package dictionary

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type DictionaryService interface {
	GetCountries(ctx context.Context) ([]domain.Country, error)
	GetLocations(ctx context.Context) ([]domain.Location, error)
	GetListingTypes(ctx context.Context) ([]domain.ListingType, error)
	GetCurrencies(ctx context.Context) ([]domain.Currency, error)
	GetFeatures(ctx context.Context) ([]domain.FeatureTag, error)
	GetDictionaries(ctx context.Context) (*domain.Dictionaries, error)
}
