package domain

import (
	"encoding/json"
	"time"
)

type DisappointmentAnalysis struct {
	ListingID     string          `json:"listing_id"`
	SourceHash    string          `json:"source_hash"`
	Result        json.RawMessage `json:"result"`
	ModelID       string          `json:"model_id"`
	PromptVersion string          `json:"prompt_version"`
	GeneratedAt   time.Time       `json:"generated_at"`
}

type DisappointmentDigestListing struct {
	HotelierID  string          `json:"hotelier_id"`
	Language    string          `json:"language"`
	ListingID   string          `json:"listing_id"`
	Title       string          `json:"title"`
	TitleRU     string          `json:"title_ru"`
	Result      json.RawMessage `json:"result"`
	GeneratedAt time.Time       `json:"generated_at"`
}
