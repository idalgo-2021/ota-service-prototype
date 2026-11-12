package domain

import (
	"fmt"
	"time"

	"github.com/shopspring/decimal"
)

var ErrProductNotFound = NewNotFound("product not found")

type Image struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// TourScheduleEntry is a recurring local departure time; weekday uses ISO numbering.
type TourScheduleEntry struct {
	Weekday int    `json:"weekday" example:"2" minimum:"1" maximum:"7"` // Monday=1, Sunday=7.
	Time    string `json:"time" example:"10:00"`                        // HH:MM in the product location's local time.
}

type Product struct {
	ID               string              `json:"id"`
	ProductType      string              `json:"product_type"`
	LocationID       *int                `json:"location_id"`
	LocationName     *string             `json:"location_name,omitempty"`
	LocationNameRU   *string             `json:"location_name_ru,omitempty"`
	CountryName      *string             `json:"country_name,omitempty"`
	CountryNameRU    *string             `json:"country_name_ru,omitempty"`
	CounterpartyID   *string             `json:"counterparty_id"`
	CounterpartyName *string             `json:"counterparty_name"`
	IsActive         bool                `json:"is_active"`
	DeactivatedAt    *time.Time          `json:"deactivated_at"`
	Name             string              `json:"name"`
	NameRU           *string             `json:"name_ru,omitempty"`
	Description      string              `json:"description"`
	DescriptionRU    *string             `json:"description_ru,omitempty"`
	Price            decimal.Decimal     `json:"price"`
	Currency         string              `json:"currency"`
	Thumbnail        Image               `json:"thumbnail"`
	Images           []Image             `json:"images"`
	Attributes       map[string]string   `json:"attributes"`
	Schedule         []TourScheduleEntry `json:"schedule,omitempty"`
	AverageRating    *decimal.Decimal    `json:"average_rating,omitempty"`
	ReviewCount      int                 `json:"review_count"`
	CreatedAt        time.Time           `json:"created_at"`
	UpdatedAt        time.Time           `json:"updated_at"`
}

type ProductFilter struct {
	LocationID     *int
	CounterpartyID *string
	ActiveOnly     bool
	ProductType    string
	AttributeKey   string
	AttributeValue string
	Currency       string
	SearchText     string
	Sort           Sort
}

// ValidateSchedule ensures stored recurring times can be shown and used in orders.
func (p Product) ValidateSchedule() error {
	if len(p.Schedule) == 0 {
		return nil
	}
	if p.ProductType != "tour" {
		return fmt.Errorf("%w: only tours may have a schedule", ErrInvalidInput)
	}
	for _, entry := range p.Schedule {
		if entry.Weekday < 1 || entry.Weekday > 7 {
			return fmt.Errorf("%w: schedule weekday must be between 1 and 7", ErrInvalidInput)
		}
		if len(entry.Time) != 5 {
			return fmt.Errorf("%w: schedule time must use HH:MM format", ErrInvalidInput)
		}
		if _, err := time.Parse("15:04", entry.Time); err != nil {
			return fmt.Errorf("%w: schedule time must use HH:MM format", ErrInvalidInput)
		}
	}
	return nil
}

// ValidateOrderDate checks an optional selected date against the tour's weekly schedule.
func (p Product) ValidateOrderDate(date *string) error {
	if err := p.ValidateSchedule(); err != nil {
		return err
	}
	if date == nil && p.ProductType == "tour" && len(p.Schedule) > 0 {
		return fmt.Errorf("%w: date is required for a scheduled tour", ErrInvalidInput)
	}
	if date == nil {
		return nil
	}
	if p.ProductType != "tour" || len(p.Schedule) == 0 {
		return fmt.Errorf("%w: date requires a tour with a schedule", ErrInvalidInput)
	}
	selected, err := time.Parse("2006-01-02", *date)
	if err != nil {
		return fmt.Errorf("%w: date must use YYYY-MM-DD format", ErrInvalidInput)
	}
	today, _ := time.Parse("2006-01-02", time.Now().Format("2006-01-02"))
	if selected.Before(today) {
		return fmt.Errorf("%w: tour date cannot be in the past", ErrInvalidInput)
	}
	weekday := int(selected.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	for _, entry := range p.Schedule {
		if entry.Weekday == weekday {
			return nil
		}
	}
	return fmt.Errorf("%w: date is not in the tour schedule", ErrInvalidInput)
}
