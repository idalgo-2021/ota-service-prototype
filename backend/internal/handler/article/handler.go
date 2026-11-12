package article

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

type Handler struct {
	service                Service
	defaultLimit, maxLimit int
	logger                 *zap.Logger
}

func NewHandler(s Service, defaultLimit, maxLimit int, logger *zap.Logger) *Handler {
	return &Handler{service: s, defaultLimit: defaultLimit, maxLimit: maxLimit, logger: logger}
}

func decode(w http.ResponseWriter, r *http.Request, dst any) error {
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20))
	d.DisallowUnknownFields()
	if err := d.Decode(dst); err != nil {
		return err
	}
	if err := d.Decode(&struct{}{}); err != io.EOF {
		return io.ErrUnexpectedEOF
	}
	return nil
}
func validUUID(w http.ResponseWriter, id string) bool {
	if _, err := uuid.Parse(id); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid UUID")
		return false
	}
	return true
}

// ListPublic godoc
// @Summary List published travel articles
// @Tags Client: Articles
// @Produce json
// @Param tag query string false "Filter by text tag"
// @Param limit query int false "Maximum results"
// @Param offset query int false "Number of results to skip"
// @Success 200 {object} handler.Response{data=[]ArticleResponse,meta=handler.Meta}
// @Router /articles [get]
func (h *Handler) ListPublic(w http.ResponseWriter, r *http.Request) {
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	published := true
	f := domain.ArticleFilter{Published: &published, Tag: strings.TrimSpace(r.URL.Query().Get("tag"))}
	if len(f.Tag) > 64 {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "tag is too long")
		return
	}
	items, total, err := h.service.List(r.Context(), f, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list public articles", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, articleResponses(items), &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

// GetPublic godoc
// @Summary Get a published travel article
// @Tags Client: Articles
// @Produce json
// @Param slug path string true "Article slug"
// @Success 200 {object} handler.Response{data=ArticleResponse}
// @Failure 404 {object} handler.Response{error=handler.ErrorInfo}
// @Router /articles/{slug} [get]
func (h *Handler) GetPublic(w http.ResponseWriter, r *http.Request) {
	slug := mux.Vars(r)["slug"]
	a, err := h.service.GetBySlug(r.Context(), slug)
	if err != nil {
		handlers.HandleError(w, h.logger, "get public article", err)
		return
	}
	handlers.Success(w, http.StatusOK, toArticleResponse(a))
}

// ListAdmin godoc
// @Summary List travel articles (staff)
// @Tags Admin: Articles
// @Produce json
// @Param is_published query bool false "Publication status"
// @Param tag query string false "Filter by text tag"
// @Param search query string false "Search title or HTML content"
// @Param limit query int false "Maximum results"
// @Param offset query int false "Number of results to skip"
// @Success 200 {object} handler.Response{data=[]ArticleResponse,meta=handler.Meta}
// @Security BearerAuth
// @Router /admin/articles [get]
func (h *Handler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := domain.ArticleFilter{Search: strings.TrimSpace(q.Get("search")), Tag: strings.TrimSpace(q.Get("tag"))}
	if len(f.Search) > 200 || len(f.Tag) > 64 {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid article filter")
		return
	}
	if q.Has("is_published") {
		v, err := strconv.ParseBool(q.Get("is_published"))
		if err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid is_published filter")
			return
		}
		f.Published = &v
	}
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	items, total, err := h.service.List(r.Context(), f, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list admin articles", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, articleResponses(items), &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

// GetAdmin godoc
// @Summary Get a travel article (staff)
// @Tags Admin: Articles
// @Produce json
// @Param id path string true "Article UUID"
// @Success 200 {object} handler.Response{data=ArticleResponse}
// @Security BearerAuth
// @Router /admin/articles/{id} [get]
func (h *Handler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if !validUUID(w, id) {
		return
	}
	a, err := h.service.Get(r.Context(), id)
	if err != nil {
		handlers.HandleError(w, h.logger, "get admin article", err)
		return
	}
	handlers.Success(w, http.StatusOK, toArticleResponse(a))
}

// Create godoc
// @Summary Create a travel article draft
// @Tags Admin: Articles
// @Accept json
// @Produce json
// @Param article body ArticleCreateRequest true "Article draft"
// @Success 201 {object} handler.Response{data=ArticleResponse}
// @Security BearerAuth
// @Router /admin/articles [post]
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req ArticleCreateRequest
	if err := decode(w, r, &req); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid article JSON")
		return
	}
	if req.LocationID <= 0 {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "location_id is required")
		return
	}
	a := domain.Article{Slug: req.Slug, Title: req.Title, ContentHTML: req.ContentHTML, CoverImageURL: req.CoverImageURL, LocationID: req.LocationID, Tags: req.Tags}
	authorID, ok := middleware.GetUserID(r.Context())
	if !ok || authorID == "" {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	created, err := h.service.Create(r.Context(), authorID, a)
	if err != nil {
		handlers.HandleError(w, h.logger, "create article", err)
		return
	}
	handlers.Success(w, http.StatusCreated, toArticleResponse(created))
}

// Patch godoc
// @Summary Update a travel article
// @Tags Admin: Articles
// @Accept json
// @Produce json
// @Param id path string true "Article UUID"
// @Param article body ArticlePatchRequest true "Fields to update"
// @Success 200 {object} handler.Response{data=ArticleResponse}
// @Security BearerAuth
// @Router /admin/articles/{id} [patch]
func (h *Handler) Patch(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if !validUUID(w, id) {
		return
	}
	var req ArticlePatchRequest
	if err := decode(w, r, &req); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid article JSON")
		return
	}
	if req.LocationID != nil && *req.LocationID <= 0 {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "location_id must be positive")
		return
	}
	a, err := h.service.Patch(r.Context(), id, domain.ArticlePatch{Slug: req.Slug, Title: req.Title, ContentHTML: req.ContentHTML, CoverImageURL: req.CoverImageURL, LocationID: req.LocationID, Tags: req.Tags})
	if err != nil {
		handlers.HandleError(w, h.logger, "update article", err)
		return
	}
	handlers.Success(w, http.StatusOK, toArticleResponse(a))
}

// Publish godoc
// @Summary Publish or unpublish a travel article
// @Tags Admin: Articles
// @Produce json
// @Param id path string true "Article UUID"
// @Success 200 {object} handler.Response{data=ArticleResponse}
// @Security BearerAuth
// @Router /admin/articles/{id}/publish [patch]
// @Router /admin/articles/{id}/unpublish [patch]
func (h *Handler) Publish(published bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		if !validUUID(w, id) {
			return
		}
		a, err := h.service.Publish(r.Context(), id, published)
		if err != nil {
			handlers.HandleError(w, h.logger, "change article publication", err)
			return
		}
		handlers.Success(w, http.StatusOK, toArticleResponse(a))
	}
}
