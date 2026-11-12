package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type fakeListingImageRows struct {
	images  []domain.ListingImage
	index   int
	scanErr error
	iterErr error
	closed  bool
}

func (r *fakeListingImageRows) Next() bool {
	if r.index >= len(r.images) {
		return false
	}
	r.index++
	return true
}

func (r *fakeListingImageRows) Scan(dest ...any) error {
	if r.scanErr != nil {
		return r.scanErr
	}
	if r.index == 0 || r.index > len(r.images) || len(dest) != 4 {
		return errors.New("unexpected scan state")
	}

	image := r.images[r.index-1]
	*dest[0].(*string) = image.ID
	*dest[1].(*string) = image.URL
	*dest[2].(*int) = image.SortOrder
	*dest[3].(*time.Time) = image.CreatedAt
	return nil
}

func (r *fakeListingImageRows) Err() error { return r.iterErr }
func (r *fakeListingImageRows) Close()     { r.closed = true }

func TestLoadListingImagesReturnsQueryError(t *testing.T) {
	queryErr := errors.New("database unavailable")
	query := func(context.Context, string, ...any) (listingImageRows, error) {
		return nil, queryErr
	}

	_, err := loadListingImages(context.Background(), "listing-1", query)
	if !errors.Is(err, queryErr) {
		t.Fatalf("error = %v, want wrapped query error", err)
	}
}

func TestLoadListingImagesReturnsScanError(t *testing.T) {
	scanErr := errors.New("invalid image row")
	rows := &fakeListingImageRows{
		images:  []domain.ListingImage{{ID: "image-1"}},
		scanErr: scanErr,
	}
	query := func(context.Context, string, ...any) (listingImageRows, error) {
		return rows, nil
	}

	_, err := loadListingImages(context.Background(), "listing-1", query)
	if !errors.Is(err, scanErr) {
		t.Fatalf("error = %v, want wrapped scan error", err)
	}
	if !rows.closed {
		t.Error("rows were not closed after scan failure")
	}
}

func TestLoadListingImagesReturnsIterationError(t *testing.T) {
	iterationErr := errors.New("connection lost while reading rows")
	rows := &fakeListingImageRows{iterErr: iterationErr}
	query := func(context.Context, string, ...any) (listingImageRows, error) {
		return rows, nil
	}

	_, err := loadListingImages(context.Background(), "listing-1", query)
	if !errors.Is(err, iterationErr) {
		t.Fatalf("error = %v, want wrapped iteration error", err)
	}
	if !rows.closed {
		t.Error("rows were not closed after iteration failure")
	}
}

func TestLoadListingImagesReturnsScannedImages(t *testing.T) {
	createdAt := time.Date(2026, time.September, 25, 10, 0, 0, 0, time.UTC)
	want := domain.ListingImage{ID: "image-1", URL: "https://example.test/image.jpg", SortOrder: 3, CreatedAt: createdAt}
	rows := &fakeListingImageRows{images: []domain.ListingImage{want}}
	query := func(context.Context, string, ...any) (listingImageRows, error) {
		return rows, nil
	}

	got, err := loadListingImages(context.Background(), "listing-1", query)
	if err != nil {
		t.Fatalf("load images: %v", err)
	}
	if len(got) != 1 || got[0] != want {
		t.Fatalf("images = %#v, want %#v", got, []domain.ListingImage{want})
	}
	if !rows.closed {
		t.Error("rows were not closed after success")
	}
}
