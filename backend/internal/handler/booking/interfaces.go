package booking

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type BookingService interface {
	Available(ctx context.Context, listingID, start string, nights int, pets bool, currency string) ([]domain.ListingUnit, error)
	ListUnits(ctx context.Context, listingID, currency string) ([]domain.ListingUnit, error)
	CreateUnit(ctx context.Context, unit *domain.ListingUnit) error
	UpdateUnit(ctx context.Context, listingID, unitID string, input domain.UpdateListingUnitInput) (*domain.ListingUnit, error)
	CreateUnitImage(ctx context.Context, listingID, unitID, url string, sortOrder int) (*domain.ListingUnitImage, error)
	DeleteUnitImage(ctx context.Context, listingID, unitID, imageID string) error
	Create(ctx context.Context, userID string, input domain.CreateBookingInput) (*domain.Booking, error)
	List(ctx context.Context, userID string, staff bool, filter domain.BookingFilter, limit, offset int) ([]domain.Booking, int, error)
	Get(ctx context.Context, id, userID string, staff bool) (*domain.Booking, error)
	Transition(ctx context.Context, id, actorID, action, reason string, staff bool) (*domain.Booking, error)
}
