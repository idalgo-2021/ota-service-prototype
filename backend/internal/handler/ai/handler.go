package ai

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"go.uber.org/zap"
)

type Handler struct {
	listingReviews           ListingReviewService
	productReviews           ProductReviewService
	disappointmentCandidates DisappointmentCandidateService
	maxLimit                 int
	logger                   *zap.Logger
}

func NewHandler(listingReviews ListingReviewService, productReviews ProductReviewService, candidates DisappointmentCandidateService, maxLimit int, logger *zap.Logger) *Handler {
	return &Handler{listingReviews: listingReviews, productReviews: productReviews,
		disappointmentCandidates: candidates, maxLimit: maxLimit, logger: logger}
}

func pagination(w http.ResponseWriter, r *http.Request, max int) (int, int, bool) {
	limit := max
	if raw := r.URL.Query().Get("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "limit must be a positive integer")
			return 0, 0, false
		}
		if value < limit {
			limit = value
		}
	}
	offset := 0
	if raw := r.URL.Query().Get("offset"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "offset must be a non-negative integer")
			return 0, 0, false
		}
		offset = value
	}
	return limit, offset, true
}

// ListListingReviews godoc
// @Summary List published listing reviews for the AI service
// @Description Requires an access token for an account with the ai_robot role. Returns only approved and visible reviews with fields needed for summarization.
// @Tags AI: Internal
// @Produce json
// @Param listing_id query string true "Listing whose published reviews to return"
// @Param limit query int false "Page size; defaults to the configured maximum, and larger values are capped" minimum(1)
// @Param offset query int false "Number of rows to skip" minimum(0)
// @Success 200 {object} handler.Response{data=[]ListingReviewResponse,meta=handler.Meta}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo} "Invalid pagination parameter"
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 403 {object} handler.Response{error=handler.ErrorInfo} "Authenticated account does not have the ai_robot role"
// @Failure 500 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /ai/reviews/listings [get]
func (h *Handler) ListListingReviews(w http.ResponseWriter, r *http.Request) {
	listingID := strings.TrimSpace(r.URL.Query().Get("listing_id"))
	if listingID == "" {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "listing_id is required")
		return
	}
	limit, offset, ok := pagination(w, r, h.maxLimit)
	if !ok {
		return
	}
	items, total, err := h.listingReviews.List(r.Context(), domain.ListingReviewFilter{
		Public:    true,
		ListingID: listingID,
		Sort:      domain.ListingReviewSort{CreatedAt: "desc"},
	}, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list AI listing reviews", err)
		return
	}
	out := make([]ListingReviewResponse, 0, len(items))
	for _, v := range items {
		out = append(out, ListingReviewResponse{ID: v.ID, ListingID: v.ListingID, OverallRating: v.OverallRating,
			PositiveReview: v.PositiveReview, NegativeReview: v.NegativeReview, CleanlinessRating: v.CleanlinessRating,
			StaffRating: v.StaffRating, ComfortRating: v.ComfortRating, LocationRating: v.LocationRating,
			SleepRating: v.SleepRating, BathroomRating: v.BathroomRating, WifiRating: v.WifiRating,
			TripPurpose: v.TripPurpose, PartyType: v.PartyType, AccommodationType: v.AccommodationType,
			Nights: v.Nights, CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt})
	}
	handlers.SuccessWithMeta(w, http.StatusOK, out, &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

// ListProductReviews godoc
// @Summary List published product reviews for the AI service
// @Description Requires an access token for an account with the ai_robot role. Returns only approved and visible reviews with fields needed for summarization.
// @Tags AI: Internal
// @Produce json
// @Param limit query int false "Page size; defaults to the configured maximum, and larger values are capped" minimum(1)
// @Param offset query int false "Number of rows to skip" minimum(0)
// @Success 200 {object} handler.Response{data=[]ProductReviewResponse,meta=handler.Meta}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo} "Invalid pagination parameter"
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 403 {object} handler.Response{error=handler.ErrorInfo} "Authenticated account does not have the ai_robot role"
// @Failure 500 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /ai/reviews/products [get]
func (h *Handler) ListProductReviews(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := pagination(w, r, h.maxLimit)
	if !ok {
		return
	}
	items, total, err := h.productReviews.List(r.Context(), domain.ProductReviewFilter{Public: true}, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list AI product reviews", err)
		return
	}
	out := make([]ProductReviewResponse, 0, len(items))
	for _, v := range items {
		out = append(out, ProductReviewResponse{ID: v.ID, ProductID: v.ProductID, Rating: v.Rating,
			ReviewText: v.ReviewText, CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt})
	}
	handlers.SuccessWithMeta(w, http.StatusOK, out, &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

// ListDisappointmentCandidates godoc
// @Summary List listing data for the AI disappointment detector
// @Description Requires an access token for an account with the ai_robot role. Returns active listings assigned to at least one hotelier and having a non-empty review summary, with all stored rating detail indicators.
// @Tags AI: Internal
// @Produce json
// @Param limit query int false "Page size; defaults to the configured maximum, and larger values are capped" minimum(1)
// @Param offset query int false "Number of rows to skip" minimum(0)
// @Success 200 {object} handler.Response{data=[]domain.DisappointmentCandidate,meta=handler.Meta}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo} "Invalid pagination parameter"
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 403 {object} handler.Response{error=handler.ErrorInfo} "Authenticated account does not have the ai_robot role"
// @Failure 500 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /ai/listings/disappointment-candidates [get]
func (h *Handler) ListDisappointmentCandidates(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := pagination(w, r, h.maxLimit)
	if !ok {
		return
	}
	items, total, err := h.disappointmentCandidates.List(r.Context(), limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list AI disappointment candidates", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, items, &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}
