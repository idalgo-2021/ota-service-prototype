package service

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/shopspring/decimal"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func (s *ListingService) Search(ctx context.Context, filter domain.ListingSearchFilter) ([]domain.ListingSearchItem, error) {
	if filter.AvailabilityMode == domain.AvailabilityForGuests {
		available, err := s.SearchAvailable(ctx, filter.AvailableFilter)
		if err != nil {
			return nil, err
		}
		result := make([]domain.ListingSearchItem, 0, len(available))
		for _, item := range available {
			options := item.LowestPriceOptions
			result = append(result, domain.ListingSearchItem{Listing: item.Listing, LowestPriceOptions: &options})
		}
		return result, nil
	}
	if filter.AvailabilityMode != domain.AvailabilityIgnore && filter.AvailabilityMode != domain.AvailabilityAnyUnit {
		return nil, fmt.Errorf("unknown availability mode: %w", domain.ErrInvalidInput)
	}
	listings, err := s.repo.ListAll(ctx, &filter.ListingFilter)
	if err != nil {
		return nil, err
	}
	result := make([]domain.ListingSearchItem, 0, len(listings))
	for _, item := range listings {
		result = append(result, domain.ListingSearchItem{Listing: item})
	}
	return result, nil
}

type ListingService struct {
	repo        ListingRepository
	logger      *zap.Logger
	currencySvc *CurrencyService
}

func NewListingService(repo ListingRepository, logger *zap.Logger, currency ...*CurrencyService) *ListingService {
	var cs *CurrencyService
	if len(currency) > 0 {
		cs = currency[0]
	}
	return &ListingService{repo: repo, logger: logger, currencySvc: cs}
}

func (s *ListingService) SearchAvailable(ctx context.Context, filter domain.AvailableListingsFilter) ([]domain.AvailableListing, error) {
	currency := filter.Currency
	rate := decimal.NewFromInt(1)
	if s.currencySvc != nil {
		if currency == "" {
			currency = s.currencySvc.Base()
		}
		_, rateValue, _, err := s.currencySvc.Quote(ctx, currency, time.Now())
		if err != nil {
			return nil, err
		}
		rate = rateValue
	}
	result, _, err := s.repo.SearchAvailable(ctx, filter)
	if err != nil {
		return nil, err
	}
	if s.currencySvc != nil {
		currency = strings.ToUpper(currency)
		for i := range result {
			for j := range result[i].LowestPriceOptions {
				o := &result[i].LowestPriceOptions[j]
				o.Currency = currency
				o.TotalPricePerNight = o.TotalPricePerNight.Mul(rate)
				for k := range o.Units {
					o.Units[k].Currency = currency
					o.Units[k].PricePerNight = o.Units[k].PricePerNight.Mul(rate)
				}
			}
		}
	}
	sort.SliceStable(result, func(i, j int) bool {
		for _, criterion := range []struct{ field, order string }{
			{filter.Sort.By, filter.Sort.Order},
			{filter.Sort.ThenBy, filter.Sort.ThenOrder},
		} {
			if criterion.field == "" {
				continue
			}
			comparison, applyDirection := compareAvailableListings(result[i], result[j], criterion.field)
			if comparison == 0 {
				continue
			}
			if !applyDirection {
				return comparison < 0
			}
			if criterion.order == "desc" {
				return comparison > 0
			}
			return comparison < 0
		}
		return listingTieLess(result[i].Listing, result[j].Listing)
	})
	if err := s.repo.LoadAvailableImages(ctx, result); err != nil {
		return nil, err
	}
	return result, nil
}

func listingTieLess(left, right domain.Listing) bool {
	if !left.CreatedAt.Equal(right.CreatedAt) {
		return left.CreatedAt.After(right.CreatedAt)
	}
	return left.ID > right.ID
}

func lowestOptionPrice(item domain.AvailableListing) (decimal.Decimal, bool) {
	if len(item.LowestPriceOptions) == 0 {
		return decimal.Zero, false
	}
	price := item.LowestPriceOptions[0].TotalPricePerNight
	for _, option := range item.LowestPriceOptions[1:] {
		if option.TotalPricePerNight.LessThan(price) {
			price = option.TotalPricePerNight
		}
	}
	return price, true
}

// compareAvailableListings returns -1/0/1; missing values sort last regardless of direction.
func compareAvailableListings(left, right domain.AvailableListing, field string) (int, bool) {
	if field == "average_overall_rating" {
		l, r := left.AverageOverallRating, right.AverageOverallRating
		if l == nil || r == nil {
			if l == nil && r == nil {
				return 0, false
			}
			if l == nil {
				return 1, false
			}
			return -1, false
		}
		if *l < *r {
			return -1, true
		}
		if *l > *r {
			return 1, true
		}
		return 0, true
	}
	if field == "price_per_night" {
		l, lok := lowestOptionPrice(left)
		r, rok := lowestOptionPrice(right)
		if !lok || !rok {
			if !lok && !rok {
				return 0, false
			}
			if !lok {
				return 1, false
			}
			return -1, false
		}
		if l.LessThan(r) {
			return -1, true
		}
		if l.GreaterThan(r) {
			return 1, true
		}
		return 0, true
	}
	return 0, false
}

func (s *ListingService) GetListing(ctx context.Context, id string, filter *domain.ListingFilter) (*domain.Listing, error) {
	listing, err := s.repo.GetByID(ctx, id, filter)
	if err != nil {
		return nil, err
	}
	return listing, nil
}

func (s *ListingService) ListListings(ctx context.Context, limit, offset int, filter *domain.ListingFilter) ([]domain.Listing, int, error) {
	listings, total, err := s.repo.List(ctx, limit, offset, filter)
	if err != nil {
		return nil, 0, err
	}
	return listings, total, nil
}
