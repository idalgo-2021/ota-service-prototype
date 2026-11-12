package domain

import (
	"time"

	"github.com/shopspring/decimal"
)

var ErrListingNotFound = NewNotFound("listing not found")

type ListingType struct {
	ID     int     `json:"id"`
	Slug   string  `json:"slug"`
	Name   string  `json:"name"`
	NameRU *string `json:"name_ru,omitempty"`
}

type Location struct {
	ID              int      `json:"id"`
	CountryID       int      `json:"country_id"`
	Name            string   `json:"name"`
	NameRU          *string  `json:"name_ru,omitempty"`
	CenterLatitude  *float64 `json:"center_latitude"`
	CenterLongitude *float64 `json:"center_longitude"`
}

type FeatureTag struct {
	ID     int64  `json:"id"`
	Slug   string `json:"slug"`
	Name   string `json:"name"`
	NameRU string `json:"name_ru"`
}

type ListingImage struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

type Listing struct {
	ID                   string             `json:"id"`
	Title                string             `json:"title"`
	TitleRU              *string            `json:"title_ru,omitempty"`
	Description          *string            `json:"description"`
	DescriptionRU        *string            `json:"description_ru,omitempty"`
	Features             []FeatureTag       `json:"features"`
	MainPicture          *string            `json:"main_picture"`
	ListingTypeID        int                `json:"listing_type_id"`
	Address              *string            `json:"address"`
	AddressRU            *string            `json:"address_ru,omitempty"`
	LocationID           int                `json:"location_id"`
	Latitude             *float64           `json:"latitude"`
	Longitude            *float64           `json:"longitude"`
	DistanceFromCenterKM *float64           `json:"distance_from_center_km"`
	AverageOverallRating *float64           `json:"average_overall_rating"`
	AverageRatingDetails map[string]float64 `json:"average_rating_details"`
	OverallRatingCount   int                `json:"overall_rating_count"`
	PublishedReviewCount int                `json:"published_review_count"`
	IsActive             bool               `json:"is_active"`
	CheckInTime          string             `json:"check_in_time"`
	DeactivatedAt        *time.Time         `json:"deactivated_at"`
	CreatedAt            time.Time          `json:"created_at"`
	UpdatedAt            time.Time          `json:"updated_at"`

	Images        []ListingImage `json:"images,omitempty"`
	ReviewSummary *string        `json:"review_summary,omitempty"`
	StartingPrice *StartingPrice `json:"starting_price"`
}

// StartingPrice is the cheapest bookable unit's nightly rate, without a date or availability check.
type StartingPrice struct {
	Amount   decimal.Decimal `json:"amount"`
	Currency string          `json:"currency"`
	UnitType string          `json:"unit_type"`
}

type ListingFilter struct {
	ListingTypeIDs   []int
	LocationIDs      []int
	IsActive         *bool
	CheckInDate      string
	CheckOutDate     string
	Geo              *GeoFilter
	MinDistanceKM    *float64
	MaxDistanceKM    *float64
	MinOverallRating *float64
	MaxOverallRating *float64
	Sort             Sort
}

// GeoFilter searches within the convex hull of Points and RadiusM metres outside it.
// Points use GeoJSON coordinate order: longitude, latitude.
type GeoFilter struct {
	Points  [][2]float64
	RadiusM float64
}

type AvailableListingsFilter struct {
	ListingTypeIDs   []int
	LocationIDs      []int
	CheckInDate      string
	CheckOutDate     string
	AdultsCount      int
	ChildrenCount    int
	HasPets          bool
	Currency         string
	Sort             Sort
	Geo              *GeoFilter
	MinDistanceKM    *float64
	MaxDistanceKM    *float64
	MinOverallRating *float64
	MaxOverallRating *float64
}

type ListingSearchFilter struct {
	AvailabilityMode string
	ListingFilter    ListingFilter
	AvailableFilter  AvailableListingsFilter
}

const (
	AvailabilityIgnore    = "ignore"
	AvailabilityAnyUnit   = "any_unit"
	AvailabilityForGuests = "for_guests"
)

type ListingSearchItem struct {
	Listing            Listing
	LowestPriceOptions *[]LowestPriceOption
}

type LowestPriceOption struct {
	Type               string          `json:"type"`
	TotalPricePerNight decimal.Decimal `json:"total_price_per_night"`
	Currency           string          `json:"currency"`
	Units              []ListingUnit   `json:"units"`
}

type AvailableListing struct {
	Listing
	LowestPriceOptions []LowestPriceOption `json:"lowest_price_options"`
}
