package profile

import (
	"context"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ProfileService interface {
	Get(ctx context.Context, userID string) (*domain.Profile, error)
	Update(ctx context.Context, userID string, patch domain.ProfilePatch) (*domain.Profile, error)
	ListClients(ctx context.Context, limit, offset int) ([]domain.Profile, int, error)
}
