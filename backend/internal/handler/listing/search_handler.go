package listing

import (
	"encoding/json"
	"errors"
	"io"
	"math"
	"net/http"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
)

const (
	maxSearchPoints       = 100
	maxSearchDiameterM    = 100_000
	maxSearchRequestBytes = 64 << 10
)

type SearchGeoRequest struct {
	// Required when geo is provided: 1 to 100 [longitude, latitude] positions, spanning no more than 100 km.
	Points [][]float64 `json:"points" binding:"required"`
	// Optional distance beyond the convex hull in metres; defaults to 1000, may be zero, and cannot exceed MAX_SEARCH_RADIUS_M.
	RadiusM *float64 `json:"radius_m"`
}

type SearchListingsRequest struct {
	// Required: ignore (no availability), any_unit (dates), or for_guests (dates, guests, and prices).
	AvailabilityMode string `json:"availability_mode" binding:"required" enums:"ignore,any_unit,for_guests"`
	// Optional for staff; for other users provide nonempty location_ids or geo. IDs must be positive.
	LocationIDs []int `json:"location_ids"`
	// Optional positive listing type IDs.
	ListingTypeIDs []int `json:"listing_type_ids"`
	// Optional inclusive minimum straight-line distance from the location centre in kilometres.
	MinDistanceKM *float64 `json:"min_distance_km"`
	// Optional inclusive maximum straight-line distance from the location centre in kilometres.
	MaxDistanceKM *float64 `json:"max_distance_km"`
	// Optional inclusive minimum of the listing's stored mean overall review score (1 to 10).
	MinOverallRating *float64 `json:"min_overall_rating"`
	// Optional inclusive maximum of the listing's stored mean overall review score (1 to 10).
	MaxOverallRating *float64 `json:"max_overall_rating"`
	// Optional for staff; for other users required when location_ids is empty.
	Geo *SearchGeoRequest `json:"geo"`
	// Required for any_unit and for_guests; YYYY-MM-DD. Omit for ignore.
	CheckInDate string `json:"check_in_date"`
	// Required for any_unit and for_guests; 1 to 365. Omit for ignore.
	Nights *int `json:"nights"`
	// Required for for_guests; positive. Omit for ignore and any_unit.
	AdultsCount *int `json:"adults_count"`
	// Optional for for_guests; nonnegative, defaults to zero. Omit for other modes.
	ChildrenCount *int `json:"children_count"`
	// Optional for for_guests; defaults to false. Omit for other modes.
	HasPets *bool `json:"has_pets"`
	// Optional for for_guests; uppercase three-letter code, defaults to the base currency. Omit for other modes.
	Currency string `json:"currency"`
	// Optional independent sort directions. When both are provided, price is primary and rating is secondary.
	Sort domain.SearchSortCriteria `json:"sort,omitempty"`
}

// SearchListings godoc
// @Summary Search listings using one availability mode and optional geographic area
// @Description Required in every request: availability_mode. For anonymous and regular users, provide location_ids or geo. Mode ignore requires no stay fields; any_unit requires check_in_date and nights; for_guests additionally requires adults_count. Without sort, ignore mode returns newest listings first, while date-based modes return lower nightly prices first. Distance bounds are inclusive kilometres from the configured location centre; rating bounds are inclusive scores from 1 to 10. Listings without a calculated value are excluded when the corresponding bound is set. Rating sorting puts unrated listings last. Geo points are [longitude,latitude]; the server searches their convex hull and radius_m metres beyond it.
// @Tags Client: Listings
// @Accept json
// @Produce json
// @Param lang query string false "Language (default en)" Enums(en,ru)
// @Param request body SearchListingsRequest true "Search filters"
// @Success 200 {object} handler.Response{data=[]SearchListingResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Router /listings/search [post]
func (h *ListingHandler) SearchListings(w http.ResponseWriter, r *http.Request) {
	lang, ok := handlers.RequestLanguage(r)
	if !ok {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxSearchRequestBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var request SearchListingsRequest
	if err := decoder.Decode(&request); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid search request JSON")
		return
	}
	if err := decoder.Decode(new(any)); !errors.Is(err, io.EOF) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "request must contain one JSON object")
		return
	}

	filter, err := h.validateSearchRequest(r, request)
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}
	items, err := h.service.Search(r.Context(), filter)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to search listings", err)
		return
	}
	result := make([]SearchListingResponse, 0, len(items))
	for _, item := range items {
		response := SearchListingResponse{Listing: toListingResponse(&item.Listing, lang)}
		if item.LowestPriceOptions != nil {
			options := make([]LowestPriceOptionResponse, 0, len(*item.LowestPriceOptions))
			for _, option := range *item.LowestPriceOptions {
				units := make([]domain.ListingUnit, len(option.Units))
				copy(units, option.Units)
				for i := range units {
					units[i].Name = handlers.LocalizedString(units[i].Name, units[i].NameRU, lang)
					units[i].ParentName = handlers.LocalizedOptional(units[i].ParentName, units[i].ParentNameRU, lang)
					units[i].NameRU = nil
					units[i].ParentNameRU = nil
				}
				options = append(options, LowestPriceOptionResponse{
					Type: option.Type, TotalPricePerNight: option.TotalPricePerNight,
					Currency: option.Currency, Units: units,
				})
			}
			response.LowestPriceOptions = &options
		}
		result = append(result, response)
	}
	handlers.Success(w, http.StatusOK, result)
}

func (h *ListingHandler) validateSearchRequest(r *http.Request, request SearchListingsRequest) (domain.ListingSearchFilter, error) {
	bad := func(message string) (domain.ListingSearchFilter, error) {
		return domain.ListingSearchFilter{}, errors.New(message)
	}
	if request.AvailabilityMode != domain.AvailabilityIgnore && request.AvailabilityMode != domain.AvailabilityAnyUnit && request.AvailabilityMode != domain.AvailabilityForGuests {
		return bad("availability_mode must be ignore, any_unit, or for_guests")
	}
	for _, id := range append(append([]int{}, request.LocationIDs...), request.ListingTypeIDs...) {
		if id < 1 {
			return bad("location_ids and listing_type_ids must contain positive IDs")
		}
	}
	for _, bound := range []*float64{request.MinDistanceKM, request.MaxDistanceKM} {
		if bound != nil && (*bound < 0 || math.IsNaN(*bound) || math.IsInf(*bound, 0)) {
			return bad("distance bounds must be finite nonnegative kilometres")
		}
	}
	if request.MinDistanceKM != nil && request.MaxDistanceKM != nil && *request.MinDistanceKM > *request.MaxDistanceKM {
		return bad("min_distance_km must not exceed max_distance_km")
	}
	for _, bound := range []*float64{request.MinOverallRating, request.MaxOverallRating} {
		if bound != nil && (*bound < 1 || *bound > 10 || math.IsNaN(*bound) || math.IsInf(*bound, 0)) {
			return bad("rating bounds must be finite numbers from 1 to 10")
		}
	}
	if request.MinOverallRating != nil && request.MaxOverallRating != nil && *request.MinOverallRating > *request.MaxOverallRating {
		return bad("min_overall_rating must not exceed max_overall_rating")
	}
	geo, err := h.validateGeo(request.Geo)
	if err != nil {
		return bad(err.Error())
	}
	if !isStaff(r) && len(request.LocationIDs) == 0 && geo == nil {
		return bad("location_ids or geo is required")
	}
	filter := domain.ListingSearchFilter{AvailabilityMode: request.AvailabilityMode}
	filter.ListingFilter = domain.ListingFilter{
		ListingTypeIDs: request.ListingTypeIDs, LocationIDs: request.LocationIDs, Geo: geo,
		MinDistanceKM: request.MinDistanceKM, MaxDistanceKM: request.MaxDistanceKM,
		MinOverallRating: request.MinOverallRating, MaxOverallRating: request.MaxOverallRating,
	}
	if !isStaff(r) {
		active := true
		filter.ListingFilter.IsActive = &active
	}
	filter.AvailableFilter = domain.AvailableListingsFilter{
		ListingTypeIDs: request.ListingTypeIDs, LocationIDs: request.LocationIDs, Geo: geo,
		MinDistanceKM: request.MinDistanceKM, MaxDistanceKM: request.MaxDistanceKM,
		MinOverallRating: request.MinOverallRating, MaxOverallRating: request.MaxOverallRating,
	}
	if request.Sort.Price != "" && request.Sort.Price != "asc" && request.Sort.Price != "desc" {
		return bad("sort.price must be asc or desc")
	}
	if request.Sort.Rating != "" && request.Sort.Rating != "asc" && request.Sort.Rating != "desc" {
		return bad("sort.rating must be asc or desc")
	}
	setSort := func(priceField string) domain.Sort {
		if request.Sort.Price != "" {
			sort := domain.Sort{By: priceField, Order: request.Sort.Price}
			if request.Sort.Rating != "" {
				sort.ThenBy, sort.ThenOrder = "average_overall_rating", request.Sort.Rating
			}
			return sort
		}
		if request.Sort.Rating != "" {
			return domain.Sort{By: "average_overall_rating", Order: request.Sort.Rating}
		}
		return domain.Sort{}
	}
	filter.ListingFilter.Sort = setSort("starting_price")
	filter.AvailableFilter.Sort = setSort("price_per_night")

	if request.AvailabilityMode == domain.AvailabilityIgnore {
		if request.CheckInDate != "" || request.Nights != nil || request.AdultsCount != nil || request.ChildrenCount != nil || request.HasPets != nil || request.Currency != "" {
			return bad("stay and currency fields require an availability mode")
		}
		return filter, nil
	}
	if request.CheckInDate == "" || request.Nights == nil || *request.Nights < 1 || *request.Nights > 365 {
		return bad("check_in_date and nights from 1 to 365 are required")
	}
	date, err := time.Parse("2006-01-02", request.CheckInDate)
	if err != nil || date.Format("2006-01-02") != request.CheckInDate {
		return bad("check_in_date must be YYYY-MM-DD")
	}
	checkOut := date.AddDate(0, 0, *request.Nights).Format("2006-01-02")
	filter.ListingFilter.CheckInDate, filter.ListingFilter.CheckOutDate = request.CheckInDate, checkOut
	filter.AvailableFilter.CheckInDate, filter.AvailableFilter.CheckOutDate = request.CheckInDate, checkOut

	if request.AvailabilityMode == domain.AvailabilityAnyUnit {
		if request.AdultsCount != nil || request.ChildrenCount != nil || request.HasPets != nil || request.Currency != "" {
			return bad("guest and currency fields require for_guests mode")
		}
		if filter.AvailableFilter.Sort.By == "" {
			filter.AvailableFilter.Sort = domain.Sort{By: "price_per_night", Order: "asc"}
		}
		return filter, nil
	}
	if request.AdultsCount == nil || *request.AdultsCount < 1 {
		return bad("adults_count must be positive")
	}
	filter.AvailableFilter.AdultsCount = *request.AdultsCount
	if request.ChildrenCount != nil {
		if *request.ChildrenCount < 0 {
			return bad("children_count must not be negative")
		}
		filter.AvailableFilter.ChildrenCount = *request.ChildrenCount
	}
	if request.HasPets != nil {
		filter.AvailableFilter.HasPets = *request.HasPets
	}
	if request.Currency != "" && !validCurrency(request.Currency) {
		return bad("currency must be a three-letter uppercase code")
	}
	filter.AvailableFilter.Currency = request.Currency
	if filter.AvailableFilter.Sort.By == "" {
		filter.AvailableFilter.Sort = domain.Sort{By: "price_per_night", Order: "asc"}
	}
	return filter, nil
}

func validCurrency(currency string) bool {
	if len(currency) != 3 {
		return false
	}
	for _, char := range currency {
		if char < 'A' || char > 'Z' {
			return false
		}
	}
	return true
}

func (h *ListingHandler) validateGeo(request *SearchGeoRequest) (*domain.GeoFilter, error) {
	if request == nil {
		return nil, nil
	}
	if len(request.Points) < 1 || len(request.Points) > maxSearchPoints {
		return nil, errors.New("geo.points must contain 1 to 100 positions")
	}
	radius := 1000.0
	if request.RadiusM != nil {
		radius = *request.RadiusM
	}
	if math.IsNaN(radius) || math.IsInf(radius, 0) || radius < 0 || radius > h.maxRadiusM {
		return nil, errors.New("geo.radius_m is out of range")
	}
	points := make([][2]float64, 0, len(request.Points))
	for _, coordinate := range request.Points {
		if len(coordinate) != 2 || math.IsNaN(coordinate[0]) || math.IsNaN(coordinate[1]) || math.IsInf(coordinate[0], 0) || math.IsInf(coordinate[1], 0) || coordinate[0] < -180 || coordinate[0] > 180 || coordinate[1] < -90 || coordinate[1] > 90 {
			return nil, errors.New("geo.points must use finite [longitude, latitude] coordinates")
		}
		points = append(points, [2]float64{coordinate[0], coordinate[1]})
	}
	for i := range points {
		for j := i + 1; j < len(points); j++ {
			if math.Abs(points[i][0]-points[j][0]) > 180 || haversineM(points[i], points[j]) > maxSearchDiameterM {
				return nil, errors.New("geo.points span more than 100 km or cross the antimeridian")
			}
		}
	}
	return &domain.GeoFilter{Points: points, RadiusM: radius}, nil
}

func haversineM(a, b [2]float64) float64 {
	latA, latB := a[1]*math.Pi/180, b[1]*math.Pi/180
	dLat, dLon := latB-latA, (b[0]-a[0])*math.Pi/180
	h := math.Pow(math.Sin(dLat/2), 2) + math.Cos(latA)*math.Cos(latB)*math.Pow(math.Sin(dLon/2), 2)
	return 2 * 6_371_000 * math.Asin(math.Min(1, math.Sqrt(h)))
}
