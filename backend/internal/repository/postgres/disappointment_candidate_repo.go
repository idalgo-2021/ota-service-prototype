package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DisappointmentCandidateRepo struct{ db *pgxpool.Pool }

func NewDisappointmentCandidateRepo(db *pgxpool.Pool) *DisappointmentCandidateRepo {
	return &DisappointmentCandidateRepo{db: db}
}

const disappointmentCandidateWhere = `
	FROM listings l
	JOIN listing_types lt ON lt.id = l.listing_type_id
	JOIN locations loc ON loc.id = l.location_id
	JOIN listing_review_summaries s ON s.listing_id = l.id
	WHERE l.is_active
	  AND btrim(s.summary) <> ''
	  AND EXISTS (SELECT 1 FROM hotelier_listings hl WHERE hl.listing_id = l.id)`

func (r *DisappointmentCandidateRepo) List(ctx context.Context, limit, offset int) ([]domain.DisappointmentCandidate, int, error) {
	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) `+disappointmentCandidateWhere).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count AI disappointment candidates: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT l.id::text, l.title, l.title_ru, l.description, l.description_ru,
			lt.id, lt.slug, lt.name, lt.name_ru,
			loc.id, loc.name, loc.name_ru,
			COALESCE((
				SELECT jsonb_agg(jsonb_build_object(
					'id', t.id, 'slug', t.slug, 'name', t.name, 'name_ru', t.name_ru
				) ORDER BY a.sort_order, t.id)
				FROM listing_feature_tag_assignments a
				JOIN listing_feature_tags t ON t.id = a.tag_id
				WHERE a.listing_id = l.id AND t.is_active
			), '[]'::jsonb),
			s.summary, s.source_review_count, s.generated_at, s.synced_at,
			s.model_id, s.prompt_version, l.average_overall_rating,
			l.average_rating_details, l.overall_rating_count, l.updated_at
		`+disappointmentCandidateWhere+`
		ORDER BY l.id
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query AI disappointment candidates: %w", err)
	}
	defer rows.Close()

	items := make([]domain.DisappointmentCandidate, 0)
	for rows.Next() {
		var item domain.DisappointmentCandidate
		var featuresJSON, ratingDetailsJSON []byte
		if err := rows.Scan(
			&item.ListingID, &item.Title, &item.TitleRU, &item.Description, &item.DescriptionRU,
			&item.ListingType.ID, &item.ListingType.Slug, &item.ListingType.Name, &item.ListingType.NameRU,
			&item.Location.ID, &item.Location.Name, &item.Location.NameRU,
			&featuresJSON,
			&item.Reviews.Summary, &item.Reviews.SourceReviewCount, &item.Reviews.GeneratedAt, &item.Reviews.SyncedAt,
			&item.Reviews.ModelID, &item.Reviews.PromptVersion, &item.Reviews.AverageOverallRating,
			&ratingDetailsJSON, &item.Reviews.OverallRatingCount, &item.ListingUpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan AI disappointment candidate: %w", err)
		}
		item.Features = make([]domain.FeatureTag, 0)
		if err := json.Unmarshal(featuresJSON, &item.Features); err != nil {
			return nil, 0, fmt.Errorf("decode AI candidate feature tags: %w", err)
		}
		item.Reviews.AverageRatingDetails = make(map[string]float64)
		if err := json.Unmarshal(ratingDetailsJSON, &item.Reviews.AverageRatingDetails); err != nil {
			return nil, 0, fmt.Errorf("decode AI candidate rating details: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate AI disappointment candidates: %w", err)
	}
	return items, total, nil
}
