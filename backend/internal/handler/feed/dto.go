package feed

import (
	"fmt"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ClipResponse struct {
	ID         string  `json:"id"`
	DemoID     *string `json:"demo_id,omitempty"`
	Type       string  `json:"type"`
	Src        string  `json:"src"`
	Title      string  `json:"title"`
	Subtitle   string  `json:"subtitle"`
	Author     string  `json:"author"`
	ListingID  *string `json:"listing_id,omitempty"`
	LocationID *int    `json:"location_id,omitempty"`
}

func toClipResponse(v domain.FeedVideo) ClipResponse {
	key := v.ID
	if v.DemoID != nil && *v.DemoID != "" {
		key = *v.DemoID
	}

	clipType := "general"
	if v.ListingID != nil {
		clipType = "listing"
	} else if v.LocationID != nil {
		clipType = "location"
	}

	return ClipResponse{
		ID:         v.ID,
		DemoID:     v.DemoID,
		Type:       clipType,
		Src:        fmt.Sprintf("/api/feed/videos/%s/index.m3u8", key),
		Title:      v.Title,
		Subtitle:   v.Subtitle,
		Author:     v.Author,
		ListingID:  v.ListingID,
		LocationID: v.LocationID,
	}
}

func toClipsResponse(videos []domain.FeedVideo) []ClipResponse {
	out := make([]ClipResponse, len(videos))
	for i, v := range videos {
		out[i] = toClipResponse(v)
	}
	return out
}
