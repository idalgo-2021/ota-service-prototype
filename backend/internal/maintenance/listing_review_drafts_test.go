package maintenance

import (
	"context"
	"errors"
	"testing"
	"time"
)

type listingDraftRepoFake struct {
	candidates []ListingReviewDraftCandidate
	failID     string
	created    []string
	cutoff     time.Time
}

func (*listingDraftRepoFake) PreviewListingReviewDrafts(context.Context, time.Time, time.Time, int) ([]ListingReviewDraftCandidate, error) {
	return nil, nil
}
func (f *listingDraftRepoFake) PendingListingReviewDrafts(_ context.Context, after *ListingReviewDraftCandidate, limit int) ([]ListingReviewDraftCandidate, error) {
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
func (f *listingDraftRepoFake) CreateListingReviewDraft(_ context.Context, c ListingReviewDraftCandidate) (bool, error) {
	if c.BookingID == f.failID {
		return false, errors.New("insert failed")
	}
	f.created = append(f.created, c.BookingID)
	return true, nil
}
func (f *listingDraftRepoFake) ExpireListingReviewDrafts(_ context.Context, cutoff time.Time) (int64, error) {
	f.cutoff = cutoff
	return 1, nil
}

func TestListingReviewDraftContinuesAfterFailure(t *testing.T) {
	repo := &listingDraftRepoFake{candidates: []ListingReviewDraftCandidate{
		{BookingID: "booking-1", ListingID: "listing-1"},
		{BookingID: "booking-2", ListingID: "listing-2"},
		{BookingID: "booking-3", ListingID: "listing-3"},
	}, failID: "booking-2"}
	now := time.Date(2026, 10, 12, 10, 0, 0, 0, time.UTC)
	var failed ListingReviewDraftCandidate
	result, err := NewListingReviewDraftRunner(repo, 48*time.Hour).Process(context.Background(), now, func(c ListingReviewDraftCandidate, _ error) { failed = c })
	if err == nil || result.Created != 2 || result.Failed != 1 || result.Expired != 1 || failed.BookingID != "booking-2" {
		t.Fatalf("result=%+v failed=%+v err=%v", result, failed, err)
	}
	if len(repo.created) != 2 || repo.created[1] != "booking-3" || !repo.cutoff.Equal(now.Add(-48*time.Hour)) {
		t.Fatalf("created=%v cutoff=%v", repo.created, repo.cutoff)
	}
}
