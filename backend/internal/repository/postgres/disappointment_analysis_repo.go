package postgres

import (
	"context"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DisappointmentAnalysisRepo struct{ db *pgxpool.Pool }

func NewDisappointmentAnalysisRepo(db *pgxpool.Pool) *DisappointmentAnalysisRepo {
	return &DisappointmentAnalysisRepo{db: db}
}

func (r *DisappointmentAnalysisRepo) UpsertListingDisappointmentAnalysis(
	ctx context.Context, analysis domain.DisappointmentAnalysis,
) (bool, error) {
	const query = `INSERT INTO listing_disappointment_analyses
		(listing_id, source_hash, result, model_id, prompt_version, generated_at, synced_at)
		VALUES ($1::uuid, $2, $3::jsonb, $4, $5, $6, now())
		ON CONFLICT (listing_id) DO UPDATE SET
			source_hash = EXCLUDED.source_hash,
			result = EXCLUDED.result,
			model_id = EXCLUDED.model_id,
			prompt_version = EXCLUDED.prompt_version,
			generated_at = EXCLUDED.generated_at,
			synced_at = now()
		WHERE listing_disappointment_analyses.generated_at < EXCLUDED.generated_at
			OR (listing_disappointment_analyses.generated_at = EXCLUDED.generated_at AND (
				listing_disappointment_analyses.source_hash IS DISTINCT FROM EXCLUDED.source_hash
				OR listing_disappointment_analyses.result IS DISTINCT FROM EXCLUDED.result
				OR listing_disappointment_analyses.model_id IS DISTINCT FROM EXCLUDED.model_id
				OR listing_disappointment_analyses.prompt_version IS DISTINCT FROM EXCLUDED.prompt_version
			))`
	result, err := r.db.Exec(ctx, query,
		analysis.ListingID,
		analysis.SourceHash,
		analysis.Result,
		analysis.ModelID,
		analysis.PromptVersion,
		analysis.GeneratedAt.UTC().Truncate(time.Microsecond),
	)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}
