package maintenance

import (
	"context"
	"fmt"
	"time"
)

const BatchSize = 100

type Repository interface {
	ExpirePendingOrders(ctx context.Context, cutoff, now time.Time, limit int) (int64, error)
}

type Runner struct {
	repo                 Repository
	pendingOrderLifetime time.Duration
}

func NewRunner(repo Repository, pendingOrderLifetime time.Duration) *Runner {
	return &Runner{repo: repo, pendingOrderLifetime: pendingOrderLifetime}
}

func (r *Runner) ExpirePendingOrders(ctx context.Context, now time.Time) (int64, error) {
	cutoff := now.Add(-r.pendingOrderLifetime)
	var total int64
	for {
		count, err := r.repo.ExpirePendingOrders(ctx, cutoff, now, BatchSize)
		if err != nil {
			return total, fmt.Errorf("expire pending orders: %w", err)
		}
		total += count
		if count < BatchSize {
			return total, nil
		}
	}
}
