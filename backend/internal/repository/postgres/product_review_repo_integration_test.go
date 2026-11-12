package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/config"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func TestReviewRepositoryIntegration(t *testing.T) {
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
	defer pool.Close()
	repo := NewProductReviewRepo(pool)
	var moderatorID string
	if err := pool.QueryRow(ctx, `SELECT id FROM users ORDER BY id LIMIT 1`).Scan(&moderatorID); err != nil {
		t.Fatal(err)
	}
	var productID, orderID, platformReviewID string
	if err := pool.QueryRow(ctx, `SELECT id FROM products ORDER BY id LIMIT 1`).Scan(&productID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO orders (user_id,status,total,currency,fulfilled_at)
		VALUES ($1,'fulfilled',0,'USD',now()) RETURNING id`, moderatorID).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	defer pool.Exec(context.Background(), `DELETE FROM orders WHERE id=$1`, orderID)
	if _, err := pool.Exec(ctx, `INSERT INTO order_items (order_id,product_id,quantity,unit_price,currency,position)
		VALUES ($1,$2,1,0,'USD',1)`, orderID, productID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO product_reviews (is_imported,author_id,product_id,order_id,status)
		VALUES (false,$1,$2,$3,'draft') RETURNING id`, moderatorID, productID, orderID).Scan(&platformReviewID); err != nil {
		t.Fatal(err)
	}
	defer pool.Exec(context.Background(), `DELETE FROM product_reviews WHERE id=$1`, platformReviewID)
	var importedReviewID string
	if err := pool.QueryRow(ctx, `INSERT INTO product_reviews (is_imported,external_source,external_review_id,product_id,rating,review_text,status)
		VALUES (true,'integration_test',$1,$2,4,'Imported review','approved') RETURNING id`, uuid.NewString(), productID).Scan(&importedReviewID); err != nil {
		t.Fatal(err)
	}
	defer pool.Exec(context.Background(), `DELETE FROM product_reviews WHERE id=$1`, importedReviewID)
	imported, err := repo.Get(ctx, importedReviewID)
	if err != nil || !imported.IsImported {
		t.Fatalf("imported review: %+v err=%v", imported, err)
	}
	local := false
	items, total, err := repo.List(ctx, domain.ProductReviewFilter{IsImported: &local, ProductID: productID}, 100, 0)
	if err != nil || total < 1 {
		t.Fatalf("local reviews: count=%d err=%v", total, err)
	}
	for _, item := range items {
		if item.IsImported {
			t.Fatalf("imported review leaked into local filter: %+v", item)
		}
	}
	var productType string
	if err := pool.QueryRow(ctx, `SELECT product_type FROM products WHERE id=$1`, productID).Scan(&productType); err != nil {
		t.Fatal(err)
	}
	typed, typedTotal, err := repo.List(ctx, domain.ProductReviewFilter{AuthorID: moderatorID, ProductID: productID, ProductType: productType}, 20, 0)
	if err != nil || typedTotal < 1 || len(typed) < 1 || typed[0].ProductType != productType || typed[0].ProductName == "" || typed[0].ClientName == "" {
		t.Fatalf("filtered product review: count=%d rows=%+v err=%v", typedTotal, typed, err)
	}
	rating, body := 4, "Platform review"
	if _, err := pool.Exec(ctx, `UPDATE product_reviews SET created_at=now()-interval '8 days' WHERE id=$1`, platformReviewID); err != nil {
		t.Fatal(err)
	}
	cutoff := time.Now().Add(-7 * 24 * time.Hour)
	if _, err := repo.PatchDraft(ctx, platformReviewID, moderatorID, &rating, &body, cutoff); err == nil {
		t.Fatal("expired draft must not be editable")
	}
	if _, err := repo.Submit(ctx, platformReviewID, moderatorID, cutoff); err == nil {
		t.Fatal("expired draft must not be submitted")
	}
	if _, err := pool.Exec(ctx, `UPDATE product_reviews SET created_at=now() WHERE id=$1`, platformReviewID); err != nil {
		t.Fatal(err)
	}
	v, err := repo.PatchDraft(ctx, platformReviewID, moderatorID, &rating, &body, time.Now().Add(-7*24*time.Hour))
	if err != nil || v.Rating == nil || *v.Rating != 4 {
		t.Fatalf("patch draft: %+v, %v", v, err)
	}
	v, err = repo.Submit(ctx, platformReviewID, moderatorID, time.Now().Add(-7*24*time.Hour))
	if err != nil || v.Status != domain.ProductReviewPending {
		t.Fatalf("submit draft: %+v, %v", v, err)
	}
	if _, err := repo.Submit(ctx, platformReviewID, moderatorID, time.Now().Add(-7*24*time.Hour)); err == nil {
		t.Fatal("second submit should conflict")
	}
}
