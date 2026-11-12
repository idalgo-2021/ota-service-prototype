package domain

import "time"

type ReviewSummary struct {
	EntityType        string    `json:"entity_type"`
	EntityID          string    `json:"entity_id"`
	Summary           string    `json:"summary"`
	SourceReviewCount int       `json:"source_review_count"`
	ModelID           string    `json:"model_id"`
	PromptVersion     string    `json:"prompt_version"`
	GeneratedAt       time.Time `json:"generated_at"`
}
