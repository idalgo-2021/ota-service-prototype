package domain

import (
	"fmt"
	"time"

	"github.com/shopspring/decimal"
)

var (
	ErrOrderNotFound = NewNotFound("order not found")
	ErrOrderConflict = NewConflict("order was modified by another request")
)

const MaxOrderItems = 100

type OrderItem struct {
	ID                  string          `json:"id"`
	ProductID           string          `json:"product_id"`
	ProductName         string          `json:"product_name,omitempty"`
	ProductNameRU       *string         `json:"product_name_ru,omitempty"`
	ProductThumbnailURL *string         `json:"-"`
	Quantity            int             `json:"quantity"`
	Price               decimal.Decimal `json:"price"`
	Currency            string          `json:"currency"`
	Date                *string         `json:"date,omitempty"`
}

// Validate checks that an order item has valid fields.
func (i OrderItem) Validate() error {
	if i.ProductID == "" {
		return fmt.Errorf("%w: product_id is required", ErrInvalidInput)
	}
	if i.Quantity <= 0 {
		return fmt.Errorf("%w: quantity must be positive", ErrInvalidInput)
	}
	if i.Date != nil {
		if _, err := time.Parse("2006-01-02", *i.Date); err != nil {
			return fmt.Errorf("%w: date must use YYYY-MM-DD format", ErrInvalidInput)
		}
	}
	return nil
}

type OrderStatus string

const (
	StatusPending   OrderStatus = "pending"
	StatusConfirmed OrderStatus = "confirmed"
	StatusFulfilled OrderStatus = "fulfilled"
	StatusCancelled OrderStatus = "cancelled"
)

// IsValid returns true if the status is a known OrderStatus value.
func (s OrderStatus) IsValid() bool {
	switch s {
	case StatusPending, StatusConfirmed, StatusFulfilled, StatusCancelled:
		return true
	}
	return false
}

// validTransitions defines the allowed state machine for order statuses.
var validTransitions = map[OrderStatus][]OrderStatus{
	StatusPending:   {StatusConfirmed, StatusCancelled},
	StatusConfirmed: {StatusFulfilled, StatusCancelled},
}

// CanTransitionTo checks whether transitioning from the current status to newStatus is allowed.
func (o *Order) CanTransitionTo(newStatus OrderStatus) bool {
	allowed, ok := validTransitions[o.Status]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == newStatus {
			return true
		}
	}
	return false
}

// CalculateTotal recomputes the order total from its items.
func (o *Order) CalculateTotal() {
	total := decimal.NewFromInt(0)
	for _, item := range o.Items {
		total = total.Add(item.Price.Mul(decimal.NewFromInt(int64(item.Quantity))))
	}
	o.Total = total
}

// BelongsTo checks whether the order belongs to the given user.
func (o *Order) BelongsTo(userID string) bool {
	return o.UserID == userID
}

// UpdateOrderInput replaces the items of a pending order.
type UpdateOrderInput struct {
	Items *[]OrderItem `json:"items,omitempty"`
}

type Order struct {
	ID                 string          `json:"id"`
	UserID             string          `json:"user_id"`
	BookingID          *string         `json:"booking_id,omitempty"`
	ClientName         string          `json:"client_name,omitempty"`
	ClientEmail        string          `json:"client_email,omitempty"`
	Items              []OrderItem     `json:"items"`
	Status             OrderStatus     `json:"status"`
	Total              decimal.Decimal `json:"total"`
	Currency           string          `json:"currency"`
	BaseTotal          decimal.Decimal `json:"base_total,omitempty"`
	RateID             *string         `json:"rate_id,omitempty"`
	QuotedAt           *time.Time      `json:"quoted_at,omitempty"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
	LoadedAt           time.Time       `json:"-"`
	CancelledAt        *time.Time      `json:"cancelled_at,omitempty"`
	CancelledBy        *string         `json:"cancelled_by,omitempty"`
	CancellationReason *string         `json:"cancellation_reason,omitempty"`
	FulfilledAt        *time.Time      `json:"fulfilled_at,omitempty"`
	ModeratedAt        *time.Time      `json:"moderated_at,omitempty"`
	ModeratedBy        *string         `json:"moderated_by,omitempty"`
}

// OrderFilter applies only to the staff order list. Date upper bounds are exclusive.
type OrderFilter struct {
	CreatedFrom, CreatedTo     *time.Time
	FulfilledFrom, FulfilledTo *time.Time
	Statuses                   []OrderStatus
	ClientID, ModeratorID      *string
	LocationID                 *int
	CounterpartyID             *string
	Sort                       Sort
}
