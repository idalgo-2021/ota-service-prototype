package domain

import "time"

type FeedVideo struct {
	ID         string    `json:"id"`
	ListingID  *string   `json:"listing_id,omitempty"`
	LocationID *int      `json:"location_id,omitempty"`
	DemoID     *string   `json:"demo_id,omitempty"`
	HotelierID *string   `json:"hotelier_id,omitempty"`
	Title      string    `json:"title"`
	Subtitle   string    `json:"subtitle"`
	Author     string    `json:"author"`
	SortOrder  int       `json:"sort_order"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
}

type FeedFilter struct {
	LocationID *int
	ListingID  *string
	Limit      int
	Offset     int
}

type CreateListingVideoInput struct {
	Title     string
	Subtitle  string
	Author    string
	SortOrder int
	IsActive  bool
}

type UpdateListingVideoInput struct {
	Title     *string
	Subtitle  *string
	Author    *string
	SortOrder *int
	IsActive  *bool
}
