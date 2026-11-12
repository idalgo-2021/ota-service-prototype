package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/config"
	"github.com/idalgo-2021/product-catalog-backend/internal/maintenance"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func TestProductReviewMaintenanceIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		if os.Getenv("REVIEW_INTEGRATION_TEST") != "1" {
			t.Skip("set TEST_DATABASE_URL or REVIEW_INTEGRATION_TEST=1 to run against a seeded database")
		}
		if err := godotenv.Load("../../../.env"); err != nil {
			t.Fatal(err)
		}
		var err error
		dsn, err = config.BuildDatabaseURL()
		if err != nil {
			t.Fatal(err)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	var userID, productID string
	if err := pool.QueryRow(ctx, `SELECT id FROM users ORDER BY id LIMIT 1`).Scan(&userID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, `SELECT id FROM products ORDER BY id LIMIT 1`).Scan(&productID); err != nil {
		t.Fatal(err)
	}
	var orderID string
	if err := pool.QueryRow(ctx, `INSERT INTO orders (user_id,status,total,currency,fulfilled_at)
		VALUES ($1,'fulfilled',0,'USD',now()) RETURNING id`, userID).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM orders WHERE id=$1`, orderID) })
	if _, err := pool.Exec(ctx, `INSERT INTO order_items (order_id,product_id,quantity,unit_price,currency,position)
		VALUES ($1,$2,1,0,'USD',1)`, orderID, productID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM order_items WHERE order_id=$1`, orderID) })
	repo := NewProductReviewMaintenanceRepo(pool)
	candidate := maintenance.ProductReviewDraftCandidate{OrderID: orderID, ProductID: productID}
	preview, err := repo.PreviewProductReviewDrafts(ctx, time.Now().Add(-time.Hour), time.Now().Add(time.Hour), 1000)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, item := range preview {
		found = found || item == candidate
	}
	if !found {
		t.Fatal("fulfilled order missing from product review candidates")
	}
	created, err := repo.CreateProductReviewDraft(ctx, candidate)
	if err != nil || !created {
		t.Fatalf("create product review draft: created=%v err=%v", created, err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM product_reviews WHERE order_id=$1`, orderID)
	})
	created, err = repo.CreateProductReviewDraft(ctx, candidate)
	if err != nil || created {
		t.Fatalf("duplicate product review draft: created=%v err=%v", created, err)
	}
}
