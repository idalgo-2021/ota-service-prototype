package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/auth"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

const testJWTSecret = "test-secret-for-middleware"

func tokenForTest(t *testing.T, role domain.Role, tokenType auth.TokenType) string {
	t.Helper()

	token, err := auth.GenerateToken(&domain.User{ID: "user-123", Role: role}, testJWTSecret, time.Minute, tokenType)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	return token
}

func TestAuthAcceptsAccessTokenAndAddsClaimsToContext(t *testing.T) {
	token := tokenForTest(t, domain.RoleManager, auth.TokenTypeAccess)
	var gotUserID string
	var gotRole domain.Role

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserID, _ = GetUserID(r.Context())
		gotRole, _ = GetUserRole(r.Context())
		w.WriteHeader(http.StatusNoContent)
	})
	handler := Auth(testJWTSecret, zap.NewNop())(next)
	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
	}
	if gotUserID != "user-123" {
		t.Errorf("user ID = %q, want %q", gotUserID, "user-123")
	}
	if gotRole != domain.RoleManager {
		t.Errorf("role = %q, want %q", gotRole, domain.RoleManager)
	}
}

func TestAuthRejectsRefreshToken(t *testing.T) {
	token := tokenForTest(t, domain.RoleAdmin, auth.TokenTypeRefresh)
	nextCalled := false
	handler := Auth(testJWTSecret, zap.NewNop())(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	}))
	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
	if nextCalled {
		t.Error("next handler was called for a refresh token")
	}
}

func TestOptionalAuthRejectsRefreshToken(t *testing.T) {
	token := tokenForTest(t, domain.RoleAdmin, auth.TokenTypeRefresh)
	nextCalled := false
	handler := OptionalAuth(testJWTSecret, zap.NewNop())(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	}))
	request := httptest.NewRequest(http.MethodGet, "/listings", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
	if nextCalled {
		t.Error("next handler was called for a refresh token")
	}
}

func TestOptionalAuthAllowsAnonymousRequest(t *testing.T) {
	var hasUserID, hasRole bool
	handler := OptionalAuth(testJWTSecret, zap.NewNop())(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, hasUserID = GetUserID(r.Context())
		_, hasRole = GetUserRole(r.Context())
		w.WriteHeader(http.StatusNoContent)
	}))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/listings", nil))

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
	}
	if hasUserID || hasRole {
		t.Error("anonymous request unexpectedly has authentication claims")
	}
}

func TestRequireRoleChecksRoleFromAccessToken(t *testing.T) {
	tests := []struct {
		name       string
		role       domain.Role
		wantStatus int
	}{
		{name: "allowed role", role: domain.RoleAdmin, wantStatus: http.StatusNoContent},
		{name: "disallowed role", role: domain.RoleUser, wantStatus: http.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := tokenForTest(t, tt.role, auth.TokenTypeAccess)
			next := RequireRole(domain.RoleAdmin)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusNoContent)
			}))
			handler := Auth(testJWTSecret, zap.NewNop())(next)
			request := httptest.NewRequest(http.MethodGet, "/admin", nil)
			request.Header.Set("Authorization", "Bearer "+token)
			response := httptest.NewRecorder()

			handler.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", response.Code, tt.wantStatus)
			}
		})
	}
}
