package listing

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ListingService interface {
	Search(ctx context.Context, filter domain.ListingSearchFilter) ([]domain.ListingSearchItem, error)
	GetListing(ctx context.Context, id string, filter *domain.ListingFilter) (*domain.Listing, error)
}
