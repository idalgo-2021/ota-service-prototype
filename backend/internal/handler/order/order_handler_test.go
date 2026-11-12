package order

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
)

func TestParseAdminOrderFilter(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/v1/admin/orders?created_from=2026-11-01&created_to=2026-11-03&status=pending,confirmed&status=fulfilled&location_id=2", nil)
	f, err := parseAdminOrderFilter(req)
	if err != nil {
		t.Fatal(err)
	}
	if f.CreatedFrom == nil || f.CreatedTo == nil || !f.CreatedFrom.Equal(time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)) || !f.CreatedTo.Equal(time.Date(2026, 11, 4, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("date range = %v..%v", f.CreatedFrom, f.CreatedTo)
	}
	if len(f.Statuses) != 3 || f.Statuses[0] != domain.StatusPending || f.Statuses[2] != domain.StatusFulfilled || f.LocationID == nil || *f.LocationID != 2 {
		t.Fatalf("filter = %+v", f)
	}
}

func TestStatusActionHasNoBody(t *testing.T) {
	for _, body := range []string{
		`{"status":"confirmed","expected_total":"100"}`,
		`{"status":"confirmed","currency":"RUB"}`,
		`{"status":"cancelled"}`,
		`{"status":"confirmed"} {"status":"confirmed"}`,
	} {
		req := httptest.NewRequest("PATCH", "/orders/id/confirm", strings.NewReader(body))
		if err := handlers.RequireEmptyActionBody(req); err == nil {
			t.Fatalf("accepted %s", body)
		}
	}
	for _, body := range []string{"", "{}"} {
		req := httptest.NewRequest("PATCH", "/orders/id/confirm", strings.NewReader(body))
		if err := handlers.RequireEmptyActionBody(req); err != nil {
			t.Fatal(err)
		}
	}
}

func TestDecodeCancelOrderActionReasonByActor(t *testing.T) {
	for _, tc := range []struct {
		body  string
		staff bool
		want  string
		valid bool
	}{
		{"", false, "", true},
		{`{}`, false, "", true},
		{"", true, "", false},
		{`{"reason":"  Plans changed  "}`, false, "Plans changed", true},
		{`{"reason":"Client request"}`, true, "Client request", true},
		{`{"reason":"  "}`, false, "", true},
		{`{"reason":"  "}`, true, "", false},
		{`{"reason":null}`, true, "", false},
		{`{"status":"cancelled"}`, false, "", false},
		{`{"status":"confirmed","reason":"Plans changed"}`, false, "", false},
		{`{"extra":1}`, false, "", false},
	} {
		reason, err := decodeCancelOrderAction(httptest.NewRequest("PATCH", "/orders/id/cancel", strings.NewReader(tc.body)), tc.staff)
		if (err == nil) != tc.valid {
			t.Fatalf("body=%s reason=%v err=%v", tc.body, reason, err)
		}
		if tc.valid && ((reason == nil && tc.want != "") || (reason != nil && *reason != tc.want)) {
			t.Fatalf("body=%s reason=%v, want %q", tc.body, reason, tc.want)
		}
	}
}

func TestParseAdminOrderFilterRejectsInvalidValues(t *testing.T) {
	for _, query := range []string{"status=shipped", "created_from=2026-11-04&created_to=2026-11-03", "location_id=0", "moderator_id=abc"} {
		t.Run(query, func(t *testing.T) {
			_, err := parseAdminOrderFilter(httptest.NewRequest("GET", "/api/v1/admin/orders?"+query, nil))
			if err == nil {
				t.Fatal("expected invalid filter error")
			}
		})
	}
}
