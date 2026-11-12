package product

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type productServiceProbe struct {
	filter     domain.ProductFilter
	called     bool
	activeOnly bool
	productID  string
}

func TestProductSearchDoesNotRequireLocation(t *testing.T) {
	probe := &productServiceProbe{}
	handler := NewProductHandler(probe, 20, 100, zap.NewNop())
	req := httptest.NewRequest(http.MethodPost, "/products/search?lang=ru", strings.NewReader(`{"query":"горный поход","product_type":"tour","sort":"price_asc"}`))
	res := httptest.NewRecorder()

	handler.SearchProducts(res, req)

	if res.Code != http.StatusOK || !probe.called {
		t.Fatalf("status=%d called=%v body=%s", res.Code, probe.called, res.Body.String())
	}
	if probe.filter.LocationID != nil || !probe.filter.ActiveOnly || probe.filter.SearchText != "горный поход" || probe.filter.ProductType != "tour" || probe.filter.Sort.By != "price" || probe.filter.Sort.Order != "asc" {
		t.Fatalf("filter=%+v", probe.filter)
	}
}

func (p *productServiceProbe) GetProduct(_ context.Context, id string, activeOnly bool) (*domain.Product, error) {
	p.called, p.activeOnly, p.productID = true, activeOnly, id
	return &domain.Product{ID: id}, nil
}

func TestProductDetailScopes(t *testing.T) {
	for _, admin := range []bool{false, true} {
		probe := &productServiceProbe{}
		handler := NewProductHandler(probe, 20, 100, zap.NewNop())
		req := httptest.NewRequest(http.MethodGet, "/products/product-1", nil)
		req = mux.SetURLVars(req, map[string]string{"product_id": "product-1"})
		res := httptest.NewRecorder()
		if admin {
			handler.GetAdminProduct(res, req)
		} else {
			handler.GetProduct(res, req)
		}
		if res.Code != http.StatusOK || !probe.called || probe.activeOnly || probe.productID != "product-1" {
			t.Fatalf("admin=%v status=%d called=%v activeOnly=%v productID=%q", admin, res.Code, probe.called, probe.activeOnly, probe.productID)
		}
	}
}

func (p *productServiceProbe) ListProducts(_ context.Context, _, _ int, filter domain.ProductFilter) ([]domain.Product, int, error) {
	p.filter, p.called = filter, true
	return nil, 0, nil
}

func TestProductListScopes(t *testing.T) {
	const counterparty = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
	for _, tc := range []struct {
		name       string
		path       string
		admin      bool
		wantStatus int
	}{
		{"client requires location", "/products", false, http.StatusBadRequest},
		{"client active only", "/products?location_id=2", false, http.StatusOK},
		{"admin includes inactive", "/admin/products?counterparty_id=" + counterparty, true, http.StatusOK},
		{"admin rejects invalid counterparty", "/admin/products?counterparty_id=bad", true, http.StatusBadRequest},
		{"client sorts by price", "/products?location_id=2&currency=RUB&sort=price_desc", false, http.StatusOK},
		{"client default order", "/products?location_id=2", false, http.StatusOK},
		{"client rejects created_at sort", "/products?location_id=2&sort=created_at_desc", false, http.StatusBadRequest},
		{"admin price defaults to base currency", "/admin/products?sort_by=price", true, http.StatusOK},
		{"admin sorts by price", "/admin/products?currency=RUB&sort_by=price", true, http.StatusOK},
		{"admin rejects invalid sort", "/admin/products?sort_by=cost", true, http.StatusBadRequest},
	} {
		t.Run(tc.name, func(t *testing.T) {
			probe := &productServiceProbe{}
			handler := NewProductHandler(probe, 20, 100, zap.NewNop())
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			res := httptest.NewRecorder()
			if tc.admin {
				handler.ListAdminProducts(res, req)
			} else {
				handler.ListProducts(res, req)
			}
			if res.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tc.wantStatus)
			}
			if tc.wantStatus != http.StatusOK {
				return
			}
			if !probe.called || probe.filter.ActiveOnly == tc.admin {
				t.Fatalf("filter = %+v, called = %v", probe.filter, probe.called)
			}
			if tc.name == "admin includes inactive" && (probe.filter.CounterpartyID == nil || *probe.filter.CounterpartyID != counterparty) {
				t.Fatalf("counterparty = %v", probe.filter.CounterpartyID)
			}
			if tc.name == "client sorts by price" && (probe.filter.Sort.By != "price" || probe.filter.Sort.Order != "desc" || probe.filter.Currency != "RUB") {
				t.Fatalf("sort filter = %+v", probe.filter)
			}
		})
	}
}
