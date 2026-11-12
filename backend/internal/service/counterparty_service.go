package service

import (
	"context"

	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type CounterpartyService struct {
	repo   CounterpartyRepository
	logger *zap.Logger
}

func NewCounterpartyService(repo CounterpartyRepository, logger *zap.Logger) *CounterpartyService {
	return &CounterpartyService{
		repo:   repo,
		logger: logger,
	}
}

func (s *CounterpartyService) ListCounterparties(ctx context.Context, locationID *int, limit, offset int) ([]domain.Counterparty, int, error) {
	return s.repo.List(ctx, locationID, limit, offset)
}
