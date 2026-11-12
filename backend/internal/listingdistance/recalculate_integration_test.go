package listingdistance_test

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/listingdistance"
	"github.com/idalgo-2021/product-catalog-backend/internal/repository/postgres"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRecalculateAndSearchIntegration(t *testing.T) {
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
	if err := db.QueryRow(ctx, `SELECT id FROM countries LIMIT 1`).Scan(&countryID); err != nil {
		if err := db.QueryRow(ctx, `INSERT INTO countries(name,code) VALUES('Distance test country','ZQ') RETURNING id`).Scan(&countryID); err != nil {
			t.Fatal(err)
		}
		defer db.Exec(context.Background(), `DELETE FROM countries WHERE id=$1`, countryID)
	}
	if err := db.QueryRow(ctx, `SELECT id FROM listing_types LIMIT 1`).Scan(&typeID); err != nil {
		if err := db.QueryRow(ctx, `INSERT INTO listing_types(slug,name) VALUES('distance-test','Distance test') RETURNING id`).Scan(&typeID); err != nil {
			t.Fatal(err)
		}
		defer db.Exec(context.Background(), `DELETE FROM listing_types WHERE id=$1`, typeID)
	}
	if err := db.QueryRow(ctx, `INSERT INTO locations(country_id,name,center_latitude,center_longitude)
		VALUES($1,$2,10,10) RETURNING id`, countryID, "distance-test-"+time.Now().Format("20060102150405.000000000")).Scan(&locationID); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(context.Background(), `DELETE FROM locations WHERE id=$1`, locationID)

	var nearID, farID, missingID string
	for _, item := range []struct {
		name string
		lon  any
		id   *string
	}{
		{"near", 10.0, &nearID},
		{"far", 10.05, &farID},
		{"missing", nil, &missingID},
	} {
		if err := db.QueryRow(ctx, `INSERT INTO listings(title,listing_type_id,location_id,latitude,longitude)
			VALUES($1,$2,$3,$4,$5) RETURNING id`, item.name, typeID, locationID, 10.0, item.lon).Scan(item.id); err != nil {
			t.Fatal(err)
		}
		defer func(id string) {
			_, _ = db.Exec(context.Background(), `DELETE FROM listing_units WHERE listing_id=$1`, id)
			_, _ = db.Exec(context.Background(), `DELETE FROM listings WHERE id=$1`, id)
		}(*item.id)
		if _, err := db.Exec(ctx, `INSERT INTO listing_units(listing_id,type,name,capacity_adults,price_per_night)
			VALUES($1,'property','Test unit',2,100)`, *item.id); err != nil {
			t.Fatal(err)
		}
	}
	var distance *float64
	if err := db.QueryRow(ctx, `SELECT distance_from_center_km FROM listings WHERE id=$1`, nearID).Scan(&distance); err != nil || distance != nil {
		t.Fatalf("new listing should wait for manual recalculation: distance=%v err=%v", distance, err)
	}
	updated, err := listingdistance.Recalculate(ctx, db, locationID)
	if err != nil || updated != 2 {
		t.Fatalf("first recalculation: updated=%d err=%v", updated, err)
	}
	var stored string
	if err := db.QueryRow(ctx, `SELECT distance_from_center_km::text FROM listings WHERE id=$1`, farID).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	parts := strings.SplitN(stored, ".", 2)
	if len(parts) != 2 || len(parts[1]) != 3 {
		t.Fatalf("distance %q must be stored with three decimal places", stored)
	}
	updated, err = listingdistance.Recalculate(ctx, db, locationID)
	if err != nil || updated != 0 {
		t.Fatalf("repeated recalculation: updated=%d err=%v", updated, err)
	}

	repo := postgres.NewListingRepo(db)
	max := 1.0
	filter := &domain.ListingFilter{LocationIDs: []int{locationID}, MaxDistanceKM: &max}
	items, _, err := repo.List(ctx, 20, 0, filter)
	if err != nil || len(items) != 1 || items[0].ID != nearID || items[0].DistanceFromCenterKM == nil {
		t.Fatalf("near search: items=%v err=%v", items, err)
	}
	min := 5.0
	farItems, _, err := repo.List(ctx, 20, 0, &domain.ListingFilter{LocationIDs: []int{locationID}, MinDistanceKM: &min})
	if err != nil || len(farItems) != 1 || farItems[0].ID != farID {
		t.Fatalf("minimum distance search: items=%v err=%v", farItems, err)
	}
	available, _, err := repo.SearchAvailable(ctx, domain.AvailableListingsFilter{
		LocationIDs: []int{locationID}, MaxDistanceKM: &max,
		CheckInDate: "2030-01-01", CheckOutDate: "2030-01-02", AdultsCount: 1,
	})
	if err != nil || len(available) != 1 || available[0].ID != nearID {
		t.Fatalf("available near search: items=%v err=%v", available, err)
	}
	if _, err := db.Exec(ctx, `UPDATE locations SET center_longitude=10.05 WHERE id=$1`, locationID); err != nil {
		t.Fatal(err)
	}
	updated, err = listingdistance.Recalculate(ctx, db, locationID)
	if err != nil || updated != 2 {
		t.Fatalf("recalculation after moving centre: updated=%d err=%v", updated, err)
	}
	items, _, err = repo.List(ctx, 20, 0, filter)
	if err != nil || len(items) != 1 || items[0].ID != farID {
		t.Fatalf("search after moving centre: items=%v err=%v", items, err)
	}
}
