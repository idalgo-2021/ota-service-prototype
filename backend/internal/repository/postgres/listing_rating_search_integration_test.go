package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestListingRatingSearchIntegration(t *testing.T) {
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
	var countryID, typeID, locationID int
	if err := db.QueryRow(ctx, `INSERT INTO countries(name,code) VALUES($1,$2) RETURNING id`, "Rating search country", "ZS").Scan(&countryID); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(context.Background(), `DELETE FROM countries WHERE id=$1`, countryID)
	if err := db.QueryRow(ctx, `INSERT INTO listing_types(slug,name) VALUES($1,$2) RETURNING id`, "rating-search-"+uuid.NewString(), "Rating search type").Scan(&typeID); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(context.Background(), `DELETE FROM listing_types WHERE id=$1`, typeID)
	if err := db.QueryRow(ctx, `INSERT INTO locations(country_id,name) VALUES($1,$2) RETURNING id`, countryID, "Rating search location").Scan(&locationID); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(context.Background(), `DELETE FROM locations WHERE id=$1`, locationID)
	ids := make([]string, 3)
	for i, rating := range []*float64{ratingPointer(8), ratingPointer(9), nil} {
		if err := db.QueryRow(ctx, `INSERT INTO listings(title,listing_type_id,location_id) VALUES($1,$2,$3) RETURNING id`, "Rating search listing", typeID, locationID).Scan(&ids[i]); err != nil {
			t.Fatal(err)
		}
		id := ids[i]
		defer func() {
			_, _ = db.Exec(context.Background(), `DELETE FROM listing_units WHERE listing_id=$1`, id)
			_, _ = db.Exec(context.Background(), `DELETE FROM listings WHERE id=$1`, id)
		}()
		if rating != nil {
			if _, err := db.Exec(ctx, `UPDATE listings SET average_overall_rating=$2,overall_rating_count=1,average_rating_details='{"staff_rating":9}'::jsonb WHERE id=$1`, id, *rating); err != nil {
				t.Fatal(err)
			}
		}
		if _, err := db.Exec(ctx, `INSERT INTO listing_units(listing_id,type,name,capacity_adults,price_per_night) VALUES($1,'property','Rating unit',2,100)`, id); err != nil {
			t.Fatal(err)
		}
	}
	repo := NewListingRepo(db)
	items, err := repo.ListAll(ctx, &domain.ListingFilter{
		LocationIDs: []int{locationID}, Sort: domain.Sort{By: "average_overall_rating", Order: "desc"},
	})
	if err != nil || len(items) != 3 || items[0].ID != ids[1] || items[1].ID != ids[0] || items[2].ID != ids[2] {
		t.Fatalf("rating order: ids=%v err=%v", ratingListingIDs(items), err)
	}
	if items[0].AverageOverallRating == nil || *items[0].AverageOverallRating != 9 || items[0].AverageRatingDetails["staff_rating"] != 9 || items[0].OverallRatingCount != 1 {
		t.Fatalf("rating fields not loaded: %+v", items[0])
	}
	items, err = repo.ListAll(ctx, &domain.ListingFilter{
		LocationIDs: []int{locationID}, Sort: domain.Sort{By: "average_overall_rating", Order: "asc"},
	})
	if err != nil || len(items) != 3 || items[0].ID != ids[0] || items[1].ID != ids[1] || items[2].ID != ids[2] {
		t.Fatalf("ascending rating order: ids=%v err=%v", ratingListingIDs(items), err)
	}
	min := 8.5
	items, err = repo.ListAll(ctx, &domain.ListingFilter{LocationIDs: []int{locationID}, MinOverallRating: &min})
	if err != nil || len(items) != 1 || items[0].ID != ids[1] {
		t.Fatalf("rating filter in basic search: ids=%v err=%v", ratingListingIDs(items), err)
	}
	max := 8.0
	items, err = repo.ListAll(ctx, &domain.ListingFilter{LocationIDs: []int{locationID}, MaxOverallRating: &max})
	if err != nil || len(items) != 1 || items[0].ID != ids[0] {
		t.Fatalf("maximum rating filter: ids=%v err=%v", ratingListingIDs(items), err)
	}
	start := time.Now().UTC().AddDate(0, 0, 2).Format("2006-01-02")
	end := time.Now().UTC().AddDate(0, 0, 4).Format("2006-01-02")
	available, _, err := repo.SearchAvailable(ctx, domain.AvailableListingsFilter{
		LocationIDs: []int{locationID}, CheckInDate: start, CheckOutDate: end,
		AdultsCount: 1, MinOverallRating: &min,
	})
	if err != nil || len(available) != 1 || available[0].ID != ids[1] || available[0].AverageOverallRating == nil || *available[0].AverageOverallRating != 9 {
		t.Fatalf("rating filter in guest search: items=%v err=%v", available, err)
	}
	item, err := repo.GetByID(ctx, ids[0], nil)
	if err != nil || item.AverageOverallRating == nil || *item.AverageOverallRating != 8 || item.OverallRatingCount != 1 {
		t.Fatalf("rating fields in detail: item=%+v err=%v", item, err)
	}
}

func ratingPointer(value float64) *float64 { return &value }

func ratingListingIDs(items []domain.Listing) []string {
	ids := make([]string, len(items))
	for i := range items {
		ids[i] = items[i].ID
	}
	return ids
}
