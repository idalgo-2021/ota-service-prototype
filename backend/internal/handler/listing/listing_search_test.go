package listing

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type listingSearchProbe struct {
	filter          *domain.ListingFilter
	availableFilter *domain.AvailableListingsFilter
	searchFilter    *domain.ListingSearchFilter
	items           []domain.ListingSearchItem
}

func (p *listingSearchProbe) GetListing(context.Context, string, *domain.ListingFilter) (*domain.Listing, error) {
	panic("unexpected GetListing")
}

func (p *listingSearchProbe) Search(_ context.Context, filter domain.ListingSearchFilter) ([]domain.ListingSearchItem, error) {
	p.searchFilter = &filter
	p.filter = &filter.ListingFilter
	p.availableFilter = &filter.AvailableFilter
	if p.items != nil {
		return p.items, nil
	}
	return []domain.ListingSearchItem{}, nil
}

func TestPostSearchReturnsAllResultsWithoutPagination(t *testing.T) {
	probe := &listingSearchProbe{items: make([]domain.ListingSearchItem, 25)}
	for i := range probe.items {
		probe.items[i].Listing.ID = fmt.Sprintf("listing-%d", i)
	}
	rating := 8.67
	probe.items[0].Listing.AverageOverallRating = &rating
	probe.items[0].Listing.AverageRatingDetails = map[string]float64{"staff_rating": 9.5}
	probe.items[0].Listing.OverallRatingCount = 3
	h := NewListingHandler(probe, 5000, zap.NewNop())
	r := httptest.NewRequest(http.MethodPost, "/listings/search", strings.NewReader(`{"availability_mode":"ignore","location_ids":[3]}`))
	w := httptest.NewRecorder()
	h.SearchListings(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	var response struct {
		Data []SearchListingResponse `json:"data"`
		Meta json.RawMessage         `json:"meta"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if len(response.Data) != 25 || response.Meta != nil {
		t.Fatalf("got %d results and meta=%s", len(response.Data), response.Meta)
	}
	first := response.Data[0].Listing
	if first.AverageOverallRating == nil || *first.AverageOverallRating != 8.67 || first.OverallRatingCount != 3 || first.AverageRatingDetails["staff_rating"] != 9.5 {
		t.Fatalf("rating response=%+v", first)
	}
}

func TestPostSearchModesAndGeo(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		status   int
		mode     string
		checkOut string
		radius   float64
	}{
		{"ignore with fractional radius", `{"availability_mode":"ignore","geo":{"points":[[37.61,55.75],[37.62,55.75],[37.62,55.76]],"radius_m":275.5}}`, 200, domain.AvailabilityIgnore, "", 275.5},
		{"zero radius", `{"availability_mode":"ignore","geo":{"points":[[37.61,55.75]],"radius_m":0}}`, 200, domain.AvailabilityIgnore, "", 0},
		{"default radius", `{"availability_mode":"ignore","geo":{"points":[[37.61,55.75]]}}`, 200, domain.AvailabilityIgnore, "", 1000},
		{"any unit", `{"availability_mode":"any_unit","location_ids":[1],"check_in_date":"2026-10-10","nights":2}`, 200, domain.AvailabilityAnyUnit, "2026-10-12", 0},
		{"for guests", `{"availability_mode":"for_guests","location_ids":[1],"check_in_date":"2026-10-10","nights":2,"adults_count":2,"children_count":1,"has_pets":true,"currency":"RUB","sort":"price_desc"}`, 200, domain.AvailabilityForGuests, "2026-10-12", 0},
		{"distance interval", `{"availability_mode":"ignore","location_ids":[1],"min_distance_km":1.5,"max_distance_km":8}`, 200, domain.AvailabilityIgnore, "", 0},
		{"distance maximum with guests", `{"availability_mode":"for_guests","location_ids":[1],"check_in_date":"2026-10-10","nights":2,"adults_count":2,"max_distance_km":5}`, 200, domain.AvailabilityForGuests, "2026-10-12", 0},
		{"minimum rating descending", `{"availability_mode":"ignore","location_ids":[1],"min_overall_rating":8,"sort":"rating_desc"}`, 200, domain.AvailabilityIgnore, "", 0},
		{"rating interval with available unit", `{"availability_mode":"any_unit","location_ids":[1],"check_in_date":"2026-10-10","nights":2,"min_overall_rating":7.5,"max_overall_rating":9,"sort":"rating_asc"}`, 200, domain.AvailabilityAnyUnit, "2026-10-12", 0},
		{"rating sort with guests", `{"availability_mode":"for_guests","location_ids":[1],"check_in_date":"2026-10-10","nights":2,"adults_count":2,"sort":"rating_desc"}`, 200, domain.AvailabilityForGuests, "2026-10-12", 0},
		{"rating above scale", `{"availability_mode":"ignore","location_ids":[1],"min_overall_rating":10.01}`, 400, "", "", 0},
		{"rating below scale", `{"availability_mode":"ignore","location_ids":[1],"max_overall_rating":0}`, 400, "", "", 0},
		{"reversed rating interval", `{"availability_mode":"ignore","location_ids":[1],"min_overall_rating":9,"max_overall_rating":8}`, 400, "", "", 0},
		{"negative distance", `{"availability_mode":"ignore","location_ids":[1],"max_distance_km":-1}`, 400, "", "", 0},
		{"reversed distance interval", `{"availability_mode":"ignore","location_ids":[1],"min_distance_km":10,"max_distance_km":5}`, 400, "", "", 0},
		{"over max radius", `{"availability_mode":"ignore","geo":{"points":[[37.61,55.75]],"radius_m":5000.1}}`, 400, "", "", 0},
		{"bad coordinate", `{"availability_mode":"ignore","geo":{"points":[[55.75,37.61,1]]}}`, 400, "", "", 0},
		{"missing guests", `{"availability_mode":"for_guests","location_ids":[1],"check_in_date":"2026-10-10","nights":2}`, 400, "", "", 0},
		{"unknown field", `{"availability_mode":"ignore","location_ids":[1],"unknown":true}`, 400, "", "", 0},
		{"old limit rejected", `{"availability_mode":"ignore","location_ids":[1],"limit":20}`, 400, "", "", 0},
		{"old offset rejected", `{"availability_mode":"ignore","location_ids":[1],"offset":0}`, 400, "", "", 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			probe := &listingSearchProbe{}
			h := NewListingHandler(probe, 5000, zap.NewNop())
			r := httptest.NewRequest(http.MethodPost, "/listings/search", strings.NewReader(tt.body))
			w := httptest.NewRecorder()
			h.SearchListings(w, r)
			if w.Code != tt.status {
				t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
			}
			if tt.status != http.StatusOK {
				if probe.searchFilter != nil {
					t.Fatal("invalid search reached service")
				}
				return
			}
			if strings.Contains(w.Body.String(), `"meta"`) {
				t.Fatalf("unpaginated response contains meta: %s", w.Body.String())
			}
			if probe.searchFilter == nil || probe.searchFilter.AvailabilityMode != tt.mode {
				t.Fatalf("filter=%+v", probe.searchFilter)
			}
			if tt.checkOut != "" && probe.searchFilter.ListingFilter.CheckOutDate != tt.checkOut {
				t.Fatalf("check out=%q", probe.searchFilter.ListingFilter.CheckOutDate)
			}
			if strings.Contains(tt.body, `"geo"`) && (probe.searchFilter.ListingFilter.Geo == nil || probe.searchFilter.ListingFilter.Geo.RadiusM != tt.radius) {
				t.Fatalf("geo=%+v", probe.searchFilter.ListingFilter.Geo)
			}
			if strings.Contains(tt.body, `"max_distance_km"`) {
				if probe.searchFilter.ListingFilter.MaxDistanceKM == nil || probe.searchFilter.AvailableFilter.MaxDistanceKM == nil {
					t.Fatalf("distance filters not passed to both search modes: %+v", probe.searchFilter)
				}
			}
			if strings.Contains(tt.body, `"min_overall_rating"`) {
				if probe.searchFilter.ListingFilter.MinOverallRating == nil || probe.searchFilter.AvailableFilter.MinOverallRating == nil {
					t.Fatalf("rating filters not passed to both search modes: %+v", probe.searchFilter)
				}
			}
			if strings.Contains(tt.body, `"sort":"rating_`) {
				if probe.searchFilter.ListingFilter.Sort.By != "average_overall_rating" || probe.searchFilter.AvailableFilter.Sort.By != "average_overall_rating" {
					t.Fatalf("rating sort not passed to both search modes: %+v", probe.searchFilter)
				}
			}
		})
	}
}
