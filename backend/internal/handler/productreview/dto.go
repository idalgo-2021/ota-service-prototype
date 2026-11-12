package productreview

import (
	"strings"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type PatchDraftRequest struct {
	Rating     *int    `json:"rating,omitempty"`
	ReviewText *string `json:"review_text,omitempty"`
}

type ModerationReasonRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type PublicProductReviewSortRequest struct {
	CreatedAt *string `json:"created_at,omitempty" enums:"asc,desc"`
	Rating    *string `json:"rating,omitempty" enums:"asc,desc"`
}

type SearchPublicProductReviewsRequest struct {
	Sort   *PublicProductReviewSortRequest `json:"sort,omitempty"`
	Limit  *int                            `json:"limit,omitempty"`
	Offset *int                            `json:"offset,omitempty"`
}

type ProductReviewResponse struct {
	ID                string  `json:"id"`
	IsImported        bool    `json:"is_imported"`
	AuthorID          *string `json:"author_id,omitempty"`
	ExternalSource    *string `json:"external_source,omitempty"`
	ExternalReviewID  *string `json:"external_review_id,omitempty"`
	ExternalAuthorID  *string `json:"external_author_id,omitempty"`
	AuthorDisplayName *string `json:"author_display_name,omitempty"`
	ClientName        string  `json:"client_name,omitempty"`
	ProductID         string  `json:"product_id"`
	ProductName       string  `json:"product_name,omitempty"`
	ProductNameRU     *string `json:"product_name_ru,omitempty"`
	// ProductThumbnailURL is the thumbnail URL for this product.
	ProductThumbnailURL *string    `json:"product_thumbnail_url"`
	ProductType         string     `json:"product_type,omitempty"`
	OrderID             *string    `json:"order_id,omitempty"`
	Rating              *int       `json:"rating,omitempty"`
	ReviewText          *string    `json:"review_text,omitempty"`
	Status              string     `json:"status"`
	IsHidden            bool       `json:"is_hidden"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	SubmittedAt         *time.Time `json:"submitted_at,omitempty"`
	OriginalAt          *time.Time `json:"original_at,omitempty"`
	ReviewedAt          *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy          *string    `json:"reviewed_by,omitempty"`
	RejectionReason     *string    `json:"rejection_reason,omitempty"`
	HiddenAt            *time.Time `json:"hidden_at,omitempty"`
	HiddenBy            *string    `json:"hidden_by,omitempty"`
	HiddenReason        *string    `json:"hidden_reason,omitempty"`
}

type PublicProductReviewResponse struct {
	ID                string     `json:"id"`
	IsImported        bool       `json:"is_imported"`
	ExternalSource    *string    `json:"external_source,omitempty"`
	AuthorDisplayName string     `json:"author_display_name"`
	Rating            int        `json:"rating"`
	ReviewText        string     `json:"review_text"`
	CreatedAt         time.Time  `json:"created_at"`
	OriginalAt        *time.Time `json:"original_at,omitempty"`
}

func productReviewResponse(v *domain.ProductReview) ProductReviewResponse {
	return ProductReviewResponse{
		ID: v.ID, IsImported: v.IsImported, AuthorID: v.AuthorID,
		ExternalSource: v.ExternalSource, ExternalReviewID: v.ExternalReviewID,
		ExternalAuthorID: v.ExternalAuthorID, AuthorDisplayName: v.AuthorDisplayName,
		ClientName: v.ClientName,
		ProductID:  v.ProductID, OrderID: v.OrderID, Rating: v.Rating, ReviewText: v.ReviewText,
		ProductName: v.ProductName, ProductNameRU: v.ProductNameRU, ProductType: v.ProductType, ProductThumbnailURL: v.ProductThumbnailURL,
		Status: string(v.Status), IsHidden: v.IsHidden,
		CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt, SubmittedAt: v.SubmittedAt,
		OriginalAt: v.OriginalAt, ReviewedAt: v.ReviewedAt, ReviewedBy: v.ReviewedBy,
		RejectionReason: v.RejectionReason, HiddenAt: v.HiddenAt, HiddenBy: v.HiddenBy,
		HiddenReason: v.HiddenReason,
	}
}

func toProductReviewResponses(items []domain.ProductReview) []ProductReviewResponse {
	out := make([]ProductReviewResponse, 0, len(items))
	for i := range items {
		out = append(out, productReviewResponse(&items[i]))
	}
	return out
}

func toPublicProductReviewResponses(items []domain.ProductReview) []PublicProductReviewResponse {
	out := make([]PublicProductReviewResponse, 0, len(items))
	for _, v := range items {
		name := "Гость"
		if v.AuthorDisplayName != nil && strings.TrimSpace(*v.AuthorDisplayName) != "" {
			name = *v.AuthorDisplayName
		}
		var rating int
		var body string
		if v.Rating != nil {
			rating = *v.Rating
		}
		if v.ReviewText != nil {
			body = *v.ReviewText
		}
		out = append(out, PublicProductReviewResponse{ID: v.ID, IsImported: v.IsImported, ExternalSource: v.ExternalSource,
			AuthorDisplayName: name, Rating: rating, ReviewText: body, CreatedAt: v.CreatedAt, OriginalAt: v.OriginalAt})
	}
	return out
}
