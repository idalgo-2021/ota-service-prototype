package router

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/auth"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/admin"
	"go.uber.org/zap"
)

type adminServiceProbe struct {
	called  string
	filters map[string]any
}

func (s *adminServiceProbe) Get(_ context.Context, kind, id string) (json.RawMessage, error) {
	s.called = "get " + kind
	return json.RawMessage(`{"id":"` + id + `"}`), nil
}
func (s *adminServiceProbe) List(_ context.Context, kind string, filters map[string]any, _, _ int) ([]json.RawMessage, int, error) {
	s.called = "list " + kind
	s.filters = filters
	return []json.RawMessage{}, 0, nil
}
func (s *adminServiceProbe) Create(_ context.Context, kind string, _ map[string]json.RawMessage) (json.RawMessage, error) {
	s.called = "create " + kind
	return json.RawMessage(`{"id":"ok"}`), nil
}
func (s *adminServiceProbe) Update(_ context.Context, kind, id string, _ map[string]json.RawMessage) (json.RawMessage, error) {
	s.called = "update " + kind
	return json.RawMessage(`{"id":"` + id + `"}`), nil
}
func (s *adminServiceProbe) DeleteImage(context.Context, string, string, string) error {
	s.called = "delete image"
	return nil
}
func (s *adminServiceProbe) CreateStaff(context.Context, string, string, domain.Role) (json.RawMessage, error) {
	s.called = "create staff"
	return json.RawMessage(`{"role":"manager"}`), nil
}
func (s *adminServiceProbe) UpdateRole(context.Context, string, string, domain.Role) (json.RawMessage, error) {
	s.called = "update role"
	return json.RawMessage(`{"role":"manager"}`), nil
}

func TestAdminRoutesEnforceStaffAndAdminRoles(t *testing.T) {
	const secret = "admin-route-secret"
	probe := &adminServiceProbe{}
	adminHandler := admin.NewHandler(probe, 20, 100, zap.NewNop())
	h := New(nil, nil, nil, nil, nil, nil, nil, nil, nil, secret, zap.NewNop(), ExtraHandlers{Admin: adminHandler})
	tests := []struct {
		role               domain.Role
		method, path, body string
		status             int
		called             string
	}{
		{domain.RoleUser, "GET", "/api/v1/admin/listings", "", 403, ""},
		{domain.RoleManager, "GET", "/api/v1/admin/listings", "", 200, "list listings"},
		{domain.RoleManager, "POST", "/api/v1/admin/listings", `{"title":"Hotel"}`, 201, "create listings"},
		{domain.RoleManager, "GET", "/api/v1/admin/countries", "", 403, ""},
		{domain.RoleAdmin, "GET", "/api/v1/admin/countries", "", 200, "list countries"},
		{domain.RoleAdmin, "GET", "/api/v1/admin/exchange-rates", "", 200, "list exchange_rates"},
		{domain.RoleManager, "POST", "/api/v1/admin/users", `{"email":"staff@example.com","password":"password123","role":"manager"}`, 403, ""},
		{domain.RoleAdmin, "POST", "/api/v1/admin/users", `{"email":"staff@example.com","password":"password123","role":"manager"}`, 201, "create staff"},
	}
	for _, tc := range tests {
		probe.called = ""
		token, err := auth.GenerateToken(&domain.User{ID: "38f61614-9f4f-44f2-8295-9ce2ba2a08b4", Role: tc.role}, secret, time.Hour, auth.TokenTypeAccess)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		req.Header.Set("Authorization", "Bearer "+token)
		res := httptest.NewRecorder()
		h.ServeHTTP(res, req)
		if res.Code != tc.status || probe.called != tc.called {
			t.Fatalf("%s %s as %s: status=%d called=%q body=%s", tc.method, tc.path, tc.role, res.Code, probe.called, res.Body.String())
		}
	}
	token, err := auth.GenerateToken(&domain.User{ID: "38f61614-9f4f-44f2-8295-9ce2ba2a08b4", Role: domain.RoleManager}, secret, time.Hour, auth.TokenTypeAccess)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("GET", "/api/v1/admin/listings?external_source=osm&external_id=way%2F36823763", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != 200 || probe.filters["external_source"] != "osm" || probe.filters["external_id"] != "way/36823763" {
		t.Fatalf("external identity filters: status=%d filters=%v", res.Code, probe.filters)
	}
	probe.called = ""
	req = httptest.NewRequest("GET", "/api/v1/admin/listings?external_source=OSM", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res = httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != 400 || probe.called != "" {
		t.Fatalf("invalid external source: status=%d called=%q", res.Code, probe.called)
	}
	req = httptest.NewRequest("GET", "/api/v1/admin/listings?search=%D0%9E%D1%82%D0%B5%D0%BB%D1%8C&sort_by=title_ru&sort_order=asc", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res = httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != 200 || probe.filters["search"] != "Отель" || probe.filters["sort_by"] != "title_ru" || probe.filters["sort_order"] != "asc" {
		t.Fatalf("listing search and sort: status=%d filters=%v", res.Code, probe.filters)
	}
	probe.called = ""
	req = httptest.NewRequest("GET", "/api/v1/admin/listings?sort_by=title%3BDROP+TABLE+listings", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res = httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != 400 || probe.called != "" {
		t.Fatalf("invalid listing sort: status=%d called=%q", res.Code, probe.called)
	}
}
