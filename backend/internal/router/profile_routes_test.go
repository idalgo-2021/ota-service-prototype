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
	profilehandler "github.com/idalgo-2021/product-catalog-backend/internal/handler/profile"
	"go.uber.org/zap"
)

type profileServiceProbe struct {
	userID        string
	limit, offset int
	preferences   *domain.SearchPreferences
	gender        *string
	nationality   *string
	patch         domain.ProfilePatch
}

func (s *profileServiceProbe) Get(_ context.Context, userID string) (*domain.Profile, error) {
	s.userID = userID
	return &domain.Profile{UserID: userID, Email: "client@example.com", Gender: s.gender, Nationality: s.nationality, SearchPreferences: s.preferences}, nil
}
func (s *profileServiceProbe) Update(_ context.Context, userID string, patch domain.ProfilePatch) (*domain.Profile, error) {
	s.userID = userID
	s.patch = patch
	return &domain.Profile{UserID: userID, Gender: patch.Gender.Value, Nationality: patch.Nationality.Value}, nil
}
func (s *profileServiceProbe) ListClients(_ context.Context, limit, offset int) ([]domain.Profile, int, error) {
	s.limit, s.offset = limit, offset
	return []domain.Profile{{UserID: "client-1", Gender: s.gender, Nationality: s.nationality, SearchPreferences: s.preferences}}, 42, nil
}
func (s *profileServiceProbe) GetClient(_ context.Context, userID string) (*domain.Profile, error) {
	s.userID = userID
	return &domain.Profile{UserID: userID, Email: "client@example.com", Language: "RU", Gender: s.gender, Nationality: s.nationality, SearchPreferences: s.preferences}, nil
}
func (s *profileServiceProbe) UpdateClient(_ context.Context, userID string, patch domain.ProfilePatch) (*domain.Profile, error) {
	s.userID = userID
	s.patch = patch
	result := &domain.Profile{UserID: userID, Email: "client@example.com", Gender: patch.Gender.Value, Nationality: patch.Nationality.Value, SearchPreferences: s.preferences}
	if patch.Language.Value != nil {
		result.Language = *patch.Language.Value
	}
	return result, nil
}

func TestStaffCanReadAndUpdateClientProfileWithoutPrivatePreferences(t *testing.T) {
	const secret = "profile-route-secret"
	const clientID = "458ece27-dc46-4772-9b43-b8c8d504bd7c"
	probe := &profileServiceProbe{preferences: &domain.SearchPreferences{Version: 1}}
	h := New(nil, nil, nil, nil, nil, nil, nil, profilehandler.NewProfileHandler(probe, 20, 100, zap.NewNop()), nil, secret, zap.NewNop())
	request := func(role domain.Role, method, body string) *httptest.ResponseRecorder {
		token, err := auth.GenerateToken(&domain.User{ID: "50b29253-726f-4e7a-bbaf-56ddb578a0fa", Role: role}, secret, time.Hour, auth.TokenTypeAccess)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(method, "/api/v1/admin/client-profiles/"+clientID, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		res := httptest.NewRecorder()
		h.ServeHTTP(res, req)
		return res
	}
	read := request(domain.RoleManager, "GET", "")
	if read.Code != 200 || strings.Contains(read.Body.String(), "search_preferences") || strings.Contains(read.Body.String(), "password_hash") {
		t.Fatalf("unsafe staff read: %d %s", read.Code, read.Body.String())
	}
	update := request(domain.RoleManager, "PATCH", `{"language":"EN"}`)
	if update.Code != 200 || probe.userID != clientID || probe.patch.Language.Value == nil || *probe.patch.Language.Value != "EN" || strings.Contains(update.Body.String(), "search_preferences") {
		t.Fatalf("staff update: %d %s", update.Code, update.Body.String())
	}
	if res := request(domain.RoleManager, "PATCH", `{"search_preferences":null}`); res.Code != 400 {
		t.Fatalf("staff changed private preferences: %d", res.Code)
	}
	if res := request(domain.RoleUser, "PATCH", `{"language":"EN"}`); res.Code != 403 {
		t.Fatalf("client accessed staff route: %d", res.Code)
	}
}

func TestProfilePreferencesOnlyAppearInOwnProfile(t *testing.T) {
	const secret = "profile-route-secret"
	prefs := &domain.SearchPreferences{Version: 1, LocationIDs: []int{1}, ListingTypeIDs: []int{}, Nights: 2, AdultsCount: 1, ListingPriceSort: "asc", ListingRatingSort: "desc", ProductPriceSort: "asc", ProductRatingSort: "desc"}
	probe := &profileServiceProbe{preferences: prefs}
	h := New(nil, nil, nil, nil, nil, nil, nil, profilehandler.NewProfileHandler(probe, 20, 100, zap.NewNop()), nil, secret, zap.NewNop())
	for _, tc := range []struct {
		path            string
		role            domain.Role
		wantPreferences bool
	}{
		{"/api/v1/profile", domain.RoleUser, true},
		{"/api/v1/admin/client-profiles", domain.RoleManager, false},
	} {
		token, err := auth.GenerateToken(&domain.User{ID: "client-1", Role: tc.role}, secret, time.Hour, auth.TokenTypeAccess)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest("GET", tc.path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		res := httptest.NewRecorder()
		h.ServeHTTP(res, req)
		if res.Code != 200 || strings.Contains(res.Body.String(), `"search_preferences"`) != tc.wantPreferences {
			t.Fatalf("unexpected profile response at %s: %d %s", tc.path, res.Code, res.Body.String())
		}
	}
	probe.preferences = nil
	token, err := auth.GenerateToken(&domain.User{ID: "client-1", Role: domain.RoleUser}, secret, time.Hour, auth.TokenTypeAccess)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("GET", "/api/v1/profile", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if strings.Contains(res.Body.String(), `"search_preferences"`) {
		t.Fatalf("unset preferences should be omitted: %s", res.Body.String())
	}
}

func TestProfilePatchParsesPreferencesAndRejectsOldRoute(t *testing.T) {
	const secret = "profile-route-secret"
	probe := &profileServiceProbe{}
	h := New(nil, nil, nil, nil, nil, nil, nil, profilehandler.NewProfileHandler(probe, 20, 100, zap.NewNop()), nil, secret, zap.NewNop())
	token, err := auth.GenerateToken(&domain.User{ID: "client-1", Role: domain.RoleUser}, secret, time.Hour, auth.TokenTypeAccess)
	if err != nil {
		t.Fatal(err)
	}
	request := func(path, body string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("PATCH", path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		res := httptest.NewRecorder()
		h.ServeHTTP(res, req)
		return res
	}
	res := request("/api/v1/profile", `{"search_preferences":{"version":1,"location_ids":[],"listing_type_ids":[],"nights":1,"adults_count":1,"children_count":0,"has_pets":false,"sort":"price_asc"}}`)
	if res.Code != 200 || !probe.patch.SearchPreferences.Set || probe.patch.SearchPreferences.Value == nil {
		t.Fatalf("valid preferences not parsed: %d %s", res.Code, res.Body.String())
	}
	res = request("/api/v1/profile", `{"search_preferences":{"version":1}}`)
	if res.Code != 400 {
		t.Fatalf("incomplete preferences accepted: %d", res.Code)
	}
	res = request("/api/v1/me/profile", `{}`)
	if res.Code != 404 {
		t.Fatalf("old route still available: %d", res.Code)
	}
}

func TestProfileRoutesEnforceScopeAndPagination(t *testing.T) {
	const secret = "profile-route-secret"
	for _, tc := range []struct {
		path, method string
		role         domain.Role
		status       int
	}{
		{"/api/v1/profile", "GET", domain.RoleUser, 200},
		{"/api/v1/profile", "PATCH", domain.RoleUser, 200},
		{"/api/v1/admin/client-profiles?limit=7&offset=2", "GET", domain.RoleUser, 403},
		{"/api/v1/admin/client-profiles?limit=7&offset=2", "GET", domain.RoleManager, 200},
		{"/api/v1/admin/client-profiles?limit=7&offset=2", "GET", domain.RoleAdmin, 200},
	} {
		probe := &profileServiceProbe{}
		h := New(nil, nil, nil, nil, nil, nil, nil, profilehandler.NewProfileHandler(probe, 20, 100, zap.NewNop()), nil, secret, zap.NewNop())
		token, err := auth.GenerateToken(&domain.User{ID: "client-1", Role: tc.role}, secret, time.Hour, auth.TokenTypeAccess)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(`{"first_name":"Анна"}`))
		req.Header.Set("Authorization", "Bearer "+token)
		res := httptest.NewRecorder()
		h.ServeHTTP(res, req)
		if res.Code != tc.status {
			t.Fatalf("%s %s %s: got %d, want %d: %s", tc.method, tc.path, tc.role, res.Code, tc.status, res.Body.String())
		}
		if tc.status == 200 && tc.path == "/api/v1/profile" && probe.userID != "client-1" {
			t.Fatalf("wrong profile scope: %s", probe.userID)
		}
		if strings.Contains(res.Body.String(), "password_hash") {
			t.Fatalf("password hash leaked in profile response: %s", res.Body.String())
		}
		if tc.status == 200 && strings.Contains(tc.path, "/admin/") {
			if probe.limit != 7 || probe.offset != 2 {
				t.Fatalf("pagination %d/%d", probe.limit, probe.offset)
			}
			var response struct {
				Meta struct {
					Total int `json:"total"`
				} `json:"meta"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &response); err != nil || response.Meta.Total != 42 {
				t.Fatalf("wrong list meta: %s", res.Body.String())
			}
		}
	}
	probe := &profileServiceProbe{}
	h := New(nil, nil, nil, nil, nil, nil, nil, profilehandler.NewProfileHandler(probe, 20, 100, zap.NewNop()), nil, secret, zap.NewNop())
	res := httptest.NewRecorder()
	h.ServeHTTP(res, httptest.NewRequest("GET", "/api/v1/profile", nil))
	if res.Code != 401 || probe.userID != "" {
		t.Fatalf("unauthenticated profile access: status %d, user %q", res.Code, probe.userID)
	}
}

func TestProfileRoutesExposeAndAcceptOptionalDemographics(t *testing.T) {
	const secret = "profile-route-secret"
	const clientID = "458ece27-dc46-4772-9b43-b8c8d504bd7c"
	gender, nationality := "female", "Кыргызка"
	probe := &profileServiceProbe{gender: &gender, nationality: &nationality}
	h := New(nil, nil, nil, nil, nil, nil, nil, profilehandler.NewProfileHandler(probe, 20, 100, zap.NewNop()), nil, secret, zap.NewNop())
	request := func(role domain.Role, method, path, body string) *httptest.ResponseRecorder {
		token, err := auth.GenerateToken(&domain.User{ID: clientID, Role: role}, secret, time.Hour, auth.TokenTypeAccess)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		res := httptest.NewRecorder()
		h.ServeHTTP(res, req)
		return res
	}
	for _, tc := range []struct {
		role domain.Role
		path string
	}{
		{domain.RoleUser, "/api/v1/profile"},
		{domain.RoleManager, "/api/v1/admin/client-profiles"},
		{domain.RoleManager, "/api/v1/admin/client-profiles/" + clientID},
	} {
		res := request(tc.role, "GET", tc.path, "")
		if res.Code != 200 || !strings.Contains(res.Body.String(), `"gender":"female"`) || !strings.Contains(res.Body.String(), `"nationality":"Кыргызка"`) {
			t.Fatalf("demographics missing from %s: %d %s", tc.path, res.Code, res.Body.String())
		}
	}
	for _, tc := range []struct {
		role domain.Role
		path string
	}{
		{domain.RoleUser, "/api/v1/profile"},
		{domain.RoleManager, "/api/v1/admin/client-profiles/" + clientID},
	} {
		res := request(tc.role, "PATCH", tc.path, `{"gender":"female","nationality":"  Кыргызка  "}`)
		if res.Code != 200 || !probe.patch.Gender.Set || !probe.patch.Nationality.Set || probe.patch.Nationality.Value == nil || *probe.patch.Nationality.Value != "  Кыргызка  " {
			t.Fatalf("demographics not parsed by %s: %d %s", tc.path, res.Code, res.Body.String())
		}
		res = request(tc.role, "PATCH", tc.path, `{"gender":null,"nationality":"  "}`)
		if res.Code != 200 || !probe.patch.Gender.Set || probe.patch.Gender.Value != nil || !probe.patch.Nationality.Set {
			t.Fatalf("demographics clear not parsed by %s: %d %s", tc.path, res.Code, res.Body.String())
		}
	}
}
