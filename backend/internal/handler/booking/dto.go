package booking

import (
	"encoding/json"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/shopspring/decimal"
)

type CreateUnitRequest struct {
	ParentUnitID     *string         `json:"parent_unit_id"`
	Type             string          `json:"type"`
	Name             string          `json:"name"`
	NameRU           *string         `json:"name_ru"`
	PricePerNight    decimal.Decimal `json:"price_per_night"`
	Currency         string          `json:"currency"`
	CapacityAdults   int             `json:"capacity_adults"`
	CapacityChildren int             `json:"capacity_children"`
	PetsAllowed      bool            `json:"pets_allowed"`
	IsActive         *bool           `json:"is_active"`
}

type UpdateUnitRequest struct {
	Name             *string          `json:"name,omitempty"`
	NameRU           json.RawMessage  `json:"name_ru" swaggertype:"string"`
	PricePerNight    *decimal.Decimal `json:"price_per_night,omitempty"`
	Currency         *string          `json:"currency,omitempty"`
	CapacityAdults   *int             `json:"capacity_adults,omitempty"`
	CapacityChildren *int             `json:"capacity_children,omitempty"`
	PetsAllowed      *bool            `json:"pets_allowed,omitempty"`
	IsActive         *bool            `json:"is_active,omitempty"`
}

type CreateUnitImageRequest struct {
	URL       string `json:"url"`
	SortOrder int    `json:"sort_order"`
}

type CreateBookingRequest struct {
	ListingID     string   `json:"listing_id"`
	UnitIDs       []string `json:"unit_ids"`
	CheckInDate   string   `json:"check_in_date"`
	Nights        int      `json:"nights"`
	AdultsCount   int      `json:"adults_count"`
	ChildrenCount int      `json:"children_count"`
	HasPets       bool     `json:"has_pets"`
	Currency      string   `json:"currency" binding:"required" example:"RUB"`
}

type CancelBookingRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type UnitImageResponse struct {
	ID        string    `json:"id"`
	UnitID    string    `json:"unit_id"`
	URL       string    `json:"url"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

type UnitResponse struct {
	ID               string              `json:"id"`
	ListingID        string              `json:"listing_id"`
	ParentUnitID     *string             `json:"parent_unit_id"`
	ParentName       *string             `json:"parent_name,omitempty"`
	ParentNameRU     *string             `json:"parent_name_ru,omitempty"`
	Type             string              `json:"type"`
	Name             string              `json:"name"`
	NameRU           *string             `json:"name_ru,omitempty"`
	PricePerNight    decimal.Decimal     `json:"price_per_night"`
	Currency         string              `json:"currency"`
	CapacityAdults   int                 `json:"capacity_adults"`
	CapacityChildren int                 `json:"capacity_children"`
	PetsAllowed      bool                `json:"pets_allowed"`
	IsActive         bool                `json:"is_active"`
	CreatedAt        time.Time           `json:"created_at"`
	UpdatedAt        time.Time           `json:"updated_at"`
	Images           []UnitImageResponse `json:"images"`
}

type BookingResponse struct {
	ID             string  `json:"id"`
	ListingID      string  `json:"listing_id"`
	ListingTitle   string  `json:"listing_title,omitempty"`
	ListingTitleRU *string `json:"listing_title_ru,omitempty"`
	// ListingThumbnailURL is the primary image URL of the booked listing.
	ListingThumbnailURL *string             `json:"listing_thumbnail_url"`
	UserID              string              `json:"user_id"`
	ClientName          string              `json:"client_name,omitempty"`
	ClientEmail         string              `json:"client_email,omitempty"`
	CheckInDate         string              `json:"check_in_date"`
	CheckOutDate        string              `json:"check_out_date"`
	AdultsCount         int                 `json:"adults_count"`
	ChildrenCount       int                 `json:"children_count"`
	HasPets             bool                `json:"has_pets"`
	Total               decimal.Decimal     `json:"total"`
	Currency            string              `json:"currency"`
	BaseTotal           decimal.Decimal     `json:"base_total,omitempty"`
	RateID              *string             `json:"rate_id,omitempty"`
	QuotedAt            *time.Time          `json:"quoted_at,omitempty"`
	Status              string              `json:"status"`
	CancellationReason  *string             `json:"cancellation_reason"`
	CanceledBy          *string             `json:"canceled_by"`
	CanceledAt          *time.Time          `json:"canceled_at"`
	CheckedInBy         *string             `json:"checked_in_by"`
	CheckedInAt         *time.Time          `json:"checked_in_at"`
	CompletedBy         *string             `json:"completed_by"`
	CompletedAt         *time.Time          `json:"completed_at"`
	CreatedAt           time.Time           `json:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at"`
	UnitIDs             []string            `json:"unit_ids"`
	Units               []domain.BookedUnit `json:"units"`
}

func toUnitImageResponse(image *domain.ListingUnitImage) UnitImageResponse {
	return UnitImageResponse{ID: image.ID, UnitID: image.UnitID, URL: image.URL, SortOrder: image.SortOrder, CreatedAt: image.CreatedAt}
}

func toUnitResponse(unit *domain.ListingUnit, lang string, admin bool) UnitResponse {
	images := make([]UnitImageResponse, 0, len(unit.Images))
	for i := range unit.Images {
		images = append(images, toUnitImageResponse(&unit.Images[i]))
	}
	response := UnitResponse{
		ID: unit.ID, ListingID: unit.ListingID, ParentUnitID: unit.ParentUnitID, ParentName: unit.ParentName,
		Type: unit.Type, Name: handlers.LocalizedString(unit.Name, unit.NameRU, lang), PricePerNight: unit.PricePerNight, Currency: unit.Currency, CapacityAdults: unit.CapacityAdults, CapacityChildren: unit.CapacityChildren,
		PetsAllowed: unit.PetsAllowed, IsActive: unit.IsActive, CreatedAt: unit.CreatedAt, UpdatedAt: unit.UpdatedAt, Images: images,
	}
	response.ParentName = handlers.LocalizedOptional(unit.ParentName, unit.ParentNameRU, lang)
	if admin {
		response.NameRU = unit.NameRU
		response.ParentNameRU = unit.ParentNameRU
	}
	return response
}

func toUnitsResponse(units []domain.ListingUnit, lang string, admin bool) []UnitResponse {
	result := make([]UnitResponse, 0, len(units))
	for i := range units {
		result = append(result, toUnitResponse(&units[i], lang, admin))
	}
	return result
}

func toBookingResponse(booking *domain.Booking) BookingResponse {
	return BookingResponse{
		ID: booking.ID, ListingID: booking.ListingID, UserID: booking.UserID,
		ListingTitle: booking.ListingTitle, ListingTitleRU: booking.ListingTitleRU, ListingThumbnailURL: booking.ListingThumbnailURL,
		ClientName: booking.ClientName, ClientEmail: booking.ClientEmail,
		CheckInDate: booking.CheckInDate, CheckOutDate: booking.CheckOutDate,
		AdultsCount: booking.AdultsCount, ChildrenCount: booking.ChildrenCount, HasPets: booking.HasPets, Total: booking.Total, Currency: booking.Currency, BaseTotal: booking.BaseTotal, RateID: booking.RateID, QuotedAt: booking.QuotedAt,
		Status: booking.Status, CancellationReason: booking.CancellationReason,
		CanceledBy: booking.CanceledBy, CanceledAt: booking.CanceledAt,
		CheckedInBy: booking.CheckedInBy, CheckedInAt: booking.CheckedInAt,
		CompletedBy: booking.CompletedBy, CompletedAt: booking.CompletedAt,
		CreatedAt: booking.CreatedAt, UpdatedAt: booking.UpdatedAt, UnitIDs: booking.UnitIDs, Units: booking.Units,
	}
}

func toBookingsResponse(bookings []domain.Booking) []BookingResponse {
	result := make([]BookingResponse, 0, len(bookings))
	for i := range bookings {
		result = append(result, toBookingResponse(&bookings[i]))
	}
	return result
}
