package order

import (
	"time"

	"github.com/shopspring/decimal"
)

type OrderItemResponse struct {
	ProductID     string  `json:"product_id"`
	ProductName   string  `json:"product_name,omitempty"`
	ProductNameRU *string `json:"product_name_ru,omitempty"`
	// ProductThumbnailURL is the thumbnail URL for this product.
	ProductThumbnailURL *string         `json:"product_thumbnail_url"`
	Quantity            int             `json:"quantity"`
	Price               decimal.Decimal `json:"price"`
	Currency            string          `json:"currency"`
	Date                *string         `json:"date,omitempty"`
}

type OrderResponse struct {
	ID                 string              `json:"id"`
	UserID             string              `json:"user_id"`
	BookingID          *string             `json:"booking_id,omitempty"`
	ClientName         string              `json:"client_name,omitempty"`
	ClientEmail        string              `json:"client_email,omitempty"`
	Status             string              `json:"status"`
	Total              decimal.Decimal     `json:"total"`
	Currency           string              `json:"currency"`
	BaseTotal          decimal.Decimal     `json:"base_total,omitempty"`
	RateID             *string             `json:"rate_id,omitempty"`
	QuotedAt           *time.Time          `json:"quoted_at,omitempty"`
	Items              []OrderItemResponse `json:"items"`
	CreatedAt          time.Time           `json:"created_at"`
	UpdatedAt          time.Time           `json:"updated_at"`
	CancelledAt        *time.Time          `json:"cancelled_at,omitempty"`
	CancelledBy        *string             `json:"cancelled_by,omitempty"`
	CancellationReason *string             `json:"cancellation_reason,omitempty"`
	FulfilledAt        *time.Time          `json:"fulfilled_at,omitempty"`
	ModeratedAt        *time.Time          `json:"moderated_at,omitempty"`
	ModeratedBy        *string             `json:"moderated_by,omitempty"`
}

// отдельный DTO
type CreateOrderResponse struct {
	ID        string              `json:"id"`
	BookingID *string             `json:"booking_id,omitempty"`
	Status    string              `json:"status"`
	Total     decimal.Decimal     `json:"total"`
	Currency  string              `json:"currency"`
	BaseTotal decimal.Decimal     `json:"base_total,omitempty"`
	RateID    *string             `json:"rate_id,omitempty"`
	QuotedAt  *time.Time          `json:"quoted_at,omitempty"`
	Items     []OrderItemResponse `json:"items"`
	CreatedAt time.Time           `json:"created_at"`
}
