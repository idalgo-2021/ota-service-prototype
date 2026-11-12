package ai

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ListingReviewService interface {
	List(context.Context, domain.ListingReviewFilter, int, int) ([]domain.ListingReview, int, error)
}

type ProductReviewService interface {
	List(context.Context, domain.ProductReviewFilter, int, int) ([]domain.ProductReview, int, error)
}

type DisappointmentCandidateService interface {
	List(context.Context, int, int) ([]domain.DisappointmentCandidate, int, error)
}
