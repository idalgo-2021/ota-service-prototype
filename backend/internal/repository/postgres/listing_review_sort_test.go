package postgres

import (
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func TestListingReviewOrderBy(t *testing.T) {
	tests := []struct {
		name string
		sort domain.ListingReviewSort
		want string
	}{
		{"default", domain.ListingReviewSort{}, "created_at DESC, id DESC"},
		{"created ascending", domain.ListingReviewSort{CreatedAt: "asc"}, "created_at ASC, id DESC"},
		{"created descending", domain.ListingReviewSort{CreatedAt: "desc"}, "created_at DESC, id DESC"},
		{"rating ascending", domain.ListingReviewSort{OverallRating: "asc"}, "overall_rating ASC NULLS LAST, id DESC"},
		{"rating descending", domain.ListingReviewSort{OverallRating: "desc"}, "overall_rating DESC NULLS LAST, id DESC"},
		{"both", domain.ListingReviewSort{CreatedAt: "asc", OverallRating: "desc"}, "created_at ASC, overall_rating DESC NULLS LAST, id DESC"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := listingReviewOrderBy(tt.sort, domain.Sort{}); got != tt.want {
				t.Fatalf("order=%q want=%q", got, tt.want)
			}
		})
	}
}
