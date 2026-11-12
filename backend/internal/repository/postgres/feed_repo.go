package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FeedRepo struct {
	db *pgxpool.Pool
}

func NewFeedRepo(db *pgxpool.Pool) *FeedRepo {
	return &FeedRepo{db: db}
}

const feedVideoColumns = `id, listing_id, location_id, demo_id, title, subtitle, author, sort_order, is_active, created_at, hotelier_id`

func scanFeedVideo(row pgx.Row) (domain.FeedVideo, error) {
	var v domain.FeedVideo
	err := row.Scan(
		&v.ID,
		&v.ListingID,
		&v.LocationID,
		&v.DemoID,
		&v.Title,
		&v.Subtitle,
		&v.Author,
		&v.SortOrder,
		&v.IsActive,
		&v.CreatedAt,
		&v.HotelierID,
	)
	return v, err
}

func (r *FeedRepo) ListFeedVideos(ctx context.Context, filter domain.FeedFilter) ([]domain.FeedVideo, error) {
	conditions := []string{"is_active = true"}
	var args []any

	if filter.ListingID != nil && *filter.ListingID != "" {
		args = append(args, *filter.ListingID)
		conditions = append(conditions, fmt.Sprintf("listing_id = $%d", len(args)))
	} else if filter.LocationID != nil {
		args = append(args, *filter.LocationID)
		conditions = append(conditions, fmt.Sprintf("(location_id = $%d OR (listing_id IS NULL AND location_id IS NULL))", len(args)))
	}

	query := fmt.Sprintf(
		"SELECT %s FROM feed_videos WHERE %s ORDER BY sort_order ASC, created_at DESC, id ASC",
		feedVideoColumns,
		strings.Join(conditions, " AND "),
	)

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	args = append(args, limit)
	query += fmt.Sprintf(" LIMIT $%d", len(args))

	if filter.Offset > 0 {
		args = append(args, filter.Offset)
		query += fmt.Sprintf(" OFFSET $%d", len(args))
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var videos []domain.FeedVideo
	for rows.Next() {
		v, err := scanFeedVideo(rows)
		if err != nil {
			return nil, err
		}
		videos = append(videos, v)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	if videos == nil {
		videos = []domain.FeedVideo{}
	}
	return videos, nil
}

func (r *FeedRepo) GetFeedVideo(ctx context.Context, idOrDemo string) (*domain.FeedVideo, error) {
	var query string
	var arg any

	if _, err := uuid.Parse(idOrDemo); err == nil {
		query = fmt.Sprintf("SELECT %s FROM feed_videos WHERE id = $1", feedVideoColumns)
		arg = idOrDemo
	} else {
		query = fmt.Sprintf("SELECT %s FROM feed_videos WHERE demo_id = $1", feedVideoColumns)
		arg = idOrDemo
	}

	v, err := scanFeedVideo(r.db.QueryRow(ctx, query, arg))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("feed video not found")
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *FeedRepo) CreateListingVideo(ctx context.Context, hotelierID, listingID string, input domain.CreateListingVideoInput) (*domain.FeedVideo, error) {
	query := fmt.Sprintf(`
		INSERT INTO feed_videos (listing_id, location_id, hotelier_id, title, subtitle, author, sort_order, is_active)
		SELECT l.id, l.location_id, $1, $2, $3, $4, $5, $6
		FROM listings l
		WHERE l.id = $7
		RETURNING %s`, feedVideoColumns)

	v, err := scanFeedVideo(r.db.QueryRow(ctx, query,
		hotelierID,
		input.Title,
		input.Subtitle,
		input.Author,
		input.SortOrder,
		input.IsActive,
		listingID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("listing not found")
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *FeedRepo) ListListingVideos(ctx context.Context, listingID string) ([]domain.FeedVideo, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM feed_videos
		WHERE listing_id = $1
		ORDER BY sort_order ASC, created_at DESC, id ASC`, feedVideoColumns)

	rows, err := r.db.Query(ctx, query, listingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var videos []domain.FeedVideo
	for rows.Next() {
		v, err := scanFeedVideo(rows)
		if err != nil {
			return nil, err
		}
		videos = append(videos, v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if videos == nil {
		videos = []domain.FeedVideo{}
	}
	return videos, nil
}

func (r *FeedRepo) GetListingVideo(ctx context.Context, listingID, videoID string) (*domain.FeedVideo, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM feed_videos
		WHERE listing_id = $1 AND id = $2`, feedVideoColumns)

	v, err := scanFeedVideo(r.db.QueryRow(ctx, query, listingID, videoID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("video not found")
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *FeedRepo) UpdateListingVideo(ctx context.Context, listingID, videoID string, patch domain.UpdateListingVideoInput) (*domain.FeedVideo, error) {
	setClauses := []string{}
	args := []any{listingID, videoID}

	if patch.Title != nil {
		args = append(args, *patch.Title)
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", len(args)))
	}
	if patch.Subtitle != nil {
		args = append(args, *patch.Subtitle)
		setClauses = append(setClauses, fmt.Sprintf("subtitle = $%d", len(args)))
	}
	if patch.Author != nil {
		args = append(args, *patch.Author)
		setClauses = append(setClauses, fmt.Sprintf("author = $%d", len(args)))
	}
	if patch.SortOrder != nil {
		args = append(args, *patch.SortOrder)
		setClauses = append(setClauses, fmt.Sprintf("sort_order = $%d", len(args)))
	}
	if patch.IsActive != nil {
		args = append(args, *patch.IsActive)
		setClauses = append(setClauses, fmt.Sprintf("is_active = $%d", len(args)))
	}

	if len(setClauses) == 0 {
		return r.GetListingVideo(ctx, listingID, videoID)
	}

	query := fmt.Sprintf(`
		UPDATE feed_videos
		SET %s
		WHERE listing_id = $1 AND id = $2
		RETURNING %s`, strings.Join(setClauses, ", "), feedVideoColumns)

	v, err := scanFeedVideo(r.db.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("video not found")
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *FeedRepo) DeleteListingVideo(ctx context.Context, listingID, videoID string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM feed_videos WHERE listing_id = $1 AND id = $2`, listingID, videoID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.NewNotFound("video not found")
	}
	return nil
}
