package listing

import (
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/shopspring/decimal"
)

type ListingImageResponse struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

type ListingResponse struct {
	ID                   string                 `json:"id"`
	Title                string                 `json:"title"`
	Description          *string                `json:"description"`
	ReviewSummary        *string                `json:"review_summary,omitempty"`
	Features             []domain.FeatureTag    `json:"features"`
	MainPicture          *string                `json:"main_picture"`
	ListingTypeID        int                    `json:"listing_type_id"`
	Address              *string                `json:"address"`
	LocationID           int                    `json:"location_id"`
	Latitude             *float64               `json:"latitude"`
	Longitude            *float64               `json:"longitude"`
	DistanceFromCenterKM *float64               `json:"distance_from_center_km"`
	AverageOverallRating *float64               `json:"average_overall_rating"`
	AverageRatingDetails map[string]float64     `json:"average_rating_details"`
	OverallRatingCount   int                    `json:"overall_rating_count"`
	PublishedReviewCount int                    `json:"published_review_count"`
	IsActive             bool                   `json:"is_active"`
	CheckInTime          string                 `json:"check_in_time"`
	DeactivatedAt        *time.Time             `json:"deactivated_at"`
	CreatedAt            time.Time              `json:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at"`
	Images               []ListingImageResponse `json:"images,omitempty"`
	StartingPrice        *domain.StartingPrice  `json:"starting_price"`
}

type LowestPriceOptionResponse struct {
	Type               string               `json:"type"`
	TotalPricePerNight decimal.Decimal      `json:"total_price_per_night"`
	Currency           string               `json:"currency"`
	Units              []domain.ListingUnit `json:"units"`
}

type SearchListingResponse struct {
	Listing            ListingResponse              `json:"listing"`
	LowestPriceOptions *[]LowestPriceOptionResponse `json:"lowest_price_options"`
}
