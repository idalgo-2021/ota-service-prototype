package domain

import "time"

// DisappointmentCandidate contains the hotelier-provided listing information
// and the corresponding aggregate review evidence used by the AI service.
type DisappointmentCandidate struct {
	ListingID        string                  `json:"listing_id"`
	Title            string                  `json:"title"`
	TitleRU          *string                 `json:"title_ru"`
	Description      *string                 `json:"description"`
	DescriptionRU    *string                 `json:"description_ru"`
	ListingType      AIListingType           `json:"listing_type"`
	Location         AILocation              `json:"location"`
	Features         []FeatureTag            `json:"features"`
	Reviews          AIListingReviewEvidence `json:"reviews"`
	ListingUpdatedAt time.Time               `json:"listing_updated_at"`
}

type AIListingType struct {
	ID     int     `json:"id"`
	Slug   string  `json:"slug"`
	Name   string  `json:"name"`
	NameRU *string `json:"name_ru"`
}

type AILocation struct {
	ID     int     `json:"id"`
	Name   string  `json:"name"`
	NameRU *string `json:"name_ru"`
}

type AIListingReviewEvidence struct {
	Summary              string             `json:"summary"`
	SourceReviewCount    int                `json:"source_review_count"`
	GeneratedAt          time.Time          `json:"generated_at"`
	SyncedAt             time.Time          `json:"synced_at"`
	ModelID              string             `json:"model_id"`
	PromptVersion        string             `json:"prompt_version"`
	AverageOverallRating *float64           `json:"average_overall_rating"`
	AverageRatingDetails map[string]float64 `json:"average_rating_details"`
	OverallRatingCount   int                `json:"overall_rating_count"`
}
