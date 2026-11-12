package dictionary

import (
	"net/http"
	"sort"

	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
)

type DictionaryHandler struct {
	service DictionaryService
	logger  *zap.Logger
}

func NewDictionaryHandler(service DictionaryService, logger *zap.Logger) *DictionaryHandler {
	return &DictionaryHandler{
		service: service,
		logger:  logger,
	}
}

// GetCountries godoc
// @Summary      List countries
// @Description  Get all countries, ordered by name.
// @Tags         Public: Dictionaries
// @Produce      json
// @Param        lang query string false "Language (default en)" Enums(en,ru)
// @Success      200  {object}  handler.Response{data=[]CountryResponse}
// @Failure      400  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Router       /countries [get]
func (h *DictionaryHandler) GetCountries(w http.ResponseWriter, r *http.Request) {
	lang, ok := handlers.RequestLanguage(r)
	if !ok {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
		return
	}
	countries, err := h.service.GetCountries(r.Context())
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to get countries", err)
		return
	}
	handlers.Success(w, http.StatusOK, toCountriesResponse(countries, lang))
}

// GetLocations godoc
// @Summary      List locations
// @Description  Get all locations, ordered by name. The name field is localized using lang; name_ru always contains the Russian name when available.
// @Tags         Public: Dictionaries
// @Produce      json
// @Param        lang query string false "Language (default en)" Enums(en,ru)
// @Success      200  {object}  handler.Response{data=[]LocationResponse}
// @Failure      400  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Router       /locations [get]
func (h *DictionaryHandler) GetLocations(w http.ResponseWriter, r *http.Request) {
	lang, ok := handlers.RequestLanguage(r)
	if !ok {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
		return
	}
	locations, err := h.service.GetLocations(r.Context())
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to get locations", err)
		return
	}
	handlers.Success(w, http.StatusOK, toLocationsResponse(locations, lang))
}

// GetListingTypes godoc
// @Summary      List listing types
// @Description  Get all listing types, ordered by ID.
// @Tags         Public: Dictionaries
// @Produce      json
// @Param        lang query string false "Language (default en)" Enums(en,ru)
// @Success      200  {object}  handler.Response{data=[]ListingTypeResponse}
// @Failure      400  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Router       /listing_types [get]
func (h *DictionaryHandler) GetListingTypes(w http.ResponseWriter, r *http.Request) {
	lang, ok := handlers.RequestLanguage(r)
	if !ok {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
		return
	}
	listingTypes, err := h.service.GetListingTypes(r.Context())
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to get listing types", err)
		return
	}
	handlers.Success(w, http.StatusOK, toListingTypesResponse(listingTypes, lang))
}

// GetCurrencies godoc
// @Summary      List currencies
// @Description  Get all active currencies available for price display and order or booking creation, ordered by code.
// @Tags         Public: Dictionaries
// @Produce      json
// @Param        lang query string false "Language (default en)" Enums(en,ru)
// @Success      200  {object}  handler.Response{data=[]CurrencyResponse}
// @Failure      400  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Router       /currencies [get]
func (h *DictionaryHandler) GetCurrencies(w http.ResponseWriter, r *http.Request) {
	lang, ok := handlers.RequestLanguage(r)
	if !ok {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
		return
	}
	currencies, err := h.service.GetCurrencies(r.Context())
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to get currencies", err)
		return
	}
	handlers.Success(w, http.StatusOK, toCurrenciesResponse(currencies, lang))
}

// GetDictionaries godoc
// @Summary      Get dictionaries
// @Description  Get countries, locations, listing types, active currencies, and active bilingual listing feature tags in one response.
// @Tags         Public: Dictionaries
// @Produce      json
// @Param        lang query string false "Language (default en)" Enums(en,ru)
// @Success      200  {object}  handler.Response{data=DictionariesResponse}
// @Failure      400  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Router       /dictionaries [get]
func (h *DictionaryHandler) GetDictionaries(w http.ResponseWriter, r *http.Request) {
	lang, ok := handlers.RequestLanguage(r)
	if !ok {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
		return
	}
	dicts, err := h.service.GetDictionaries(r.Context())
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to get dictionaries", err)
		return
	}
	handlers.Success(w, http.StatusOK, toDictionariesResponse(dicts, lang))
}

func toCountryResponse(c domain.Country, lang string) CountryResponse {
	return CountryResponse{ID: c.ID, Name: handlers.LocalizedString(c.Name, c.NameRU, lang), Code: c.Code}
}

func toCountriesResponse(items []domain.Country, lang string) []CountryResponse {
	result := make([]CountryResponse, 0, len(items))
	for _, c := range items {
		result = append(result, toCountryResponse(c, lang))
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Name == result[j].Name {
			return result[i].ID < result[j].ID
		}
		return result[i].Name < result[j].Name
	})
	return result
}

func toLocationResponse(l domain.Location, lang string) LocationResponse {
	return LocationResponse{ID: l.ID, CountryID: l.CountryID, Name: handlers.LocalizedString(l.Name, l.NameRU, lang), NameRU: l.NameRU, CenterLatitude: l.CenterLatitude, CenterLongitude: l.CenterLongitude}
}

func toLocationsResponse(items []domain.Location, lang string) []LocationResponse {
	result := make([]LocationResponse, 0, len(items))
	for _, l := range items {
		result = append(result, toLocationResponse(l, lang))
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Name == result[j].Name {
			return result[i].ID < result[j].ID
		}
		return result[i].Name < result[j].Name
	})
	return result
}

func toListingTypeResponse(lt domain.ListingType, lang string) ListingTypeResponse {
	return ListingTypeResponse{ID: lt.ID, Slug: lt.Slug, Name: handlers.LocalizedString(lt.Name, lt.NameRU, lang)}
}

func toListingTypesResponse(items []domain.ListingType, lang string) []ListingTypeResponse {
	result := make([]ListingTypeResponse, 0, len(items))
	for _, lt := range items {
		result = append(result, toListingTypeResponse(lt, lang))
	}
	return result
}

func toCurrencyResponse(c domain.Currency, lang string) CurrencyResponse {
	return CurrencyResponse{Code: c.Code, Name: handlers.LocalizedString(c.Name, c.NameRU, lang)}
}

func toCurrenciesResponse(items []domain.Currency, lang string) []CurrencyResponse {
	result := make([]CurrencyResponse, 0, len(items))
	for _, c := range items {
		result = append(result, toCurrencyResponse(c, lang))
	}
	return result
}

func toFeatureTagsResponse(items []domain.FeatureTag) []FeatureTagResponse {
	result := make([]FeatureTagResponse, 0, len(items))
	for _, tag := range items {
		result = append(result, FeatureTagResponse{ID: tag.ID, Slug: tag.Slug, Name: tag.Name, NameRU: tag.NameRU})
	}
	return result
}

func toDictionariesResponse(d *domain.Dictionaries, lang string) DictionariesResponse {
	return DictionariesResponse{
		Countries:    toCountriesResponse(d.Countries, lang),
		Locations:    toLocationsResponse(d.Locations, lang),
		ListingTypes: toListingTypesResponse(d.ListingTypes, lang),
		Currencies:   toCurrenciesResponse(d.Currencies, lang),
		Features:     toFeatureTagsResponse(d.Features),
	}
}
