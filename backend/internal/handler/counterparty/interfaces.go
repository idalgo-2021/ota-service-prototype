package counterparty

import (
	"context"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type CounterpartyService interface {
	ListCounterparties(ctx context.Context, locationID *int, limit, offset int) ([]domain.Counterparty, int, error)
}
