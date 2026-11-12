package service

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ProductService struct {
	repo        ProductRepository
	logger      *zap.Logger
	currencySvc *CurrencyService
}

func NewProductService(repo ProductRepository, logger *zap.Logger, currency ...*CurrencyService) *ProductService {
	var cs *CurrencyService
	if len(currency) > 0 {
		cs = currency[0]
	}
	return &ProductService{
		repo: repo, logger: logger, currencySvc: cs,
	}
}

func (s *ProductService) GetProduct(ctx context.Context, id string, activeOnly bool) (*domain.Product, error) {
	product, err := s.repo.GetByID(ctx, id, activeOnly)
	if err != nil {
		return nil, err
	}
	return product, nil
}

func (s *ProductService) ListProducts(ctx context.Context, limit, offset int, filter domain.ProductFilter) ([]domain.Product, int, error) {
	if filter.Currency != "" && s.currencySvc != nil {
		if _, _, _, err := s.currencySvc.Quote(ctx, filter.Currency, time.Now()); err != nil {
			return nil, 0, err
		}
	}
	products, total, err := s.repo.List(ctx, limit, offset, filter)
	if err != nil {
		return nil, 0, err
	}
	return products, total, nil
}
