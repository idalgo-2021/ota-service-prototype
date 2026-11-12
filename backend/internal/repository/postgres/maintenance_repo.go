package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type MaintenanceRepo struct{ db *pgxpool.Pool }

func NewMaintenanceRepo(db *pgxpool.Pool) *MaintenanceRepo { return &MaintenanceRepo{db: db} }

// Each statement locks a small batch. Concurrent confirmations and manual
// cancellations serialize on the same order rows and cannot be overwritten.
func (r *MaintenanceRepo) ExpirePendingOrders(ctx context.Context, cutoff, now time.Time, limit int) (int64, error) {
	rows, err := r.db.Query(ctx, `WITH candidates AS (
		SELECT id FROM orders
		WHERE status = 'pending' AND created_at <= $1
		ORDER BY created_at, id
		LIMIT $2 FOR UPDATE SKIP LOCKED
	)
	UPDATE orders AS o SET status = 'cancelled', cancelled_at = $3,
		cancelled_by = NULL, cancellation_reason = 'expired', updated_at = $3
	FROM candidates AS c WHERE o.id = c.id
	RETURNING o.id`, cutoff, limit, now)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	var count int64
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return count, err
		}
		count++
	}
	return count, rows.Err()
}

// TryReviewLock prevents overlapping scheduled runs, even in separate processes.
func (r *MaintenanceRepo) TryReviewLock(ctx context.Context) (func(), bool, error) {
	return r.tryAdvisoryLock(ctx, 740021)
}

func (r *MaintenanceRepo) tryAdvisoryLock(ctx context.Context, key int64) (func(), bool, error) {
	conn, err := r.db.Acquire(ctx)
	if err != nil {
		return nil, false, err
	}
	var acquired bool
	if err := conn.QueryRow(ctx, `SELECT pg_try_advisory_lock($1)`, key).Scan(&acquired); err != nil {
		conn.Release()
		return nil, false, err
	}
	if !acquired {
		conn.Release()
		return nil, false, nil
	}
	return func() {
		// This uses the same connection on which the session lock was acquired.
		_, _ = conn.Exec(context.Background(), `SELECT pg_advisory_unlock($1)`, key)
		conn.Release()
	}, true, nil
}
