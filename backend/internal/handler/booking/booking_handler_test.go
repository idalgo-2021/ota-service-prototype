package booking

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
)

type bookingServiceProbe struct {
	BookingService
	availableCalled  bool
	createCalled     bool
	listFilter       domain.BookingFilter
	listCalled       bool
	transitionAction string
	transitionReason string
}

func (p *bookingServiceProbe) Available(_ context.Context, _, _ string, _ int, _ bool, _ string) ([]domain.ListingUnit, error) {
	p.availableCalled = true
	return []domain.ListingUnit{{ID: "unit-1", Name: "Койка 01", Currency: "RUB", Images: []domain.ListingUnitImage{{ID: "image-1", URL: "https://example.com/bed.jpg"}}}}, nil
}

func (p *bookingServiceProbe) ListUnits(_ context.Context, _, _ string) ([]domain.ListingUnit, error) {
	return []domain.ListingUnit{{ID: "unit-1", Name: "Койка 01", Currency: "RUB"}}, nil
}

func (p *bookingServiceProbe) Create(_ context.Context, _ string, _ domain.CreateBookingInput) (*domain.Booking, error) {
	p.createCalled = true
	return &domain.Booking{ID: "booking-1"}, nil
}

func (p *bookingServiceProbe) List(_ context.Context, _ string, _ bool, filter domain.BookingFilter, _, _ int) ([]domain.Booking, int, error) {
	p.listCalled = true
	p.listFilter = filter
	return []domain.Booking{}, 0, nil
}

func (p *bookingServiceProbe) Transition(_ context.Context, _, _, action, reason string, _ bool) (*domain.Booking, error) {
	p.transitionAction, p.transitionReason = action, reason
	return &domain.Booking{ID: "11111111-1111-4111-8111-111111111111"}, nil
}

func TestAdminBookingTransitionsRequireMatchingStatus(t *testing.T) {
	const bookingID = "11111111-1111-4111-8111-111111111111"
	for _, tc := range []struct {
		name, action, body, expectedAction, expectedReason string
		staff                                              bool
		status                                             int
	}{
		{"admin cancel valid", "cancel", `{"reason":"Client called"}`, "cancel", "Client called", true, http.StatusOK},
		{"admin cancel with status", "cancel", `{"status":"canceled","reason":"Client called"}`, "", "", true, http.StatusBadRequest},
		{"admin cancel missing reason", "cancel", `{}`, "", "", true, http.StatusBadRequest},
		{"admin cancel blank reason", "cancel", `{"reason":"  "}`, "", "", true, http.StatusBadRequest},
		{"client cancel valid", "cancel", `{"reason":"Plans changed"}`, "cancel", "Plans changed", false, http.StatusOK},
		{"client cancel without reason", "cancel", `{}`, "", "", false, http.StatusBadRequest},
		{"client cancel blank reason", "cancel", `{"reason":"  "}`, "", "", false, http.StatusBadRequest},
		{"client cancel with status", "cancel", `{"status":"canceled","reason":"Plans changed"}`, "", "", false, http.StatusBadRequest},
		{"check in valid", "check-in", "", "check-in", "", true, http.StatusOK},
		{"check in empty object", "check-in", `{}`, "check-in", "", true, http.StatusOK},
		{"check in with status", "check-in", `{"status":"checked_in"}`, "", "", true, http.StatusBadRequest},
		{"check out valid", "check-out", "", "check-out", "", true, http.StatusOK},
		{"check out with status", "check-out", `{"status":"completed"}`, "", "", true, http.StatusBadRequest},
	} {
		t.Run(tc.name, func(t *testing.T) {
			probe := &bookingServiceProbe{}
			h := NewBookingHandler(probe, 20, 100, zap.NewNop())
			r := httptest.NewRequest(http.MethodPatch, "/admin/bookings/"+bookingID+"/"+tc.action, strings.NewReader(tc.body))
			r = mux.SetURLVars(r, map[string]string{"id": bookingID})
			r = r.WithContext(context.WithValue(r.Context(), middleware.UserIDKey, bookingID))
			w := httptest.NewRecorder()
			h.transition(w, r, tc.action, tc.staff)
			if w.Code != tc.status || probe.transitionAction != tc.expectedAction || probe.transitionReason != tc.expectedReason {
				t.Fatalf("status=%d action=%q reason=%q body=%s", w.Code, probe.transitionAction, probe.transitionReason, w.Body.String())
			}
		})
	}
}

func TestListAdminParsesBookingFilters(t *testing.T) {
	probe := &bookingServiceProbe{}
	h := NewBookingHandler(probe, 20, 100, zap.NewNop())
	const clientID = "11111111-1111-4111-8111-111111111111"
	const listingID = "22222222-2222-4222-8222-222222222222"
	r := httptest.NewRequest(http.MethodGet, "/admin/bookings?client_id="+clientID+"&listing_id="+listingID+"&status=confirmed&check_in_from=2026-11-01&check_in_to=2026-11-30&check_out_from=2026-11-02&check_out_to=2026-12-01&sort_by=check_in_date&sort_order=desc", nil)
	r = r.WithContext(context.WithValue(r.Context(), middleware.UserIDKey, clientID))
	w := httptest.NewRecorder()
	h.ListAdmin(w, r)
	if w.Code != http.StatusOK || !probe.listCalled {
		t.Fatalf("status=%d called=%v body=%s", w.Code, probe.listCalled, w.Body.String())
	}
	f := probe.listFilter
	if f.ClientID != clientID || f.ListingID != listingID || f.Status != "confirmed" || f.CheckInFrom != "2026-11-01" || f.CheckInTo != "2026-11-30" || f.CheckOutFrom != "2026-11-02" || f.CheckOutTo != "2026-12-01" || f.Sort.By != "check_in_date" || f.Sort.Order != "desc" {
		t.Fatalf("unexpected filter: %+v", f)
	}
}

func TestAvailableMapsUnitsAndImages(t *testing.T) {
	probe := &bookingServiceProbe{}
	h := NewBookingHandler(probe, 20, 100, zap.NewNop())
	r := httptest.NewRequest(http.MethodGet, "/listings/1/available-units?check_in_date=2026-10-10&nights=2", nil)
	r = mux.SetURLVars(r, map[string]string{"id": "listing-1"})
	w := httptest.NewRecorder()
	h.Available(w, r)
	if w.Code != http.StatusOK || !probe.availableCalled {
		t.Fatalf("status=%d called=%v", w.Code, probe.availableCalled)
	}
	var body struct {
		Data []UnitResponse `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Data) != 1 || len(body.Data[0].Images) != 1 || body.Data[0].Images[0].URL != "https://example.com/bed.jpg" {
		t.Fatalf("unexpected units: %+v", body.Data)
	}
}

func TestUnitPriceSortDefaultsToBaseCurrencyInBothScopes(t *testing.T) {
	const listingID = "22222222-2222-4222-8222-222222222222"
	for _, admin := range []bool{false, true} {
		for _, currency := range []string{"", "&currency=RUB"} {
			probe := &bookingServiceProbe{}
			h := NewBookingHandler(probe, 20, 100, zap.NewNop())
			path := "/listings/" + listingID + "/available-units?check_in_date=2026-10-10&nights=2&sort_by=price_per_night" + currency
			if admin {
				path = "/admin/listings/" + listingID + "/units?sort_by=price_per_night" + currency
			}
			r := httptest.NewRequest(http.MethodGet, path, nil)
			r = mux.SetURLVars(r, map[string]string{"id": listingID})
			w := httptest.NewRecorder()
			if admin {
				h.ListUnits(w, r)
			} else {
				h.Available(w, r)
			}
			want := http.StatusOK
			if w.Code != want {
				t.Fatalf("admin=%v currency=%q status=%d body=%s", admin, currency, w.Code, w.Body.String())
			}
		}
	}
}

func TestCreateBookingRequiresUserContext(t *testing.T) {
	probe := &bookingServiceProbe{}
	h := NewBookingHandler(probe, 20, 100, zap.NewNop())
	r := httptest.NewRequest(http.MethodPost, "/bookings", strings.NewReader(`{"listing_id":"listing-1","unit_ids":["unit-1"],"check_in_date":"2026-10-10","nights":2,"adults_count":1}`))
	w := httptest.NewRecorder()
	h.Create(w, r)
	if w.Code != http.StatusUnauthorized || probe.createCalled {
		t.Fatalf("status=%d called=%v", w.Code, probe.createCalled)
	}
	var body handlers.Response
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error == nil || body.Error.Code != "UNAUTHORIZED" {
		t.Fatalf("unexpected response: %+v", body)
	}
}
