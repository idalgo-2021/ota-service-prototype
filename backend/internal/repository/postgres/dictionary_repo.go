package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type DictionaryRepo struct {
	db *pgxpool.Pool
}

func NewDictionaryRepo(db *pgxpool.Pool) *DictionaryRepo {
	return &DictionaryRepo{
		db: db,
	}
}

func (r *DictionaryRepo) GetCountries(ctx context.Context) ([]domain.Country, error) {
	query := `SELECT id, name, name_ru, code FROM countries ORDER BY name ASC, id ASC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query countries: %w", err)
	}
	defer rows.Close()

	var result []domain.Country
	for rows.Next() {
		var c domain.Country
		if err := rows.Scan(&c.ID, &c.Name, &c.NameRU, &c.Code); err != nil {
			return nil, fmt.Errorf("failed to scan country: %w", err)
		}
		result = append(result, c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate countries: %w", err)
	}

	return result, nil
}

func (r *DictionaryRepo) GetLocations(ctx context.Context) ([]domain.Location, error) {
	query := `SELECT id, country_id, name, name_ru, center_latitude, center_longitude FROM locations ORDER BY name ASC, id ASC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query locations: %w", err)
	}
	defer rows.Close()

	var result []domain.Location
	for rows.Next() {
		var l domain.Location
		if err := rows.Scan(&l.ID, &l.CountryID, &l.Name, &l.NameRU, &l.CenterLatitude, &l.CenterLongitude); err != nil {
			return nil, fmt.Errorf("failed to scan location: %w", err)
		}
		result = append(result, l)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate locations: %w", err)
	}

	return result, nil
}

func (r *DictionaryRepo) GetListingTypes(ctx context.Context) ([]domain.ListingType, error) {
	query := `SELECT id, slug, name, name_ru FROM listing_types ORDER BY id ASC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query listing_types: %w", err)
	}
	defer rows.Close()

	var result []domain.ListingType
	for rows.Next() {
		var lt domain.ListingType
		if err := rows.Scan(&lt.ID, &lt.Slug, &lt.Name, &lt.NameRU); err != nil {
			return nil, fmt.Errorf("failed to scan listing_type: %w", err)
		}
		result = append(result, lt)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate listing_types: %w", err)
	}

	return result, nil
}

func (r *DictionaryRepo) GetFeatures(ctx context.Context) ([]domain.FeatureTag, error) {
	rows, err := r.db.Query(ctx, `SELECT id, slug, name, name_ru FROM listing_feature_tags WHERE is_active ORDER BY name ASC, id ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query listing feature tags: %w", err)
	}
	defer rows.Close()
	result := make([]domain.FeatureTag, 0)
	for rows.Next() {
		var tag domain.FeatureTag
		if err := rows.Scan(&tag.ID, &tag.Slug, &tag.Name, &tag.NameRU); err != nil {
			return nil, fmt.Errorf("failed to scan listing feature tag: %w", err)
		}
		result = append(result, tag)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate listing feature tags: %w", err)
	}
	return result, nil
}

func (r *DictionaryRepo) GetCurrencies(ctx context.Context) ([]domain.Currency, error) {
	rows, err := r.db.Query(ctx, `SELECT code, name, name_ru FROM currencies WHERE is_active ORDER BY code ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query currencies: %w", err)
	}
	defer rows.Close()
	result := make([]domain.Currency, 0)
	for rows.Next() {
		var c domain.Currency
		if err := rows.Scan(&c.Code, &c.Name, &c.NameRU); err != nil {
			return nil, fmt.Errorf("failed to scan currency: %w", err)
		}
		result = append(result, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate currencies: %w", err)
	}
	return result, nil
}
