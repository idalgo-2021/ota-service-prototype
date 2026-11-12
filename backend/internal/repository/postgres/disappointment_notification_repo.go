package postgres

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DisappointmentNotificationRepo struct{ db *pgxpool.Pool }

func NewDisappointmentNotificationRepo(db *pgxpool.Pool) *DisappointmentNotificationRepo {
	return &DisappointmentNotificationRepo{db: db}
}

func (r *DisappointmentNotificationRepo) ListDisappointmentDigestListings(ctx context.Context) ([]domain.DisappointmentDigestListing, error) {
	rows, err := r.db.Query(ctx, `SELECT hl.hotelier_id::text,COALESCE(up.language,'RU'),l.id::text,l.title,COALESCE(l.title_ru,''),a.result,a.generated_at
		FROM listing_disappointment_analyses a
		JOIN listings l ON l.id=a.listing_id AND l.is_active
		JOIN hotelier_listings hl ON hl.listing_id=l.id
		LEFT JOIN user_profiles up ON up.user_id=hl.hotelier_id
		ORDER BY hl.hotelier_id,l.title,l.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.DisappointmentDigestListing, 0)
	for rows.Next() {
		var item domain.DisappointmentDigestListing
		if err := rows.Scan(&item.HotelierID, &item.Language, &item.ListingID, &item.Title, &item.TitleRU, &item.Result, &item.GeneratedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *DisappointmentNotificationRepo) UpsertHotelierDisappointmentDigest(ctx context.Context, hotelierID, message string) (bool, error) {
	const query = `INSERT INTO hotelier_messages
		(hotelier_id,listing_id,message_type,sender_type,source,external_message_id,message_text)
		VALUES ($1::uuid,NULL,'ota_recommendation','system','disappointment_detector',$2,$3)
		ON CONFLICT (source,external_message_id) WHERE external_message_id IS NOT NULL DO UPDATE SET
			message_text=EXCLUDED.message_text,
			status='new',hotelier_reply=NULL,replied_at=NULL,processed_at=NULL,created_at=now()
		WHERE hotelier_messages.message_text IS DISTINCT FROM EXCLUDED.message_text`
	command, err := r.db.Exec(ctx, query, hotelierID, "digest:"+hotelierID, message)
	if err != nil {
		return false, err
	}
	return command.RowsAffected() > 0, nil
}

func (r *DisappointmentNotificationRepo) ResolveMissingHotelierDisappointmentDigests(ctx context.Context) (int64, error) {
	command, err := r.db.Exec(ctx, `UPDATE hotelier_messages m SET status='processed',processed_at=now()
		WHERE m.source='disappointment_detector' AND m.status='new'
		AND NOT EXISTS (
			SELECT 1 FROM hotelier_listings hl
			JOIN listings l ON l.id=hl.listing_id AND l.is_active
			JOIN listing_disappointment_analyses a ON a.listing_id=l.id
			WHERE hl.hotelier_id=m.hotelier_id
		)`)
	if err != nil {
		return 0, err
	}
	return command.RowsAffected(), nil
}
