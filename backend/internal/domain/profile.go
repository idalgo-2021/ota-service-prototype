package domain

import (
	"encoding/json"
	"time"
)

var ErrProfileNotFound = NewNotFound("profile not found")

type Profile struct {
	UserID            string             `json:"user_id"`
	Email             string             `json:"email"`
	FirstName         string             `json:"first_name"`
	LastName          string             `json:"last_name"`
	BirthYear         *int               `json:"birth_year"`
	Gender            *string            `json:"gender" enums:"male,female,other"`
	Nationality       *string            `json:"nationality" maxLength:"100"`
	About             string             `json:"about"`
	Language          string             `json:"language"`
	Currency          string             `json:"currency"`
	CountryID         int                `json:"country_id"`
	LocationID        *int               `json:"location_id"`
	SearchPreferences *SearchPreferences `json:"search_preferences,omitempty"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
}

// SearchPreferences is a saved search form, not a query executed by the profile API.
// The arrival date and pagination are intentionally transient.
type SearchPreferences struct {
	Version           int    `json:"version" binding:"required" enums:"1"`
	LocationIDs       []int  `json:"location_ids" binding:"required" maxItems:"1"`
	ListingTypeIDs    []int  `json:"listing_type_ids" binding:"required"`
	Nights            int    `json:"nights" binding:"required" minimum:"1" maximum:"365"`
	AdultsCount       int    `json:"adults_count" binding:"required" minimum:"1"`
	ChildrenCount     int    `json:"children_count" binding:"required" minimum:"0"`
	HasPets           bool   `json:"has_pets" binding:"required"`
	ListingPriceSort  string `json:"listing_price_sort" binding:"required" enums:"asc,desc"`
	ListingRatingSort string `json:"listing_rating_sort" binding:"required" enums:"asc,desc"`
	ProductPriceSort  string `json:"product_price_sort" binding:"required" enums:"asc,desc"`
	ProductRatingSort string `json:"product_rating_sort" binding:"required" enums:"asc,desc"`
}

// UnmarshalJSON also normalizes the former sort keys used by saved profiles.
func (p *SearchPreferences) UnmarshalJSON(data []byte) error {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(data, &fields); err != nil {
		return err
	}
	baseFields := []string{"version", "location_ids", "listing_type_ids", "nights", "adults_count", "children_count", "has_pets"}
	canonicalSortFields := []string{"listing_price_sort", "listing_rating_sort", "product_price_sort", "product_rating_sort"}
	legacySortFields := []string{"sort", "rating_sort", "products_sort", "products_rating_sort"}
	allowed := make(map[string]bool, len(baseFields)+len(canonicalSortFields)+len(legacySortFields))
	for _, name := range append(append([]string{}, baseFields...), canonicalSortFields...) {
		allowed[name] = true
	}
	for _, name := range legacySortFields {
		allowed[name] = true
	}
	for name := range fields {
		if !allowed[name] {
			return ErrInvalidInput
		}
	}
	canonical := fields["listing_price_sort"] != nil || fields["listing_rating_sort"] != nil || fields["product_price_sort"] != nil || fields["product_rating_sort"] != nil
	legacy := fields["sort"] != nil || fields["rating_sort"] != nil || fields["products_sort"] != nil || fields["products_rating_sort"] != nil
	if canonical == legacy {
		return ErrInvalidInput
	}
	for _, name := range baseFields {
		if value, ok := fields[name]; !ok || string(value) == "null" {
			return ErrInvalidInput
		}
	}
	if canonical {
		for _, name := range canonicalSortFields {
			if value, ok := fields[name]; !ok || string(value) == "null" {
				return ErrInvalidInput
			}
		}
	} else if value, ok := fields["sort"]; !ok || string(value) == "null" {
		return ErrInvalidInput
	}
	type plain SearchPreferences
	var parsed plain
	if err := json.Unmarshal(data, &parsed); err != nil {
		return err
	}
	*p = SearchPreferences(parsed)
	if !canonical {
		legacySort := string(fields["sort"])
		if err := json.Unmarshal(fields["sort"], &legacySort); err != nil {
			return err
		}
		switch legacySort {
		case "price_asc":
			p.ListingPriceSort = "asc"
		case "price_desc":
			p.ListingPriceSort = "desc"
		case "rating_asc":
			p.ListingPriceSort, p.ListingRatingSort = "asc", "asc"
		case "rating_desc":
			p.ListingPriceSort, p.ListingRatingSort = "asc", "desc"
		default:
			return ErrInvalidInput
		}
		if p.ListingRatingSort == "" {
			p.ListingRatingSort = "desc"
		}
		if value, ok := fields["rating_sort"]; ok {
			if err := json.Unmarshal(value, &p.ListingRatingSort); err != nil {
				return err
			}
		}
		p.ProductPriceSort, p.ProductRatingSort = "asc", "desc"
		if value, ok := fields["products_sort"]; ok {
			var price string
			if err := json.Unmarshal(value, &price); err != nil {
				return err
			}
			switch price {
			case "price_asc":
				p.ProductPriceSort = "asc"
			case "price_desc":
				p.ProductPriceSort = "desc"
			default:
				return ErrInvalidInput
			}
		}
		if value, ok := fields["products_rating_sort"]; ok {
			if err := json.Unmarshal(value, &p.ProductRatingSort); err != nil {
				return err
			}
		}
	}
	return nil
}

// PatchValue distinguishes an omitted field from an explicit JSON null.
type PatchValue[T any] struct {
	Set   bool
	Value *T
}

func (p *PatchValue[T]) UnmarshalJSON(data []byte) error {
	p.Set = true
	if string(data) == "null" {
		p.Value = nil
		return nil
	}
	var value T
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	p.Value = &value
	return nil
}

type ProfilePatch struct {
	FirstName         PatchValue[string]            `json:"first_name"`
	LastName          PatchValue[string]            `json:"last_name"`
	BirthYear         PatchValue[int]               `json:"birth_year"`
	Gender            PatchValue[string]            `json:"gender"`
	Nationality       PatchValue[string]            `json:"nationality"`
	About             PatchValue[string]            `json:"about"`
	Language          PatchValue[string]            `json:"language"`
	Currency          PatchValue[string]            `json:"currency"`
	CountryID         PatchValue[int]               `json:"country_id"`
	LocationID        PatchValue[int]               `json:"location_id"`
	SearchPreferences PatchValue[SearchPreferences] `json:"search_preferences"`
}
