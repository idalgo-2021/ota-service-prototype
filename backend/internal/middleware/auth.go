// internal/middleware/auth.go
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/auth"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type contextKey string

const (
	UserIDKey contextKey = "user_id"
	RoleKey   contextKey = "user_role"
)

// GetUserID extracts the authenticated user ID from the request context.
// Returns empty string and false if not present (e.g. unauthenticated request).
func GetUserID(ctx context.Context) (string, bool) {
	uid, ok := ctx.Value(UserIDKey).(string)
	return uid, ok
}

// GetUserRole extracts the authenticated user role from the request context.
func GetUserRole(ctx context.Context) (domain.Role, bool) {
	role, ok := ctx.Value(RoleKey).(domain.Role)
	return role, ok
}

func Auth(jwtSecret string, logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"Authorization header required"}}`, http.StatusUnauthorized)
				return
			}

			claims, err := validateAccessToken(authHeader, jwtSecret)
			if err != nil {
				logger.Warn("invalid access token", zap.Error(err))
				http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"Invalid or non-access token"}}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, RoleKey, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth parses the token if present, otherwise proceeds without error
func OptionalAuth(jwtSecret string, logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				next.ServeHTTP(w, r)
				return
			}

			claims, err := validateAccessToken(authHeader, jwtSecret)
			if err != nil {
				logger.Warn("invalid access token in optional auth", zap.Error(err))
				http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"Invalid or non-access token"}}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, RoleKey, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// validateAccessToken validates the Bearer token and rejects refresh tokens.
func validateAccessToken(authHeader, jwtSecret string) (*auth.JWTClaims, error) {
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" || parts[1] == "" {
		return nil, fmt.Errorf("invalid authorization header format")
	}

	claims, err := auth.ValidateToken(parts[1], jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}
	if claims.TokenType != auth.TokenTypeAccess {
		return nil, fmt.Errorf("unexpected token type: %q", claims.TokenType)
	}

	return claims, nil
}
