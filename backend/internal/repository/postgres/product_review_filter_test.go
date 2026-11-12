package postgres

import (
	"reflect"
	"strings"
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func TestProductReviewImportFilter(t *testing.T) {
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
			where, args := productReviewWhere(domain.ProductReviewFilter{IsImported: tc.value})
			if strings.Contains(where, "is_imported") != (tc.value != nil) || !reflect.DeepEqual(args, tc.want) {
				t.Fatalf("where=%q args=%v", where, args)
			}
		})
	}
}

func TestProductReviewTypeFilterUsesProductRelation(t *testing.T) {
	where, args := productReviewWhere(domain.ProductReviewFilter{ProductType: "tour"})
	if !strings.Contains(where, "EXISTS (SELECT 1 FROM products p WHERE p.id=product_id AND p.product_type=$1)") ||
		!reflect.DeepEqual(args, []any{"tour"}) {
		t.Fatalf("where=%q args=%v", where, args)
	}
}
