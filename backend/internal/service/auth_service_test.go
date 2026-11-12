package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/idalgo-2021/product-catalog-backend/internal/auth"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

const testAuthSecret = "test-secret-for-auth-service"

type authTestUserRepository struct {
	user     *domain.User
	emailErr error
	idErr    error
}

func (r *authTestUserRepository) GetByID(context.Context, string) (*domain.User, error) {
	return r.user, r.idErr
}

func (r *authTestUserRepository) GetByEmail(context.Context, string) (*domain.User, error) {
	return r.user, r.emailErr
}

func (r *authTestUserRepository) Create(context.Context, *domain.User) error {
	return nil
}

func testPasswordHash(t *testing.T, password string) string {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	return string(hash)
}

func assertTokenRole(t *testing.T, token string, wantType auth.TokenType, wantRole domain.Role) {
	t.Helper()
	claims, err := auth.ValidateToken(token, testAuthSecret)
	if err != nil {
		t.Fatalf("validate token: %v", err)
	}
	if claims.TokenType != wantType {
		t.Errorf("token type = %q, want %q", claims.TokenType, wantType)
	}
	if claims.Role != wantRole {
		t.Errorf("token role = %q, want %q", claims.Role, wantRole)
	}
}

func TestLoginIncludesRepositoryRoleInTokens(t *testing.T) {
	user := &domain.User{
		ID:           "user-123",
		Email:        "manager@example.com",
		PasswordHash: testPasswordHash(t, "correct-password"),
		Role:         domain.RoleManager,
	}
	service := NewAuthService(
		&authTestUserRepository{user: user},
		testAuthSecret,
		15*time.Minute,
		24*time.Hour,
		zap.NewNop(),
	)

	accessToken, refreshToken, err := service.Login(context.Background(), user.Email, "correct-password")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	assertTokenRole(t, accessToken, auth.TokenTypeAccess, domain.RoleManager)
	assertTokenRole(t, refreshToken, auth.TokenTypeRefresh, domain.RoleManager)
}

func TestRefreshIncludesCurrentRepositoryRoleInTokens(t *testing.T) {
	user := &domain.User{ID: "user-123", Role: domain.RoleUser}
	repo := &authTestUserRepository{user: user}
	service := NewAuthService(repo, testAuthSecret, 15*time.Minute, 24*time.Hour, zap.NewNop())

	_, refreshToken, err := service.GenerateTokens(user)
	if err != nil {
		t.Fatalf("generate initial tokens: %v", err)
	}

	// Refresh reloads the user so newly issued tokens carry the current persisted role.
	repo.user = &domain.User{ID: user.ID, Role: domain.RoleAdmin}
	accessToken, newRefreshToken, err := service.RefreshToken(context.Background(), refreshToken)
	if err != nil {
		t.Fatalf("refresh tokens: %v", err)
	}

	assertTokenRole(t, accessToken, auth.TokenTypeAccess, domain.RoleAdmin)
	assertTokenRole(t, newRefreshToken, auth.TokenTypeRefresh, domain.RoleAdmin)
}

func TestRefreshRejectsInvalidTokensAsUnauthorized(t *testing.T) {
	user := &domain.User{ID: "user-123", Role: domain.RoleUser}
	service := NewAuthService(&authTestUserRepository{user: user}, testAuthSecret, time.Minute, time.Hour, zap.NewNop())

	accessToken, err := auth.GenerateToken(user, testAuthSecret, time.Minute, auth.TokenTypeAccess)
	if err != nil {
		t.Fatalf("generate access token: %v", err)
	}
	expiredToken, err := auth.GenerateToken(user, testAuthSecret, -time.Minute, auth.TokenTypeRefresh)
	if err != nil {
		t.Fatalf("generate expired refresh token: %v", err)
	}

	for _, tc := range []struct {
		name  string
		token string
	}{
		{name: "malformed", token: "invalid-token"},
		{name: "expired", token: expiredToken},
		{name: "wrong type", token: accessToken},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, _, err := service.RefreshToken(context.Background(), tc.token)
			if !errors.Is(err, domain.ErrUnauthorized) {
				t.Fatalf("error = %v, want ErrUnauthorized", err)
			}
			if got, want := err.Error(), "unauthorized: invalid refresh token"; got != want {
				t.Errorf("error message = %q, want %q", got, want)
			}
		})
	}
}

func TestRefreshRejectsTokenForMissingUserAsUnauthorized(t *testing.T) {
	user := &domain.User{ID: "deleted-user"}
	repo := &authTestUserRepository{idErr: domain.ErrUserNotFound}
	service := NewAuthService(repo, testAuthSecret, time.Minute, time.Hour, zap.NewNop())
	token, err := auth.GenerateToken(user, testAuthSecret, time.Hour, auth.TokenTypeRefresh)
	if err != nil {
		t.Fatalf("generate refresh token: %v", err)
	}

	_, _, err = service.RefreshToken(context.Background(), token)
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("error = %v, want ErrUnauthorized", err)
	}
}

func TestRefreshPropagatesDatabaseFailure(t *testing.T) {
	user := &domain.User{ID: "user-123"}
	dbErr := errors.New("database connection refused")
	repo := &authTestUserRepository{idErr: dbErr}
	service := NewAuthService(repo, testAuthSecret, time.Minute, time.Hour, zap.NewNop())
	token, err := auth.GenerateToken(user, testAuthSecret, time.Hour, auth.TokenTypeRefresh)
	if err != nil {
		t.Fatalf("generate refresh token: %v", err)
	}

	_, _, err = service.RefreshToken(context.Background(), token)
	if !errors.Is(err, dbErr) {
		t.Fatalf("error = %v, want wrapped database error", err)
	}
	if errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("database failure was incorrectly classified as unauthorized: %v", err)
	}
}

func TestLoginTreatsUnknownEmailAsInvalidCredentials(t *testing.T) {
	repo := &authTestUserRepository{emailErr: domain.ErrUserNotFound}
	service := NewAuthService(repo, testAuthSecret, time.Minute, time.Hour, zap.NewNop())

	_, _, err := service.Login(context.Background(), "missing@example.com", "password")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("error = %v, want ErrUnauthorized", err)
	}
	if got, want := err.Error(), "unauthorized: invalid credentials"; got != want {
		t.Errorf("error message = %q, want %q", got, want)
	}
}

func TestLoginPropagatesDatabaseFailureWithoutMarkingUnauthorized(t *testing.T) {
	dbErr := errors.New("database connection refused")
	repo := &authTestUserRepository{emailErr: dbErr}
	service := NewAuthService(repo, testAuthSecret, time.Minute, time.Hour, zap.NewNop())

	_, _, err := service.Login(context.Background(), "user@example.com", "password")
	if err == nil {
		t.Fatal("expected login to fail")
	}
	if errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("database failure was incorrectly classified as unauthorized: %v", err)
	}
	if !errors.Is(err, dbErr) {
		t.Errorf("error %v does not wrap the database error", err)
	}
}
