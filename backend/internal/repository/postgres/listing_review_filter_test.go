package postgres

import (
	"reflect"
	"strings"
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func TestListingReviewImportFilter(t *testing.T) {
	for _, tc := range []struct {
		name  string
		value *bool
		want  []any
	}{
		{name: "omitted", want: []any{}},
		{name: "imported", value: func() *bool { v := true; return &v }(), want: []any{true}},
		{name: "local", value: func() *bool { v := false; return &v }(), want: []any{false}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			where, args := listingReviewWhere(domain.ListingReviewFilter{IsImported: tc.value})
			if strings.Contains(where, "is_imported") != (tc.value != nil) || !reflect.DeepEqual(args, tc.want) {
				t.Fatalf("where=%q args=%v", where, args)
			}
		})
	}
}

func TestListingReviewRatingAndNameFiltersUseParameters(t *testing.T) {
	min, max := 7.5, 9.0
	where, args := listingReviewWhere(domain.ListingReviewFilter{
		ListingSearch: "Отель%_", RatingField: "staff_rating", MinRating: &min, MaxRating: &max,
	})
	if !strings.Contains(where, "staff_rating >= $2") || !strings.Contains(where, "staff_rating <= $3") ||
		!strings.Contains(where, "l.title_ru ILIKE $1") || !reflect.DeepEqual(args, []any{"%Отель\\%\\_%", min, max}) {
		t.Fatalf("where=%q args=%v", where, args)
	}
}
