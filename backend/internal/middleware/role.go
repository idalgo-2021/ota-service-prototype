package middleware

import (
	"net/http"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

// RequireRole checks if the user has one of the allowed roles
func RequireRole(allowedRoles ...domain.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userRole, ok := GetUserRole(r.Context())
			if !ok {
				http.Error(w, `{"error":{"code":"UNAUTHORIZED","message":"Unauthorized"}}`, http.StatusUnauthorized)
				return
			}

			for _, role := range allowedRoles {
				if role == userRole {
					next.ServeHTTP(w, r)
					return
				}
			}

			http.Error(w, `{"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}}`, http.StatusForbidden)
		})
	}
}
