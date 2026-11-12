package domain

import (
	"encoding/json"
	"time"
)

type ListingReviewStatus string

const (
	ListingReviewDraft    ListingReviewStatus = "draft"
	ListingReviewPending  ListingReviewStatus = "pending_moderation"
	ListingReviewApproved ListingReviewStatus = "approved"
	ListingReviewRejected ListingReviewStatus = "rejected"
)

func (s ListingReviewStatus) Valid() bool {
	return s == ListingReviewDraft || s == ListingReviewPending || s == ListingReviewApproved || s == ListingReviewRejected
}

type ListingReview struct {
	ID                  string              `json:"id"`
	IsImported          bool                `json:"is_imported"`
	ReviewerUserID      *string             `json:"reviewer_user_id,omitempty"`
	ExternalSource      *string             `json:"external_source,omitempty"`
	ExternalReviewID    *string             `json:"external_review_id,omitempty"`
	ExternalReviewerID  *string             `json:"external_reviewer_id,omitempty"`
	ReviewerDisplayName *string             `json:"reviewer_display_name,omitempty"`
	ClientName          string              `json:"client_name,omitempty"`
	ListingID           string              `json:"listing_id"`
	ListingTitle        string              `json:"listing_title,omitempty"`
	ListingTitleRU      *string             `json:"listing_title_ru,omitempty"`
	ListingThumbnailURL *string             `json:"listing_thumbnail_url"`
	CityName            string              `json:"city_name,omitempty"`
	CityNameRU          *string             `json:"city_name_ru,omitempty"`
	CountryName         string              `json:"country_name,omitempty"`
	CountryNameRU       *string             `json:"country_name_ru,omitempty"`
	BookingID           *string             `json:"booking_id,omitempty"`
	StayCheckInDate     *time.Time          `json:"stay_check_in_date,omitempty"`
	StayCheckOutDate    *time.Time          `json:"stay_check_out_date,omitempty"`
	StayAdultsCount     *int                `json:"stay_adults_count,omitempty"`
	StayChildrenCount   *int                `json:"stay_children_count,omitempty"`
	StayHasPets         *bool               `json:"stay_has_pets,omitempty"`
	OverallRating       *float64            `json:"overall_rating"`
	PositiveReview      *string             `json:"positive_review"`
	NegativeReview      *string             `json:"negative_review"`
	CleanlinessRating   *float64            `json:"cleanliness_rating"`
	StaffRating         *float64            `json:"staff_rating"`
	ComfortRating       *float64            `json:"comfort_rating"`
	LocationRating      *float64            `json:"location_rating"`
	SleepRating         *float64            `json:"sleep_rating"`
	BathroomRating      *float64            `json:"bathroom_rating"`
	WifiRating          *float64            `json:"wifi_rating"`
	TripPurpose         *string             `json:"trip_purpose"`
	PartyType           *string             `json:"party_type"`
	AccommodationType   *string             `json:"accommodation_type"`
	Nights              *int                `json:"nights"`
	ReviewerAge         *string             `json:"reviewer_age"`
	ReviewerGender      *string             `json:"reviewer_gender"`
	ReviewerCountry     *string             `json:"reviewer_country"`
	Status              ListingReviewStatus `json:"status"`
	IsHidden            bool                `json:"is_hidden"`
	CreatedAt           time.Time           `json:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at"`
	SubmittedAt         *time.Time          `json:"submitted_at,omitempty"`
	OriginalAt          *time.Time          `json:"original_at,omitempty"`
	ModeratedAt         *time.Time          `json:"moderated_at,omitempty"`
	ModeratedBy         *string             `json:"moderated_by,omitempty"`
	RejectionReason     *string             `json:"rejection_reason,omitempty"`
	HiddenAt            *time.Time          `json:"hidden_at,omitempty"`
	HiddenBy            *string             `json:"hidden_by,omitempty"`
	HiddenReason        *string             `json:"hidden_reason,omitempty"`
}

type ListingReviewFilter struct {
	ReviewerUserID string
	Status         ListingReviewStatus
	CreatedFrom    *time.Time
	CreatedTo      *time.Time
	IsImported     *bool
	ListingID      string
	ListingIDs     []string
	HotelierOnly   bool
	HotelierID     string
	ListingSearch  string
	RatingField    string
	MinRating      *float64
	MaxRating      *float64
	Public         bool
	Sort           ListingReviewSort
	HotelierSort   Sort
}

// ListingReviewSort contains independent optional directions for public review sorting.
// When both fields are set, CreatedAt is the primary sort key.
type ListingReviewSort struct {
	CreatedAt     string
	OverallRating string
}

// ListingReviewField distinguishes an omitted PATCH field from an explicit null.
type ListingReviewField[T any] struct {
	Set   bool
	Value *T
}

func (f *ListingReviewField[T]) UnmarshalJSON(data []byte) error {
	f.Set = true
	if string(data) == "null" {
		f.Value = nil
		return nil
	}
	var value T
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	f.Value = &value
	return nil
}

type ListingReviewPatch struct {
	OverallRating     ListingReviewField[float64] `json:"overall_rating"`
	PositiveReview    ListingReviewField[string]  `json:"positive_review"`
	NegativeReview    ListingReviewField[string]  `json:"negative_review"`
	CleanlinessRating ListingReviewField[float64] `json:"cleanliness_rating"`
	StaffRating       ListingReviewField[float64] `json:"staff_rating"`
	ComfortRating     ListingReviewField[float64] `json:"comfort_rating"`
	LocationRating    ListingReviewField[float64] `json:"location_rating"`
	SleepRating       ListingReviewField[float64] `json:"sleep_rating"`
	BathroomRating    ListingReviewField[float64] `json:"bathroom_rating"`
	WifiRating        ListingReviewField[float64] `json:"wifi_rating"`
	TripPurpose       ListingReviewField[string]  `json:"trip_purpose"`
	PartyType         ListingReviewField[string]  `json:"party_type"`
	ReviewerAge       ListingReviewField[string]  `json:"reviewer_age"`
	ReviewerGender    ListingReviewField[string]  `json:"reviewer_gender"`
	ReviewerCountry   ListingReviewField[string]  `json:"reviewer_country"`
}
