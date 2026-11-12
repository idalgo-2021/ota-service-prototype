package maintenance

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"
)

type productDraftRepoFake struct {
	candidates []ProductReviewDraftCandidate
	failID     string
	created    []string
	cutoff     time.Time
}

func (*productDraftRepoFake) PreviewProductReviewDrafts(context.Context, time.Time, time.Time, int) ([]ProductReviewDraftCandidate, error) {
	return nil, nil
}
func (f *productDraftRepoFake) PendingProductReviewDrafts(_ context.Context, after *ProductReviewDraftCandidate, limit int) ([]ProductReviewDraftCandidate, error) {
	start := 0
	if after != nil {
		for i, c := range f.candidates {
			if c == *after {
				start = i + 1
				break
			}
		}
	}
	end := start + limit
	if end > len(f.candidates) {
		end = len(f.candidates)
	}
	return f.candidates[start:end], nil
}
func (f *productDraftRepoFake) CreateProductReviewDraft(_ context.Context, c ProductReviewDraftCandidate) (bool, error) {
	if c.OrderID == f.failID {
		return false, errors.New("insert failed")
	}
	f.created = append(f.created, c.OrderID)
	return true, nil
}
func (f *productDraftRepoFake) ExpireProductReviewDrafts(_ context.Context, cutoff time.Time) (int64, error) {
	f.cutoff = cutoff
	return 2, nil
}

func TestProductReviewDraftPaginationAndFailure(t *testing.T) {
	repo := &productDraftRepoFake{failID: "order-050"}
	for i := 0; i < BatchSize+1; i++ {
		repo.candidates = append(repo.candidates, ProductReviewDraftCandidate{OrderID: fmt.Sprintf("order-%03d", i), ProductID: "product"})
	}
	now := time.Date(2026, 10, 12, 10, 0, 0, 0, time.UTC)
	var failed ProductReviewDraftCandidate
	result, err := NewProductReviewDraftRunner(repo, 48*time.Hour).Process(context.Background(), now, func(c ProductReviewDraftCandidate, _ error) { failed = c })
	if err == nil || result.Created != BatchSize || result.Failed != 1 || result.Expired != 2 || failed.OrderID != "order-050" {
		t.Fatalf("result=%+v failed=%+v err=%v", result, failed, err)
	}
	if len(repo.created) != BatchSize || repo.created[len(repo.created)-1] != "order-100" || !repo.cutoff.Equal(now.Add(-48*time.Hour)) {
		t.Fatalf("created=%d cutoff=%v", len(repo.created), repo.cutoff)
	}
}
