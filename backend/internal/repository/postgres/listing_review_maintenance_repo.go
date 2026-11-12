package postgres

import (
	"context"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/maintenance"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ListingReviewMaintenanceRepo struct{ db *pgxpool.Pool }

func NewListingReviewMaintenanceRepo(db *pgxpool.Pool) *ListingReviewMaintenanceRepo {
	return &ListingReviewMaintenanceRepo{db: db}
}

func (r *ListingReviewMaintenanceRepo) PreviewListingReviewDrafts(ctx context.Context, since, until time.Time, limit int) ([]maintenance.ListingReviewDraftCandidate, error) {
	rows, err := r.db.Query(ctx, `SELECT b.id, b.listing_id FROM bookings b
		WHERE b.status='completed' AND b.completed_at IS NOT NULL
			AND b.completed_at AT TIME ZONE current_setting('TimeZone') >= $1
			AND b.completed_at AT TIME ZONE current_setting('TimeZone') < $2
			AND NOT EXISTS (SELECT 1 FROM listing_reviews rv WHERE rv.booking_id=b.id)
		ORDER BY b.completed_at, b.id, b.listing_id LIMIT $3`, since, until, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []maintenance.ListingReviewDraftCandidate{}
	for rows.Next() {
		var c maintenance.ListingReviewDraftCandidate
		if err := rows.Scan(&c.BookingID, &c.ListingID); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func (r *ListingReviewMaintenanceRepo) PendingListingReviewDrafts(ctx context.Context, after *maintenance.ListingReviewDraftCandidate, limit int) ([]maintenance.ListingReviewDraftCandidate, error) {
	var afterBooking, afterListing any
	if after != nil {
		afterBooking, afterListing = after.BookingID, after.ListingID
	}
	rows, err := r.db.Query(ctx, `SELECT b.id, b.listing_id FROM bookings b
		WHERE b.status='completed' AND b.completed_at IS NOT NULL
			AND NOT EXISTS (SELECT 1 FROM listing_reviews rv WHERE rv.booking_id=b.id)
			AND ($1::uuid IS NULL OR (b.id,b.listing_id)>($1::uuid,$2::uuid))
		ORDER BY b.id, b.listing_id LIMIT $3`, afterBooking, afterListing, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []maintenance.ListingReviewDraftCandidate{}
	for rows.Next() {
		var c maintenance.ListingReviewDraftCandidate
		if err := rows.Scan(&c.BookingID, &c.ListingID); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func (r *ListingReviewMaintenanceRepo) CreateListingReviewDraft(ctx context.Context, c maintenance.ListingReviewDraftCandidate) (bool, error) {
	var id string
	err := r.db.QueryRow(ctx, `INSERT INTO listing_reviews (is_imported,reviewer_user_id,listing_id,booking_id,status,nights,accommodation_type,reviewer_gender,reviewer_age,reviewer_country)
		SELECT false, b.user_id, b.listing_id, b.id, 'draft',
			b.check_out_date-b.check_in_date,
			(SELECT CASE
				WHEN count(DISTINCT u.type)>1 THEN 'mixed'
				WHEN min(u.type)='bed' AND lt.slug='hostel' THEN 'hostel_bed'
				WHEN min(u.type)='room' AND lt.slug='hotel' THEN 'hotel_room'
				WHEN min(u.type)='room' AND lt.slug='guest_house' THEN 'guest_house_room'
				WHEN min(u.type)='property' AND lt.slug='apartment' THEN 'apartment'
				ELSE min(u.type)
			END
			FROM booking_units bu JOIN listing_units u ON u.id=bu.unit_id
			JOIN listings l ON l.id=b.listing_id JOIN listing_types lt ON lt.id=l.listing_type_id
			WHERE bu.booking_id=b.id GROUP BY lt.slug),
			p.gender,
			CASE WHEN EXTRACT(YEAR FROM b.check_out_date)::integer-p.birth_year BETWEEN 1 AND 120
				THEN (EXTRACT(YEAR FROM b.check_out_date)::integer-p.birth_year)::text END,
			c.name
		FROM bookings b LEFT JOIN user_profiles p ON p.user_id=b.user_id
		LEFT JOIN countries c ON c.id=p.country_id
		WHERE b.id=$1 AND b.listing_id=$2 AND b.status='completed'
			AND b.completed_at IS NOT NULL
		ON CONFLICT DO NOTHING RETURNING id`, c.BookingID, c.ListingID).Scan(&id)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	return err == nil, err
}

func (r *ListingReviewMaintenanceRepo) ExpireListingReviewDrafts(ctx context.Context, cutoff time.Time) (int64, error) {
	ct, err := r.db.Exec(ctx, `UPDATE listing_reviews SET status='rejected', rejection_reason='expired',
		updated_at=now() WHERE status='draft' AND created_at <= $1`, cutoff)
	if err != nil {
		return 0, err
	}
	return ct.RowsAffected(), nil
}
