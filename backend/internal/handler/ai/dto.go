package ai

import "time"

type ListingReviewResponse struct {
	ID                string    `json:"id"`
	ListingID         string    `json:"listing_id"`
	OverallRating     *float64  `json:"overall_rating"`
	PositiveReview    *string   `json:"positive_review"`
	NegativeReview    *string   `json:"negative_review"`
	CleanlinessRating *float64  `json:"cleanliness_rating"`
	StaffRating       *float64  `json:"staff_rating"`
	ComfortRating     *float64  `json:"comfort_rating"`
	LocationRating    *float64  `json:"location_rating"`
	SleepRating       *float64  `json:"sleep_rating"`
	BathroomRating    *float64  `json:"bathroom_rating"`
	WifiRating        *float64  `json:"wifi_rating"`
	TripPurpose       *string   `json:"trip_purpose"`
	PartyType         *string   `json:"party_type"`
	AccommodationType *string   `json:"accommodation_type"`
	Nights            *int      `json:"nights"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type ProductReviewResponse struct {
	ID         string    `json:"id"`
	ProductID  string    `json:"product_id"`
	Rating     *int      `json:"rating"`
	ReviewText *string   `json:"review_text"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
