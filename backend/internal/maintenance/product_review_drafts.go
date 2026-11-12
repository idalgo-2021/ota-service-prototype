package maintenance

import (
	"context"
	"fmt"
	"time"
)

type ProductReviewDraftCandidate struct {
	OrderID   string
	ProductID string
}

type ProductReviewDraftRepository interface {
	PreviewProductReviewDrafts(context.Context, time.Time, time.Time, int) ([]ProductReviewDraftCandidate, error)
	PendingProductReviewDrafts(context.Context, *ProductReviewDraftCandidate, int) ([]ProductReviewDraftCandidate, error)
	CreateProductReviewDraft(context.Context, ProductReviewDraftCandidate) (bool, error)
	ExpireProductReviewDrafts(context.Context, time.Time) (int64, error)
}

type ProductReviewDraftResult struct {
	Created int
	Skipped int
	Failed  int
	Expired int64
}

type ProductReviewDraftRunner struct {
	repo     ProductReviewDraftRepository
	lifetime time.Duration
}

func NewProductReviewDraftRunner(repo ProductReviewDraftRepository, lifetime time.Duration) *ProductReviewDraftRunner {
	return &ProductReviewDraftRunner{repo: repo, lifetime: lifetime}
}

func (r *ProductReviewDraftRunner) Preview(ctx context.Context, since, until time.Time, report func(ProductReviewDraftCandidate) error) (int, error) {
	if !since.Before(until) {
		return 0, fmt.Errorf("since must be before until")
	}
	const limit = 1000
	candidates, err := r.repo.PreviewProductReviewDrafts(ctx, since, until, limit+1)
	if err != nil {
		return 0, fmt.Errorf("find product review draft candidates: %w", err)
	}
	if len(candidates) > limit {
		return 0, fmt.Errorf("more than %d product review draft candidates; use a smaller time window", limit)
	}
	for i, candidate := range candidates {
		if err := report(candidate); err != nil {
			return i, fmt.Errorf("preview product review draft for order %s: %w", candidate.OrderID, err)
		}
	}
	return len(candidates), nil
}

func (r *ProductReviewDraftRunner) Process(ctx context.Context, now time.Time, onError func(ProductReviewDraftCandidate, error)) (ProductReviewDraftResult, error) {
	var result ProductReviewDraftResult
	var after *ProductReviewDraftCandidate
	for {
		candidates, err := r.repo.PendingProductReviewDrafts(ctx, after, BatchSize)
		if err != nil {
			return result, fmt.Errorf("find product review draft candidates: %w", err)
		}
		for _, candidate := range candidates {
			if err := ctx.Err(); err != nil {
				return result, err
			}
			created, err := r.repo.CreateProductReviewDraft(ctx, candidate)
			if err != nil {
				result.Failed++
				if onError != nil {
					onError(candidate, err)
				}
				continue
			}
			if created {
				result.Created++
			} else {
				result.Skipped++
			}
		}
		if len(candidates) < BatchSize {
			break
		}
		last := candidates[len(candidates)-1]
		after = &last
	}
	expired, err := r.repo.ExpireProductReviewDrafts(ctx, now.Add(-r.lifetime))
	result.Expired = expired
	if err != nil {
		return result, fmt.Errorf("expire product review drafts: %w", err)
	}
	if result.Failed != 0 {
		return result, fmt.Errorf("failed to create %d product review drafts", result.Failed)
	}
	return result, nil
}
