package postgres

import (
	"context"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReviewSummaryRepo struct{ db *pgxpool.Pool }

func NewReviewSummaryRepo(db *pgxpool.Pool) *ReviewSummaryRepo {
	return &ReviewSummaryRepo{db: db}
}

func (r *ReviewSummaryRepo) UpsertListingReviewSummary(ctx context.Context, summary domain.ReviewSummary) (bool, error) {
	return upsertReviewSummary(ctx, r.db, "listing_review_summaries", "listing_id", summary)
}

func (r *ReviewSummaryRepo) UpsertProductReviewSummary(ctx context.Context, summary domain.ReviewSummary) (bool, error) {
	return upsertReviewSummary(ctx, r.db, "product_review_summaries", "product_id", summary)
}

func upsertReviewSummary(ctx context.Context, db *pgxpool.Pool, table, idColumn string, summary domain.ReviewSummary) (bool, error) {
	query := `INSERT INTO ` + table + ` (` + idColumn + `, summary, source_review_count, model_id, prompt_version, generated_at, synced_at)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, now())
		ON CONFLICT (` + idColumn + `) DO UPDATE SET
			summary = EXCLUDED.summary,
			source_review_count = EXCLUDED.source_review_count,
			model_id = EXCLUDED.model_id,
			prompt_version = EXCLUDED.prompt_version,
			generated_at = EXCLUDED.generated_at,
			synced_at = now()
		WHERE ` + table + `.generated_at < EXCLUDED.generated_at
			OR (` + table + `.generated_at = EXCLUDED.generated_at AND (
				` + table + `.summary IS DISTINCT FROM EXCLUDED.summary
				OR ` + table + `.source_review_count IS DISTINCT FROM EXCLUDED.source_review_count
				OR ` + table + `.model_id IS DISTINCT FROM EXCLUDED.model_id
				OR ` + table + `.prompt_version IS DISTINCT FROM EXCLUDED.prompt_version
			))`
	result, err := db.Exec(ctx, query, summary.EntityID, summary.Summary, summary.SourceReviewCount, summary.ModelID, summary.PromptVersion, summary.GeneratedAt.UTC().Truncate(time.Microsecond))
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}
