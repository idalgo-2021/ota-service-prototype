package handler

import (
	"net/http/httptest"
	"testing"
)

func TestParseSort(t *testing.T) {
	for _, tc := range []struct {
		query, by, order string
		valid            bool
	}{
		{"", "created_at", "desc", true},
		{"sort_by=price", "price", "asc", true},
		{"sort_order=asc", "created_at", "asc", true},
		{"sort_by=price&sort_order=desc", "price", "desc", true},
		{"sort_by=unknown", "", "", false},
		{"sort_order=sideways", "", "", false},
	} {
		r := httptest.NewRequest("GET", "/products?"+tc.query, nil)
		sort, err := ParseSort(r, "created_at", "created_at", "price")
		if (err == nil) != tc.valid || (tc.valid && (sort.By != tc.by || sort.Order != tc.order)) {
			t.Fatalf("query=%q sort=%+v err=%v", tc.query, sort, err)
		}
	}
}
