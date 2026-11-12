package hotelier

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	base "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
	"go.uber.org/zap"
)

type Handler struct {
	service                Service
	defaultLimit, maxLimit int
	logger                 *zap.Logger
}

func NewHandler(s Service, defaultLimit, maxLimit int, logger *zap.Logger) *Handler {
	return &Handler{service: s, defaultLimit: defaultLimit, maxLimit: maxLimit, logger: logger}
}

// Profile godoc
// @Summary Get hotelier profile
// @Tags Hotelier: Profile
// @Produce json
// @Success 200 {object} handler.Response{data=domain.HotelierProfile}
// @Security BearerAuth
// @Router /hotelier/profile [get]
func (h *Handler) Profile(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	profile, err := h.service.Profile(r.Context(), uid)
	if err != nil {
		h.err(w, "get hotelier profile", err)
		return
	}
	base.Success(w, 200, profile)
}

func (h *Handler) user(w http.ResponseWriter, r *http.Request) (string, bool) {
	id, ok := middleware.GetUserID(r.Context())
	if !ok || id == "" {
		base.Error(w, 401, "UNAUTHORIZED", "User not authenticated")
		return "", false
	}
	return id, true
}
func validPathID(w http.ResponseWriter, id, label string) bool {
	if _, err := uuid.Parse(id); err != nil {
		base.Error(w, 400, "INVALID_INPUT", "invalid "+label+" ID")
		return false
	}
	return true
}
func (h *Handler) err(w http.ResponseWriter, op string, err error) {
	base.HandleError(w, h.logger, op, err)
}
func (h *Handler) listingAccess(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	uid, ok := h.user(w, r)
	if !ok {
		return "", "", false
	}
	id := mux.Vars(r)["listing_id"]
	if !validPathID(w, id, "listing") {
		return "", "", false
	}
	allowed, err := h.service.CanAccessListing(r.Context(), uid, id)
	if err != nil {
		h.err(w, "check hotelier listing access", err)
		return "", "", false
	}
	if !allowed {
		base.Error(w, 404, "NOT_FOUND", "listing not found")
		return "", "", false
	}
	return uid, id, true
}

// Listings godoc
// @Summary List assigned listings
// @Tags Hotelier: Listings & Units
// @Produce json
// @Success 200 {object} handler.Response{data=[]domain.HotelierListing}
// @Security BearerAuth
// @Router /hotelier/listings [get]
func (h *Handler) Listings(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	items, err := h.service.Listings(r.Context(), uid)
	if err != nil {
		h.err(w, "list hotelier listings", err)
		return
	}
	base.Success(w, 200, items)
}

// UpdateListingCard edits only hotelier-managed listing content.
// @Summary Update an assigned listing card
// @Tags Hotelier: Listings & Units
// @Accept json
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param input body domain.HotelierListingCardInput true "Editable listing card fields"
// @Success 200 {object} handler.Response
// @Failure 404 {object} handler.Response
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/card [patch]
func (h *Handler) UpdateListingCard(w http.ResponseWriter, r *http.Request) {
	uid, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	var input domain.HotelierListingCardInput
	decoder := json.NewDecoder(io.LimitReader(r.Body, 16<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		base.Error(w, 400, "INVALID_INPUT", "invalid listing card data")
		return
	}
	if strings.TrimSpace(input.Title) == "" || len(input.Title) > 255 || len(input.TitleRU) > 255 || len(input.Address) > 1000 || len(input.AddressRU) > 1000 {
		base.Error(w, 400, "INVALID_INPUT", "title and address are invalid")
		return
	}
	if _, err := time.Parse("15:04", input.CheckInTime); err != nil {
		if _, err := time.Parse("15:04:05", input.CheckInTime); err != nil {
			base.Error(w, 400, "INVALID_INPUT", "check-in time is invalid")
			return
		}
	}
	if len(input.FeatureIDs) > 100 {
		base.Error(w, 400, "INVALID_INPUT", "too many listing feature tags")
		return
	}
	if len(input.Images) > 20 {
		base.Error(w, 400, "INVALID_INPUT", "too many listing images")
		return
	}
	if !validListingImages(w, input.Images) {
		return
	}
	if err := h.service.UpdateListingCard(r.Context(), uid, listingID, input); err != nil {
		h.err(w, "update hotelier listing card", err)
		return
	}
	base.Success(w, 200, map[string]bool{"updated": true})
}

func validListingImages(w http.ResponseWriter, images []string) bool {
	if len(images) > 20 {
		base.Error(w, 400, "INVALID_INPUT", "too many listing images")
		return false
	}
	for _, imageURL := range images {
		validRemote := strings.HasPrefix(imageURL, "https://") || strings.HasPrefix(imageURL, "http://")
		validUpload := (strings.HasPrefix(imageURL, "data:image/jpeg;base64,") || strings.HasPrefix(imageURL, "data:image/png;base64,") || strings.HasPrefix(imageURL, "data:image/webp;base64,")) && len(imageURL) <= 7<<20
		if validUpload {
			_, encoded, _ := strings.Cut(imageURL, ",")
			_, err := base64.StdEncoding.DecodeString(encoded)
			validUpload = err == nil
		}
		if !validRemote && !validUpload {
			base.Error(w, 400, "INVALID_INPUT", "images must be http(s) URLs or supported uploaded images")
			return false
		}
	}
	return true
}

// CreateListing creates a listing and assigns it to the authenticated hotelier.
// @Summary Create a property for the authenticated hotelier
// @Tags Hotelier: Listings & Units
// @Accept json
// @Produce json
// @Param input body domain.CreateHotelierListingInput true "New property"
// @Success 201 {object} handler.Response
// @Security BearerAuth
// @Router /hotelier/listings [post]
func (h *Handler) CreateListing(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	var input domain.CreateHotelierListingInput
	decoder := json.NewDecoder(io.LimitReader(r.Body, 16<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		base.Error(w, 400, "INVALID_INPUT", "invalid listing data")
		return
	}
	if strings.TrimSpace(input.Title) == "" || len(input.Title) > 255 || len(input.TitleRU) > 255 || len(input.Address) > 1000 || len(input.AddressRU) > 1000 || input.ListingTypeID <= 0 || input.LocationID <= 0 {
		base.Error(w, 400, "INVALID_INPUT", "title, listing type, and location are required")
		return
	}
	if !validListingImages(w, input.Images) {
		return
	}
	if len(input.FeatureIDs) > 100 {
		base.Error(w, 400, "INVALID_INPUT", "too many listing feature tags")
		return
	}
	id, err := h.service.CreateListing(r.Context(), uid, input)
	if err != nil {
		h.err(w, "create hotelier listing", err)
		return
	}
	base.Success(w, http.StatusCreated, map[string]string{"id": id})
}

// DeactivateListing soft-deletes an assigned listing without removing its data.
// @Summary Deactivate an assigned property
// @Tags Hotelier: Listings & Units
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Success 200 {object} handler.Response
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id} [delete]
func (h *Handler) DeactivateListing(w http.ResponseWriter, r *http.Request) {
	uid, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	if err := h.service.DeactivateListing(r.Context(), uid, listingID); err != nil {
		h.err(w, "deactivate hotelier listing", err)
		return
	}
	base.Success(w, http.StatusOK, map[string]bool{"deleted": true})
}

// SetListingActive changes whether an assigned property is visible to guests.
// @Summary Activate or deactivate an assigned property
// @Tags Hotelier: Listings & Units
// @Accept json
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param input body domain.HotelierListingStatusInput true "New active state"
// @Success 200 {object} handler.Response
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/status [patch]
func (h *Handler) SetListingActive(w http.ResponseWriter, r *http.Request) {
	uid, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	var input domain.HotelierListingStatusInput
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil || input.IsActive == nil {
		base.Error(w, http.StatusBadRequest, "INVALID_INPUT", "is_active is required")
		return
	}
	if err := h.service.SetListingActive(r.Context(), uid, listingID, *input.IsActive); err != nil {
		h.err(w, "set hotelier listing status", err)
		return
	}
	base.Success(w, http.StatusOK, map[string]bool{"is_active": *input.IsActive})
}

// ListBookings godoc
// @Summary List bookings for assigned listings
// @Tags Hotelier: Bookings
// @Produce json
// @Param listing_id query string false "Listing UUID"
// @Param status query string false "Booking status"
// @Param sort_by query string false "status, created_at, listing_id, id"
// @Param sort_order query string false "asc or desc"
// @Success 200 {object} handler.Response{data=[]domain.Booking,meta=handler.Meta}
// @Security BearerAuth
// @Router /hotelier/bookings [get]
func (h *Handler) ListBookings(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	q := r.URL.Query()
	f := domain.BookingFilter{ListingID: q.Get("listing_id"), Status: q.Get("status")}
	if f.ListingID != "" && !validPathID(w, f.ListingID, "listing") {
		return
	}
	if f.Status != "" && f.Status != "confirmed" && f.Status != "checked_in" && f.Status != "completed" && f.Status != "canceled" {
		base.Error(w, 400, "INVALID_INPUT", "invalid status")
		return
	}
	f.Sort.By = q.Get("sort_by")
	f.Sort.Order = q.Get("sort_order")
	if f.Sort.By == "" {
		f.Sort.By = "created_at"
	}
	if f.Sort.Order == "" {
		if f.Sort.By == "created_at" {
			f.Sort.Order = "desc"
		} else {
			f.Sort.Order = "asc"
		}
	}
	switch f.Sort.By {
	case "status", "created_at", "listing_id", "id":
	default:
		base.Error(w, 400, "INVALID_INPUT", "invalid sort field")
		return
	}
	if f.Sort.Order != "asc" && f.Sort.Order != "desc" {
		base.Error(w, 400, "INVALID_INPUT", "invalid sort order")
		return
	}
	if f.ListingID != "" {
		allowed, err := h.service.CanAccessListing(r.Context(), uid, f.ListingID)
		if err != nil {
			h.err(w, "check listing access", err)
			return
		}
		if !allowed {
			base.Error(w, 404, "NOT_FOUND", "listing not found")
			return
		}
	}
	limit, offset := base.ParsePagination(r, h.defaultLimit, h.maxLimit)
	items, total, err := h.service.ListBookings(r.Context(), uid, f, limit, offset)
	if err != nil {
		h.err(w, "list hotelier bookings", err)
		return
	}
	base.SuccessWithMeta(w, 200, items, &base.Meta{Limit: limit, Offset: offset, Total: total})
}

// GetBooking godoc
// @Summary Get booking card
// @Tags Hotelier: Bookings
// @Produce json
// @Param id path string true "Booking UUID"
// @Success 200 {object} handler.Response{data=domain.Booking}
// @Security BearerAuth
// @Router /hotelier/bookings/{id} [get]
func (h *Handler) GetBooking(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	id := mux.Vars(r)["id"]
	if !validPathID(w, id, "booking") {
		return
	}
	item, err := h.service.GetBooking(r.Context(), id, uid)
	if err != nil {
		h.err(w, "get hotelier booking", err)
		return
	}
	base.Success(w, 200, item)
}
func (h *Handler) BookingAction(action string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := h.user(w, r)
		if !ok {
			return
		}
		id := mux.Vars(r)["id"]
		if !validPathID(w, id, "booking") {
			return
		}
		reason := ""
		if action == "cancel" {
			var in CancelBookingRequest
			if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&in); err != nil {
				base.Error(w, 400, "INVALID_REQUEST", "invalid request body")
				return
			}
			reason = strings.TrimSpace(in.Reason)
		}
		item, err := h.service.TransitionBooking(r.Context(), id, uid, action, reason)
		if err != nil {
			h.err(w, "change hotelier booking status", err)
			return
		}
		base.Success(w, 200, item)
	}
}

// ListReviews godoc
// @Summary List reviews for assigned listings
// @Tags Hotelier: Reviews
// @Produce json
// @Param listing_id query string false "Listing UUID"
// @Param status query string false "Review status"
// @Param created_from query string false "Created on or after this date (YYYY-MM-DD)"
// @Param created_to query string false "Created on or before this date (YYYY-MM-DD)"
// @Param is_imported query bool false "Imported review"
// @Param sort_by query string false "status, created_at, listing_id, id, overall_rating"
// @Param sort_order query string false "asc or desc"
// @Success 200 {object} handler.Response{data=[]domain.ListingReview,meta=handler.Meta}
// @Security BearerAuth
// @Router /hotelier/listing-reviews [get]
func (h *Handler) ListReviews(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	q := r.URL.Query()
	listingID := q.Get("listing_id")
	if listingID != "" {
		if !validPathID(w, listingID, "listing") {
			return
		}
		allowed, err := h.service.CanAccessListing(r.Context(), uid, listingID)
		if err != nil {
			h.err(w, "check review listing access", err)
			return
		}
		if !allowed {
			base.Error(w, 404, "NOT_FOUND", "listing not found")
			return
		}
	}
	f := domain.ListingReviewFilter{Status: domain.ListingReviewStatus(q.Get("status")), ListingID: listingID, HotelierOnly: true, HotelierID: uid}
	if f.Status != "" && !f.Status.Valid() {
		base.Error(w, 400, "INVALID_INPUT", "invalid review status")
		return
	}
	parseCreatedDate := func(key string, inclusiveEnd bool) (*time.Time, error) {
		value := q.Get(key)
		if value == "" {
			return nil, nil
		}
		date, err := time.Parse("2006-01-02", value)
		if err != nil {
			return nil, err
		}
		if inclusiveEnd {
			date = date.AddDate(0, 0, 1)
		}
		return &date, nil
	}
	var dateErr error
	if f.CreatedFrom, dateErr = parseCreatedDate("created_from", false); dateErr != nil {
		base.Error(w, 400, "INVALID_INPUT", "created_from must use YYYY-MM-DD")
		return
	}
	if f.CreatedTo, dateErr = parseCreatedDate("created_to", true); dateErr != nil {
		base.Error(w, 400, "INVALID_INPUT", "created_to must use YYYY-MM-DD")
		return
	}
	if f.CreatedFrom != nil && f.CreatedTo != nil && !f.CreatedFrom.Before(*f.CreatedTo) {
		base.Error(w, 400, "INVALID_INPUT", "created_from must not be after created_to")
		return
	}
	if q.Has("is_imported") {
		v, e := strconv.ParseBool(q.Get("is_imported"))
		if e != nil {
			base.Error(w, 400, "INVALID_INPUT", "invalid is_imported")
			return
		}
		f.IsImported = &v
	}
	f.HotelierSort.By = q.Get("sort_by")
	f.HotelierSort.Order = q.Get("sort_order")
	if f.HotelierSort.By == "" {
		f.HotelierSort.By = "created_at"
	}
	if f.HotelierSort.Order == "" {
		if f.HotelierSort.By == "created_at" {
			f.HotelierSort.Order = "desc"
		} else {
			f.HotelierSort.Order = "asc"
		}
	}
	switch f.HotelierSort.By {
	case "status", "created_at", "listing_id", "id", "overall_rating":
	default:
		base.Error(w, 400, "INVALID_INPUT", "invalid sort field")
		return
	}
	if f.HotelierSort.Order != "asc" && f.HotelierSort.Order != "desc" {
		base.Error(w, 400, "INVALID_INPUT", "invalid sort order")
		return
	}
	limit, offset := base.ParsePagination(r, h.defaultLimit, h.maxLimit)
	items, total, err := h.service.ListReviews(r.Context(), uid, f, limit, offset)
	if err != nil {
		h.err(w, "list hotelier reviews", err)
		return
	}
	base.SuccessWithMeta(w, 200, items, &base.Meta{Limit: limit, Offset: offset, Total: total})
}

// GetReview godoc
// @Summary Get review card
// @Tags Hotelier: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=domain.ListingReview}
// @Security BearerAuth
// @Router /hotelier/listing-reviews/{id} [get]
func (h *Handler) GetReview(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	id := mux.Vars(r)["id"]
	if !validPathID(w, id, "review") {
		return
	}
	item, err := h.service.GetReview(r.Context(), id)
	if err != nil {
		h.err(w, "get hotelier review", err)
		return
	}
	allowed, err := h.service.CanAccessListing(r.Context(), uid, item.ListingID)
	if err != nil {
		h.err(w, "check review listing access", err)
		return
	}
	if !allowed {
		base.Error(w, 404, "NOT_FOUND", "review not found")
		return
	}
	base.Success(w, 200, item)
}

// ListUnits godoc
// @Summary List inventory for an assigned listing
// @Tags Hotelier: Listings & Units
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Success 200 {object} handler.Response{data=[]domain.ListingUnit}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/units [get]
func (h *Handler) ListUnits(w http.ResponseWriter, r *http.Request) {
	_, id, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	items, err := h.service.ListUnits(r.Context(), id, r.URL.Query().Get("currency"))
	if err != nil {
		h.err(w, "list hotelier inventory", err)
		return
	}
	base.Success(w, 200, items)
}

// GetUnit godoc
// @Summary Get inventory unit card
// @Tags Hotelier: Listings & Units
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param unit_id path string true "Unit UUID"
// @Success 200 {object} handler.Response{data=domain.ListingUnit}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/units/{unit_id} [get]
func (h *Handler) GetUnit(w http.ResponseWriter, r *http.Request) {
	_, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	unitID := mux.Vars(r)["unit_id"]
	if !validPathID(w, unitID, "unit") {
		return
	}
	item, err := h.service.GetUnit(r.Context(), listingID, unitID)
	if err != nil {
		h.err(w, "get hotelier inventory unit", err)
		return
	}
	base.Success(w, 200, item)
}

// CreateUnit godoc
// @Summary Add inventory to an assigned listing
// @Tags Hotelier: Listings & Units
// @Accept json
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param input body hotelier.CreateUnitRequest true "Inventory unit"
// @Success 201 {object} handler.Response{data=domain.ListingUnit}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/units [post]
func (h *Handler) CreateUnit(w http.ResponseWriter, r *http.Request) {
	_, id, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	var in CreateUnitRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		base.Error(w, 400, "INVALID_REQUEST", "invalid request body")
		return
	}
	active := true
	if in.IsActive != nil {
		active = *in.IsActive
	}
	u := domain.ListingUnit{ListingID: id, ParentUnitID: in.ParentUnitID, Type: in.Type, Name: in.Name, NameRU: in.NameRU, PricePerNight: in.PricePerNight, Currency: in.Currency, CapacityAdults: in.CapacityAdults, CapacityChildren: in.CapacityChildren, PetsAllowed: in.PetsAllowed, IsActive: active}
	if err := h.service.CreateUnit(r.Context(), &u); err != nil {
		h.err(w, "create hotelier inventory unit", err)
		return
	}
	base.Success(w, 201, u)
}

// UpdateUnit godoc
// @Summary Update inventory unit
// @Tags Hotelier: Listings & Units
// @Accept json
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param unit_id path string true "Unit UUID"
// @Param input body hotelier.UpdateUnitRequest true "Fields to change"
// @Success 200 {object} handler.Response{data=domain.ListingUnit}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/units/{unit_id} [patch]
func (h *Handler) UpdateUnit(w http.ResponseWriter, r *http.Request) {
	_, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	unitID := mux.Vars(r)["unit_id"]
	if !validPathID(w, unitID, "unit") {
		return
	}
	var in UpdateUnitRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		base.Error(w, 400, "INVALID_REQUEST", "invalid request body")
		return
	}
	patch := domain.UpdateListingUnitInput{Name: in.Name, PricePerNight: in.PricePerNight, Currency: in.Currency, CapacityAdults: in.CapacityAdults, CapacityChildren: in.CapacityChildren, PetsAllowed: in.PetsAllowed, IsActive: in.IsActive}
	if len(in.NameRU) > 0 {
		patch.NameRUSet = true
		if string(in.NameRU) != "null" {
			var v string
			if json.Unmarshal(in.NameRU, &v) != nil {
				base.Error(w, 400, "INVALID_REQUEST", "invalid name_ru")
				return
			}
			patch.NameRU = &v
		}
	}
	item, err := h.service.UpdateUnit(r.Context(), listingID, unitID, patch)
	if err != nil {
		h.err(w, "update hotelier inventory unit", err)
		return
	}
	base.Success(w, 200, item)
}

// CreateUnitImage godoc
// @Summary Add an inventory image
// @Tags Hotelier: Listings & Units
// @Accept json
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param unit_id path string true "Unit UUID"
// @Param input body hotelier.CreateUnitImageRequest true "Image"
// @Success 201 {object} handler.Response{data=domain.ListingUnitImage}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/units/{unit_id}/images [post]
func (h *Handler) CreateUnitImage(w http.ResponseWriter, r *http.Request) {
	_, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	unitID := mux.Vars(r)["unit_id"]
	if !validPathID(w, unitID, "unit") {
		return
	}
	var in CreateUnitImageRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		base.Error(w, 400, "INVALID_REQUEST", "invalid request body")
		return
	}
	item, err := h.service.CreateUnitImage(r.Context(), listingID, unitID, in.URL, in.SortOrder)
	if err != nil {
		h.err(w, "create hotelier inventory image", err)
		return
	}
	base.Success(w, 201, item)
}

// DeleteUnitImage godoc
// @Summary Delete an inventory image
// @Tags Hotelier: Listings & Units
// @Param listing_id path string true "Listing UUID"
// @Param unit_id path string true "Unit UUID"
// @Param image_id path string true "Image UUID"
// @Success 204
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/units/{unit_id}/images/{image_id} [delete]
func (h *Handler) DeleteUnitImage(w http.ResponseWriter, r *http.Request) {
	_, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	vars := mux.Vars(r)
	if !validPathID(w, vars["unit_id"], "unit") || !validPathID(w, vars["image_id"], "image") {
		return
	}
	if err := h.service.DeleteUnitImage(r.Context(), listingID, vars["unit_id"], vars["image_id"]); err != nil {
		h.err(w, "delete hotelier inventory image", err)
		return
	}
	w.WriteHeader(204)
}

// UpdateUnitImage godoc
// @Summary Update an inventory image
// @Tags Hotelier: Listings & Units
// @Accept json
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param unit_id path string true "Unit UUID"
// @Param image_id path string true "Image UUID"
// @Param input body hotelier.UpdateUnitImageRequest true "url and/or sort_order"
// @Success 200 {object} handler.Response{data=domain.ListingUnitImage}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/units/{unit_id}/images/{image_id} [patch]
func (h *Handler) UpdateUnitImage(w http.ResponseWriter, r *http.Request) {
	_, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	vars := mux.Vars(r)
	if !validPathID(w, vars["unit_id"], "unit") || !validPathID(w, vars["image_id"], "image") {
		return
	}
	var in UpdateUnitImageRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		base.Error(w, 400, "INVALID_REQUEST", "invalid request body")
		return
	}
	item, err := h.service.UpdateUnitImage(r.Context(), listingID, vars["unit_id"], vars["image_id"], in.URL, in.SortOrder)
	if err != nil {
		h.err(w, "update hotelier inventory image", err)
		return
	}
	base.Success(w, 200, item)
}

// ListMessages godoc
// @Summary List incoming questions and OTA notices
// @Tags Hotelier: Messages
// @Produce json
// @Param listing_id query string false "Listing UUID"
// @Param type query string false "client_question, ota_notification, ota_recommendation"
// @Param status query string false "new or processed"
// @Success 200 {object} handler.Response{data=[]domain.HotelierMessage,meta=handler.Meta}
// @Security BearerAuth
// @Router /hotelier/messages [get]
func (h *Handler) ListMessages(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	q := r.URL.Query()
	listingID := q.Get("listing_id")
	if listingID != "" {
		if !validPathID(w, listingID, "listing") {
			return
		}
		allowed, err := h.service.CanAccessListing(r.Context(), uid, listingID)
		if err != nil {
			h.err(w, "check message listing access", err)
			return
		}
		if !allowed {
			base.Error(w, 404, "NOT_FOUND", "listing not found")
			return
		}
	}
	typ, status := q.Get("type"), q.Get("status")
	if typ != "" && typ != "client_question" && typ != "ota_notification" && typ != "ota_recommendation" {
		base.Error(w, 400, "INVALID_INPUT", "invalid message type")
		return
	}
	if status != "" && status != "new" && status != "processed" {
		base.Error(w, 400, "INVALID_INPUT", "invalid message status")
		return
	}
	sortBy, sortOrder := q.Get("sort_by"), q.Get("sort_order")
	if sortBy == "" {
		sortBy = "created_at"
	}
	if sortBy != "created_at" && sortBy != "status" && sortBy != "listing_id" && sortBy != "id" {
		base.Error(w, 400, "INVALID_INPUT", "invalid sort field")
		return
	}
	if sortOrder == "" {
		sortOrder = "desc"
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		base.Error(w, 400, "INVALID_INPUT", "invalid sort order")
		return
	}
	limit, offset := base.ParsePagination(r, h.defaultLimit, h.maxLimit)
	items, total, err := h.service.ListMessages(r.Context(), uid, listingID, typ, status, sortBy, sortOrder, limit, offset)
	if err != nil {
		h.err(w, "list hotelier messages", err)
		return
	}
	base.SuccessWithMeta(w, 200, items, &base.Meta{Limit: limit, Offset: offset, Total: total})
}

// GetMessage godoc
// @Summary Get incoming message
// @Tags Hotelier: Messages
// @Produce json
// @Param id path string true "Message UUID"
// @Success 200 {object} handler.Response{data=domain.HotelierMessage}
// @Security BearerAuth
// @Router /hotelier/messages/{id} [get]
func (h *Handler) GetMessage(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	id := mux.Vars(r)["id"]
	if !validPathID(w, id, "message") {
		return
	}
	item, err := h.service.GetMessage(r.Context(), uid, id)
	if err != nil {
		h.err(w, "get hotelier message", err)
		return
	}
	base.Success(w, 200, item)
}

// ReplyMessage godoc
// @Summary Reply and optionally mark a message processed
// @Tags Hotelier: Messages
// @Accept json
// @Produce json
// @Param id path string true "Message UUID"
// @Param input body hotelier.ReplyMessageRequest true "reply and processed"
// @Success 200 {object} handler.Response{data=domain.HotelierMessage}
// @Security BearerAuth
// @Router /hotelier/messages/{id} [patch]
func (h *Handler) ReplyMessage(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	id := mux.Vars(r)["id"]
	if !validPathID(w, id, "message") {
		return
	}
	var in ReplyMessageRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		base.Error(w, 400, "INVALID_REQUEST", "invalid request body")
		return
	}
	in.Reply = strings.TrimSpace(in.Reply)
	if (in.Reply == "" && !in.Processed) || len(in.Reply) > 10000 {
		base.Error(w, 400, "INVALID_INPUT", "reply is required unless marking a system notice processed; maximum 10000 characters")
		return
	}
	item, err := h.service.ReplyMessage(r.Context(), uid, id, in.Reply, in.Processed)
	if err != nil {
		h.err(w, "reply to hotelier message", err)
		return
	}
	base.Success(w, 200, item)
}

// CreateClientQuestion godoc
// @Summary Send a question to the assigned hotelier
// @Tags Client: Listings
// @Accept json
// @Produce json
// @Param id path string true "Listing UUID"
// @Param input body hotelier.CreateClientQuestionRequest true "message_text"
// @Success 201 {object} handler.Response{data=map[string]string}
// @Security BearerAuth
// @Router /listings/{id}/questions [post]
func (h *Handler) CreateClientQuestion(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.user(w, r)
	if !ok {
		return
	}
	listingID := mux.Vars(r)["id"]
	if !validPathID(w, listingID, "listing") {
		return
	}
	var in CreateClientQuestionRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		base.Error(w, 400, "INVALID_REQUEST", "invalid request body")
		return
	}
	in.MessageText = strings.TrimSpace(in.MessageText)
	if in.MessageText == "" || len(in.MessageText) > 10000 {
		base.Error(w, 400, "INVALID_INPUT", "message_text is required and must be at most 10000 characters")
		return
	}
	_, err := h.service.CreateClientQuestion(r.Context(), listingID, uid, in.MessageText)
	if err != nil {
		h.err(w, "create client question", err)
		return
	}
	base.Success(w, 201, map[string]string{"status": "received"})
}

// HotelierCheckIn godoc
// @Summary Mark a booking checked in
// @Tags Hotelier: Bookings
// @Produce json
// @Param id path string true "Booking UUID"
// @Success 200 {object} handler.Response{data=domain.Booking}
// @Security BearerAuth
// @Router /hotelier/bookings/{id}/check-in [patch]
func documentHotelierCheckIn() {}

// HotelierCheckOut godoc
// @Summary Mark a booking completed
// @Tags Hotelier: Bookings
// @Produce json
// @Param id path string true "Booking UUID"
// @Success 200 {object} handler.Response{data=domain.Booking}
// @Security BearerAuth
// @Router /hotelier/bookings/{id}/check-out [patch]
func documentHotelierCheckOut() {}

// HotelierCancel godoc
// @Summary Cancel a booking
// @Tags Hotelier: Bookings
// @Accept json
// @Produce json
// @Param id path string true "Booking UUID"
// @Param input body hotelier.CancelBookingRequest true "Cancellation reason"
// @Success 200 {object} handler.Response{data=domain.Booking}
// @Security BearerAuth
// @Router /hotelier/bookings/{id}/cancel [patch]
func documentHotelierCancel() {}
