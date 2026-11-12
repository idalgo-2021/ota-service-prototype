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

func TestReviewMaintenancePaginationIntegration(t *testing.T) {
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
	var userID, listingID string
	if err := pool.QueryRow(ctx, `SELECT id FROM users ORDER BY id LIMIT 1`).Scan(&userID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, `SELECT id FROM listings ORDER BY id LIMIT 1`).Scan(&listingID); err != nil {
		t.Fatal(err)
	}
	ids := make([]string, 2)
	for i := range ids {
		if err := pool.QueryRow(ctx, `INSERT INTO bookings (listing_id,user_id,check_in_date,check_out_date,adults_count,status,completed_at)
			VALUES ($1,$2,current_date-2,current_date-1,1,'completed',now()) RETURNING id`, listingID, userID).Scan(&ids[i]); err != nil {
			t.Fatal(err)
		}
		id := ids[i]
		defer pool.Exec(context.Background(), `DELETE FROM bookings WHERE id=$1`, id)
		defer pool.Exec(context.Background(), `DELETE FROM listing_reviews WHERE booking_id=$1`, id)
	}
	repo := NewListingReviewMaintenanceRepo(pool)
	var after *maintenance.ListingReviewDraftCandidate
	seen := map[string]bool{}
	for page := 0; page < 100; page++ {
		candidates, err := repo.PendingListingReviewDrafts(ctx, after, 1)
		if err != nil {
			t.Fatal(err)
		}
		if len(candidates) == 0 {
			break
		}
		if len(candidates) != 1 {
			t.Fatalf("page size=%d", len(candidates))
		}
		c := candidates[0]
		seen[c.BookingID] = true
		after = &c
	}
	if !seen[ids[0]] || !seen[ids[1]] {
		t.Fatalf("missing bookings across pages: %v", seen)
	}
	for _, id := range ids {
		created, err := repo.CreateListingReviewDraft(ctx, maintenance.ListingReviewDraftCandidate{BookingID: id, ListingID: listingID})
		if err != nil || !created {
			t.Fatalf("create draft: created=%v err=%v", created, err)
		}
		created, err = repo.CreateListingReviewDraft(ctx, maintenance.ListingReviewDraftCandidate{BookingID: id, ListingID: listingID})
		if err != nil || created {
			t.Fatalf("duplicate draft: created=%v err=%v", created, err)
		}
	}
}
