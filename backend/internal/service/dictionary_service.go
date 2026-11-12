package service

import (
	"context"

	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type DictionaryService struct {
	repo   DictionaryRepository
	logger *zap.Logger
}

func NewDictionaryService(repo DictionaryRepository, logger *zap.Logger) *DictionaryService {
	return &DictionaryService{
		repo:   repo,
		logger: logger,
	}
}

func (s *DictionaryService) GetCountries(ctx context.Context) ([]domain.Country, error) {
	return s.repo.GetCountries(ctx)
}

func (s *DictionaryService) GetLocations(ctx context.Context) ([]domain.Location, error) {
	return s.repo.GetLocations(ctx)
}

func (s *DictionaryService) GetListingTypes(ctx context.Context) ([]domain.ListingType, error) {
	return s.repo.GetListingTypes(ctx)
}

func (s *DictionaryService) GetCurrencies(ctx context.Context) ([]domain.Currency, error) {
	return s.repo.GetCurrencies(ctx)
}

func (s *DictionaryService) GetFeatures(ctx context.Context) ([]domain.FeatureTag, error) {
	return s.repo.GetFeatures(ctx)
}

func (s *DictionaryService) GetDictionaries(ctx context.Context) (*domain.Dictionaries, error) {
	// Execute sequentially for simplicity. In a high-load scenario, we could use an errgroup to run these in parallel.
	countries, err := s.repo.GetCountries(ctx)
	if err != nil {
		return nil, err
	}

	locations, err := s.repo.GetLocations(ctx)
	if err != nil {
		return nil, err
	}

	listingTypes, err := s.repo.GetListingTypes(ctx)
	if err != nil {
		return nil, err
	}
	currencies, err := s.repo.GetCurrencies(ctx)
	if err != nil {
		return nil, err
	}
	features, err := s.repo.GetFeatures(ctx)
	if err != nil {
		return nil, err
	}

	return &domain.Dictionaries{
		Countries:    countries,
		Locations:    locations,
		ListingTypes: listingTypes,
		Currencies:   currencies,
		Features:     features,
	}, nil
}
