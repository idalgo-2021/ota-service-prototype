package admin

import (
	"encoding/json"
	"io"
	"net/http"
	"regexp"
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

type Handler struct {
	service                Service
	defaultLimit, maxLimit int
	logger                 *zap.Logger
}

var externalSourcePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

func NewHandler(s Service, defaultLimit, maxLimit int, logger *zap.Logger) *Handler {
	return &Handler{s, defaultLimit, maxLimit, logger}
}

func decodeMap(w http.ResponseWriter, r *http.Request) (map[string]json.RawMessage, bool) {
	var fields map[string]json.RawMessage
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	if err := dec.Decode(&fields); err != nil || fields == nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON object")
		return nil, false
	}
	var extra any
	if dec.Decode(&extra) != io.EOF {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return nil, false
	}
	return fields, true
}

func pathID(w http.ResponseWriter, r *http.Request, kind, key string) (string, bool) {
	id := mux.Vars(r)[key]
	if kind == "countries" || kind == "locations" || kind == "listing_types" {
		n, err := strconv.Atoi(id)
		if err != nil || n <= 0 {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid ID")
			return "", false
		}
	} else if kind == "listing_feature_tags" {
		n, err := strconv.ParseInt(id, 10, 64)
		if err != nil || n <= 0 {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid ID")
			return "", false
		}
	} else if kind == "currencies" {
		if len(id) != 3 || strings.ToUpper(id) != id {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid currency code")
			return "", false
		}
	} else if _, err := uuid.Parse(id); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid ID")
		return "", false
	}
	return id, true
}

// List godoc
// @Summary List administration dictionary resources
// @Description Resource-specific filters are documented in ADMIN_API.md.
// @Tags Admin: Dictionaries & Rates
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Page size"
// @Param offset query int false "Rows to skip"
// @Success 200 {object} handler.Response{meta=handler.Meta}
// @Router /admin/countries [get]
// @Router /admin/locations [get]
// @Router /admin/listing_types [get]
// @Router /admin/currencies [get]
// @Router /admin/exchange-rates [get]
func (h *Handler) List(kind string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filters := map[string]any{}
		q := r.URL.Query()
		parseInt := func(name string) bool {
			raw := q.Get(name)
			if raw == "" {
				return true
			}
			n, err := strconv.Atoi(raw)
			if err != nil || n <= 0 {
				return false
			}
			filters[name] = n
			return true
		}
		parseBool := func(name string) bool {
			raw := q.Get(name)
			if raw == "" {
				return true
			}
			b, err := strconv.ParseBool(raw)
			if err != nil {
				return false
			}
			filters[name] = b
			return true
		}
		valid := true
		switch kind {
		case "listing_feature_tags":
			valid = parseBool("is_active")
		case "listing_review_summaries":
			if search := strings.TrimSpace(q.Get("listing_search")); search != "" {
				if len(search) > 200 {
					valid = false
				} else {
					filters["listing_search"] = search
				}
			}
		case "locations":
			valid = parseInt("country_id")
		case "currencies":
			valid = parseBool("is_active")
		case "users":
			if role := q.Get("role"); role != "" {
				if role != "user" && role != "manager" && role != "admin" && role != "hotelier" && role != "ai_robot" {
					valid = false
				} else {
					filters["role"] = role
				}
			}
		case "exchange_rates":
			if code := q.Get("quote_currency"); code != "" {
				if len(code) != 3 || strings.ToUpper(code) != code {
					valid = false
				} else {
					filters["quote_currency"] = code
				}
			}
			for _, name := range []string{"effective_from", "effective_to"} {
				if raw := q.Get(name); raw != "" {
					t, err := time.Parse(time.RFC3339, raw)
					if err != nil {
						valid = false
					} else {
						filters[name] = t
					}
				}
			}
		case "listings":
			valid = parseBool("is_active")
			if search := strings.TrimSpace(q.Get("search")); search != "" {
				if len(search) > 200 {
					valid = false
				} else {
					filters["search"] = search
				}
			}
			if sortBy := q.Get("sort_by"); sortBy != "" {
				if sortBy != "title" && sortBy != "title_ru" && sortBy != "created_at" {
					valid = false
				} else {
					filters["sort_by"] = sortBy
				}
			}
			if sortOrder := q.Get("sort_order"); sortOrder != "" {
				if sortOrder != "asc" && sortOrder != "desc" {
					valid = false
				} else {
					filters["sort_order"] = sortOrder
				}
			}
			if values, ok := q["external_source"]; ok {
				if len(values) != 1 || !externalSourcePattern.MatchString(values[0]) {
					valid = false
				} else {
					filters["external_source"] = values[0]
				}
			}
			if values, ok := q["external_id"]; ok {
				if len(values) != 1 || values[0] == "" || strings.TrimSpace(values[0]) != values[0] || len(values[0]) > 255 {
					valid = false
				} else {
					filters["external_id"] = values[0]
				}
			}
			for _, name := range []string{"location_ids", "listing_type_ids"} {
				if raw := q.Get(name); raw != "" {
					ids := []int{}
					for _, part := range strings.Split(raw, ",") {
						id, err := strconv.Atoi(part)
						if err != nil || id <= 0 {
							valid = false
							break
						}
						ids = append(ids, id)
					}
					filters[name] = ids
				}
			}
		}
		if !valid {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid filter")
			return
		}
		limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
		items, total, err := h.service.List(r.Context(), kind, filters, limit, offset)
		if err != nil {
			handlers.HandleError(w, h.logger, "list admin resource", err)
			return
		}
		handlers.SuccessWithMeta(w, http.StatusOK, items, &handlers.Meta{Limit: limit, Offset: offset, Total: total})
	}
}

// ListListingFeatureTags godoc
// @Summary List property feature tags
// @Tags Admin: Dictionaries & Rates
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Page size"
// @Param offset query int false "Rows to skip"
// @Param is_active query bool false "Filter by active status"
// @Success 200 {object} handler.Response{meta=handler.Meta}
// @Router /admin/listing-feature-tags [get]
func (h *Handler) ListListingFeatureTags(w http.ResponseWriter, r *http.Request) {
	h.List("listing_feature_tags")(w, r)
}

// ListListingReviewSummaries godoc
// @Summary List property review summaries
// @Tags Admin: Listings & Units
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Page size"
// @Param offset query int false "Rows to skip"
// @Param listing_search query string false "Search by English or Russian property title"
// @Success 200 {object} handler.Response{meta=handler.Meta}
// @Router /admin/listing-review-summaries [get]
func (h *Handler) ListListingReviewSummaries(w http.ResponseWriter, r *http.Request) {
	h.List("listing_review_summaries")(w, r)
}

// ListListings godoc
// @Summary List accommodation listings for staff
// @Tags Admin: Listings & Units
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Page size"
// @Param offset query int false "Rows to skip"
// @Param external_source query string false "External source, e.g. osm"
// @Param external_id query string false "External object ID, e.g. way/36823763"
// @Success 200 {object} handler.Response{meta=handler.Meta}
// @Router /admin/listings [get]
func (h *Handler) ListListings(w http.ResponseWriter, r *http.Request) {
	h.List("listings")(w, r)
}

// Get godoc
// @Summary Get one administration dictionary resource
// @Tags Admin: Dictionaries & Rates
// @Produce json
// @Security BearerAuth
// @Param id path string true "Resource ID"
// @Success 200 {object} handler.Response
// @Router /admin/countries/{id} [get]
// @Router /admin/locations/{id} [get]
// @Router /admin/listing_types/{id} [get]
// @Router /admin/currencies/{id} [get]
// @Router /admin/exchange-rates/{id} [get]
// @Router /admin/listing-feature-tags/{id} [get]
func (h *Handler) Get(kind string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r, kind, "id")
		if !ok {
			return
		}
		item, err := h.service.Get(r.Context(), kind, id)
		if err != nil {
			handlers.HandleError(w, h.logger, "get admin resource", err)
			return
		}
		handlers.Success(w, http.StatusOK, item)
	}
}

// Create godoc
// @Summary Create an administration dictionary resource
// @Description Required fields depend on resource; see ADMIN_API.md.
// @Tags Admin: Dictionaries & Rates
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param input body map[string]interface{} true "Resource fields"
// @Success 201 {object} handler.Response
// @Router /admin/countries [post]
// @Router /admin/locations [post]
// @Router /admin/listing_types [post]
// @Router /admin/currencies [post]
// @Router /admin/exchange-rates [post]
// @Router /admin/listing-feature-tags [post]
func (h *Handler) Create(kind string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fields, ok := decodeMap(w, r)
		if !ok {
			return
		}
		item, err := h.service.Create(r.Context(), kind, fields)
		if err != nil {
			handlers.HandleError(w, h.logger, "create admin resource", err)
			return
		}
		handlers.Success(w, http.StatusCreated, item)
	}
}

// Update godoc
// @Summary Partially update an administration dictionary resource
// @Description Editable fields depend on resource; see ADMIN_API.md.
// @Tags Admin: Dictionaries & Rates
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Resource ID"
// @Param input body map[string]interface{} true "Fields to update"
// @Success 200 {object} handler.Response
// @Router /admin/countries/{id} [patch]
// @Router /admin/locations/{id} [patch]
// @Router /admin/listing_types/{id} [patch]
// @Router /admin/currencies/{id} [patch]
// @Router /admin/listing-feature-tags/{id} [patch]
func (h *Handler) Update(kind string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r, kind, "id")
		if !ok {
			return
		}
		fields, ok := decodeMap(w, r)
		if !ok {
			return
		}
		item, err := h.service.Update(r.Context(), kind, id, fields)
		if err != nil {
			handlers.HandleError(w, h.logger, "update admin resource", err)
			return
		}
		handlers.Success(w, http.StatusOK, item)
	}
}

// CreateImage godoc
// @Summary Add a listing image
// @Tags Admin: Listings & Units
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Listing UUID"
// @Param input body map[string]interface{} true "url and optional sort_order"
// @Success 201 {object} handler.Response
// @Router /admin/listings/{id}/images [post]
func (h *Handler) CreateImage(kind string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		listingID, ok := pathID(w, r, "listings", "id")
		if !ok {
			return
		}
		parentID := listingID
		if kind == "unit_images" {
			parentID, ok = pathID(w, r, "listing_units", "unit_id")
			if !ok {
				return
			}
			if !h.unitBelongs(w, r, listingID, parentID) {
				return
			}
		} else if _, err := h.service.Get(r.Context(), "listings", listingID); err != nil {
			handlers.HandleError(w, h.logger, "get listing", err)
			return
		}
		fields, ok := decodeMap(w, r)
		if !ok {
			return
		}
		parentKey := "listing_id"
		if kind == "unit_images" {
			parentKey = "unit_id"
		}
		if _, provided := fields[parentKey]; provided {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Parent ID belongs in the URL")
			return
		}
		fields[parentKey] = json.RawMessage(strconv.Quote(parentID))
		item, err := h.service.Create(r.Context(), kind, fields)
		if err != nil {
			handlers.HandleError(w, h.logger, "create image", err)
			return
		}
		handlers.Success(w, http.StatusCreated, item)
	}
}

func (h *Handler) unitBelongs(w http.ResponseWriter, r *http.Request, listingID, unitID string) bool {
	unit, err := h.service.Get(r.Context(), "listing_units", unitID)
	if err != nil {
		handlers.HandleError(w, h.logger, "get unit", err)
		return false
	}
	var row unitListingRef
	if err := json.Unmarshal(unit, &row); err != nil {
		handlers.HandleError(w, h.logger, "decode unit", err)
		return false
	}
	if row.ListingID != listingID {
		handlers.Error(w, http.StatusNotFound, "NOT_FOUND", "Unit not found")
		return false
	}
	return true
}

// Unit godoc
// @Summary Get one accommodation unit (staff)
// @Tags Admin: Listings & Units
// @Produce json
// @Security BearerAuth
// @Param id path string true "Listing UUID"
// @Param unit_id path string true "Unit UUID"
// @Success 200 {object} handler.Response
// @Router /admin/listings/{id}/units/{unit_id} [get]
func (h *Handler) Unit(w http.ResponseWriter, r *http.Request) {
	listingID, ok := pathID(w, r, "listings", "id")
	if !ok {
		return
	}
	unitID, ok := pathID(w, r, "listing_units", "unit_id")
	if !ok || !h.unitBelongs(w, r, listingID, unitID) {
		return
	}
	item, err := h.service.Get(r.Context(), "listing_units", unitID)
	if err != nil {
		handlers.HandleError(w, h.logger, "get unit", err)
		return
	}
	handlers.Success(w, http.StatusOK, item)
}

// Image godoc
// @Summary Update or delete a listing or unit image (staff)
// @Tags Admin: Listings & Units
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Listing UUID"
// @Param image_id path string true "Image UUID"
// @Param input body map[string]interface{} false "url and/or sort_order for PATCH"
// @Success 200 {object} handler.Response
// @Success 204 "Image deleted"
// @Router /admin/listings/{id}/images/{image_id} [patch]
// @Router /admin/listings/{id}/images/{image_id} [delete]
func (h *Handler) Image(kind string, update bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		listingID, ok := pathID(w, r, "listings", "id")
		if !ok {
			return
		}
		parentID := listingID
		if kind == "unit_images" {
			parentID, ok = pathID(w, r, "listing_units", "unit_id")
			if !ok || !h.unitBelongs(w, r, listingID, parentID) {
				return
			}
		}
		imageID, ok := pathID(w, r, kind, "image_id")
		if !ok {
			return
		}
		image, err := h.service.Get(r.Context(), kind, imageID)
		if err != nil {
			handlers.HandleError(w, h.logger, "get image", err)
			return
		}
		var row map[string]json.RawMessage
		if err := json.Unmarshal(image, &row); err != nil {
			handlers.HandleError(w, h.logger, "decode image", err)
			return
		}
		field := "listing_id"
		if kind == "unit_images" {
			field = "unit_id"
		}
		var actual string
		if err := json.Unmarshal(row[field], &actual); err != nil || actual != parentID {
			handlers.Error(w, http.StatusNotFound, "NOT_FOUND", "Image not found")
			return
		}
		if !update {
			if err := h.service.DeleteImage(r.Context(), kind, parentID, imageID); err != nil {
				handlers.HandleError(w, h.logger, "delete image", err)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		fields, ok := decodeMap(w, r)
		if !ok {
			return
		}
		item, err := h.service.Update(r.Context(), kind, imageID, fields)
		if err != nil {
			handlers.HandleError(w, h.logger, "update image", err)
			return
		}
		handlers.Success(w, http.StatusOK, item)
	}
}

// documentUnitImagePatch godoc
// @Summary Update a unit image (staff)
// @Tags Admin: Listings & Units
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Listing UUID"
// @Param unit_id path string true "Unit UUID"
// @Param image_id path string true "Image UUID"
// @Param input body map[string]interface{} true "url and/or sort_order"
// @Success 200 {object} handler.Response
// @Router /admin/listings/{id}/units/{unit_id}/images/{image_id} [patch]
func documentUnitImagePatch() {}

// CreateStaff godoc
// @Summary Create a staff account (admin)
// @Tags Admin: Users & Profiles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param input body map[string]interface{} true "email, password, role"
// @Success 201 {object} handler.Response
// @Router /admin/users [post]
func (h *Handler) CreateStaff(w http.ResponseWriter, r *http.Request) {
	var input CreateStaffRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&input); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid user")
		return
	}
	var extra any
	if dec.Decode(&extra) != io.EOF {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}
	item, err := h.service.CreateStaff(r.Context(), input.Email, input.Password, input.Role)
	if err != nil {
		handlers.HandleError(w, h.logger, "create staff", err)
		return
	}
	handlers.Success(w, http.StatusCreated, item)
}

// UpdateRole godoc
// @Summary Change an account role (admin)
// @Tags Admin: Users & Profiles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User UUID"
// @Param input body map[string]interface{} true "role"
// @Success 200 {object} handler.Response
// @Router /admin/users/{id} [patch]
func (h *Handler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "users", "id")
	if !ok {
		return
	}
	fields, ok := decodeMap(w, r)
	if !ok {
		return
	}
	if len(fields) != 1 {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Only role can be changed")
		return
	}
	var role domain.Role
	if err := json.Unmarshal(fields["role"], &role); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid role")
		return
	}
	actor, _ := middleware.GetUserID(r.Context())
	item, err := h.service.UpdateRole(r.Context(), id, actor, role)
	if err != nil {
		handlers.HandleError(w, h.logger, "update role", err)
		return
	}
	handlers.Success(w, http.StatusOK, item)
}
