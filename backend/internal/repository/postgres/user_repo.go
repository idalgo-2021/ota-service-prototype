package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type UserRepo struct {
	db *pgxpool.Pool
}

func NewUserRepo(db *pgxpool.Pool) *UserRepo {
	return &UserRepo{
		db: db,
	}
}

type userRowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row userRowScanner) (*domain.User, error) {
	var user domain.User
	if err := row.Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, role, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	user, err := scanUser(r.db.QueryRow(ctx, query, id))

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("user %s: %w [%w]", id, domain.ErrUserNotFound, err)
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, role, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	user, err := scanUser(r.db.QueryRow(ctx, query, email))

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("user %s: %w [%w]", email, domain.ErrUserNotFound, err)
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (r *UserRepo) Create(ctx context.Context, user *domain.User) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin user creation: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO users (id, email, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err = tx.Exec(ctx, query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return fmt.Errorf("user email %s conflict: %w (db_cause: %w)", user.Email, domain.ErrUserAlreadyExists, err)
		}
		return fmt.Errorf("failed to create user: %w", err)
	}

	profileTag, err := tx.Exec(ctx, `INSERT INTO user_profiles (user_id, country_id)
		SELECT $1, id FROM countries WHERE code = 'RU'`, user.ID)
	if err != nil {
		return fmt.Errorf("failed to create user profile: %w", err)
	}
	if profileTag.RowsAffected() != 1 {
		return fmt.Errorf("failed to create user profile: default country missing")
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit user creation: %w", err)
	}
	return nil
}
