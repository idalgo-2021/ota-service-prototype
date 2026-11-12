package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"go.uber.org/zap"

	jwtAuth "github.com/idalgo-2021/product-catalog-backend/internal/auth"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/service"
)

type refreshTestUserRepository struct {
	idErr error
}

func (r *refreshTestUserRepository) GetByID(context.Context, string) (*domain.User, error) {
	return nil, r.idErr
}

func (r *refreshTestUserRepository) GetByEmail(context.Context, string) (*domain.User, error) {
	return nil, nil
}

func (r *refreshTestUserRepository) Create(context.Context, *domain.User) error {
	return nil
}

func TestRefreshReturnsUnauthorizedForInvalidToken(t *testing.T) {
	service := service.NewAuthService(&refreshTestUserRepository{}, "test-secret", time.Minute, time.Hour, zap.NewNop())
	handler := NewAuthHandler(service, zap.NewNop())
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", strings.NewReader(`{"refresh_token":"invalid-token"}`))

	handler.Refresh(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Error.Code != "UNAUTHORIZED" {
		t.Errorf("error code = %q, want UNAUTHORIZED", body.Error.Code)
	}
}

func TestRefreshKeepsDatabaseFailureInternal(t *testing.T) {
	const secret = "test-secret"
	token, err := jwtAuth.GenerateToken(&domain.User{ID: "user-123"}, secret, time.Hour, jwtAuth.TokenTypeRefresh)
	if err != nil {
		t.Fatalf("generate refresh token: %v", err)
	}
	service := service.NewAuthService(&refreshTestUserRepository{idErr: errors.New("database unavailable")}, secret, time.Minute, time.Hour, zap.NewNop())
	handler := NewAuthHandler(service, zap.NewNop())
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", strings.NewReader(`{"refresh_token":"`+token+`"}`))

	handler.Refresh(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	if strings.Contains(response.Body.String(), "database unavailable") {
		t.Fatal("response leaked database error")
	}
}
