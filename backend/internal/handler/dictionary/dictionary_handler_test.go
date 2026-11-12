package dictionary

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"go.uber.org/zap"
)

type dictionaryLanguageStub struct{}

func (*dictionaryLanguageStub) GetCountries(context.Context) ([]domain.Country, error) {
	ru := "Россия"
	return []domain.Country{{ID: 1, Code: "RU", Name: "Russia", NameRU: &ru}}, nil
}
func (*dictionaryLanguageStub) GetLocations(context.Context) ([]domain.Location, error) {
	return []domain.Location{{ID: 1, CountryID: 1, Name: "Moscow"}}, nil
}
func (*dictionaryLanguageStub) GetListingTypes(context.Context) ([]domain.ListingType, error) {
	ru := "Отель"
	return []domain.ListingType{{ID: 1, Slug: "hotel", Name: "Hotel", NameRU: &ru}}, nil
}
func (*dictionaryLanguageStub) GetCurrencies(context.Context) ([]domain.Currency, error) {
	ru := "Российский рубль"
	return []domain.Currency{{Code: "RUB", Name: "Russian ruble", NameRU: &ru}}, nil
}
func (*dictionaryLanguageStub) GetFeatures(context.Context) ([]domain.FeatureTag, error) {
	return []domain.FeatureTag{{ID: 1, Slug: "breakfast", Name: "Breakfast", NameRU: "Завтрак"}}, nil
}
func (s *dictionaryLanguageStub) GetDictionaries(ctx context.Context) (*domain.Dictionaries, error) {
	countries, _ := s.GetCountries(ctx)
	locations, _ := s.GetLocations(ctx)
	types, _ := s.GetListingTypes(ctx)
	currencies, _ := s.GetCurrencies(ctx)
	features, _ := s.GetFeatures(ctx)
	return &domain.Dictionaries{Countries: countries, Locations: locations, ListingTypes: types, Currencies: currencies, Features: features}, nil
}

func TestDictionaryLanguageResponses(t *testing.T) {
	h := NewDictionaryHandler(&dictionaryLanguageStub{}, zap.NewNop())
	for _, tc := range []struct {
		name    string
		handler http.HandlerFunc
		key     string
		en, ru  string
	}{
		{"countries", h.GetCountries, "", "Russia", "Россия"},
		{"locations", h.GetLocations, "", "Moscow", "Moscow"},
		{"listing_types", h.GetListingTypes, "", "Hotel", "Отель"},
		{"currencies", h.GetCurrencies, "", "Russian ruble", "Российский рубль"},
		{"dictionaries", h.GetDictionaries, "countries", "Russia", "Россия"},
	} {
		for _, language := range []struct {
			query string
			want  string
		}{{"", tc.en}, {"?lang=en", tc.en}, {"?lang=RU", tc.ru}} {
			t.Run(tc.name+language.query, func(t *testing.T) {
				res := httptest.NewRecorder()
				tc.handler(res, httptest.NewRequest(http.MethodGet, "/"+tc.name+language.query, nil))
				if res.Code != http.StatusOK {
					t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
				}
				var out struct {
					Data json.RawMessage `json:"data"`
				}
				if err := json.Unmarshal(res.Body.Bytes(), &out); err != nil {
					t.Fatal(err)
				}
				data := out.Data
				if tc.key != "" {
					var grouped map[string]json.RawMessage
					if err := json.Unmarshal(data, &grouped); err != nil {
						t.Fatal(err)
					}
					data = grouped[tc.key]
				}
				var items []struct {
					Name string `json:"name"`
				}
				if err := json.Unmarshal(data, &items); err != nil {
					t.Fatal(err)
				}
				if len(items) != 1 || items[0].Name != language.want {
					t.Fatalf("data=%s want=%q", data, language.want)
				}
			})
		}
		for _, query := range []string{"?lang=de", "?lang=", "?lang=en&lang=ru"} {
			t.Run(tc.name+query, func(t *testing.T) {
				res := httptest.NewRecorder()
				tc.handler(res, httptest.NewRequest(http.MethodGet, "/"+tc.name+query, nil))
				if res.Code != http.StatusBadRequest {
					t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
				}
			})
		}
	}
}
