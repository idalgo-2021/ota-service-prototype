package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type mockHotelierRepo struct {
	canAccessFn func(ctx context.Context, hotelierID, listingID string) (bool, error)
}

func (m *mockHotelierRepo) GetHotelierProfile(ctx context.Context, hotelierID string) (*domain.HotelierProfile, error) {
	return nil, nil
}
func (m *mockHotelierRepo) CanAccessListing(ctx context.Context, hotelierID, listingID string) (bool, error) {
	if m.canAccessFn != nil {
		return m.canAccessFn(ctx, hotelierID, listingID)
	}
	return true, nil
}
func (m *mockHotelierRepo) ListHotelierListings(ctx context.Context, hotelierID string) ([]domain.HotelierListing, error) {
	return nil, nil
}
func (m *mockHotelierRepo) UpdateHotelierListingCard(ctx context.Context, hotelierID, listingID string, input domain.HotelierListingCardInput) error {
	return nil
}
func (m *mockHotelierRepo) CreateHotelierListing(ctx context.Context, hotelierID string, input domain.CreateHotelierListingInput) (string, error) {
	return "", nil
}
func (m *mockHotelierRepo) SetHotelierListingActive(ctx context.Context, hotelierID, listingID string, active bool) error {
	return nil
}
func (m *mockHotelierRepo) HotelierListingIDs(ctx context.Context, hotelierID string) ([]string, error) {
	return nil, nil
}
func (m *mockHotelierRepo) ListMessages(ctx context.Context, hotelierID, listingID, messageType, status, sortBy, sortOrder string, limit, offset int) ([]domain.HotelierMessage, int, error) {
	return nil, 0, nil
}
func (m *mockHotelierRepo) GetMessage(ctx context.Context, hotelierID, messageID string) (*domain.HotelierMessage, error) {
	return nil, nil
}
func (m *mockHotelierRepo) ReplyMessage(ctx context.Context, hotelierID, messageID, reply string, processed bool) (*domain.HotelierMessage, error) {
	return nil, nil
}
func (m *mockHotelierRepo) CreateClientQuestion(ctx context.Context, listingID, clientID, messageText string) ([]domain.HotelierMessage, error) {
	return nil, nil
}

type mockVideoRepo struct {
	createFn func(ctx context.Context, hotelierID, listingID string, input domain.CreateListingVideoInput) (*domain.FeedVideo, error)
	listFn   func(ctx context.Context, listingID string) ([]domain.FeedVideo, error)
	getFn    func(ctx context.Context, listingID, videoID string) (*domain.FeedVideo, error)
	updateFn func(ctx context.Context, listingID, videoID string, patch domain.UpdateListingVideoInput) (*domain.FeedVideo, error)
	deleteFn func(ctx context.Context, listingID, videoID string) error
}

func (m *mockVideoRepo) CreateListingVideo(ctx context.Context, hotelierID, listingID string, input domain.CreateListingVideoInput) (*domain.FeedVideo, error) {
	if m.createFn != nil {
		return m.createFn(ctx, hotelierID, listingID, input)
	}
	return &domain.FeedVideo{ID: uuid.NewString(), ListingID: &listingID, HotelierID: &hotelierID, CreatedAt: time.Now()}, nil
}
func (m *mockVideoRepo) ListListingVideos(ctx context.Context, listingID string) ([]domain.FeedVideo, error) {
	if m.listFn != nil {
		return m.listFn(ctx, listingID)
	}
	return nil, nil
}
func (m *mockVideoRepo) GetListingVideo(ctx context.Context, listingID, videoID string) (*domain.FeedVideo, error) {
	if m.getFn != nil {
		return m.getFn(ctx, listingID, videoID)
	}
	return nil, nil
}
func (m *mockVideoRepo) UpdateListingVideo(ctx context.Context, listingID, videoID string, patch domain.UpdateListingVideoInput) (*domain.FeedVideo, error) {
	if m.updateFn != nil {
		return m.updateFn(ctx, listingID, videoID, patch)
	}
	return nil, nil
}
func (m *mockVideoRepo) DeleteListingVideo(ctx context.Context, listingID, videoID string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, listingID, videoID)
	}
	return nil
}

type mockTranscoder struct {
	transcodeFn func(ctx context.Context, srcPath, videoID string) error
	deleteFn    func(videoID string) error
}

func (m *mockTranscoder) TranscodeToHLS(ctx context.Context, srcPath, videoID string) error {
	if m.transcodeFn != nil {
		return m.transcodeFn(ctx, srcPath, videoID)
	}
	return nil
}
func (m *mockTranscoder) DeleteMedia(videoID string) error {
	if m.deleteFn != nil {
		return m.deleteFn(videoID)
	}
	return nil
}

func TestHotelierService_ListListingVideos(t *testing.T) {
	ctx := context.Background()
	hotelierID := uuid.NewString()
	listingID := uuid.NewString()

	t.Run("access denied", func(t *testing.T) {
		hRepo := &mockHotelierRepo{
			canAccessFn: func(ctx context.Context, hID, lID string) (bool, error) {
				return false, nil
			},
		}
		svc := NewHotelierService(hRepo, nil, nil, nil, nil, nil)
		_, err := svc.ListListingVideos(ctx, hotelierID, listingID)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var notFound domain.NotFoundError
		if !errors.As(err, &notFound) {
			t.Fatalf("expected NotFoundError, got %T (%v)", err, err)
		}
	})

	t.Run("access granted", func(t *testing.T) {
		hRepo := &mockHotelierRepo{
			canAccessFn: func(ctx context.Context, hID, lID string) (bool, error) {
				return true, nil
			},
		}
		vRepo := &mockVideoRepo{
			listFn: func(ctx context.Context, lID string) ([]domain.FeedVideo, error) {
				return []domain.FeedVideo{
					{ID: "v1", ListingID: &lID, Title: "Video 1"},
				}, nil
			},
		}
		svc := NewHotelierService(hRepo, nil, nil, nil, vRepo, nil)
		res, err := svc.ListListingVideos(ctx, hotelierID, listingID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(res) != 1 || res[0].ID != "v1" {
			t.Fatalf("unexpected result: %+v", res)
		}
	})
}

func TestHotelierService_UploadListingVideo(t *testing.T) {
	ctx := context.Background()
	hotelierID := uuid.NewString()
	listingID := uuid.NewString()

	t.Run("access denied", func(t *testing.T) {
		hRepo := &mockHotelierRepo{
			canAccessFn: func(ctx context.Context, hID, lID string) (bool, error) {
				return false, nil
			},
		}
		svc := NewHotelierService(hRepo, nil, nil, nil, nil, nil)
		_, err := svc.UploadListingVideo(ctx, hotelierID, listingID, "/tmp/test.mp4", domain.CreateListingVideoInput{})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("success", func(t *testing.T) {
		hRepo := &mockHotelierRepo{
			canAccessFn: func(ctx context.Context, hID, lID string) (bool, error) {
				return true, nil
			},
		}
		vRepo := &mockVideoRepo{
			createFn: func(ctx context.Context, hID, lID string, input domain.CreateListingVideoInput) (*domain.FeedVideo, error) {
				return &domain.FeedVideo{
					ID:         "vid-123",
					ListingID:  &lID,
					HotelierID: &hID,
					Title:      input.Title,
				}, nil
			},
		}
		transcoded := false
		tc := &mockTranscoder{
			transcodeFn: func(ctx context.Context, srcPath, videoID string) error {
				if videoID == "vid-123" {
					transcoded = true
				}
				return nil
			},
		}
		svc := NewHotelierService(hRepo, nil, nil, nil, vRepo, tc)
		v, err := svc.UploadListingVideo(ctx, hotelierID, listingID, "/tmp/test.mp4", domain.CreateListingVideoInput{Title: "Lobby"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if v.ID != "vid-123" || !transcoded {
			t.Fatalf("transcode not called or wrong video: %+v", v)
		}
	})

	t.Run("transcode fails rolls back db record", func(t *testing.T) {
		hRepo := &mockHotelierRepo{
			canAccessFn: func(ctx context.Context, hID, lID string) (bool, error) {
				return true, nil
			},
		}
		deletedVideoID := ""
		vRepo := &mockVideoRepo{
			createFn: func(ctx context.Context, hID, lID string, input domain.CreateListingVideoInput) (*domain.FeedVideo, error) {
				return &domain.FeedVideo{
					ID:        "vid-rollback",
					ListingID: &lID,
				}, nil
			},
			deleteFn: func(ctx context.Context, lID, vID string) error {
				deletedVideoID = vID
				return nil
			},
		}
		tc := &mockTranscoder{
			transcodeFn: func(ctx context.Context, srcPath, videoID string) error {
				return errors.New("ffmpeg failed")
			},
		}
		svc := NewHotelierService(hRepo, nil, nil, nil, vRepo, tc)
		_, err := svc.UploadListingVideo(ctx, hotelierID, listingID, "/tmp/test.mp4", domain.CreateListingVideoInput{Title: "Fail"})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if deletedVideoID != "vid-rollback" {
			t.Fatalf("expected rollback deletion of vid-rollback, got %s", deletedVideoID)
		}
	})
}

func TestHotelierService_DeleteListingVideo(t *testing.T) {
	ctx := context.Background()
	hotelierID := uuid.NewString()
	listingID := uuid.NewString()
	videoID := uuid.NewString()

	t.Run("access denied", func(t *testing.T) {
		hRepo := &mockHotelierRepo{
			canAccessFn: func(ctx context.Context, hID, lID string) (bool, error) {
				return false, nil
			},
		}
		svc := NewHotelierService(hRepo, nil, nil, nil, nil, nil)
		err := svc.DeleteListingVideo(ctx, hotelierID, listingID, videoID)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("success", func(t *testing.T) {
		hRepo := &mockHotelierRepo{
			canAccessFn: func(ctx context.Context, hID, lID string) (bool, error) {
				return true, nil
			},
		}
		repoDeleted := false
		vRepo := &mockVideoRepo{
			deleteFn: func(ctx context.Context, lID, vID string) error {
				if lID == listingID && vID == videoID {
					repoDeleted = true
				}
				return nil
			},
		}
		diskDeleted := false
		tc := &mockTranscoder{
			deleteFn: func(vID string) error {
				if vID == videoID {
					diskDeleted = true
				}
				return nil
			},
		}
		svc := NewHotelierService(hRepo, nil, nil, nil, vRepo, tc)
		err := svc.DeleteListingVideo(ctx, hotelierID, listingID, videoID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !repoDeleted || !diskDeleted {
			t.Fatalf("expected both repo and disk delete: repo=%v disk=%v", repoDeleted, diskDeleted)
		}
	})
}
