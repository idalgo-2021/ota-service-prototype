package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type HotelierVideoRepository interface {
	CreateListingVideo(ctx context.Context, hotelierID, listingID string, input domain.CreateListingVideoInput) (*domain.FeedVideo, error)
	ListListingVideos(ctx context.Context, listingID string) ([]domain.FeedVideo, error)
	GetListingVideo(ctx context.Context, listingID, videoID string) (*domain.FeedVideo, error)
	UpdateListingVideo(ctx context.Context, listingID, videoID string, patch domain.UpdateListingVideoInput) (*domain.FeedVideo, error)
	DeleteListingVideo(ctx context.Context, listingID, videoID string) error
}

type VideoTranscoder interface {
	TranscodeToHLS(ctx context.Context, srcPath, videoID string) error
	DeleteMedia(videoID string) error
}

// HotelierService deliberately exposes scoped operations only; it does not forward staff-wide APIs.
type HotelierService struct {
	repo       HotelierRepository
	bookings   *BookingService
	reviews    *ListingReviewService
	inventory  *BookingService
	videoRepo  HotelierVideoRepository
	transcoder VideoTranscoder
}

func NewHotelierService(repo HotelierRepository, bookings, inventory *BookingService, reviews *ListingReviewService, videoRepo HotelierVideoRepository, transcoder VideoTranscoder) *HotelierService {
	return &HotelierService{
		repo:       repo,
		bookings:   bookings,
		reviews:    reviews,
		inventory:  inventory,
		videoRepo:  videoRepo,
		transcoder: transcoder,
	}
}

func (s *HotelierService) Listings(ctx context.Context, id string) ([]domain.HotelierListing, error) {
	return s.repo.ListHotelierListings(ctx, id)
}
func (s *HotelierService) UpdateListingCard(ctx context.Context, hotelierID, listingID string, input domain.HotelierListingCardInput) error {
	return s.repo.UpdateHotelierListingCard(ctx, hotelierID, listingID, input)
}
func (s *HotelierService) CreateListing(ctx context.Context, hotelierID string, input domain.CreateHotelierListingInput) (string, error) {
	return s.repo.CreateHotelierListing(ctx, hotelierID, input)
}
func (s *HotelierService) DeactivateListing(ctx context.Context, hotelierID, listingID string) error {
	return s.repo.SetHotelierListingActive(ctx, hotelierID, listingID, false)
}
func (s *HotelierService) SetListingActive(ctx context.Context, hotelierID, listingID string, active bool) error {
	return s.repo.SetHotelierListingActive(ctx, hotelierID, listingID, active)
}
func (s *HotelierService) Profile(ctx context.Context, id string) (*domain.HotelierProfile, error) {
	return s.repo.GetHotelierProfile(ctx, id)
}
func (s *HotelierService) CanAccessListing(ctx context.Context, userID, listingID string) (bool, error) {
	return s.repo.CanAccessListing(ctx, userID, listingID)
}
func (s *HotelierService) ListBookings(ctx context.Context, id string, f domain.BookingFilter, limit, offset int) ([]domain.Booking, int, error) {
	return s.bookings.ListHotelier(ctx, id, f, limit, offset)
}
func (s *HotelierService) GetBooking(ctx context.Context, id, userID string) (*domain.Booking, error) {
	return s.bookings.GetHotelier(ctx, id, userID)
}
func (s *HotelierService) TransitionBooking(ctx context.Context, id, userID, action, reason string) (*domain.Booking, error) {
	return s.bookings.TransitionHotelier(ctx, id, userID, action, reason)
}
func (s *HotelierService) ListReviews(ctx context.Context, hotelierID string, f domain.ListingReviewFilter, limit, offset int) ([]domain.ListingReview, int, error) {
	ids, err := s.repo.HotelierListingIDs(ctx, hotelierID)
	if err != nil {
		return nil, 0, err
	}
	f.ListingIDs = ids
	return s.reviews.List(ctx, f, limit, offset)
}
func (s *HotelierService) GetReview(ctx context.Context, id string) (*domain.ListingReview, error) {
	return s.reviews.Get(ctx, id, "", true)
}
func (s *HotelierService) ListUnits(ctx context.Context, listingID, currency string) ([]domain.ListingUnit, error) {
	return s.inventory.ListUnits(ctx, listingID, currency)
}
func (s *HotelierService) GetUnit(ctx context.Context, listingID, unitID string) (*domain.ListingUnit, error) {
	units, err := s.inventory.ListUnits(ctx, listingID, "")
	if err != nil {
		return nil, err
	}
	for i := range units {
		if units[i].ID == unitID {
			return &units[i], nil
		}
	}
	return nil, domain.NewNotFound("unit not found")
}
func (s *HotelierService) CreateUnit(ctx context.Context, u *domain.ListingUnit) error {
	return s.inventory.CreateUnit(ctx, u)
}
func (s *HotelierService) UpdateUnit(ctx context.Context, listingID, unitID string, in domain.UpdateListingUnitInput) (*domain.ListingUnit, error) {
	return s.inventory.UpdateUnit(ctx, listingID, unitID, in)
}
func (s *HotelierService) CreateUnitImage(ctx context.Context, listingID, unitID, url string, order int) (*domain.ListingUnitImage, error) {
	return s.inventory.CreateUnitImage(ctx, listingID, unitID, url, order)
}
func (s *HotelierService) UpdateUnitImage(ctx context.Context, listingID, unitID, imageID string, url *string, order *int) (*domain.ListingUnitImage, error) {
	return s.inventory.UpdateUnitImage(ctx, listingID, unitID, imageID, url, order)
}
func (s *HotelierService) DeleteUnitImage(ctx context.Context, listingID, unitID, imageID string) error {
	return s.inventory.DeleteUnitImage(ctx, listingID, unitID, imageID)
}
func (s *HotelierService) ListMessages(ctx context.Context, id, listingID, typ, status, sortBy, sortOrder string, limit, offset int) ([]domain.HotelierMessage, int, error) {
	return s.repo.ListMessages(ctx, id, listingID, typ, status, sortBy, sortOrder, limit, offset)
}
func (s *HotelierService) GetMessage(ctx context.Context, id, messageID string) (*domain.HotelierMessage, error) {
	return s.repo.GetMessage(ctx, id, messageID)
}
func (s *HotelierService) ReplyMessage(ctx context.Context, id, messageID, reply string, processed bool) (*domain.HotelierMessage, error) {
	return s.repo.ReplyMessage(ctx, id, messageID, reply, processed)
}
func (s *HotelierService) CreateClientQuestion(ctx context.Context, listingID, clientID, message string) ([]domain.HotelierMessage, error) {
	return s.repo.CreateClientQuestion(ctx, listingID, clientID, message)
}

func (s *HotelierService) ListListingVideos(ctx context.Context, hotelierID, listingID string) ([]domain.FeedVideo, error) {
	allowed, err := s.CanAccessListing(ctx, hotelierID, listingID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, domain.NewNotFound("listing not found")
	}
	if s.videoRepo == nil {
		return nil, errors.New("video repository not initialized")
	}
	return s.videoRepo.ListListingVideos(ctx, listingID)
}

func (s *HotelierService) UploadListingVideo(ctx context.Context, hotelierID, listingID, srcPath string, input domain.CreateListingVideoInput) (*domain.FeedVideo, error) {
	allowed, err := s.CanAccessListing(ctx, hotelierID, listingID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, domain.NewNotFound("listing not found")
	}
	if s.videoRepo == nil || s.transcoder == nil {
		return nil, errors.New("video dependencies not initialized")
	}

	video, err := s.videoRepo.CreateListingVideo(ctx, hotelierID, listingID, input)
	if err != nil {
		return nil, err
	}

	if err := s.transcoder.TranscodeToHLS(ctx, srcPath, video.ID); err != nil {
		_ = s.videoRepo.DeleteListingVideo(ctx, listingID, video.ID)
		return nil, fmt.Errorf("transcode video: %w", err)
	}

	return video, nil
}

func (s *HotelierService) UpdateListingVideo(ctx context.Context, hotelierID, listingID, videoID string, patch domain.UpdateListingVideoInput) (*domain.FeedVideo, error) {
	allowed, err := s.CanAccessListing(ctx, hotelierID, listingID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, domain.NewNotFound("listing not found")
	}
	if s.videoRepo == nil {
		return nil, errors.New("video repository not initialized")
	}
	return s.videoRepo.UpdateListingVideo(ctx, listingID, videoID, patch)
}

func (s *HotelierService) DeleteListingVideo(ctx context.Context, hotelierID, listingID, videoID string) error {
	allowed, err := s.CanAccessListing(ctx, hotelierID, listingID)
	if err != nil {
		return err
	}
	if !allowed {
		return domain.NewNotFound("listing not found")
	}
	if s.videoRepo == nil {
		return errors.New("video repository not initialized")
	}
	if err := s.videoRepo.DeleteListingVideo(ctx, listingID, videoID); err != nil {
		return err
	}
	if s.transcoder != nil {
		_ = s.transcoder.DeleteMedia(videoID)
	}
	return nil
}
