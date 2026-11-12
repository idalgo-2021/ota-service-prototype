package domain

import "time"

type HotelierMessage struct {
	ID                string     `json:"id"`
	HotelierID        string     `json:"hotelier_id"`
	ListingID         string     `json:"listing_id"`
	ListingTitle      string     `json:"listing_title,omitempty"`
	MessageType       string     `json:"message_type"`
	SenderType        string     `json:"sender_type"`
	SenderUserID      *string    `json:"sender_user_id,omitempty"`
	SenderName        *string    `json:"sender_name,omitempty"`
	SenderEmail       *string    `json:"sender_email,omitempty"`
	Source            *string    `json:"source,omitempty"`
	ExternalMessageID *string    `json:"external_message_id,omitempty"`
	MessageText       string     `json:"message_text"`
	HotelierReply     *string    `json:"hotelier_reply,omitempty"`
	Status            string     `json:"status"`
	CreatedAt         time.Time  `json:"created_at"`
	RepliedAt         *time.Time `json:"replied_at,omitempty"`
	ProcessedAt       *time.Time `json:"processed_at,omitempty"`
}

type HotelierMessageFilter struct {
	ListingID string
	Type      string
	Status    string
	Sort      Sort
}

type HotelierListing struct {
	ID                   string         `json:"id"`
	IsActive             bool           `json:"is_active"`
	Title                string         `json:"title"`
	TitleRU              *string        `json:"title_ru,omitempty"`
	MainPicture          *string        `json:"main_picture,omitempty"`
	Address              *string        `json:"address,omitempty"`
	AddressRU            *string        `json:"address_ru,omitempty"`
	LocationName         string         `json:"location_name"`
	LocationNameRU       *string        `json:"location_name_ru,omitempty"`
	CheckInTime          string         `json:"check_in_time"`
	CreatedAt            time.Time      `json:"created_at"`
	DeactivatedAt        *time.Time     `json:"deactivated_at"`
	ListingTypeName      string         `json:"listing_type_name"`
	ListingTypeNameRU    *string        `json:"listing_type_name_ru,omitempty"`
	AverageOverallRating *float64       `json:"average_overall_rating"`
	PublishedReviewCount int            `json:"published_review_count"`
	VideoCount           int            `json:"video_count"`
	Description          *string        `json:"description"`
	DescriptionRU        *string        `json:"description_ru"`
	Images               []ListingImage `json:"images"`
	Features             []FeatureTag   `json:"features"`
}

type HotelierListingCardInput struct {
	Title         string   `json:"title"`
	TitleRU       string   `json:"title_ru"`
	Address       string   `json:"address"`
	AddressRU     string   `json:"address_ru"`
	Description   *string  `json:"description"`
	DescriptionRU *string  `json:"description_ru"`
	Images        []string `json:"images"`
	FeatureIDs    []int64  `json:"feature_ids"`
	IsActive      *bool    `json:"is_active,omitempty"`
	CheckInTime   string   `json:"check_in_time"`
}

type HotelierListingStatusInput struct {
	IsActive *bool `json:"is_active"`
}

type CreateHotelierListingInput struct {
	Title         string   `json:"title"`
	TitleRU       string   `json:"title_ru"`
	Address       string   `json:"address"`
	AddressRU     string   `json:"address_ru"`
	Description   string   `json:"description"`
	DescriptionRU string   `json:"description_ru"`
	ListingTypeID int      `json:"listing_type_id"`
	LocationID    int      `json:"location_id"`
	Images        []string `json:"images"`
	FeatureIDs    []int64  `json:"feature_ids"`
}

type HotelierProfile struct {
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Language  string `json:"language"`
}

type HotelierListingAssignment struct {
	ListingID string    `json:"listing_id"`
	CreatedAt time.Time `json:"created_at"`
}
