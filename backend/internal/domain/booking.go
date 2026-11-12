package domain

import (
	"time"

	"github.com/shopspring/decimal"
)

var ErrUnitUnavailable = NewConflict("unit unavailable")

type ListingUnit struct {
	ID               string             `json:"id"`
	ListingID        string             `json:"listing_id"`
	ParentUnitID     *string            `json:"parent_unit_id"`
	ParentName       *string            `json:"parent_name,omitempty"`
	ParentNameRU     *string            `json:"parent_name_ru,omitempty"`
	Type             string             `json:"type"`
	Name             string             `json:"name"`
	NameRU           *string            `json:"name_ru,omitempty"`
	PricePerNight    decimal.Decimal    `json:"price_per_night"`
	Currency         string             `json:"currency"`
	CapacityAdults   int                `json:"capacity_adults"`
	CapacityChildren int                `json:"capacity_children"`
	PetsAllowed      bool               `json:"pets_allowed"`
	IsActive         bool               `json:"is_active"`
	CreatedAt        time.Time          `json:"created_at"`
	UpdatedAt        time.Time          `json:"updated_at"`
	Images           []ListingUnitImage `json:"images"`
}

type ListingUnitImage struct {
	ID        string    `json:"id"`
	UnitID    string    `json:"unit_id"`
	URL       string    `json:"url"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

type UpdateListingUnitInput struct {
	Name             *string          `json:"name,omitempty"`
	NameRU           *string          `json:"name_ru,omitempty"`
	NameRUSet        bool             `json:"-"`
	PricePerNight    *decimal.Decimal `json:"price_per_night,omitempty"`
	Currency         *string          `json:"currency,omitempty"`
	CapacityAdults   *int             `json:"capacity_adults,omitempty"`
	CapacityChildren *int             `json:"capacity_children,omitempty"`
	PetsAllowed      *bool            `json:"pets_allowed,omitempty"`
	IsActive         *bool            `json:"is_active,omitempty"`
}

type BookedUnit struct {
	UnitID        string          `json:"unit_id"`
	Name          string          `json:"name"`
	NameRU        *string         `json:"name_ru,omitempty"`
	PricePerNight decimal.Decimal `json:"price_per_night"`
}

type Booking struct {
	ID                  string          `json:"id"`
	ListingID           string          `json:"listing_id"`
	ListingTitle        string          `json:"listing_title,omitempty"`
	ListingTitleRU      *string         `json:"listing_title_ru,omitempty"`
	ListingThumbnailURL *string         `json:"-"`
	UserID              string          `json:"user_id"`
	ClientName          string          `json:"client_name,omitempty"`
	ClientEmail         string          `json:"client_email,omitempty"`
	CheckInDate         string          `json:"check_in_date"`
	CheckOutDate        string          `json:"check_out_date"`
	AdultsCount         int             `json:"adults_count"`
	ChildrenCount       int             `json:"children_count"`
	HasPets             bool            `json:"has_pets"`
	Total               decimal.Decimal `json:"total"`
	Currency            string          `json:"currency"`
	BaseTotal           decimal.Decimal `json:"base_total,omitempty"`
	RateID              *string         `json:"rate_id,omitempty"`
	QuotedAt            *time.Time      `json:"quoted_at,omitempty"`
	Status              string          `json:"status"`
	CancellationReason  *string         `json:"cancellation_reason"`
	CanceledBy          *string         `json:"canceled_by"`
	CanceledAt          *time.Time      `json:"canceled_at"`
	CheckedInBy         *string         `json:"checked_in_by"`
	CheckedInAt         *time.Time      `json:"checked_in_at"`
	CompletedBy         *string         `json:"completed_by"`
	CompletedAt         *time.Time      `json:"completed_at"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
	UnitIDs             []string        `json:"unit_ids"`
	Units               []BookedUnit    `json:"units"`
}

type CreateBookingInput struct {
	ListingID     string   `json:"listing_id"`
	UnitIDs       []string `json:"unit_ids"`
	CheckInDate   string   `json:"check_in_date"`
	Nights        int      `json:"nights"`
	AdultsCount   int      `json:"adults_count"`
	ChildrenCount int      `json:"children_count"`
	HasPets       bool     `json:"has_pets"`
	Currency      string   `json:"currency"`
}

type BookingFilter struct {
	ListingID    string
	ClientID     string
	Status       string
	CheckInFrom  string
	CheckInTo    string
	CheckOutFrom string
	CheckOutTo   string
	Sort         Sort
	HotelierOnly bool
}
