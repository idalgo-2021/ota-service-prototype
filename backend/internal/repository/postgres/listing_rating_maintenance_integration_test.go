package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRefreshListingRatingsIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	tx, err := db.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(context.Background())

	var countryID, typeID, locationID int
	if err := tx.QueryRow(ctx, `INSERT INTO countries(name,code) VALUES($1,$2) RETURNING id`, "Rating test country", "ZR").Scan(&countryID); err != nil {
		t.Fatal(err)
	}
	if err := tx.QueryRow(ctx, `INSERT INTO listing_types(slug,name) VALUES($1,$2) RETURNING id`, "rating-test-"+uuid.NewString(), "Rating test").Scan(&typeID); err != nil {
		t.Fatal(err)
	}
	if err := tx.QueryRow(ctx, `INSERT INTO locations(country_id,name) VALUES($1,$2) RETURNING id`, countryID, "Rating test location").Scan(&locationID); err != nil {
		t.Fatal(err)
	}
	listingIDs := make([]string, 3)
	for i := range listingIDs {
		if err := tx.QueryRow(ctx, `INSERT INTO listings(title,listing_type_id,location_id) VALUES($1,$2,$3) RETURNING id`, "Rating test listing", typeID, locationID).Scan(&listingIDs[i]); err != nil {
			t.Fatal(err)
		}
	}
	addReview := func(listingID, status string, hidden bool, overall, cleanliness, staff, location any, text any) string {
		t.Helper()
		var id string
		err := tx.QueryRow(ctx, `INSERT INTO listing_reviews
			(is_imported,external_source,external_review_id,listing_id,status,is_hidden,overall_rating,cleanliness_rating,staff_rating,location_rating,positive_review)
			VALUES(true,'rating_integration_test',$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
			uuid.NewString(), listingID, status, hidden, overall, cleanliness, staff, location, text).Scan(&id)
		if err != nil {
			t.Fatal(err)
		}
		return id
	}
	first := addReview(listingIDs[0], "approved", false, 8.0, 9.0, nil, 8.5, nil)
	second := addReview(listingIDs[0], "approved", false, 9.0, 8.0, 10.0, nil, nil)
	third := addReview(listingIDs[0], "approved", false, 9.0, nil, nil, nil, nil)
	addReview(listingIDs[0], "approved", true, 10.0, 10.0, 10.0, 10.0, nil)
	addReview(listingIDs[0], "pending_moderation", false, 10.0, 10.0, 10.0, 10.0, nil)
	addReview(listingIDs[1], "approved", false, nil, nil, 6.0, nil, "Text-only review")

	updated, err := refreshListingRatings(ctx, tx)
	if err != nil || updated != 2 {
		t.Fatalf("first refresh: updated=%d err=%v", updated, err)
	}
	var average *float64
	var details map[string]float64
	var count int
	if err := tx.QueryRow(ctx, `SELECT average_overall_rating,average_rating_details,overall_rating_count FROM listings WHERE id=$1`, listingIDs[0]).Scan(&average, &details, &count); err != nil {
		t.Fatal(err)
	}
	if average == nil || *average != 8.67 || count != 3 || len(details) != 3 || details["cleanliness_rating"] != 8.5 || details["staff_rating"] != 10 || details["location_rating"] != 8.5 {
		t.Fatalf("first listing: average=%v details=%v count=%d", average, details, count)
	}
	if err := tx.QueryRow(ctx, `SELECT average_overall_rating,average_rating_details,overall_rating_count FROM listings WHERE id=$1`, listingIDs[1]).Scan(&average, &details, &count); err != nil {
		t.Fatal(err)
	}
	if average != nil || count != 0 || len(details) != 1 || details["staff_rating"] != 6 {
		t.Fatalf("text-only listing: average=%v details=%v count=%d", average, details, count)
	}
	if err := tx.QueryRow(ctx, `SELECT average_overall_rating,average_rating_details,overall_rating_count FROM listings WHERE id=$1`, listingIDs[2]).Scan(&average, &details, &count); err != nil {
		t.Fatal(err)
	}
	if average != nil || count != 0 || len(details) != 0 {
		t.Fatalf("unrated listing: average=%v details=%v count=%d", average, details, count)
	}
	if updated, err = refreshListingRatings(ctx, tx); err != nil || updated != 0 {
		t.Fatalf("idempotent refresh: updated=%d err=%v", updated, err)
	}
	if _, err := tx.Exec(ctx, `UPDATE listing_reviews SET is_hidden=true WHERE id=ANY($1::uuid[])`, []string{first, second, third}); err != nil {
		t.Fatal(err)
	}
	if updated, err = refreshListingRatings(ctx, tx); err != nil || updated != 1 {
		t.Fatalf("refresh after hiding reviews: updated=%d err=%v", updated, err)
	}
	if err := tx.QueryRow(ctx, `SELECT average_overall_rating,average_rating_details,overall_rating_count FROM listings WHERE id=$1`, listingIDs[0]).Scan(&average, &details, &count); err != nil {
		t.Fatal(err)
	}
	if average != nil || count != 0 || len(details) != 0 {
		t.Fatalf("cleared listing: average=%v details=%v count=%d", average, details, count)
	}
	if err := tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	oneConnConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	oneConnConfig.MaxConns = 1
	oneConnDB, err := pgxpool.NewWithConfig(ctx, oneConnConfig)
	if err != nil {
		t.Fatal(err)
	}
	defer oneConnDB.Close()
	if _, err := NewMaintenanceRepo(oneConnDB).RefreshListingRatings(ctx); err != nil {
		t.Fatalf("refresh with one database connection: %v", err)
	}
}
