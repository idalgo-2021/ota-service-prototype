package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type CounterpartyRepo struct {
	db *pgxpool.Pool
}

func NewCounterpartyRepo(db *pgxpool.Pool) *CounterpartyRepo {
	return &CounterpartyRepo{db: db}
}

func (r *CounterpartyRepo) List(ctx context.Context, locationID *int, limit, offset int) ([]domain.Counterparty, int, error) {
	countQuery := `SELECT count(*) FROM counterparties WHERE ($1::int IS NULL OR location_id = $1)`
	var total int
	if err := r.db.QueryRow(ctx, countQuery, locationID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count counterparties: %w", err)
	}

	query := `SELECT id, name, location_id FROM counterparties WHERE ($1::int IS NULL OR location_id = $1) ORDER BY name, id LIMIT $2 OFFSET $3`
	rows, err := r.db.Query(ctx, query, locationID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list counterparties: %w", err)
	}
	defer rows.Close()

	result := make([]domain.Counterparty, 0)
	for rows.Next() {
		var c domain.Counterparty
		if err := rows.Scan(&c.ID, &c.Name, &c.LocationID); err != nil {
			return nil, 0, fmt.Errorf("failed to scan counterparty: %w", err)
		}
		result = append(result, c)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate counterparties: %w", err)
	}

	return result, total, nil
}
