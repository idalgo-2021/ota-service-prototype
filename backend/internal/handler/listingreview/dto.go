package listingreview

import (
	"strings"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

// PatchDraftRequest describes the JSON shape; the handler decodes it into
// domain.ListingReviewPatch to preserve omitted fields versus explicit nulls.
type PatchDraftRequest struct {
	OverallRating     *float64 `json:"overall_rating"`
	PositiveReview    *string  `json:"positive_review"`
	NegativeReview    *string  `json:"negative_review"`
	CleanlinessRating *float64 `json:"cleanliness_rating"`
	StaffRating       *float64 `json:"staff_rating"`
	ComfortRating     *float64 `json:"comfort_rating"`
	LocationRating    *float64 `json:"location_rating"`
	SleepRating       *float64 `json:"sleep_rating"`
	BathroomRating    *float64 `json:"bathroom_rating"`
	WifiRating        *float64 `json:"wifi_rating"`
	TripPurpose       *string  `json:"trip_purpose"`
	PartyType         *string  `json:"party_type"`
	ReviewerAge       *string  `json:"reviewer_age"`
	ReviewerGender    *string  `json:"reviewer_gender"`
	ReviewerCountry   *string  `json:"reviewer_country"`
}

type PublicListingReviewSortRequest struct {
	CreatedAt     *string `json:"created_at,omitempty" enums:"asc,desc"`
	OverallRating *string `json:"overall_rating,omitempty" enums:"asc,desc"`
}

type SearchPublicListingReviewsRequest struct {
	Sort   *PublicListingReviewSortRequest `json:"sort,omitempty"`
	Limit  *int                            `json:"limit,omitempty"`
	Offset *int                            `json:"offset,omitempty"`
}

type PublicListingReviewResponse struct {
	ID                  string     `json:"id"`
	IsImported          bool       `json:"is_imported"`
	ExternalSource      *string    `json:"external_source,omitempty"`
	ReviewerDisplayName string     `json:"reviewer_display_name"`
	OverallRating       *float64   `json:"overall_rating"`
	PositiveReview      *string    `json:"positive_review"`
	NegativeReview      *string    `json:"negative_review"`
	CleanlinessRating   *float64   `json:"cleanliness_rating"`
	StaffRating         *float64   `json:"staff_rating"`
	ComfortRating       *float64   `json:"comfort_rating"`
	LocationRating      *float64   `json:"location_rating"`
	SleepRating         *float64   `json:"sleep_rating"`
	BathroomRating      *float64   `json:"bathroom_rating"`
	WifiRating          *float64   `json:"wifi_rating"`
	TripPurpose         *string    `json:"trip_purpose"`
	PartyType           *string    `json:"party_type"`
	AccommodationType   *string    `json:"accommodation_type"`
	Nights              *int       `json:"nights"`
	ReviewerAge         *string    `json:"reviewer_age"`
	ReviewerGender      *string    `json:"reviewer_gender"`
	ReviewerCountry     *string    `json:"reviewer_country"`
	CreatedAt           time.Time  `json:"created_at"`
	OriginalAt          *time.Time `json:"original_at,omitempty"`
}

func publicListingReviews(items []domain.ListingReview) []PublicListingReviewResponse {
	out := make([]PublicListingReviewResponse, 0, len(items))
	for _, v := range items {
		name := "Гость"
		if v.ReviewerDisplayName != nil && strings.TrimSpace(*v.ReviewerDisplayName) != "" {
			name = *v.ReviewerDisplayName
		}
		out = append(out, PublicListingReviewResponse{
			ID: v.ID, IsImported: v.IsImported, ExternalSource: v.ExternalSource,
			ReviewerDisplayName: name, OverallRating: v.OverallRating,
			PositiveReview: v.PositiveReview,
			NegativeReview: v.NegativeReview, CleanlinessRating: v.CleanlinessRating,
			StaffRating: v.StaffRating, ComfortRating: v.ComfortRating,
			LocationRating: v.LocationRating, SleepRating: v.SleepRating,
			BathroomRating: v.BathroomRating, WifiRating: v.WifiRating,
			TripPurpose: v.TripPurpose, PartyType: v.PartyType,
			AccommodationType: v.AccommodationType, Nights: v.Nights,
			ReviewerAge: v.ReviewerAge, ReviewerGender: v.ReviewerGender,
			ReviewerCountry: v.ReviewerCountry, CreatedAt: v.CreatedAt,
			OriginalAt: v.OriginalAt,
		})
	}
	return out
}
