package postgres

import (
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func TestOrderSortSQL(t *testing.T) {
	if got := orderSortSQL(domain.Sort{}, true); got != "o.created_at DESC, o.id DESC" {
		t.Fatalf("default order = %q", got)
	}
	if got := orderSortSQL(domain.Sort{By: "fulfilled_at", Order: "asc"}, true); got != "o.fulfilled_at ASC NULLS LAST, o.id ASC" {
		t.Fatalf("fulfilled order = %q", got)
	}
}
