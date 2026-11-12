package listingdistance

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Recalculate updates stored straight-line distances in kilometres. A zero
// locationID selects every location. Missing coordinates produce NULL.
func Recalculate(ctx context.Context, db *pgxpool.Pool, locationID int) (int64, error) {
	if locationID < 0 {
		return 0, fmt.Errorf("location_id must not be negative")
	}
	if locationID != 0 {
		var exists bool
		if err := db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM locations WHERE id=$1)`, locationID).Scan(&exists); err != nil {
			return 0, fmt.Errorf("check location: %w", err)
		}
		if !exists {
			return 0, fmt.Errorf("location_id %d does not exist", locationID)
		}
	}

	result, err := db.Exec(ctx, `WITH distances AS (
		SELECT l.id,
			CASE WHEN l.geo IS NOT NULL AND loc.center_latitude IS NOT NULL THEN
				ROUND((ST_Distance(l.geo, ST_SetSRID(ST_MakePoint(loc.center_longitude, loc.center_latitude), 4326)::geography) / 1000.0)::numeric, 3)::numeric(9,3)
			ELSE NULL END AS km
		FROM listings l
		JOIN locations loc ON loc.id = l.location_id
		WHERE $1::integer = 0 OR l.location_id = $1
	)
	UPDATE listings l SET distance_from_center_km = d.km
	FROM distances d
	WHERE l.id = d.id AND l.distance_from_center_km IS DISTINCT FROM d.km`, locationID)
	if err != nil {
		return 0, fmt.Errorf("recalculate listing distances: %w", err)
	}
	return result.RowsAffected(), nil
}
