package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/auth"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	bookinghandler "github.com/idalgo-2021/product-catalog-backend/internal/handler/booking"
	orderhandler "github.com/idalgo-2021/product-catalog-backend/internal/handler/order"
)

func TestDeprecatedListingRoutesAreRemoved(t *testing.T) {
	routes := New(nil, nil, nil, nil, nil, nil, bookinghandler.NewBookingHandler(nil, 20, 100, zap.NewNop()), nil, nil, "router-test-secret", zap.NewNop()).(*mux.Router)
	for _, tc := range []struct {
		method, path string
		wantMatch    bool
	}{
		{http.MethodGet, "/api/v1/listings", false},
		{http.MethodGet, "/api/v1/listings/available-units", false},
		{http.MethodPost, "/api/v1/listings/search", true},
		{http.MethodGet, "/api/v1/listings/11111111-1111-1111-1111-111111111111", true},
		{http.MethodGet, "/api/v1/listings/11111111-1111-1111-1111-111111111111/available-units", true},
		{http.MethodPost, "/api/v1/products/search", true},
	} {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
			matched := routes.Match(httptest.NewRequest(tc.method, tc.path, nil), &mux.RouteMatch{})
			if matched != tc.wantMatch {
				t.Fatalf("route matched=%v, want %v", matched, tc.wantMatch)
			}
		})
	}
}

type orderServiceProbe struct {
	called   bool
	role     domain.Role
	action   string
	sort     domain.Sort
	statuses []domain.OrderStatus
}

func (s *orderServiceProbe) ListOrders(_ context.Context, _ string, role domain.Role, sort domain.Sort, statuses []domain.OrderStatus, _, _ int) ([]domain.Order, int, error) {
	s.called, s.role, s.sort, s.statuses = true, role, sort, statuses
	return nil, 0, nil
}
func (s *orderServiceProbe) GetOrder(context.Context, string, string, domain.Role) (*domain.Order, error) {
	panic("unexpected GetOrder")
}
func (s *orderServiceProbe) CreateOrder(context.Context, string, string, *string, []domain.OrderItem) (*domain.Order, error) {
	panic("unexpected CreateOrder")
}
func (s *orderServiceProbe) LinkBooking(context.Context, string, string, *string) (*domain.Order, error) {
	s.action = "link-booking"
	return &domain.Order{ID: "order-1"}, nil
}
func (s *orderServiceProbe) UpdateOrder(context.Context, string, string, domain.Role, domain.UpdateOrderInput) (*domain.Order, error) {
	panic("unexpected UpdateOrder")
}
func (s *orderServiceProbe) ConfirmOrder(context.Context, string, string) (*domain.Order, error) {
	s.action = "confirm"
	return &domain.Order{ID: "order-1"}, nil
}
func (s *orderServiceProbe) FulfillOrder(context.Context, string, string) (*domain.Order, error) {
	s.action = "fulfill"
	return &domain.Order{ID: "order-1"}, nil
}
func (s *orderServiceProbe) ListAdminOrders(_ context.Context, filter domain.OrderFilter, _, _ int) ([]domain.Order, int, error) {
	s.called = true
	s.role = domain.RoleManager
	s.sort = filter.Sort
	return nil, 0, nil
}

func TestOrderListSortScopes(t *testing.T) {
	const secret = "router-test-secret"
	for _, tc := range []struct {
		path, by, order string
		orderStatus     domain.OrderStatus
		role            domain.Role
		status          int
	}{
		{path: "/api/v1/orders", by: "created_at", order: "desc", role: domain.RoleUser, status: http.StatusOK},
		{path: "/api/v1/orders?status=pending", by: "created_at", order: "desc", orderStatus: domain.StatusPending, role: domain.RoleUser, status: http.StatusOK},
		{path: "/api/v1/admin/orders?sort_by=fulfilled_at&sort_order=asc", by: "fulfilled_at", order: "asc", role: domain.RoleManager, status: http.StatusOK},
		{path: "/api/v1/orders?sort_by=created_at&sort_order=asc", role: domain.RoleUser, status: http.StatusBadRequest},
		{path: "/api/v1/orders?status=unknown", role: domain.RoleUser, status: http.StatusBadRequest},
	} {
		probe := &orderServiceProbe{}
		handler := New(nil, nil, nil, nil, nil, orderhandler.NewOrderHandler(probe, 20, 100, zap.NewNop()), nil, nil, nil, secret, zap.NewNop())
		token, err := auth.GenerateToken(&domain.User{ID: "user-1", Role: tc.role}, secret, time.Hour, auth.TokenTypeAccess)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(http.MethodGet, tc.path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		var gotStatus domain.OrderStatus
		if len(probe.statuses) > 0 {
			gotStatus = probe.statuses[0]
		}
		if res.Code != tc.status || probe.sort.By != tc.by || probe.sort.Order != tc.order || gotStatus != tc.orderStatus {
			t.Fatalf("path=%q status=%d sort=%+v filter=%q", tc.path, res.Code, probe.sort, gotStatus)
		}
	}
}
func (s *orderServiceProbe) CancelOrder(context.Context, string, string, bool, *string) (*domain.Order, error) {
	s.action = "cancel"
	return &domain.Order{ID: "order-1"}, nil
}

func TestOrderRouteScopes(t *testing.T) {
	const secret = "router-test-secret"
	for _, tc := range []struct {
		path       string
		role       domain.Role
		wantStatus int
		wantCalled bool
		wantScope  domain.Role
	}{
		{"/api/v1/orders", domain.RoleUser, http.StatusOK, true, domain.RoleUser},
		{"/api/v1/orders", domain.RoleManager, http.StatusOK, true, domain.RoleUser},
		{"/api/v1/admin/orders", domain.RoleUser, http.StatusForbidden, false, ""},
		{"/api/v1/admin/orders", domain.RoleManager, http.StatusOK, true, domain.RoleManager},
		{"/api/v1/admin/orders", domain.RoleAdmin, http.StatusOK, true, domain.RoleManager},
	} {
		t.Run(tc.path+"/"+string(tc.role), func(t *testing.T) {
			probe := &orderServiceProbe{}
			handler := New(nil, nil, nil, nil, nil, orderhandler.NewOrderHandler(probe, 20, 100, zap.NewNop()), nil, nil, nil, secret, zap.NewNop())
			token, err := auth.GenerateToken(&domain.User{ID: "user-1", Role: tc.role}, secret, time.Hour, auth.TokenTypeAccess)
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != tc.wantStatus || probe.called != tc.wantCalled || probe.role != tc.wantScope {
				t.Fatalf("status=%d called=%v scope=%q, want %d %v %q", res.Code, probe.called, probe.role, tc.wantStatus, tc.wantCalled, tc.wantScope)
			}
		})
	}
}

func TestOrderActionsRequireCorrectRole(t *testing.T) {
	const secret = "router-test-secret"
	for _, tc := range []struct {
		path   string
		role   domain.Role
		body   string
		status int
		action string
	}{
		{"/api/v1/orders/order-1/confirm", domain.RoleUser, "", http.StatusOK, "confirm"},
		{"/api/v1/orders/order-1/cancel", domain.RoleUser, "", http.StatusOK, "cancel"},
		{"/api/v1/orders/order-1/booking", domain.RoleUser, `{"booking_id":null}`, http.StatusOK, "link-booking"},
		{"/api/v1/admin/orders/order-1/fulfill", domain.RoleUser, "", http.StatusForbidden, ""},
		{"/api/v1/admin/orders/order-1/fulfill", domain.RoleManager, "", http.StatusOK, "fulfill"},
		{"/api/v1/admin/orders/order-1/cancel", domain.RoleAdmin, `{"reason":"Client request"}`, http.StatusOK, "cancel"},
		{"/api/v1/admin/orders/order-1/cancel", domain.RoleAdmin, "", http.StatusBadRequest, ""},
	} {
		t.Run(tc.path+"/"+string(tc.role), func(t *testing.T) {
			probe := &orderServiceProbe{}
			handler := New(nil, nil, nil, nil, nil, orderhandler.NewOrderHandler(probe, 20, 100, zap.NewNop()), nil, nil, nil, secret, zap.NewNop())
			token, err := auth.GenerateToken(&domain.User{ID: "user-1", Role: tc.role}, secret, time.Hour, auth.TokenTypeAccess)
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequest(http.MethodPatch, tc.path, strings.NewReader(tc.body))
			req.Header.Set("Authorization", "Bearer "+token)
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != tc.status || probe.action != tc.action {
				t.Fatalf("status=%d action=%q, want %d %q", res.Code, probe.action, tc.status, tc.action)
			}
		})
	}
}
