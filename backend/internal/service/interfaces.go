package service

import (
	"context"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

// DictionaryRepository defines the contract for dictionary persistence operations.
type DictionaryRepository interface {
	GetCountries(ctx context.Context) ([]domain.Country, error)
	GetLocations(ctx context.Context) ([]domain.Location, error)
	GetListingTypes(ctx context.Context) ([]domain.ListingType, error)
	GetCurrencies(ctx context.Context) ([]domain.Currency, error)
	GetFeatures(ctx context.Context) ([]domain.FeatureTag, error)
}

// UserRepository defines the contract for user persistence operations.
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Create(ctx context.Context, user *domain.User) error
}

type ProfileRepository interface {
	GetByUserID(ctx context.Context, userID string) (*domain.Profile, error)
	Update(ctx context.Context, profile *domain.Profile, patch domain.ProfilePatch) (*domain.Profile, error)
	ListClients(ctx context.Context, limit, offset int) ([]domain.Profile, int, error)
}

// ProductRepository defines the contract for product persistence operations.
type ProductRepository interface {
	GetByID(ctx context.Context, id string, activeOnly bool) (*domain.Product, error)
	GetByIDs(ctx context.Context, ids []string) (map[string]*domain.Product, error)
	List(ctx context.Context, limit, offset int, filter domain.ProductFilter) ([]domain.Product, int, error)
}

// OrderRepository defines the contract for order persistence operations.
type OrderRepository interface {
	GetByID(ctx context.Context, id string) (*domain.Order, error)
	Create(ctx context.Context, order *domain.Order) error
	Update(ctx context.Context, order *domain.Order) error
	UpdatePending(ctx context.Context, order *domain.Order, cutoff time.Time) error
	GetByUserID(ctx context.Context, userID string, sort domain.Sort, statuses []domain.OrderStatus, limit, offset int) ([]domain.Order, int, error)
	GetAll(ctx context.Context, filter domain.OrderFilter, limit, offset int) ([]domain.Order, int, error)
}

// ListingRepository defines the contract for listing persistence operations.
type ListingRepository interface {
	GetByID(ctx context.Context, id string, filter *domain.ListingFilter) (*domain.Listing, error)
	List(ctx context.Context, limit, offset int, filter *domain.ListingFilter) ([]domain.Listing, int, error)
	ListAll(ctx context.Context, filter *domain.ListingFilter) ([]domain.Listing, error)
	SearchAvailable(ctx context.Context, filter domain.AvailableListingsFilter) ([]domain.AvailableListing, int, error)
	LoadAvailableImages(ctx context.Context, listings []domain.AvailableListing) error
}

// OrderListingRepository exposes only the listing data required when an order is linked to a stay.
type OrderListingRepository interface {
	GetByID(ctx context.Context, id string, filter *domain.ListingFilter) (*domain.Listing, error)
}

// BookingRepository defines persistence for accommodation inventory and bookings.
type BookingRepository interface {
	ListUnits(context.Context, string, bool) ([]domain.ListingUnit, error)
	GetUnit(context.Context, string, string) (*domain.ListingUnit, error)
	CreateUnit(context.Context, *domain.ListingUnit) error
	UpdateUnit(context.Context, *domain.ListingUnit) error
	CreateUnitImage(context.Context, string, string, string, int) (*domain.ListingUnitImage, error)
	UpdateUnitImage(context.Context, string, string, string, *string, *int) (*domain.ListingUnitImage, error)
	DeleteUnitImage(context.Context, string, string, string) error
	AvailableUnits(context.Context, string, string, string, bool) ([]domain.ListingUnit, error)
	CreateBooking(context.Context, string, domain.CreateBookingInput, string, domain.CurrencyQuote) (string, error)
	GetBooking(context.Context, string) (*domain.Booking, error)
	ListBookings(context.Context, string, bool, domain.BookingFilter, int, int) ([]domain.Booking, int, error)
	GetBookingForHotelier(context.Context, string, string) (*domain.Booking, error)
	TransitionHotelier(context.Context, string, string, string, string) error
	Transition(context.Context, string, string, string, string, bool) error
}

// CounterpartyRepository lists partners for the management API.
type CounterpartyRepository interface {
	List(ctx context.Context, locationID *int, limit, offset int) ([]domain.Counterparty, int, error)
}

// HotelierRepository exposes the hotelier-scoped persistence operations used by HotelierService.
type HotelierRepository interface {
	GetHotelierProfile(ctx context.Context, hotelierID string) (*domain.HotelierProfile, error)
	CanAccessListing(ctx context.Context, hotelierID, listingID string) (bool, error)
	ListHotelierListings(ctx context.Context, hotelierID string) ([]domain.HotelierListing, error)
	UpdateHotelierListingCard(ctx context.Context, hotelierID, listingID string, input domain.HotelierListingCardInput) error
	CreateHotelierListing(ctx context.Context, hotelierID string, input domain.CreateHotelierListingInput) (string, error)
	SetHotelierListingActive(ctx context.Context, hotelierID, listingID string, active bool) error
	HotelierListingIDs(ctx context.Context, hotelierID string) ([]string, error)
	ListMessages(ctx context.Context, hotelierID, listingID, messageType, status, sortBy, sortOrder string, limit, offset int) ([]domain.HotelierMessage, int, error)
	GetMessage(ctx context.Context, hotelierID, messageID string) (*domain.HotelierMessage, error)
	ReplyMessage(ctx context.Context, hotelierID, messageID, reply string, processed bool) (*domain.HotelierMessage, error)
	CreateClientQuestion(ctx context.Context, listingID, clientID, messageText string) ([]domain.HotelierMessage, error)
}
