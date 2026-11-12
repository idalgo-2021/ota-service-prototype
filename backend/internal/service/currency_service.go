package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/shopspring/decimal"
)

// CurrencyRepository provides the immutable rate that was effective at a point in time.
type CurrencyRepository interface {
	GetRate(context.Context, string, time.Time) (id string, rate decimal.Decimal, effectiveAt time.Time, err error)
}

type CurrencyService struct {
	repo CurrencyRepository
	base string
}

func NewCurrencyService(repo CurrencyRepository, base string) *CurrencyService {
	return &CurrencyService{repo: repo, base: strings.ToUpper(base)}
}

func (s *CurrencyService) Quote(ctx context.Context, currency string, at time.Time) (string, decimal.Decimal, time.Time, error) {
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if len(currency) != 3 {
		return "", decimal.Zero, time.Time{}, fmt.Errorf("%w: currency must be a three-letter uppercase code", domain.ErrInvalidInput)
	}
	for _, r := range currency {
		if r < 'A' || r > 'Z' {
			return "", decimal.Zero, time.Time{}, fmt.Errorf("%w: invalid currency", domain.ErrInvalidInput)
		}
	}
	if currency == s.base {
		return "", decimal.NewFromInt(1), at, nil
	}
	id, rate, effective, err := s.repo.GetRate(ctx, currency, at)
	if err != nil {
		return "", decimal.Zero, time.Time{}, err
	}
	return id, rate, effective, nil
}

func (s *CurrencyService) Base() string { return s.base }
