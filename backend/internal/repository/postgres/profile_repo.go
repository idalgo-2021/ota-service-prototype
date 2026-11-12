package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ProfileRepo struct{ db *pgxpool.Pool }

func NewProfileRepo(db *pgxpool.Pool) *ProfileRepo { return &ProfileRepo{db: db} }

const profileBaseColumns = `p.user_id, u.email, p.first_name, p.last_name, p.birth_year, p.gender, p.nationality,
	p.about, p.language, p.currency, p.country_id, p.location_id, p.created_at, p.updated_at`
const profileColumns = profileBaseColumns + `, p.search_preferences`

func scanProfile(row userRowScanner, withPreferences bool) (*domain.Profile, error) {
	var p domain.Profile
	fields := []any{&p.UserID, &p.Email, &p.FirstName, &p.LastName, &p.BirthYear, &p.Gender, &p.Nationality,
		&p.About, &p.Language, &p.Currency, &p.CountryID, &p.LocationID,
		&p.CreatedAt, &p.UpdatedAt}
	var rawPreferences []byte
	if withPreferences {
		fields = append(fields, &rawPreferences)
	}
	if err := row.Scan(fields...); err != nil {
		return nil, err
	}
	if rawPreferences != nil {
		if err := json.Unmarshal(rawPreferences, &p.SearchPreferences); err != nil {
			return nil, fmt.Errorf("decode search preferences: %w", err)
		}
	}
	return &p, nil
}

func (r *ProfileRepo) GetByUserID(ctx context.Context, userID string) (*domain.Profile, error) {
	p, err := scanProfile(r.db.QueryRow(ctx, `SELECT `+profileColumns+`
		FROM user_profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = $1`, userID), true)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("user %s: %w", userID, domain.ErrProfileNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}
	return p, nil
}

func (r *ProfileRepo) GetClientByUserID(ctx context.Context, userID string) (*domain.Profile, error) {
	p, err := scanProfile(r.db.QueryRow(ctx, `SELECT `+profileBaseColumns+`
		FROM user_profiles p JOIN users u ON u.id=p.user_id
		WHERE p.user_id=$1 AND u.role='user'`, userID), false)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrProfileNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get client profile: %w", err)
	}
	return p, nil
}

func (r *ProfileRepo) Update(ctx context.Context, p *domain.Profile, patch domain.ProfilePatch) (*domain.Profile, error) {
	args := []any{p.UserID}
	sets := make([]string, 0, 12)
	add := func(column string, value any, cast string) string {
		args = append(args, value)
		placeholder := fmt.Sprintf("$%d%s", len(args), cast)
		sets = append(sets, column+"="+placeholder)
		return placeholder
	}
	if patch.FirstName.Set {
		add("first_name", p.FirstName, "")
	}
	if patch.LastName.Set {
		add("last_name", p.LastName, "")
	}
	if patch.BirthYear.Set {
		add("birth_year", p.BirthYear, "")
	}
	if patch.Gender.Set {
		add("gender", p.Gender, "")
	}
	if patch.Nationality.Set {
		add("nationality", p.Nationality, "")
	}
	if patch.About.Set {
		add("about", p.About, "")
	}
	if patch.Language.Set {
		add("language", p.Language, "")
	}
	currencyCheck := "TRUE"
	if patch.Currency.Set {
		placeholder := add("currency", p.Currency, "")
		currencyCheck = "EXISTS (SELECT 1 FROM currencies WHERE code=" + placeholder + " AND is_active)"
	}
	countryExpr := "p.country_id"
	if patch.CountryID.Set {
		countryExpr = add("country_id", p.CountryID, "")
	}
	locationExpr := "p.location_id"
	if patch.LocationID.Set {
		locationExpr = add("location_id", p.LocationID, "::integer")
	}
	if patch.SearchPreferences.Set {
		var value any
		if p.SearchPreferences != nil {
			encoded, err := json.Marshal(p.SearchPreferences)
			if err != nil {
				return nil, fmt.Errorf("encode search preferences: %w", err)
			}
			value = string(encoded)
		}
		add("search_preferences", value, "::jsonb")
	}
	if len(sets) == 0 {
		return r.GetByUserID(ctx, p.UserID)
	}
	sets = append(sets, "updated_at=now()")
	query := `UPDATE user_profiles p SET ` + strings.Join(sets, ", ") + `
		WHERE p.user_id=$1
		AND EXISTS (SELECT 1 FROM countries WHERE id=` + countryExpr + `)
		AND ` + currencyCheck + `
		AND (` + locationExpr + ` IS NULL OR EXISTS (SELECT 1 FROM locations WHERE id=` + locationExpr + ` AND country_id=` + countryExpr + `))
		RETURNING p.user_id`
	var updatedID string
	err := r.db.QueryRow(ctx, query, args...).Scan(&updatedID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("invalid country, location or currency: %w", domain.ErrInvalidInput)
	}
	if err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}
	return r.GetByUserID(ctx, updatedID)
}

func (r *ProfileRepo) ListClients(ctx context.Context, limit, offset int) ([]domain.Profile, int, error) {
	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM user_profiles p JOIN users u ON u.id=p.user_id WHERE u.role='user'`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count client profiles: %w", err)
	}
	rows, err := r.db.Query(ctx, `SELECT `+profileBaseColumns+` FROM user_profiles p
		JOIN users u ON u.id=p.user_id WHERE u.role='user'
		ORDER BY p.created_at DESC, p.user_id DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list client profiles: %w", err)
	}
	defer rows.Close()
	result := make([]domain.Profile, 0)
	for rows.Next() {
		p, err := scanProfile(rows, false)
		if err != nil {
			return nil, 0, fmt.Errorf("scan client profile: %w", err)
		}
		result = append(result, *p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate client profiles: %w", err)
	}
	return result, total, nil
}
