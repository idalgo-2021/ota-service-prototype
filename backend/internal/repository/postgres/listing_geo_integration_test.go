package postgres

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

func TestListingGeoSearchIntegration(t *testing.T) {
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
	var postgisVersion string
	if err := db.QueryRow(ctx, `SELECT PostGIS_Version()`).Scan(&postgisVersion); err != nil {
		t.Fatalf("test database must have PostGIS: %v", err)
	}

	var countryID, locationID, typeID int
	createdCountry, createdLocation, createdType := false, false, false
	if err := db.QueryRow(ctx, `SELECT id FROM countries LIMIT 1`).Scan(&countryID); err != nil {
		if err := db.QueryRow(ctx, `INSERT INTO countries(name,code) VALUES('Geo test country','XZ') RETURNING id`).Scan(&countryID); err != nil {
			t.Fatal(err)
		}
		createdCountry = true
	}
	if err := db.QueryRow(ctx, `SELECT id FROM locations WHERE country_id=$1 LIMIT 1`, countryID).Scan(&locationID); err != nil {
		if err := db.QueryRow(ctx, `INSERT INTO locations(country_id,name) VALUES($1,'Geo test location') RETURNING id`, countryID).Scan(&locationID); err != nil {
			t.Fatal(err)
		}
		createdLocation = true
	}
	if err := db.QueryRow(ctx, `SELECT id FROM listing_types LIMIT 1`).Scan(&typeID); err != nil {
		if err := db.QueryRow(ctx, `INSERT INTO listing_types(slug,name) VALUES('geo-test','Geo test') RETURNING id`).Scan(&typeID); err != nil {
			t.Fatal(err)
		}
		createdType = true
	}
	defer func() {
		if createdType {
			_, _ = db.Exec(context.Background(), `DELETE FROM listing_types WHERE id=$1`, typeID)
		}
		if createdLocation {
			_, _ = db.Exec(context.Background(), `DELETE FROM locations WHERE id=$1`, locationID)
		}
		if createdCountry {
			_, _ = db.Exec(context.Background(), `DELETE FROM countries WHERE id=$1`, countryID)
		}
	}()

	ids := make([]string, 0, 3)
	defer func() {
		for _, id := range ids {
			_, _ = db.Exec(context.Background(), `DELETE FROM listing_units WHERE listing_id=$1 AND parent_unit_id IS NOT NULL`, id)
			_, _ = db.Exec(context.Background(), `DELETE FROM listing_units WHERE listing_id=$1`, id)
			_, _ = db.Exec(context.Background(), `DELETE FROM listings WHERE id=$1`, id)
		}
	}()
	for _, item := range []struct {
		name string
		lon  float64
		lat  float64
	}{
		{"inside", 10.002, 10.002},
		{"near", 10.017, 10.001},
		{"far", 10.04, 10.001},
	} {
		var id string
		name := fmt.Sprintf("geo-test-%s-%d", item.name, time.Now().UnixNano())
		if err := db.QueryRow(ctx, `INSERT INTO listings(title,listing_type_id,location_id,longitude,latitude) VALUES($1,$2,$3,$4,$5) RETURNING id`, name, typeID, locationID, item.lon, item.lat).Scan(&id); err != nil {
			t.Fatal(err)
		}
		ids = append(ids, id)
		if err := db.QueryRow(ctx, `INSERT INTO listing_units(listing_id,type,name,capacity_adults,price_per_night) VALUES($1,'property','Test unit',2,100) RETURNING id`, id).Scan(new(string)); err != nil {
			t.Fatal(err)
		}
	}

	repo := NewListingRepo(db)
	geo := &domain.GeoFilter{Points: [][2]float64{{10, 10}, {10.01, 10}, {10, 10.01}}, RadiusM: 0}
	filter := &domain.ListingFilter{LocationIDs: []int{locationID}, Geo: geo}
	inside, _, err := repo.List(ctx, 100, 0, filter)
	if err != nil || len(inside) != 1 || inside[0].ID != ids[0] {
		t.Fatalf("zero radius: listings=%v err=%v", listingIDs(inside), err)
	}
	if inside[0].StartingPrice == nil || !inside[0].StartingPrice.Amount.Equal(decimal.NewFromInt(100)) || inside[0].StartingPrice.UnitType != "property" {
		t.Fatalf("starting price in search: %+v", inside[0].StartingPrice)
	}
	geo.RadiusM = 1000
	near, _, err := repo.List(ctx, 100, 0, filter)
	if err != nil || len(near) != 2 {
		t.Fatalf("one kilometre: listings=%v err=%v", listingIDs(near), err)
	}
	emptyPage, total, err := repo.List(ctx, 1, 1000, filter)
	if err != nil || len(emptyPage) != 0 || total != 2 {
		t.Fatalf("past last page: total=%d listings=%v err=%v", total, listingIDs(emptyPage), err)
	}
	geo.Points = [][2]float64{{10.002, 10.002}}
	geo.RadiusM = 0
	onePoint, _, err := repo.List(ctx, 100, 0, filter)
	if err != nil || len(onePoint) != 1 || onePoint[0].ID != ids[0] {
		t.Fatalf("one point: listings=%v err=%v", listingIDs(onePoint), err)
	}
	geo.Points = [][2]float64{{10, 10}, {10.01, 10}}
	geo.RadiusM = 1000
	twoPoints, _, err := repo.List(ctx, 100, 0, filter)
	if err != nil || len(twoPoints) != 2 {
		t.Fatalf("two points: listings=%v err=%v", listingIDs(twoPoints), err)
	}
	geo.Points = [][2]float64{{10, 10}, {10.01, 10}, {10, 10.01}}
	available, _, err := repo.SearchAvailable(ctx, domain.AvailableListingsFilter{
		Geo: geo, CheckInDate: "2030-01-01", CheckOutDate: "2030-01-02", AdultsCount: 1,
	})
	if err != nil || len(available) != 2 {
		t.Fatalf("available search: count=%d err=%v", len(available), err)
	}

	var groupID string
	if err := db.QueryRow(ctx, `INSERT INTO listing_units(listing_id,type,name,capacity_adults,price_per_night)
		VALUES($1,'room','Group room',2,10) RETURNING id`, ids[0]).Scan(&groupID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO listing_units(listing_id,parent_unit_id,type,name,capacity_adults,price_per_night)
		VALUES($1,$2,'bed','Bed',1,80)`, ids[0], groupID); err != nil {
		t.Fatal(err)
	}
	for _, query := range []string{
		`INSERT INTO listing_units(listing_id,type,name,capacity_adults,price_per_night,is_active)
		 VALUES($1,'room','Inactive room',2,1,false)`,
		`INSERT INTO listing_units(listing_id,type,name,capacity_adults,price_per_night)
		 VALUES($1,'room','Unpriced room',2,0)`,
	} {
		if _, err := db.Exec(ctx, query, ids[0]); err != nil {
			t.Fatal(err)
		}
	}
	listing, err := repo.GetByID(ctx, ids[0], nil)
	if err != nil || listing.StartingPrice == nil || !listing.StartingPrice.Amount.Equal(decimal.NewFromInt(80)) || listing.StartingPrice.UnitType != "bed" {
		t.Fatalf("bed price excluding grouping and inactive units: %+v err=%v", listing, err)
	}
	if _, err := db.Exec(ctx, `UPDATE listing_units SET is_active=false WHERE id=$1`, groupID); err != nil {
		t.Fatal(err)
	}
	listing, err = repo.GetByID(ctx, ids[0], nil)
	if err != nil || listing.StartingPrice == nil || !listing.StartingPrice.Amount.Equal(decimal.NewFromInt(100)) {
		t.Fatalf("inactive parent must exclude bed: %+v err=%v", listing, err)
	}
}

func listingIDs(listings []domain.Listing) []string {
	ids := make([]string, 0, len(listings))
	for _, listing := range listings {
		ids = append(ids, listing.ID)
	}
	return ids
}
