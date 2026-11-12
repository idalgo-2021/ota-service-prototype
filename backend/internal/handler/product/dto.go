package product

import (
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/shopspring/decimal"
)

type ImageResponse struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type ProductResponse struct {
	ID               string                     `json:"id"`
	ProductType      string                     `json:"product_type"`
	LocationID       *int                       `json:"location_id"`
	LocationName     *string                    `json:"location_name,omitempty"`
	CountryName      *string                    `json:"country_name,omitempty"`
	CounterpartyID   *string                    `json:"counterparty_id"`
	CounterpartyName *string                    `json:"counterparty_name"`
	IsActive         bool                       `json:"is_active"`
	DeactivatedAt    *time.Time                 `json:"deactivated_at"`
	Name             string                     `json:"name"`
	NameRU           *string                    `json:"name_ru,omitempty"`
	Description      string                     `json:"description"`
	DescriptionRU    *string                    `json:"description_ru,omitempty"`
	Price            decimal.Decimal            `json:"price"`
	Currency         string                     `json:"currency"`
	Thumbnail        ImageResponse              `json:"thumbnail"`
	Images           []ImageResponse            `json:"images"`
	Attributes       map[string]string          `json:"attributes"`
	Schedule         []domain.TourScheduleEntry `json:"schedule,omitempty"`
	AverageRating    *decimal.Decimal           `json:"average_rating,omitempty"`
	ReviewCount      int                        `json:"review_count"`
	CreatedAt        time.Time                  `json:"created_at"`
	UpdatedAt        time.Time                  `json:"updated_at"`
}
