package maintenance

import (
	"context"
	"fmt"
	"time"
)

type ListingReviewDraftCandidate struct {
	BookingID string
	ListingID string
}

type ListingReviewDraftRepository interface {
	PreviewListingReviewDrafts(context.Context, time.Time, time.Time, int) ([]ListingReviewDraftCandidate, error)
	PendingListingReviewDrafts(context.Context, *ListingReviewDraftCandidate, int) ([]ListingReviewDraftCandidate, error)
	CreateListingReviewDraft(context.Context, ListingReviewDraftCandidate) (bool, error)
	ExpireListingReviewDrafts(context.Context, time.Time) (int64, error)
}

type ListingReviewDraftResult struct {
	Created int
	Skipped int
	Failed  int
	Expired int64
}

type ListingReviewDraftRunner struct {
	repo     ListingReviewDraftRepository
	lifetime time.Duration
}

func NewListingReviewDraftRunner(repo ListingReviewDraftRepository, lifetime time.Duration) *ListingReviewDraftRunner {
	return &ListingReviewDraftRunner{repo: repo, lifetime: lifetime}
}

func (r *ListingReviewDraftRunner) Preview(ctx context.Context, since, until time.Time, report func(ListingReviewDraftCandidate) error) (int, error) {
	if !since.Before(until) {
		return 0, fmt.Errorf("since must be before until")
	}
	const limit = 1000
	candidates, err := r.repo.PreviewListingReviewDrafts(ctx, since, until, limit+1)
	if err != nil {
		return 0, fmt.Errorf("find listing review draft candidates: %w", err)
	}
	if len(candidates) > limit {
		return 0, fmt.Errorf("more than %d listing review draft candidates; use a smaller time window", limit)
	}
	for i, candidate := range candidates {
		if err := report(candidate); err != nil {
			return i, fmt.Errorf("preview listing review draft for booking %s: %w", candidate.BookingID, err)
		}
	}
	return len(candidates), nil
}

func (r *ListingReviewDraftRunner) Process(ctx context.Context, now time.Time, onError func(ListingReviewDraftCandidate, error)) (ListingReviewDraftResult, error) {
	var result ListingReviewDraftResult
	var after *ListingReviewDraftCandidate
	for {
		candidates, err := r.repo.PendingListingReviewDrafts(ctx, after, BatchSize)
		if err != nil {
			return result, fmt.Errorf("find listing review draft candidates: %w", err)
		}
		for _, candidate := range candidates {
			if err := ctx.Err(); err != nil {
				return result, err
			}
			created, err := r.repo.CreateListingReviewDraft(ctx, candidate)
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
	expired, err := r.repo.ExpireListingReviewDrafts(ctx, now.Add(-r.lifetime))
	result.Expired = expired
	if err != nil {
		return result, fmt.Errorf("expire listing review drafts: %w", err)
	}
	if result.Failed != 0 {
		return result, fmt.Errorf("failed to create %d listing review drafts", result.Failed)
	}
	return result, nil
}
