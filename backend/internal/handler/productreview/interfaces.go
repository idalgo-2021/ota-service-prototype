package productreview

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ProductReviewService interface {
	List(ctx context.Context, filter domain.ProductReviewFilter, limit, offset int) ([]domain.ProductReview, int, error)
	Get(ctx context.Context, id, userID string, staff bool) (*domain.ProductReview, error)
	PatchDraft(ctx context.Context, id, userID string, rating *int, body *string) (*domain.ProductReview, error)
	Submit(ctx context.Context, id, userID string) (*domain.ProductReview, error)
	Moderate(ctx context.Context, id, moderatorID, action, reason string) (*domain.ProductReview, error)
}
