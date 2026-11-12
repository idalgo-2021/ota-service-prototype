package hotelier

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
	"go.uber.org/zap"
)

type mockHotelierService struct {
	canAccess bool
	videos    []domain.FeedVideo
	lastPatch domain.UpdateListingVideoInput
	deleted   bool
}

func (m *mockHotelierService) Profile(context.Context, string) (*domain.HotelierProfile, error) {
	return nil, nil
}
func (m *mockHotelierService) Listings(context.Context, string) ([]domain.HotelierListing, error) {
	return nil, nil
}
func (m *mockHotelierService) UpdateListingCard(context.Context, string, string, domain.HotelierListingCardInput) error {
	return nil
}
func (m *mockHotelierService) CreateListing(context.Context, string, domain.CreateHotelierListingInput) (string, error) {
	return "", nil
}
func (m *mockHotelierService) DeactivateListing(context.Context, string, string) error {
	return nil
}
func (m *mockHotelierService) SetListingActive(context.Context, string, string, bool) error {
	return nil
}
func (m *mockHotelierService) CanAccessListing(ctx context.Context, hotelierID, listingID string) (bool, error) {
	return m.canAccess, nil
}
func (m *mockHotelierService) ListBookings(context.Context, string, domain.BookingFilter, int, int) ([]domain.Booking, int, error) {
	return nil, 0, nil
}
func (m *mockHotelierService) GetBooking(context.Context, string, string) (*domain.Booking, error) {
	return nil, nil
}
func (m *mockHotelierService) TransitionBooking(context.Context, string, string, string, string) (*domain.Booking, error) {
	return nil, nil
}
func (m *mockHotelierService) ListReviews(context.Context, string, domain.ListingReviewFilter, int, int) ([]domain.ListingReview, int, error) {
	return nil, 0, nil
}
func (m *mockHotelierService) GetReview(context.Context, string) (*domain.ListingReview, error) {
	return nil, nil
}
func (m *mockHotelierService) ListUnits(context.Context, string, string) ([]domain.ListingUnit, error) {
	return nil, nil
}
func (m *mockHotelierService) GetUnit(context.Context, string, string) (*domain.ListingUnit, error) {
	return nil, nil
}
func (m *mockHotelierService) CreateUnit(context.Context, *domain.ListingUnit) error {
	return nil
}
func (m *mockHotelierService) UpdateUnit(context.Context, string, string, domain.UpdateListingUnitInput) (*domain.ListingUnit, error) {
	return nil, nil
}
func (m *mockHotelierService) CreateUnitImage(context.Context, string, string, string, int) (*domain.ListingUnitImage, error) {
	return nil, nil
}
func (m *mockHotelierService) UpdateUnitImage(context.Context, string, string, string, *string, *int) (*domain.ListingUnitImage, error) {
	return nil, nil
}
func (m *mockHotelierService) DeleteUnitImage(context.Context, string, string, string) error {
	return nil
}
func (m *mockHotelierService) ListMessages(context.Context, string, string, string, string, string, string, int, int) ([]domain.HotelierMessage, int, error) {
	return nil, 0, nil
}
func (m *mockHotelierService) GetMessage(context.Context, string, string) (*domain.HotelierMessage, error) {
	return nil, nil
}
func (m *mockHotelierService) ReplyMessage(context.Context, string, string, string, bool) (*domain.HotelierMessage, error) {
	return nil, nil
}
func (m *mockHotelierService) CreateClientQuestion(context.Context, string, string, string) ([]domain.HotelierMessage, error) {
	return nil, nil
}

func (m *mockHotelierService) ListListingVideos(ctx context.Context, hotelierID, listingID string) ([]domain.FeedVideo, error) {
	return m.videos, nil
}
func (m *mockHotelierService) UploadListingVideo(ctx context.Context, hotelierID, listingID, srcPath string, input domain.CreateListingVideoInput) (*domain.FeedVideo, error) {
	v := domain.FeedVideo{
		ID:        "11111111-2222-3333-4444-555555555555",
		ListingID: &listingID,
		Title:     input.Title,
		Subtitle:  input.Subtitle,
		Author:    input.Author,
		SortOrder: input.SortOrder,
		IsActive:  input.IsActive,
		CreatedAt: time.Now(),
	}
	m.videos = append(m.videos, v)
	return &v, nil
}
func (m *mockHotelierService) UpdateListingVideo(ctx context.Context, hotelierID, listingID, videoID string, patch domain.UpdateListingVideoInput) (*domain.FeedVideo, error) {
	m.lastPatch = patch
	v := domain.FeedVideo{
		ID:        videoID,
		ListingID: &listingID,
		Title:     "Updated Title",
		CreatedAt: time.Now(),
	}
	return &v, nil
}
func (m *mockHotelierService) DeleteListingVideo(ctx context.Context, hotelierID, listingID, videoID string) error {
	m.deleted = true
	return nil
}

func setupTestRouter(svc Service) *mux.Router {
	h := NewHandler(svc, 20, 100, zap.NewNop())
	r := mux.NewRouter()
	r.HandleFunc("/hotelier/listings/{listing_id}/videos", h.ListListingVideos).Methods("GET")
	r.HandleFunc("/hotelier/listings/{listing_id}/videos", h.UploadListingVideo).Methods("POST")
	r.HandleFunc("/hotelier/listings/{listing_id}/videos/{video_id}", h.UpdateListingVideo).Methods("PATCH")
	r.HandleFunc("/hotelier/listings/{listing_id}/videos/{video_id}", h.DeleteListingVideo).Methods("DELETE")
	return r
}

func withAuth(req *http.Request, userID string) *http.Request {
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	return req.WithContext(ctx)
}

func TestHotelierVideoHandler_ListVideos(t *testing.T) {
	listingID := "a9d0d501-b723-48e0-9f52-93db2e16f905"
	svc := &mockHotelierService{
		canAccess: true,
		videos: []domain.FeedVideo{
			{
				ID:        "22222222-3333-4444-5555-666666666666",
				ListingID: &listingID,
				Title:     "Pool View",
				CreatedAt: time.Now(),
			},
		},
	}
	router := setupTestRouter(svc)

	req := httptest.NewRequest("GET", "/hotelier/listings/"+listingID+"/videos", nil)
	req = withAuth(req, "hotelier-uuid-1")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d, body: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Data []ListingVideoResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(resp.Data) != 1 || resp.Data[0].Title != "Pool View" {
		t.Errorf("unexpected videos data: %+v", resp.Data)
	}
}

func TestHotelierVideoHandler_CanAccessForbidden(t *testing.T) {
	listingID := "a9d0d501-b723-48e0-9f52-93db2e16f905"
	svc := &mockHotelierService{
		canAccess: false, // Access denied
	}
	router := setupTestRouter(svc)

	req := httptest.NewRequest("GET", "/hotelier/listings/"+listingID+"/videos", nil)
	req = withAuth(req, "other-hotelier-uuid")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 NOT_FOUND for inaccessible listing, got %d", rec.Code)
	}
}

func TestHotelierVideoHandler_UploadVideo(t *testing.T) {
	listingID := "a9d0d501-b723-48e0-9f52-93db2e16f905"
	svc := &mockHotelierService{
		canAccess: true,
	}
	router := setupTestRouter(svc)

	// Build multipart body
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("title", "Luxury Room Tour")
	_ = writer.WriteField("subtitle", "King Bed & Balcony")
	part, err := writer.CreateFormFile("video", "clip.mp4")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	part.Write([]byte("dummy video content"))
	_ = writer.Close()

	req := httptest.NewRequest("POST", "/hotelier/listings/"+listingID+"/videos", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = withAuth(req, "hotelier-uuid-1")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d, body: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Data ListingVideoResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Data.Title != "Luxury Room Tour" || resp.Data.StreamURL == "" {
		t.Errorf("unexpected uploaded video response: %+v", resp.Data)
	}
}

func TestHotelierVideoHandler_DeleteVideo(t *testing.T) {
	listingID := "a9d0d501-b723-48e0-9f52-93db2e16f905"
	videoID := "11111111-2222-3333-4444-555555555555"
	svc := &mockHotelierService{
		canAccess: true,
	}
	router := setupTestRouter(svc)

	req := httptest.NewRequest("DELETE", "/hotelier/listings/"+listingID+"/videos/"+videoID, nil)
	req = withAuth(req, "hotelier-uuid-1")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204 No Content, got %d", rec.Code)
	}
	if !svc.deleted {
		t.Errorf("expected service DeleteListingVideo to be called")
	}
}
