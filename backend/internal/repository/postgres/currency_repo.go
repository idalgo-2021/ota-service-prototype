package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type CurrencyRepo struct{ db *pgxpool.Pool }

func NewCurrencyRepo(db *pgxpool.Pool) *CurrencyRepo { return &CurrencyRepo{db: db} }

func (r *CurrencyRepo) GetRate(ctx context.Context, quote string, at time.Time) (string, decimal.Decimal, time.Time, error) {
	var id string
	var rate decimal.Decimal
	var effective time.Time
	err := r.db.QueryRow(ctx, `SELECT er.id, er.rate, er.effective_from
		FROM exchange_rates er
		JOIN currencies c ON c.code=er.quote_currency AND c.is_active
		WHERE er.quote_currency=$1 AND er.effective_from <= $2
		ORDER BY er.effective_from DESC LIMIT 1`, quote, at).Scan(&id, &rate, &effective)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", decimal.Zero, time.Time{}, fmt.Errorf("%w: exchange rate for %s is not configured", domain.ErrInvalidInput, quote)
	}
	if err != nil {
		return "", decimal.Zero, time.Time{}, err
	}
	return id, rate, effective, nil
}
