package service

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/shopspring/decimal"
)

type BookingService struct {
	repo        BookingRepository
	currencySvc *CurrencyService
}

func NewBookingService(repo BookingRepository, currency ...*CurrencyService) *BookingService {
	var cs *CurrencyService
	if len(currency) > 0 {
		cs = currency[0]
	}
	return &BookingService{repo: repo, currencySvc: cs}
}

func validatePeriod(start string, nights int) (string, error) {
	date, err := time.ParseInLocation("2006-01-02", start, time.Local)
	if err != nil || date.Format("2006-01-02") != start || nights < 1 || nights > 365 {
		return "", fmt.Errorf("invalid stay dates: %w", domain.ErrInvalidInput)
	}
	return date.AddDate(0, 0, nights).Format("2006-01-02"), nil
}

func (s *BookingService) Available(ctx context.Context, listingID, start string, nights int, pets bool, currency string) ([]domain.ListingUnit, error) {
	if _, err := uuid.Parse(listingID); err != nil {
		return nil, fmt.Errorf("invalid listing ID: %w", domain.ErrInvalidInput)
	}
	end, err := validatePeriod(start, nights)
	if err != nil {
		return nil, err
	}
	u, err := s.repo.AvailableUnits(ctx, listingID, start, end, pets)
	return s.convertUnits(ctx, u, currency)
}

func (s *BookingService) Create(ctx context.Context, userID string, in domain.CreateBookingInput) (*domain.Booking, error) {
	in.Currency = strings.ToUpper(strings.TrimSpace(in.Currency))
	if len(in.Currency) != 3 || strings.ContainsFunc(in.Currency, func(r rune) bool { return r < 'A' || r > 'Z' }) {
		return nil, fmt.Errorf("%w: currency must be a three-letter uppercase code", domain.ErrInvalidInput)
	}
	if _, err := uuid.Parse(in.ListingID); err != nil {
		return nil, fmt.Errorf("invalid listing ID: %w", domain.ErrInvalidInput)
	}
	end, err := validatePeriod(in.CheckInDate, in.Nights)
	if err != nil {
		return nil, err
	}
	if in.AdultsCount < 0 || in.ChildrenCount < 0 || in.AdultsCount+in.ChildrenCount < 1 || len(in.UnitIDs) < 1 || len(in.UnitIDs) > 100 {
		return nil, fmt.Errorf("invalid guests or units: %w", domain.ErrInvalidInput)
	}
	seen := map[string]bool{}
	for _, id := range in.UnitIDs {
		parsed, err := uuid.Parse(id)
		if err != nil || seen[parsed.String()] {
			return nil, fmt.Errorf("invalid or duplicate unit: %w", domain.ErrInvalidInput)
		}
		seen[parsed.String()] = true
	}
	quote := domain.CurrencyQuote{Currency: in.Currency, Rate: decimal.NewFromInt(1), QuotedAt: time.Now()}
	if s.currencySvc != nil {
		rateID, rate, quotedAt, err := s.currencySvc.Quote(ctx, in.Currency, quote.QuotedAt)
		if err != nil {
			return nil, err
		}
		quote.Rate = rate
		quote.QuotedAt = quotedAt
		if rateID != "" {
			quote.RateID = &rateID
		}
	}
	id, err := s.repo.CreateBooking(ctx, userID, in, end, quote)
	if err != nil {
		return nil, err
	}
	return s.repo.GetBooking(ctx, id)
}

func (s *BookingService) ListUnits(ctx context.Context, listingID, currency string) ([]domain.ListingUnit, error) {
	u, err := s.repo.ListUnits(ctx, listingID, false)
	if err != nil {
		return nil, err
	}
	return s.convertUnits(ctx, u, currency)
}

func (s *BookingService) convertUnits(ctx context.Context, units []domain.ListingUnit, currency string) ([]domain.ListingUnit, error) {
	if s.currencySvc == nil {
		return units, nil
	}
	if currency == "" {
		currency = s.currencySvc.Base()
	}
	_, rate, _, err := s.currencySvc.Quote(ctx, currency, time.Now())
	if err != nil {
		return nil, err
	}
	for i := range units {
		units[i].PricePerNight = units[i].PricePerNight.Mul(rate)
		units[i].Currency = strings.ToUpper(currency)
	}
	return units, nil
}

func (s *BookingService) CreateUnit(ctx context.Context, u *domain.ListingUnit) error {
	if err := validateUnit(u); err != nil {
		return err
	}
	return s.repo.CreateUnit(ctx, u)
}

func (s *BookingService) UpdateUnit(ctx context.Context, listingID, unitID string, patch domain.UpdateListingUnitInput) (*domain.ListingUnit, error) {
	u, err := s.repo.GetUnit(ctx, listingID, unitID)
	if err != nil {
		return nil, err
	}
	if patch.Name != nil {
		u.Name = *patch.Name
	}
	if patch.NameRUSet {
		u.NameRU = patch.NameRU
	}
	if patch.PricePerNight != nil {
		u.PricePerNight = *patch.PricePerNight
	}
	if patch.Currency != nil {
		u.Currency = *patch.Currency
	}
	if patch.CapacityAdults != nil {
		u.CapacityAdults = *patch.CapacityAdults
	}
	if patch.CapacityChildren != nil {
		u.CapacityChildren = *patch.CapacityChildren
	}
	if patch.PetsAllowed != nil {
		u.PetsAllowed = *patch.PetsAllowed
	}
	if patch.IsActive != nil {
		u.IsActive = *patch.IsActive
	}
	if err := validateUnit(u); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateUnit(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

func validateUnit(u *domain.ListingUnit) error {
	if _, err := uuid.Parse(u.ListingID); err != nil {
		return fmt.Errorf("invalid listing ID: %w", domain.ErrInvalidInput)
	}
	if strings.TrimSpace(u.Name) == "" || strings.ContainsFunc(u.Name, func(r rune) bool { return unicode.In(r, unicode.Cyrillic) }) || u.CapacityAdults < 0 || u.CapacityChildren < 0 || u.CapacityAdults+u.CapacityChildren < 1 {
		return fmt.Errorf("invalid unit properties: %w", domain.ErrInvalidInput)
	}
	if u.NameRU != nil && strings.TrimSpace(*u.NameRU) == "" {
		return fmt.Errorf("invalid unit name_ru: %w", domain.ErrInvalidInput)
	}
	if u.PricePerNight.IsNegative() || u.PricePerNight.Exponent() < -2 || len(u.Currency) != 3 {
		return fmt.Errorf("invalid unit price or currency: %w", domain.ErrInvalidInput)
	}
	for _, letter := range u.Currency {
		if letter < 'A' || letter > 'Z' {
			return fmt.Errorf("invalid currency: %w", domain.ErrInvalidInput)
		}
	}
	if u.Type != "property" && u.Type != "room" && u.Type != "bed" {
		return fmt.Errorf("invalid unit type: %w", domain.ErrInvalidInput)
	}
	if (u.Type == "bed") != (u.ParentUnitID != nil) {
		return fmt.Errorf("invalid parent unit: %w", domain.ErrInvalidInput)
	}
	if u.ParentUnitID != nil {
		if _, err := uuid.Parse(*u.ParentUnitID); err != nil {
			return fmt.Errorf("invalid parent unit: %w", domain.ErrInvalidInput)
		}
	}
	return nil
}

func (s *BookingService) CreateUnitImage(ctx context.Context, listingID, unitID, rawURL string, sortOrder int) (*domain.ListingUnitImage, error) {
	if _, err := uuid.Parse(listingID); err != nil {
		return nil, fmt.Errorf("invalid listing ID: %w", domain.ErrInvalidInput)
	}
	if _, err := uuid.Parse(unitID); err != nil {
		return nil, fmt.Errorf("invalid unit ID: %w", domain.ErrInvalidInput)
	}
	parsed, err := url.Parse(rawURL)
	if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" || sortOrder < 0 {
		return nil, fmt.Errorf("invalid image URL or order: %w", domain.ErrInvalidInput)
	}
	return s.repo.CreateUnitImage(ctx, listingID, unitID, rawURL, sortOrder)
}

func (s *BookingService) DeleteUnitImage(ctx context.Context, listingID, unitID, imageID string) error {
	for _, id := range []string{listingID, unitID, imageID} {
		if _, err := uuid.Parse(id); err != nil {
			return fmt.Errorf("invalid ID: %w", domain.ErrInvalidInput)
		}
	}
	return s.repo.DeleteUnitImage(ctx, listingID, unitID, imageID)
}

func (s *BookingService) UpdateUnitImage(ctx context.Context, listingID, unitID, imageID string, rawURL *string, sortOrder *int) (*domain.ListingUnitImage, error) {
	for _, id := range []string{listingID, unitID, imageID} {
		if _, err := uuid.Parse(id); err != nil {
			return nil, fmt.Errorf("invalid ID: %w", domain.ErrInvalidInput)
		}
	}
	if rawURL == nil && sortOrder == nil {
		return nil, fmt.Errorf("empty image patch: %w", domain.ErrInvalidInput)
	}
	if rawURL != nil {
		parsed, err := url.Parse(*rawURL)
		if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
			return nil, fmt.Errorf("invalid image URL: %w", domain.ErrInvalidInput)
		}
	}
	if sortOrder != nil && *sortOrder < 0 {
		return nil, fmt.Errorf("invalid image order: %w", domain.ErrInvalidInput)
	}
	return s.repo.UpdateUnitImage(ctx, listingID, unitID, imageID, rawURL, sortOrder)
}

func (s *BookingService) Get(ctx context.Context, id, actor string, staff bool) (*domain.Booking, error) {
	b, err := s.repo.GetBooking(ctx, id)
	if err != nil {
		return nil, err
	}
	if !staff && b.UserID != actor {
		return nil, domain.NewNotFound("booking not found")
	}
	return b, nil
}

func (s *BookingService) List(ctx context.Context, actor string, staff bool, f domain.BookingFilter, limit, offset int) ([]domain.Booking, int, error) {
	return s.repo.ListBookings(ctx, actor, staff, f, limit, offset)
}

func (s *BookingService) GetHotelier(ctx context.Context, id, hotelierID string) (*domain.Booking, error) {
	return s.repo.GetBookingForHotelier(ctx, id, hotelierID)
}

func (s *BookingService) ListHotelier(ctx context.Context, hotelierID string, f domain.BookingFilter, limit, offset int) ([]domain.Booking, int, error) {
	f.HotelierOnly = true
	return s.repo.ListBookings(ctx, hotelierID, false, f, limit, offset)
}

func (s *BookingService) TransitionHotelier(ctx context.Context, id, actorID, action, reason string) (*domain.Booking, error) {
	if action != "check-in" && action != "check-out" && action != "cancel" {
		return nil, domain.ErrInvalidInput
	}
	if action == "cancel" && strings.TrimSpace(reason) == "" {
		return nil, fmt.Errorf("cancellation reason is required: %w", domain.ErrInvalidInput)
	}
	if err := s.repo.TransitionHotelier(ctx, id, actorID, action, reason); err != nil {
		return nil, err
	}
	return s.repo.GetBookingForHotelier(ctx, id, actorID)
}

func (s *BookingService) Transition(ctx context.Context, id, actor, action, reason string, staff bool) (*domain.Booking, error) {
	if action == "cancel" && strings.TrimSpace(reason) == "" {
		return nil, fmt.Errorf("cancellation reason required: %w", domain.ErrInvalidInput)
	}
	if err := s.repo.Transition(ctx, id, actor, action, strings.TrimSpace(reason), staff); err != nil {
		return nil, err
	}
	return s.Get(ctx, id, actor, staff)
}
