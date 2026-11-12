package postgres

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/config"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func TestPendingOrderLifetimeIntegration(t *testing.T) {
	if os.Getenv("REVIEW_INTEGRATION_TEST") != "1" {
		t.Skip("set REVIEW_INTEGRATION_TEST=1 to run against a seeded database")
	}
	if err := godotenv.Load("../../../.env"); err != nil {
		t.Fatal(err)
	}
	dsn, err := config.BuildDatabaseURL()
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	var userID, orderID string
	if err := pool.QueryRow(ctx, `SELECT id FROM users ORDER BY id LIMIT 1`).Scan(&userID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO orders (user_id,status,total,currency,created_at)
		VALUES ($1,'pending',0,'USD',now()-interval '25 hours') RETURNING id`, userID).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	defer pool.Exec(context.Background(), `DELETE FROM orders WHERE id=$1`, orderID)
	repo := NewOrderRepo(pool)
	o, err := repo.GetByID(ctx, orderID)
	if err != nil {
		t.Fatal(err)
	}
	o.Status = domain.StatusConfirmed
	o.UpdatedAt = time.Now().UTC()
	if err := repo.UpdatePending(ctx, o, time.Now().Add(-24*time.Hour)); !errors.Is(err, domain.ErrOrderConflict) {
		t.Fatalf("expired pending order updated: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE orders SET created_at=now() WHERE id=$1`, orderID); err != nil {
		t.Fatal(err)
	}
	o, err = repo.GetByID(ctx, orderID)
	if err != nil {
		t.Fatal(err)
	}
	o.Status = domain.StatusConfirmed
	o.UpdatedAt = time.Now().UTC()
	if err := repo.UpdatePending(ctx, o, time.Now().Add(-24*time.Hour)); err != nil {
		t.Fatalf("valid pending order was not updated: %v", err)
	}
}
