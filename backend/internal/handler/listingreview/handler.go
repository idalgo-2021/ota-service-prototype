package listingreview

import (
	"encoding/json"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
)

type Handler struct {
	service      Service
	defaultLimit int
	maxLimit     int
	logger       *zap.Logger
}

func NewHandler(service Service, defaultLimit, maxLimit int, logger *zap.Logger) *Handler {
	return &Handler{service: service, defaultLimit: defaultLimit, maxLimit: maxLimit, logger: logger}
}

func validID(w http.ResponseWriter, value string) bool {
	if _, err := uuid.Parse(value); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid UUID")
		return false
	}
	return true
}

func currentUser(w http.ResponseWriter, r *http.Request) (string, bool) {
	id, ok := middleware.GetUserID(r.Context())
	if !ok || id == "" {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return "", false
	}
	return id, true
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10))
	d.DisallowUnknownFields()
	if err := d.Decode(dst); err != nil {
		return err
	}
	if err := d.Decode(&struct{}{}); err != io.EOF {
		return io.ErrUnexpectedEOF
	}
	return nil
}

// SearchPublic godoc
// @Summary Search published listing reviews
// @Tags Client: Listings
// @Accept json
// @Produce json
// @Param id path string true "Listing UUID"
// @Param request body SearchPublicListingReviewsRequest false "Optional sorting and pagination"
// @Success 200 {object} handler.Response{data=[]PublicListingReviewResponse,meta=handler.Meta}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Router /listings/{id}/reviews/search [post]
func (h *Handler) SearchPublic(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if !validID(w, id) {
		return
	}
	var request SearchPublicListingReviewsRequest
	if err := decodeJSON(w, r, &request); err != nil && err != io.EOF {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid search request JSON")
		return
	}
	filter := domain.ListingReviewFilter{Public: true, ListingID: id}
	if request.Sort != nil {
		for _, item := range []struct {
			value  *string
			target *string
		}{{request.Sort.CreatedAt, &filter.Sort.CreatedAt}, {request.Sort.OverallRating, &filter.Sort.OverallRating}} {
			if item.value == nil {
				continue
			}
			if *item.value != "asc" && *item.value != "desc" {
				handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "sort direction must be asc or desc")
				return
			}
			*item.target = *item.value
		}
	}
	if filter.Sort.CreatedAt == "" && filter.Sort.OverallRating == "" {
		filter.Sort.CreatedAt = "desc"
	}
	limit, offset := h.defaultLimit, 0
	if request.Limit != nil {
		if *request.Limit < 1 {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "limit must be positive")
			return
		}
		limit = min(*request.Limit, h.maxLimit)
	}
	if request.Offset != nil {
		if *request.Offset < 0 {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "offset must not be negative")
			return
		}
		offset = *request.Offset
	}
	items, total, err := h.service.List(r.Context(), filter, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list public listing reviews", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, publicListingReviews(items), &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

// ListMine godoc
// @Summary List current user's listing reviews
// @Tags Client: Reviews
// @Produce json
// @Param status query string false "Review status" Enums(draft,pending_moderation,approved,rejected)
// @Param limit query int false "Maximum results"
// @Param offset query int false "Number of results to skip"
// @Success 200 {object} handler.Response{data=[]domain.ListingReview,meta=handler.Meta}
// @Security BearerAuth
// @Router /listing-reviews [get]
func (h *Handler) ListMine(w http.ResponseWriter, r *http.Request) {
	uid, ok := currentUser(w, r)
	if !ok {
		return
	}
	f := domain.ListingReviewFilter{ReviewerUserID: uid, Status: domain.ListingReviewStatus(r.URL.Query().Get("status"))}
	if f.Status != "" && !f.Status.Valid() {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid review status")
		return
	}
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	items, total, err := h.service.List(r.Context(), f, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list own listing reviews", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, items, &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

// ListAdmin godoc
// @Summary List listing reviews (staff)
// @Tags Admin: Reviews
// @Produce json
// @Param status query string false "Review status" Enums(draft,pending_moderation,approved,rejected)
// @Param is_imported query bool false "Imported review"
// @Param listing_id query string false "Listing UUID"
// @Param limit query int false "Maximum results"
// @Param offset query int false "Number of results to skip"
// @Success 200 {object} handler.Response{data=[]domain.ListingReview,meta=handler.Meta}
// @Security BearerAuth
// @Router /admin/listing-reviews [get]
func (h *Handler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := domain.ListingReviewFilter{Status: domain.ListingReviewStatus(q.Get("status")), ListingID: q.Get("listing_id"), ListingSearch: strings.TrimSpace(q.Get("listing_search"))}
	if f.ListingID != "" && !validID(w, f.ListingID) {
		return
	}
	if len(f.ListingSearch) > 200 {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid listing search")
		return
	}
	f.RatingField = q.Get("rating_field")
	if f.RatingField == "" {
		f.RatingField = "overall_rating"
	}
	switch f.RatingField {
	case "overall_rating", "cleanliness_rating", "staff_rating", "comfort_rating", "location_rating", "sleep_rating", "bathroom_rating", "wifi_rating":
	default:
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid rating field")
		return
	}
	for _, bound := range []struct {
		name   string
		target **float64
	}{{"min_rating", &f.MinRating}, {"max_rating", &f.MaxRating}} {
		if q.Has(bound.name) {
			value, err := strconv.ParseFloat(q.Get(bound.name), 64)
			if err != nil || math.IsNaN(value) || math.IsInf(value, 0) || value < 1 || value > 10 {
				handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid rating range")
				return
			}
			*bound.target = &value
		}
	}
	if f.MinRating != nil && f.MaxRating != nil && *f.MinRating > *f.MaxRating {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid rating range")
		return
	}
	if f.Status != "" && !f.Status.Valid() {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid review filter")
		return
	}
	if q.Has("is_imported") {
		isImported, err := strconv.ParseBool(q.Get("is_imported"))
		if err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid is_imported filter")
			return
		}
		f.IsImported = &isImported
	}
	if f.ListingID != "" && !validID(w, f.ListingID) {
		return
	}
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	items, total, err := h.service.List(r.Context(), f, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list admin listing reviews", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, items, &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request, staff bool) {
	id := mux.Vars(r)["id"]
	if !validID(w, id) {
		return
	}
	uid := ""
	if !staff {
		var ok bool
		uid, ok = currentUser(w, r)
		if !ok {
			return
		}
	}
	v, err := h.service.Get(r.Context(), id, uid, staff)
	if err != nil {
		handlers.HandleError(w, h.logger, "get listing review", err)
		return
	}
	handlers.Success(w, http.StatusOK, v)
}

// GetMine godoc
// @Summary Get current user's listing review
// @Tags Client: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=domain.ListingReview}
// @Security BearerAuth
// @Router /listing-reviews/{id} [get]
func (h *Handler) GetMine(w http.ResponseWriter, r *http.Request) { h.get(w, r, false) }

// GetAdmin godoc
// @Summary Get listing review (staff)
// @Tags Admin: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=domain.ListingReview}
// @Security BearerAuth
// @Router /admin/listing-reviews/{id} [get]
func (h *Handler) GetAdmin(w http.ResponseWriter, r *http.Request) { h.get(w, r, true) }

// PatchDraft godoc
// @Summary Edit own listing review draft
// @Tags Client: Reviews
// @Accept json
// @Produce json
// @Param id path string true "Review UUID"
// @Param body body PatchDraftRequest true "Omitted fields stay unchanged; null clears a field"
// @Success 200 {object} handler.Response{data=domain.ListingReview}
// @Security BearerAuth
// @Router /listing-reviews/{id} [patch]
func (h *Handler) PatchDraft(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if !validID(w, id) {
		return
	}
	uid, ok := currentUser(w, r)
	if !ok {
		return
	}
	var patch domain.ListingReviewPatch
	if err := decodeJSON(w, r, &patch); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}
	v, err := h.service.PatchDraft(r.Context(), id, uid, patch)
	if err != nil {
		handlers.HandleError(w, h.logger, "edit listing review", err)
		return
	}
	handlers.Success(w, http.StatusOK, v)
}

// Submit godoc
// @Summary Submit own listing review
// @Tags Client: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=domain.ListingReview}
// @Security BearerAuth
// @Router /listing-reviews/{id}/submit [patch]
func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if !validID(w, id) {
		return
	}
	uid, ok := currentUser(w, r)
	if !ok {
		return
	}
	if err := handlers.RequireEmptyActionBody(r); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}
	v, err := h.service.Submit(r.Context(), id, uid)
	if err != nil {
		handlers.HandleError(w, h.logger, "submit listing review", err)
		return
	}
	handlers.Success(w, http.StatusOK, v)
}

type moderationReasonRequest struct {
	Reason string `json:"reason"`
}

func (h *Handler) moderate(w http.ResponseWriter, r *http.Request, action string) {
	id := mux.Vars(r)["id"]
	if !validID(w, id) {
		return
	}
	uid, ok := currentUser(w, r)
	if !ok {
		return
	}
	reason := ""
	if action == "reject" || action == "hide" {
		var req moderationReasonRequest
		if err := decodeJSON(w, r, &req); err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
			return
		}
		reason = strings.TrimSpace(req.Reason)
		if reason == "" {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
			return
		}
	} else if err := handlers.RequireEmptyActionBody(r); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}
	v, err := h.service.Moderate(r.Context(), id, uid, action, reason)
	if err != nil {
		handlers.HandleError(w, h.logger, "moderate listing review", err)
		return
	}
	handlers.Success(w, http.StatusOK, v)
}

// Approve godoc
// @Summary Approve listing review
// @Tags Admin: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=domain.ListingReview}
// @Security BearerAuth
// @Router /admin/listing-reviews/{id}/approve [patch]
func (h *Handler) Approve(w http.ResponseWriter, r *http.Request) { h.moderate(w, r, "approve") }

// Reject godoc
// @Summary Reject listing review
// @Tags Admin: Reviews
// @Accept json
// @Produce json
// @Param id path string true "Review UUID"
// @Param body body moderationReasonRequest true "Rejection reason"
// @Success 200 {object} handler.Response{data=domain.ListingReview}
// @Security BearerAuth
// @Router /admin/listing-reviews/{id}/reject [patch]
func (h *Handler) Reject(w http.ResponseWriter, r *http.Request) { h.moderate(w, r, "reject") }

// Hide godoc
// @Summary Hide listing review
// @Tags Admin: Reviews
// @Accept json
// @Produce json
// @Param id path string true "Review UUID"
// @Param body body moderationReasonRequest true "Hiding reason"
// @Success 200 {object} handler.Response{data=domain.ListingReview}
// @Security BearerAuth
// @Router /admin/listing-reviews/{id}/hide [patch]
func (h *Handler) Hide(w http.ResponseWriter, r *http.Request) { h.moderate(w, r, "hide") }

// Unhide godoc
// @Summary Unhide listing review
// @Tags Admin: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=domain.ListingReview}
// @Security BearerAuth
// @Router /admin/listing-reviews/{id}/unhide [patch]
func (h *Handler) Unhide(w http.ResponseWriter, r *http.Request) { h.moderate(w, r, "unhide") }
