package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

var languageCode = regexp.MustCompile(`^[A-Z]{2,8}$`)
var currencyCode = regexp.MustCompile(`^[A-Z]{3}$`)

type ProfileService struct{ repo ProfileRepository }

func NewProfileService(repo ProfileRepository) *ProfileService { return &ProfileService{repo: repo} }

func (s *ProfileService) Get(ctx context.Context, userID string) (*domain.Profile, error) {
	return s.repo.GetByUserID(ctx, userID)
}

func (s *ProfileService) GetClient(ctx context.Context, userID string) (*domain.Profile, error) {
	clientRepo, ok := s.repo.(interface {
		GetClientByUserID(context.Context, string) (*domain.Profile, error)
	})
	if !ok {
		return nil, fmt.Errorf("client profile lookup is unavailable")
	}
	return clientRepo.GetClientByUserID(ctx, userID)
}

func (s *ProfileService) UpdateClient(ctx context.Context, userID string, patch domain.ProfilePatch) (*domain.Profile, error) {
	if patch.SearchPreferences.Set {
		return nil, fmt.Errorf("search_preferences are private: %w", domain.ErrInvalidInput)
	}
	if _, err := s.GetClient(ctx, userID); err != nil {
		return nil, err
	}
	return s.Update(ctx, userID, patch)
}

func (s *ProfileService) Update(ctx context.Context, userID string, patch domain.ProfilePatch) (*domain.Profile, error) {
	p, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if patch.FirstName.Set {
		if patch.FirstName.Value == nil {
			return nil, fmt.Errorf("first_name cannot be null: %w", domain.ErrInvalidInput)
		}
		p.FirstName = *patch.FirstName.Value
	}
	if patch.LastName.Set {
		if patch.LastName.Value == nil {
			return nil, fmt.Errorf("last_name cannot be null: %w", domain.ErrInvalidInput)
		}
		p.LastName = *patch.LastName.Value
	}
	if patch.About.Set {
		if patch.About.Value == nil {
			return nil, fmt.Errorf("about cannot be null: %w", domain.ErrInvalidInput)
		}
		p.About = *patch.About.Value
	}
	if patch.Language.Set {
		if patch.Language.Value == nil {
			return nil, fmt.Errorf("language cannot be null: %w", domain.ErrInvalidInput)
		}
		p.Language = *patch.Language.Value
	}
	if patch.Currency.Set {
		if patch.Currency.Value == nil {
			return nil, fmt.Errorf("currency cannot be null: %w", domain.ErrInvalidInput)
		}
		p.Currency = *patch.Currency.Value
	}
	if patch.CountryID.Set {
		if patch.CountryID.Value == nil {
			return nil, fmt.Errorf("country_id cannot be null: %w", domain.ErrInvalidInput)
		}
		p.CountryID = *patch.CountryID.Value
	}
	if patch.Gender.Set {
		p.Gender = patch.Gender.Value
	}
	if patch.Nationality.Set {
		if patch.Nationality.Value == nil {
			p.Nationality = nil
		} else {
			value := strings.TrimSpace(*patch.Nationality.Value)
			if value == "" {
				p.Nationality = nil
			} else {
				p.Nationality = &value
			}
		}
	}
	if patch.BirthYear.Set {
		p.BirthYear = patch.BirthYear.Value
	}
	if patch.LocationID.Set {
		p.LocationID = patch.LocationID.Value
	}
	if patch.SearchPreferences.Set {
		if patch.SearchPreferences.Value != nil {
			if err := validateSearchPreferences(*patch.SearchPreferences.Value); err != nil {
				return nil, err
			}
		}
		p.SearchPreferences = patch.SearchPreferences.Value
	}
	if utf8.RuneCountInString(p.FirstName) > 100 || utf8.RuneCountInString(p.LastName) > 100 || utf8.RuneCountInString(p.About) > 2000 ||
		!languageCode.MatchString(p.Language) || !currencyCode.MatchString(p.Currency) ||
		(p.Gender != nil && *p.Gender != "male" && *p.Gender != "female" && *p.Gender != "other") ||
		(p.Nationality != nil && utf8.RuneCountInString(*p.Nationality) > 100) ||
		(p.BirthYear != nil && (*p.BirthYear < 1900 || *p.BirthYear > time.Now().Year())) {
		return nil, fmt.Errorf("invalid profile fields: %w", domain.ErrInvalidInput)
	}
	return s.repo.Update(ctx, p, patch)
}

func validateSearchPreferences(p domain.SearchPreferences) error {
	if p.Version != 1 || p.LocationIDs == nil || p.ListingTypeIDs == nil ||
		len(p.LocationIDs) > 1 || len(p.ListingTypeIDs) > 100 ||
		p.Nights < 1 || p.Nights > 365 || p.AdultsCount < 1 || p.ChildrenCount < 0 ||
		(p.ListingPriceSort != "asc" && p.ListingPriceSort != "desc") ||
		(p.ListingRatingSort != "asc" && p.ListingRatingSort != "desc") ||
		(p.ProductPriceSort != "asc" && p.ProductPriceSort != "desc") ||
		(p.ProductRatingSort != "asc" && p.ProductRatingSort != "desc") {
		return fmt.Errorf("invalid search_preferences: %w", domain.ErrInvalidInput)
	}
	for _, ids := range [][]int{p.LocationIDs, p.ListingTypeIDs} {
		seen := make(map[int]bool, len(ids))
		for _, id := range ids {
			if id <= 0 || seen[id] {
				return fmt.Errorf("invalid search_preferences IDs: %w", domain.ErrInvalidInput)
			}
			seen[id] = true
		}
	}
	return nil
}

func (s *ProfileService) ListClients(ctx context.Context, limit, offset int) ([]domain.Profile, int, error) {
	return s.repo.ListClients(ctx, limit, offset)
}
