package hotelier

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/shopspring/decimal"
)

type CreateUnitRequest struct {
	ParentUnitID     *string         `json:"parent_unit_id"`
	Type             string          `json:"type"`
	Name             string          `json:"name"`
	NameRU           *string         `json:"name_ru"`
	PricePerNight    decimal.Decimal `json:"price_per_night"`
	Currency         string          `json:"currency"`
	CapacityAdults   int             `json:"capacity_adults"`
	CapacityChildren int             `json:"capacity_children"`
	PetsAllowed      bool            `json:"pets_allowed"`
	IsActive         *bool           `json:"is_active"`
}

type UpdateUnitRequest struct {
	Name             *string          `json:"name,omitempty"`
	NameRU           json.RawMessage  `json:"name_ru" swaggertype:"string"`
	PricePerNight    *decimal.Decimal `json:"price_per_night,omitempty"`
	Currency         *string          `json:"currency,omitempty"`
	CapacityAdults   *int             `json:"capacity_adults,omitempty"`
	CapacityChildren *int             `json:"capacity_children,omitempty"`
	PetsAllowed      *bool            `json:"pets_allowed,omitempty"`
	IsActive         *bool            `json:"is_active,omitempty"`
}

type CreateUnitImageRequest struct {
	URL       string `json:"url"`
	SortOrder int    `json:"sort_order"`
}

type UpdateUnitImageRequest struct {
	URL       *string `json:"url"`
	SortOrder *int    `json:"sort_order"`
}

type CancelBookingRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type ReplyMessageRequest struct {
	Reply     string `json:"reply"`
	Processed bool   `json:"processed"`
}

type CreateClientQuestionRequest struct {
	MessageText string `json:"message_text"`
}

type ListingVideoResponse struct {
	ID         string    `json:"id"`
	ListingID  string    `json:"listing_id"`
	LocationID *int      `json:"location_id,omitempty"`
	Title      string    `json:"title"`
	Subtitle   string    `json:"subtitle"`
	Author     string    `json:"author"`
	SortOrder  int       `json:"sort_order"`
	IsActive   bool      `json:"is_active"`
	PreviewURL string    `json:"preview_url"`
	StreamURL  string    `json:"stream_url"`
	CreatedAt  time.Time `json:"created_at"`
}

func toListingVideoResponse(v domain.FeedVideo) ListingVideoResponse {
	listingID := ""
	if v.ListingID != nil {
		listingID = *v.ListingID
	}
	key := v.ID
	if v.DemoID != nil && *v.DemoID != "" {
		key = *v.DemoID
	}
	return ListingVideoResponse{
		ID:         v.ID,
		ListingID:  listingID,
		LocationID: v.LocationID,
		Title:      v.Title,
		Subtitle:   v.Subtitle,
		Author:     v.Author,
		SortOrder:  v.SortOrder,
		IsActive:   v.IsActive,
		PreviewURL: fmt.Sprintf("/api/feed/videos/%s/preview.jpg", key),
		StreamURL:  fmt.Sprintf("/api/feed/videos/%s/index.m3u8", key),
		CreatedAt:  v.CreatedAt,
	}
}

func toListingVideosResponse(videos []domain.FeedVideo) []ListingVideoResponse {
	out := make([]ListingVideoResponse, len(videos))
	for i, v := range videos {
		out[i] = toListingVideoResponse(v)
	}
	return out
}

type UpdateListingVideoRequest struct {
	Title     *string `json:"title,omitempty"`
	Subtitle  *string `json:"subtitle,omitempty"`
	Author    *string `json:"author,omitempty"`
	SortOrder *int    `json:"sort_order,omitempty"`
	IsActive  *bool   `json:"is_active,omitempty"`
}
