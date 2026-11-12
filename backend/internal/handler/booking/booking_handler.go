package booking

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
	"go.uber.org/zap"
)

type BookingHandler struct {
	service      BookingService
	defaultLimit int
	maxLimit     int
	logger       *zap.Logger
}

func NewBookingHandler(service BookingService, defaultLimit, maxLimit int, logger *zap.Logger) *BookingHandler {
	return &BookingHandler{
		service:      service,
		defaultLimit: defaultLimit,
		maxLimit:     maxLimit,
		logger:       logger,
	}
}

func decode(r *http.Request, d any) error {
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(d); err != nil {
		return err
	}
	if err := dec.Decode(new(any)); err != io.EOF {
		return domain.ErrInvalidInput
	}
	return nil
}

func (h *BookingHandler) handleError(w http.ResponseWriter, message string, err error) {
	if errors.Is(err, domain.ErrUnitUnavailable) {
		handlers.Error(w, http.StatusConflict, "UNIT_UNAVAILABLE", err.Error())
		return
	}
	handlers.HandleError(w, h.logger, message, err)
}

func idValid(id string) bool {
	_, err := uuid.Parse(id)
	return err == nil
}

func actorID(w http.ResponseWriter, r *http.Request) (string, bool) {
	id, ok := middleware.GetUserID(r.Context())
	if !ok || id == "" {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return "", false
	}
	return id, true
}

func parseBool(s string) (bool, error) {
	if s == "" {
		return false, nil
	}
	return strconv.ParseBool(s)
}

func parseUnitSort(w http.ResponseWriter, r *http.Request) (domain.Sort, string, bool) {
	sort, err := handlers.ParseSort(r, "name", "name", "price_per_night")
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return domain.Sort{}, "", false
	}
	currency := r.URL.Query().Get("currency")
	if currency != "" && (len(currency) != 3 || strings.ContainsFunc(currency, func(c rune) bool { return c < 'A' || c > 'Z' })) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "currency must be a three-letter uppercase code")
		return domain.Sort{}, "", false
	}
	return sort, currency, true
}

// Available godoc
// @Summary List available accommodation units
// @Description Prices are returned in the requested currency or in the configured base currency when currency is omitted.
// @Tags Client: Listings
// @Produce json
// @Param id path string true "Listing ID"
// @Param lang query string false "Language (default en)" Enums(en,ru)
// @Param check_in_date query string true "YYYY-MM-DD"
// @Param nights query int true "Number of nights"
// @Param has_pets query bool false "Pets"
// @Param currency query string false "Active three-letter currency code for displayed prices; defaults to the base currency; unknown codes return 400"
// @Param sort_by query string false "Sort field: name or price_per_night (default name)" Enums(name,price_per_night)
// @Param sort_order query string false "Sort direction: asc or desc (default asc)" Enums(asc,desc)
// @Success 200 {object} handler.Response{data=[]UnitResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Router /listings/{id}/available-units [get]
func (h *BookingHandler) Available(w http.ResponseWriter, r *http.Request) {
	lang, ok := handlers.RequestLanguage(r)
	if !ok {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
		return
	}
	id := mux.Vars(r)["id"]
	sort, currency, ok := parseUnitSort(w, r)
	if !ok {
		return
	}
	n, err := strconv.Atoi(r.URL.Query().Get("nights"))
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "nights must be an integer")
		return
	}
	pets, err := parseBool(r.URL.Query().Get("has_pets"))
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "has_pets must be a boolean")
		return
	}
	units, err := h.service.Available(r.Context(), id, r.URL.Query().Get("check_in_date"), n, pets, currency)
	if err != nil {
		h.handleError(w, "failed to list available units", err)
		return
	}
	for i := range units {
		units[i].Name = handlers.LocalizedString(units[i].Name, units[i].NameRU, lang)
	}
	sortUnits(units, sort)
	handlers.Success(w, http.StatusOK, toUnitsResponse(units, lang, false))
}

// ListUnits godoc
// @Summary List all units of a listing (staff)
// @Description Includes active, inactive and grouping units. Prices are returned in the requested currency or in the configured base currency when currency is omitted.
// @Tags Admin: Listings & Units
// @Produce json
// @Param id path string true "Listing ID"
// @Param currency query string false "Active three-letter currency code for displayed prices; defaults to the base currency; unknown codes return 400"
// @Param sort_by query string false "Sort field: name or price_per_night (default name)" Enums(name,price_per_night)
// @Param sort_order query string false "Sort direction: asc or desc (default asc)" Enums(asc,desc)
// @Success 200 {object} handler.Response{data=[]UnitResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /admin/listings/{id}/units [get]
func (h *BookingHandler) ListUnits(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	sort, currency, ok := parseUnitSort(w, r)
	if !ok {
		return
	}
	if !idValid(id) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid listing ID")
		return
	}
	u, err := h.service.ListUnits(r.Context(), id, currency)
	if err != nil {
		h.handleError(w, "failed to list listing units", err)
		return
	}
	sortUnits(u, sort)
	handlers.Success(w, http.StatusOK, toUnitsResponse(u, "en", true))
}

// CreateUnit godoc
// @Summary Add an accommodation unit (staff)
// @Tags Admin: Listings & Units
// @Accept json
// @Produce json
// @Param id path string true "Listing ID"
// @Param input body CreateUnitRequest true "Unit"
// @Success 201 {object} handler.Response{data=UnitResponse}
// @Security BearerAuth
// @Router /admin/listings/{id}/units [post]
func (h *BookingHandler) CreateUnit(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var in CreateUnitRequest
	if err := decode(r, &in); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	active := true
	if in.IsActive != nil {
		active = *in.IsActive
	}
	u := domain.ListingUnit{ListingID: id, ParentUnitID: in.ParentUnitID, Type: in.Type, Name: in.Name, NameRU: in.NameRU, PricePerNight: in.PricePerNight, Currency: in.Currency, CapacityAdults: in.CapacityAdults, CapacityChildren: in.CapacityChildren, PetsAllowed: in.PetsAllowed, IsActive: active}
	if err := h.service.CreateUnit(r.Context(), &u); err != nil {
		h.handleError(w, "failed to create listing unit", err)
		return
	}
	handlers.Success(w, http.StatusCreated, toUnitResponse(&u, "en", true))
}

// UpdateUnit godoc
// @Summary Update accommodation unit fields (staff)
// @Tags Admin: Listings & Units
// @Accept json
// @Produce json
// @Param id path string true "Listing ID"
// @Param unit_id path string true "Unit ID"
// @Param input body UpdateUnitRequest true "Fields to change"
// @Success 200 {object} handler.Response{data=UnitResponse}
// @Security BearerAuth
// @Router /admin/listings/{id}/units/{unit_id} [patch]
func (h *BookingHandler) UpdateUnit(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	if !idValid(vars["id"]) || !idValid(vars["unit_id"]) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid ID")
		return
	}
	var in UpdateUnitRequest
	if err := decode(r, &in); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	patch := domain.UpdateListingUnitInput{Name: in.Name, PricePerNight: in.PricePerNight, Currency: in.Currency, CapacityAdults: in.CapacityAdults, CapacityChildren: in.CapacityChildren, PetsAllowed: in.PetsAllowed, IsActive: in.IsActive}
	if in.NameRU != nil {
		patch.NameRUSet = true
		if string(in.NameRU) != "null" {
			var nameRU string
			if err := json.Unmarshal(in.NameRU, &nameRU); err != nil {
				handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "name_ru must be a string or null")
				return
			}
			patch.NameRU = &nameRU
		}
	}
	u, err := h.service.UpdateUnit(r.Context(), vars["id"], vars["unit_id"], patch)
	if err != nil {
		h.handleError(w, "failed to update listing unit", err)
		return
	}
	handlers.Success(w, http.StatusOK, toUnitResponse(u, "en", true))
}

// CreateUnitImage godoc
// @Summary Add an image to an accommodation unit (staff)
// @Tags Admin: Listings & Units
// @Accept json
// @Produce json
// @Param id path string true "Listing ID"
// @Param unit_id path string true "Unit ID"
// @Param input body CreateUnitImageRequest true "Image"
// @Success 201 {object} handler.Response{data=UnitImageResponse}
// @Security BearerAuth
// @Router /admin/listings/{id}/units/{unit_id}/images [post]
func (h *BookingHandler) CreateUnitImage(w http.ResponseWriter, r *http.Request) {
	var in CreateUnitImageRequest
	if err := decode(r, &in); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	v := mux.Vars(r)
	image, err := h.service.CreateUnitImage(r.Context(), v["id"], v["unit_id"], in.URL, in.SortOrder)
	if err != nil {
		h.handleError(w, "failed to create unit image", err)
		return
	}
	handlers.Success(w, http.StatusCreated, toUnitImageResponse(image))
}

// DeleteUnitImage godoc
// @Summary Delete an accommodation unit image (staff)
// @Tags Admin: Listings & Units
// @Param id path string true "Listing ID"
// @Param unit_id path string true "Unit ID"
// @Param image_id path string true "Image ID"
// @Success 204
// @Security BearerAuth
// @Router /admin/listings/{id}/units/{unit_id}/images/{image_id} [delete]
func (h *BookingHandler) DeleteUnitImage(w http.ResponseWriter, r *http.Request) {
	v := mux.Vars(r)
	if err := h.service.DeleteUnitImage(r.Context(), v["id"], v["unit_id"], v["image_id"]); err != nil {
		h.handleError(w, "failed to delete unit image", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Create godoc
// @Summary Create a confirmed accommodation booking
// @Tags Client: Bookings
// @Accept json
// @Produce json
// @Param input body CreateBookingRequest true "Booking"
// @Success 201 {object} handler.Response{data=BookingResponse}
// @Security BearerAuth
// @Router /bookings [post]
func (h *BookingHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateBookingRequest
	if err := decode(r, &req); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	actor, ok := actorID(w, r)
	if !ok {
		return
	}
	input := domain.CreateBookingInput{ListingID: req.ListingID, UnitIDs: req.UnitIDs, CheckInDate: req.CheckInDate, Nights: req.Nights, AdultsCount: req.AdultsCount, ChildrenCount: req.ChildrenCount, HasPets: req.HasPets, Currency: req.Currency}
	b, err := h.service.Create(r.Context(), actor, input)
	if err != nil {
		h.handleError(w, "failed to create booking", err)
		return
	}
	handlers.Success(w, http.StatusCreated, toBookingResponse(b))
}

// List godoc
// @Summary List own bookings
// @Tags Client: Bookings
// @Produce json
// @Param listing_id query string false "Listing UUID"
// @Param status query string false "Booking status: confirmed, checked_in, completed or canceled"
// @Param check_in_from query string false "Check-in date from YYYY-MM-DD, inclusive"
// @Param check_in_to query string false "Check-in date to YYYY-MM-DD, inclusive"
// @Param check_out_from query string false "Check-out date from YYYY-MM-DD, inclusive"
// @Param check_out_to query string false "Check-out date to YYYY-MM-DD, inclusive"
// @Param sort_by query string false "Sort field: created_at, check_in_date or check_out_date (default created_at)" Enums(created_at,check_in_date,check_out_date)
// @Param sort_order query string false "Sort direction: asc or desc (default desc for created_at, asc for stay dates)" Enums(asc,desc)
// @Param limit query int false "Maximum results (default 20, maximum 100 unless configured otherwise)"
// @Param offset query int false "Number of results to skip"
// @Success 200 {object} handler.Response{data=[]BookingResponse,meta=handler.Meta}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /bookings [get]
func (h *BookingHandler) List(w http.ResponseWriter, r *http.Request) {
	h.list(w, r, false)
}

// ListAdmin godoc
// @Summary List all bookings (staff)
// @Description Date ranges are inclusive and filter check-in or check-out dates independently. All filters can be combined.
// @Tags Admin: Bookings
// @Produce json
// @Param listing_id query string false "Listing UUID"
// @Param client_id query string false "Client UUID"
// @Param status query string false "Booking status: confirmed, checked_in, completed or canceled"
// @Param check_in_from query string false "Check-in date from YYYY-MM-DD, inclusive"
// @Param check_in_to query string false "Check-in date to YYYY-MM-DD, inclusive"
// @Param check_out_from query string false "Check-out date from YYYY-MM-DD, inclusive"
// @Param check_out_to query string false "Check-out date to YYYY-MM-DD, inclusive"
// @Param sort_by query string false "Sort field: created_at, check_in_date or check_out_date (default created_at)" Enums(created_at,check_in_date,check_out_date)
// @Param sort_order query string false "Sort direction: asc or desc (default desc for created_at, asc for stay dates)" Enums(asc,desc)
// @Param limit query int false "Maximum results (default 20, maximum 100 unless configured otherwise)"
// @Param offset query int false "Number of results to skip"
// @Success 200 {object} handler.Response{data=[]BookingResponse,meta=handler.Meta}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 403 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /admin/bookings [get]
func (h *BookingHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	h.list(w, r, true)
}

func (h *BookingHandler) list(w http.ResponseWriter, r *http.Request, staff bool) {
	q := r.URL.Query()
	sort, err := handlers.ParseSort(r, "created_at", "created_at", "check_in_date", "check_out_date")
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}
	f := domain.BookingFilter{
		ListingID: q.Get("listing_id"), Status: q.Get("status"),
		CheckInFrom: q.Get("check_in_from"), CheckInTo: q.Get("check_in_to"),
		CheckOutFrom: q.Get("check_out_from"), CheckOutTo: q.Get("check_out_to"),
		Sort: sort,
	}
	if staff {
		f.ClientID = q.Get("client_id")
	}
	if f.ListingID != "" && !idValid(f.ListingID) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid listing ID")
		return
	}
	if f.ClientID != "" && !idValid(f.ClientID) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid client ID")
		return
	}
	if f.Status != "" && f.Status != "confirmed" && f.Status != "checked_in" && f.Status != "completed" && f.Status != "canceled" {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid status")
		return
	}
	for _, date := range []string{f.CheckInFrom, f.CheckInTo, f.CheckOutFrom, f.CheckOutTo} {
		if date != "" {
			t, e := time.Parse("2006-01-02", date)
			if e != nil || t.Format("2006-01-02") != date {
				handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid date")
				return
			}
		}
	}
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	actor, ok := actorID(w, r)
	if !ok {
		return
	}
	items, total, err := h.service.List(r.Context(), actor, staff, f, limit, offset)
	if err != nil {
		h.handleError(w, "failed to list bookings", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, toBookingsResponse(items), &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

// Get godoc
// @Summary Get own booking
// @Tags Client: Bookings
// @Produce json
// @Param id path string true "Booking ID"
// @Success 200 {object} handler.Response{data=BookingResponse}
// @Security BearerAuth
// @Router /bookings/{id} [get]
func (h *BookingHandler) Get(w http.ResponseWriter, r *http.Request) {
	h.get(w, r, false)
}

// GetAdmin godoc
// @Summary Get booking (staff)
// @Tags Admin: Bookings
// @Produce json
// @Param id path string true "Booking ID"
// @Success 200 {object} handler.Response{data=BookingResponse}
// @Security BearerAuth
// @Router /admin/bookings/{id} [get]
func (h *BookingHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	h.get(w, r, true)
}

func (h *BookingHandler) get(w http.ResponseWriter, r *http.Request, staff bool) {
	id := mux.Vars(r)["id"]
	if !idValid(id) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid booking ID")
		return
	}
	actor, ok := actorID(w, r)
	if !ok {
		return
	}
	b, err := h.service.Get(r.Context(), id, actor, staff)
	if err != nil {
		h.handleError(w, "failed to get booking", err)
		return
	}
	handlers.Success(w, http.StatusOK, toBookingResponse(b))
}

// Cancel godoc
// @Summary Cancel own booking before check-in
// @Tags Client: Bookings
// @Accept json
// @Produce json
// @Param id path string true "Booking ID"
// @Param input body CancelBookingRequest true "Cancellation reason is required"
// @Success 200 {object} handler.Response{data=BookingResponse}
// @Security BearerAuth
// @Router /bookings/{id}/cancel [patch]
func (h *BookingHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	h.transition(w, r, "cancel", false)
}

// CancelAdmin godoc
// @Summary Cancel booking (staff)
// @Tags Admin: Bookings
// @Accept json
// @Produce json
// @Param id path string true "Booking ID"
// @Param input body CancelBookingRequest true "Cancellation reason is required"
// @Success 200 {object} handler.Response{data=BookingResponse}
// @Security BearerAuth
// @Router /admin/bookings/{id}/cancel [patch]
func (h *BookingHandler) CancelAdmin(w http.ResponseWriter, r *http.Request) {
	h.transition(w, r, "cancel", true)
}

// CheckIn godoc
// @Summary Confirm guest check-in (staff)
// @Tags Admin: Bookings
// @Produce json
// @Param id path string true "Booking ID"
// @Success 200 {object} handler.Response{data=BookingResponse}
// @Security BearerAuth
// @Router /admin/bookings/{id}/check-in [patch]
func (h *BookingHandler) CheckIn(w http.ResponseWriter, r *http.Request) {
	h.transition(w, r, "check-in", true)
}

// CheckOut godoc
// @Summary Confirm guest check-out (staff)
// @Tags Admin: Bookings
// @Produce json
// @Param id path string true "Booking ID"
// @Success 200 {object} handler.Response{data=BookingResponse}
// @Security BearerAuth
// @Router /admin/bookings/{id}/check-out [patch]
func (h *BookingHandler) CheckOut(w http.ResponseWriter, r *http.Request) {
	h.transition(w, r, "check-out", true)
}
func (h *BookingHandler) transition(w http.ResponseWriter, r *http.Request, action string, staff bool) {
	id := mux.Vars(r)["id"]
	if !idValid(id) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid booking ID")
		return
	}
	reason := ""
	if action == "cancel" {
		var in CancelBookingRequest
		if err := decode(r, &in); err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		reason = strings.TrimSpace(in.Reason)
		if reason == "" {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
			return
		}
	} else {
		if err := handlers.RequireEmptyActionBody(r); err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
	}
	actor, ok := actorID(w, r)
	if !ok {
		return
	}
	b, err := h.service.Transition(r.Context(), id, actor, action, reason, staff)
	if err != nil {
		h.handleError(w, "failed to change booking status", err)
		return
	}
	handlers.Success(w, http.StatusOK, toBookingResponse(b))
}
