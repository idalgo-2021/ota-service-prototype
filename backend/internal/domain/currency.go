package domain

import (
	"time"

	"github.com/shopspring/decimal"
)

// CurrencyQuote is the already resolved currency snapshot used when storing a booking.
// Repositories persist it but do not decide which currency is the system base.
type CurrencyQuote struct {
	Currency string
	Rate     decimal.Decimal
	RateID   *string
	QuotedAt time.Time
}
