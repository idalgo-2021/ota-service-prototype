package service

import (
	"context"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"go.uber.org/zap"
)

type ratingSearchRepo struct {
	items []domain.AvailableListing
}

func (r *ratingSearchRepo) GetByID(context.Context, string, *domain.ListingFilter) (*domain.Listing, error) {
	panic("unused")
}
func (r *ratingSearchRepo) List(context.Context, int, int, *domain.ListingFilter) ([]domain.Listing, int, error) {
	panic("unused")
}
func (r *ratingSearchRepo) ListAll(context.Context, *domain.ListingFilter) ([]domain.Listing, error) {
	panic("unused")
}
func (r *ratingSearchRepo) SearchAvailable(context.Context, domain.AvailableListingsFilter) ([]domain.AvailableListing, int, error) {
	return append([]domain.AvailableListing(nil), r.items...), len(r.items), nil
}
func (r *ratingSearchRepo) LoadAvailableImages(context.Context, []domain.AvailableListing) error {
	return nil
}

func TestAvailableListingsRatingSortPutsUnratedLast(t *testing.T) {
	eight, nine := 8.0, 9.0
	date := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	repo := &ratingSearchRepo{items: []domain.AvailableListing{
		{Listing: domain.Listing{ID: "unrated", CreatedAt: date}},
		{Listing: domain.Listing{ID: "older-nine", CreatedAt: date, AverageOverallRating: &nine}},
		{Listing: domain.Listing{ID: "eight", CreatedAt: date, AverageOverallRating: &eight}},
		{Listing: domain.Listing{ID: "newer-nine", CreatedAt: date.Add(time.Hour), AverageOverallRating: &nine}},
	}}
	service := NewListingService(repo, zap.NewNop())
	for _, tt := range []struct {
		order string
		want  []string
	}{
		{"desc", []string{"newer-nine", "older-nine", "eight", "unrated"}},
		{"asc", []string{"eight", "newer-nine", "older-nine", "unrated"}},
	} {
		items, err := service.SearchAvailable(context.Background(), domain.AvailableListingsFilter{
			Sort: domain.Sort{By: "average_overall_rating", Order: tt.order},
		})
		if err != nil {
			t.Fatal(err)
		}
		for i, want := range tt.want {
			if items[i].ID != want {
				t.Fatalf("%s: item %d = %s, want %s", tt.order, i, items[i].ID, want)
			}
		}
	}
}
