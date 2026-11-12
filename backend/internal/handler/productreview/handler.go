package productreview

import (
	"encoding/json"
	"io"
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

type ProductReviewHandler struct {
	service      ProductReviewService
	defaultLimit int
	maxLimit     int
	logger       *zap.Logger
}

func NewProductReviewHandler(service ProductReviewService, defaultLimit, maxLimit int, logger *zap.Logger) *ProductReviewHandler {
	return &ProductReviewHandler{service: service, defaultLimit: defaultLimit, maxLimit: maxLimit, logger: logger}
}

func validUUID(w http.ResponseWriter, value string) bool {
	if _, err := uuid.Parse(value); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid UUID")
		return false
	}
	return true
}

func actor(w http.ResponseWriter, r *http.Request) (string, bool) {
	id, ok := middleware.GetUserID(r.Context())
	if !ok || id == "" {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return "", false
	}
	return id, true
}

func decodeBody(w http.ResponseWriter, r *http.Request, dst any) error {
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

// SearchProduct godoc
// @Summary Search published product reviews
// @Tags Client: Products
// @Accept json
// @Produce json
// @Param product_id path string true "Product UUID"
// @Param request body SearchPublicProductReviewsRequest false "Optional sorting and pagination"
// @Success 200 {object} handler.Response{data=[]PublicProductReviewResponse,meta=handler.Meta}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Router /products/{product_id}/reviews/search [post]
func (h *ProductReviewHandler) SearchProduct(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["product_id"]
	if !validUUID(w, id) {
		return
	}
	var request SearchPublicProductReviewsRequest
	if err := decodeBody(w, r, &request); err != nil && err != io.EOF {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid search request JSON")
		return
	}
	f := domain.ProductReviewFilter{Public: true, ProductID: id}
	if request.Sort != nil {
		for _, item := range []struct {
			value  *string
			target *string
		}{{request.Sort.CreatedAt, &f.Sort.CreatedAt}, {request.Sort.Rating, &f.Sort.Rating}} {
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
	if f.Sort.CreatedAt == "" && f.Sort.Rating == "" {
		f.Sort.CreatedAt = "desc"
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
	items, total, err := h.service.List(r.Context(), f, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "search public product reviews", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, toPublicProductReviewResponses(items), &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

func (h *ProductReviewHandler) listMine(w http.ResponseWriter, r *http.Request) {
	uid, ok := actor(w, r)
	if !ok {
		return
	}
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	f := domain.ProductReviewFilter{AuthorID: uid, Status: domain.ProductReviewStatus(r.URL.Query().Get("status"))}
	if f.Status != "" && !f.Status.Valid() {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid review status")
		return
	}
	items, total, err := h.service.List(r.Context(), f, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list user reviews", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, toProductReviewResponses(items), &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

func (h *ProductReviewHandler) listAdmin(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := domain.ProductReviewFilter{Status: domain.ProductReviewStatus(q.Get("status")),
		ProductID: q.Get("product_id"), ProductType: q.Get("product_type")}
	if f.ProductType != "" && f.ProductType != "tour" && f.ProductType != "service" && f.ProductType != "goods" {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid product type")
		return
	}
	if f.Status != "" && !f.Status.Valid() {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid review status")
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
	if f.ProductID != "" && !validUUID(w, f.ProductID) {
		return
	}
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	items, total, err := h.service.List(r.Context(), f, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list admin reviews", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, toProductReviewResponses(items), &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

func (h *ProductReviewHandler) get(w http.ResponseWriter, r *http.Request, staff bool) {
	id := mux.Vars(r)["id"]
	if !validUUID(w, id) {
		return
	}
	uid := ""
	if !staff {
		var ok bool
		uid, ok = actor(w, r)
		if !ok {
			return
		}
	}
	v, err := h.service.Get(r.Context(), id, uid, staff)
	if err != nil {
		handlers.HandleError(w, h.logger, "get review", err)
		return
	}
	handlers.Success(w, http.StatusOK, productReviewResponse(v))
}

func (h *ProductReviewHandler) patchDraft(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if !validUUID(w, id) {
		return
	}
	uid, ok := actor(w, r)
	if !ok {
		return
	}
	var req PatchDraftRequest
	if err := decodeBody(w, r, &req); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}
	v, err := h.service.PatchDraft(r.Context(), id, uid, req.Rating, req.ReviewText)
	if err != nil {
		handlers.HandleError(w, h.logger, "edit review draft", err)
		return
	}
	handlers.Success(w, http.StatusOK, productReviewResponse(v))
}

func (h *ProductReviewHandler) submit(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if !validUUID(w, id) {
		return
	}
	uid, ok := actor(w, r)
	if !ok {
		return
	}
	if err := handlers.RequireEmptyActionBody(r); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}
	v, err := h.service.Submit(r.Context(), id, uid)
	if err != nil {
		handlers.HandleError(w, h.logger, "submit review", err)
		return
	}
	handlers.Success(w, http.StatusOK, productReviewResponse(v))
}

func (h *ProductReviewHandler) moderate(w http.ResponseWriter, r *http.Request, action string) {
	id := mux.Vars(r)["id"]
	if !validUUID(w, id) {
		return
	}
	uid, ok := actor(w, r)
	if !ok {
		return
	}
	reason := ""
	switch action {
	case "approve":
		if err := handlers.RequireEmptyActionBody(r); err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
			return
		}
	case "reject":
		var req ModerationReasonRequest
		if err := decodeBody(w, r, &req); err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
			return
		}
		reason = strings.TrimSpace(req.Reason)
		if reason == "" {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
			return
		}
	case "hide":
		var req ModerationReasonRequest
		if err := decodeBody(w, r, &req); err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
			return
		}
		reason = strings.TrimSpace(req.Reason)
		if reason == "" {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
			return
		}
	case "unhide":
		if err := handlers.RequireEmptyActionBody(r); err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
			return
		}
	default:
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid moderation action")
		return
	}
	v, err := h.service.Moderate(r.Context(), id, uid, action, reason)
	if err != nil {
		handlers.HandleError(w, h.logger, "moderate review", err)
		return
	}
	handlers.Success(w, http.StatusOK, productReviewResponse(v))
}

// ListMineProduct godoc
// @Summary List current user's product reviews
// @Tags Client: Reviews
// @Produce json
// @Param status query string false "Review status" Enums(draft,pending_moderation,approved,rejected)
// @Param limit query int false "Maximum results"
// @Param offset query int false "Number of results to skip"
// @Success 200 {object} handler.Response{data=[]ProductReviewResponse,meta=handler.Meta}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /product-reviews [get]
func (h *ProductReviewHandler) ListMineProduct(w http.ResponseWriter, r *http.Request) {
	h.listMine(w, r)
}

// ListAdminProduct godoc
// @Summary List product reviews (staff)
// @Tags Admin: Reviews
// @Produce json
// @Param status query string false "Review status" Enums(draft,pending_moderation,approved,rejected)
// @Param is_imported query bool false "Imported review"
// @Param product_id query string false "Subject UUID"
// @Param limit query int false "Maximum results"
// @Param offset query int false "Number of results to skip"
// @Success 200 {object} handler.Response{data=[]ProductReviewResponse,meta=handler.Meta}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /admin/product-reviews [get]
func (h *ProductReviewHandler) ListAdminProduct(w http.ResponseWriter, r *http.Request) {
	h.listAdmin(w, r)
}

// GetMineProduct godoc
// @Summary Get current user's product review
// @Tags Client: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=ProductReviewResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /product-reviews/{id} [get]
func (h *ProductReviewHandler) GetMineProduct(w http.ResponseWriter, r *http.Request) {
	h.get(w, r, false)
}

// GetAdminProduct godoc
// @Summary Get product review (staff)
// @Tags Admin: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=ProductReviewResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /admin/product-reviews/{id} [get]
func (h *ProductReviewHandler) GetAdminProduct(w http.ResponseWriter, r *http.Request) {
	h.get(w, r, true)
}

// PatchDraftProduct godoc
// @Summary Edit own product review draft
// @Tags Client: Reviews
// @Accept json
// @Produce json
// @Param id path string true "Review UUID"
// @Param body body PatchDraftRequest true "Request body"
// @Success 200 {object} handler.Response{data=ProductReviewResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /product-reviews/{id} [patch]
func (h *ProductReviewHandler) PatchDraftProduct(w http.ResponseWriter, r *http.Request) {
	h.patchDraft(w, r)
}

// SubmitProduct godoc
// @Summary Submit own product review
// @Tags Client: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=ProductReviewResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /product-reviews/{id}/submit [patch]
func (h *ProductReviewHandler) SubmitProduct(w http.ResponseWriter, r *http.Request) {
	h.submit(w, r)
}

// ApproveProduct godoc
// @Summary Approve product review
// @Tags Admin: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=ProductReviewResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /admin/product-reviews/{id}/approve [patch]
func (h *ProductReviewHandler) ApproveProduct(w http.ResponseWriter, r *http.Request) {
	h.moderate(w, r, "approve")
}

// RejectProduct godoc
// @Summary Reject product review
// @Tags Admin: Reviews
// @Accept json
// @Produce json
// @Param id path string true "Review UUID"
// @Param body body ModerationReasonRequest true "Rejection reason is required"
// @Success 200 {object} handler.Response{data=ProductReviewResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /admin/product-reviews/{id}/reject [patch]
func (h *ProductReviewHandler) RejectProduct(w http.ResponseWriter, r *http.Request) {
	h.moderate(w, r, "reject")
}

// HideProduct godoc
// @Summary Hide product review
// @Tags Admin: Reviews
// @Accept json
// @Produce json
// @Param id path string true "Review UUID"
// @Param body body ModerationReasonRequest true "Hiding reason is required"
// @Success 200 {object} handler.Response{data=ProductReviewResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /admin/product-reviews/{id}/hide [patch]
func (h *ProductReviewHandler) HideProduct(w http.ResponseWriter, r *http.Request) {
	h.moderate(w, r, "hide")
}

// UnhideProduct godoc
// @Summary Unhide product review
// @Tags Admin: Reviews
// @Produce json
// @Param id path string true "Review UUID"
// @Success 200 {object} handler.Response{data=ProductReviewResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /admin/product-reviews/{id}/unhide [patch]
func (h *ProductReviewHandler) UnhideProduct(w http.ResponseWriter, r *http.Request) {
	h.moderate(w, r, "unhide")
}
