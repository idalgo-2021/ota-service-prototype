package domain

import "time"

type ProductReviewStatus string

const (
	ProductReviewDraft    ProductReviewStatus = "draft"
	ProductReviewPending  ProductReviewStatus = "pending_moderation"
	ProductReviewApproved ProductReviewStatus = "approved"
	ProductReviewRejected ProductReviewStatus = "rejected"
)

func (s ProductReviewStatus) Valid() bool {
	return s == ProductReviewDraft || s == ProductReviewPending || s == ProductReviewApproved || s == ProductReviewRejected
}

type ProductReview struct {
	ID                  string              `json:"id"`
	IsImported          bool                `json:"is_imported"`
	AuthorID            *string             `json:"author_id,omitempty"`
	ExternalSource      *string             `json:"external_source,omitempty"`
	ExternalReviewID    *string             `json:"external_review_id,omitempty"`
	ExternalAuthorID    *string             `json:"external_author_id,omitempty"`
	AuthorDisplayName   *string             `json:"author_display_name,omitempty"`
	ClientName          string              `json:"client_name,omitempty"`
	ProductID           string              `json:"product_id"`
	ProductName         string              `json:"product_name,omitempty"`
	ProductNameRU       *string             `json:"product_name_ru,omitempty"`
	ProductThumbnailURL *string             `json:"-"`
	ProductType         string              `json:"product_type,omitempty"`
	OrderID             *string             `json:"order_id,omitempty"`
	Rating              *int                `json:"rating,omitempty"`
	ReviewText          *string             `json:"review_text,omitempty"`
	Status              ProductReviewStatus `json:"status"`
	IsHidden            bool                `json:"is_hidden"`
	CreatedAt           time.Time           `json:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at"`
	SubmittedAt         *time.Time          `json:"submitted_at,omitempty"`
	OriginalAt          *time.Time          `json:"original_at,omitempty"`
	ReviewedAt          *time.Time          `json:"reviewed_at,omitempty"`
	ReviewedBy          *string             `json:"reviewed_by,omitempty"`
	RejectionReason     *string             `json:"rejection_reason,omitempty"`
	HiddenAt            *time.Time          `json:"hidden_at,omitempty"`
	HiddenBy            *string             `json:"hidden_by,omitempty"`
	HiddenReason        *string             `json:"hidden_reason,omitempty"`
}

type ProductReviewFilter struct {
	AuthorID    string
	Status      ProductReviewStatus
	IsImported  *bool
	ProductID   string
	ProductType string
	Public      bool
	Sort        ProductReviewSort
}

// ProductReviewSort contains optional directions for public review ordering.
// When both are set, CreatedAt is the primary sort key.
type ProductReviewSort struct {
	CreatedAt string
	Rating    string
}
