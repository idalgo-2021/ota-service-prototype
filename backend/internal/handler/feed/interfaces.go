package feed

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type FeedService interface {
	GetClips(ctx context.Context, filter domain.FeedFilter) ([]domain.FeedVideo, error)
}
