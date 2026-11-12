package product

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ProductService interface {
	GetProduct(ctx context.Context, id string, activeOnly bool) (*domain.Product, error)
	ListProducts(ctx context.Context, limit, offset int, filter domain.ProductFilter) ([]domain.Product, int, error)
}
