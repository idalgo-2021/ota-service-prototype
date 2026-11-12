package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
)

type ratingExecutor interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}

// RefreshListingRatings recalculates every listing from currently public reviews.
// AVG ignores NULL independently for the overall score and for each criterion.
// Listings whose last eligible review disappeared are reset by the LEFT JOIN.
func (r *MaintenanceRepo) RefreshListingRatings(ctx context.Context) (int64, error) {
	conn, err := r.db.Acquire(ctx)
	if err != nil {
		return 0, fmt.Errorf("acquire listing rating connection: %w", err)
	}
	defer conn.Release()
	var acquired bool
	if err := conn.QueryRow(ctx, `SELECT pg_try_advisory_lock(740022)`).Scan(&acquired); err != nil {
		return 0, fmt.Errorf("acquire listing rating lock: %w", err)
	}
	if !acquired {
		return 0, errors.New("listing rating refresh is already running")
	}
	defer func() { _, _ = conn.Exec(context.Background(), `SELECT pg_advisory_unlock(740022)`) }()
	return refreshListingRatings(ctx, conn)
}

func refreshListingRatings(ctx context.Context, db ratingExecutor) (int64, error) {
	result, err := db.Exec(ctx, `WITH ratings AS (
		SELECT listing_id,
			ROUND(AVG(overall_rating), 2) AS overall,
			COUNT(overall_rating)::integer AS overall_count,
			jsonb_strip_nulls(jsonb_build_object(
				'cleanliness_rating', ROUND(AVG(cleanliness_rating), 2),
				'staff_rating', ROUND(AVG(staff_rating), 2),
				'comfort_rating', ROUND(AVG(comfort_rating), 2),
				'location_rating', ROUND(AVG(location_rating), 2),
				'sleep_rating', ROUND(AVG(sleep_rating), 2),
				'bathroom_rating', ROUND(AVG(bathroom_rating), 2),
				'wifi_rating', ROUND(AVG(wifi_rating), 2)
			)) AS details
		FROM listing_reviews
		WHERE status = 'approved' AND NOT is_hidden
		GROUP BY listing_id
	), desired AS (
		SELECT l.id, r.overall, COALESCE(r.overall_count, 0) AS overall_count,
			COALESCE(r.details, '{}'::jsonb) AS details
		FROM listings l LEFT JOIN ratings r ON r.listing_id = l.id
	)
	UPDATE listings l SET
		average_overall_rating = d.overall,
		overall_rating_count = d.overall_count,
		average_rating_details = d.details
	FROM desired d
	WHERE l.id = d.id AND (
		l.average_overall_rating IS DISTINCT FROM d.overall OR
		l.overall_rating_count IS DISTINCT FROM d.overall_count OR
		l.average_rating_details IS DISTINCT FROM d.details
	)`)
	if err != nil {
		return 0, fmt.Errorf("refresh listing ratings: %w", err)
	}
	return result.RowsAffected(), nil
}
