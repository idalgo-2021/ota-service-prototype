package listingreview

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type Service interface {
	List(context.Context, domain.ListingReviewFilter, int, int) ([]domain.ListingReview, int, error)
	Get(context.Context, string, string, bool) (*domain.ListingReview, error)
	PatchDraft(context.Context, string, string, domain.ListingReviewPatch) (*domain.ListingReview, error)
	Submit(context.Context, string, string) (*domain.ListingReview, error)
	Moderate(context.Context, string, string, string, string) (*domain.ListingReview, error)
}
