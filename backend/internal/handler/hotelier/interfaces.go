package hotelier

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type Service interface {
	Profile(context.Context, string) (*domain.HotelierProfile, error)
	Listings(context.Context, string) ([]domain.HotelierListing, error)
	UpdateListingCard(context.Context, string, string, domain.HotelierListingCardInput) error
	CreateListing(context.Context, string, domain.CreateHotelierListingInput) (string, error)
	DeactivateListing(context.Context, string, string) error
	SetListingActive(context.Context, string, string, bool) error
	CanAccessListing(context.Context, string, string) (bool, error)
	ListBookings(context.Context, string, domain.BookingFilter, int, int) ([]domain.Booking, int, error)
	GetBooking(context.Context, string, string) (*domain.Booking, error)
	TransitionBooking(context.Context, string, string, string, string) (*domain.Booking, error)
	ListReviews(context.Context, string, domain.ListingReviewFilter, int, int) ([]domain.ListingReview, int, error)
	GetReview(context.Context, string) (*domain.ListingReview, error)
	ListUnits(context.Context, string, string) ([]domain.ListingUnit, error)
	GetUnit(context.Context, string, string) (*domain.ListingUnit, error)
	CreateUnit(context.Context, *domain.ListingUnit) error
	UpdateUnit(context.Context, string, string, domain.UpdateListingUnitInput) (*domain.ListingUnit, error)
	CreateUnitImage(context.Context, string, string, string, int) (*domain.ListingUnitImage, error)
	UpdateUnitImage(context.Context, string, string, string, *string, *int) (*domain.ListingUnitImage, error)
	DeleteUnitImage(context.Context, string, string, string) error
	ListMessages(context.Context, string, string, string, string, string, string, int, int) ([]domain.HotelierMessage, int, error)
	GetMessage(context.Context, string, string) (*domain.HotelierMessage, error)
	ReplyMessage(context.Context, string, string, string, bool) (*domain.HotelierMessage, error)
	CreateClientQuestion(context.Context, string, string, string) ([]domain.HotelierMessage, error)
	ListListingVideos(ctx context.Context, hotelierID, listingID string) ([]domain.FeedVideo, error)
	UploadListingVideo(ctx context.Context, hotelierID, listingID, srcPath string, input domain.CreateListingVideoInput) (*domain.FeedVideo, error)
	UpdateListingVideo(ctx context.Context, hotelierID, listingID, videoID string, patch domain.UpdateListingVideoInput) (*domain.FeedVideo, error)
	DeleteListingVideo(ctx context.Context, hotelierID, listingID, videoID string) error
}
