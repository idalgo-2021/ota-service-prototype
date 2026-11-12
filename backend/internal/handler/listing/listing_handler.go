package listing

import (
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
)

type ListingHandler struct {
	service    ListingService
	maxRadiusM float64
	logger     *zap.Logger
}

func NewListingHandler(service ListingService, maxRadiusM float64, logger *zap.Logger) *ListingHandler {
	return &ListingHandler{
		service:    service,
		maxRadiusM: maxRadiusM,
		logger:     logger,
	}
}

// GetListing godoc
// @Summary      Get a listing by ID
// @Description  Get a listing by ID, including inactive listings. Availability and active status do not affect direct links.
// @Tags         Client: Listings
// @Accept       json
// @Produce      json
// @Param        id path string true "Listing ID"
// @Param        lang query string false "Language (default en)" Enums(en,ru)
// @Success      200  {object}  handler.Response{data=ListingResponse}
// @Failure      401  {object}  handler.Response{error=handler.ErrorInfo} "Invalid supplied token"
// @Failure      404  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Router       /listings/{id} [get]
func (h *ListingHandler) GetListing(w http.ResponseWriter, r *http.Request) {
	lang, ok := handlers.RequestLanguage(r)
	if !ok {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
		return
	}
	vars := mux.Vars(r)
	id := vars["id"]
	listing, err := h.service.GetListing(r.Context(), id, nil)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to get listing", err)
		return
	}

	handlers.Success(w, http.StatusOK, toListingResponse(listing, lang))
}

func isStaff(r *http.Request) bool {
	role, ok := middleware.GetUserRole(r.Context())
	return ok && (role == domain.RoleManager || role == domain.RoleAdmin)
}

func toListingResponse(l *domain.Listing, lang string) ListingResponse {
	address := l.Address
	if lang == "ru" && l.AddressRU != nil && strings.TrimSpace(*l.AddressRU) != "" {
		address = l.AddressRU
	}
	imgs := make([]ListingImageResponse, 0, len(l.Images))
	for _, item := range l.Images {
		imgs = append(imgs, ListingImageResponse{
			ID:        item.ID,
			URL:       item.URL,
			SortOrder: item.SortOrder,
			CreatedAt: item.CreatedAt,
		})
	}

	return ListingResponse{
		ID:                   l.ID,
		Title:                handlers.LocalizedString(l.Title, l.TitleRU, lang),
		Description:          handlers.LocalizedOptional(l.Description, l.DescriptionRU, lang),
		ReviewSummary:        l.ReviewSummary,
		Features:             l.Features,
		MainPicture:          l.MainPicture,
		ListingTypeID:        l.ListingTypeID,
		Address:              address,
		LocationID:           l.LocationID,
		Latitude:             l.Latitude,
		Longitude:            l.Longitude,
		DistanceFromCenterKM: l.DistanceFromCenterKM,
		AverageOverallRating: l.AverageOverallRating,
		AverageRatingDetails: l.AverageRatingDetails,
		OverallRatingCount:   l.OverallRatingCount,
		PublishedReviewCount: l.PublishedReviewCount,
		IsActive:             l.IsActive,
		CheckInTime:          l.CheckInTime,
		DeactivatedAt:        l.DeactivatedAt,
		CreatedAt:            l.CreatedAt,
		UpdatedAt:            l.UpdatedAt,
		Images:               imgs,
		StartingPrice:        l.StartingPrice,
	}
}
