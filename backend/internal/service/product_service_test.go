package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

type currencyRepoProbe struct{}

func (currencyRepoProbe) GetRate(context.Context, string, time.Time) (string, decimal.Decimal, time.Time, error) {
	return "", decimal.Zero, time.Time{}, domain.ErrInvalidInput
}

type productRepoProbe struct{ called bool }

func (p *productRepoProbe) GetByID(context.Context, string, bool) (*domain.Product, error) {
	return nil, nil
}
func (p *productRepoProbe) GetByIDs(context.Context, []string) (map[string]*domain.Product, error) {
	return nil, nil
}
func (p *productRepoProbe) List(context.Context, int, int, domain.ProductFilter) ([]domain.Product, int, error) {
	p.called = true
	return nil, 0, nil
}

func TestListProductsRejectsUnknownCurrencyBeforeRepository(t *testing.T) {
	repo := &productRepoProbe{}
	svc := NewProductService(repo, zap.NewNop(), NewCurrencyService(currencyRepoProbe{}, "RUB"))
	_, _, err := svc.ListProducts(context.Background(), 20, 0, domain.ProductFilter{Currency: "RRR"})
	if err == nil || !errors.Is(err, domain.ErrInvalidInput) || repo.called {
		t.Fatalf("err=%v repo_called=%v", err, repo.called)
	}
}
