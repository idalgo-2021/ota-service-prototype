package maintenance

import (
	"context"
	"testing"
	"time"
)

type orderExpirationRepoFake struct{ cutoff time.Time }

func (f *orderExpirationRepoFake) ExpirePendingOrders(_ context.Context, cutoff, _ time.Time, _ int) (int64, error) {
	f.cutoff = cutoff
	return 0, nil
}

func TestExpirePendingOrdersUsesConfiguredLifetime(t *testing.T) {
	repo := &orderExpirationRepoFake{}
	now := time.Date(2026, 10, 12, 10, 0, 0, 0, time.UTC)
	_, err := NewRunner(repo, 12*time.Hour).ExpirePendingOrders(context.Background(), now)
	if err != nil || !repo.cutoff.Equal(now.Add(-12*time.Hour)) {
		t.Fatalf("cutoff=%v err=%v", repo.cutoff, err)
	}
}
