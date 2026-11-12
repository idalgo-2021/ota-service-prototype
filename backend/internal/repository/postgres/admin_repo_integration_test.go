package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/config"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/service"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/shopspring/decimal"
)

func TestAdminRepositoryIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		if os.Getenv("ADMIN_INTEGRATION_TEST") != "1" {
			t.Skip("TEST_DATABASE_URL or ADMIN_INTEGRATION_TEST is not set")
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
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	r := NewAdminRepo(db)
	idOf := func(raw json.RawMessage) string {
		var obj struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(raw, &obj); err != nil {
			t.Fatal(err)
		}
		if obj.ID == "" {
			t.Fatalf("missing ID: %s", raw)
		}
		return obj.ID
	}

	// Each temporary row is removed in reverse dependency order.
	var ruID int
	if err := db.QueryRow(ctx, `SELECT id FROM countries WHERE code='RU'`).Scan(&ruID); err != nil {
		t.Fatal(err)
	}
	name := "admin-test-" + uuid.NewString()
	code := string([]byte{'X', 'A' + uuid.New()[0]%26})
	country, err := r.Create(ctx, "countries", map[string]any{"name": name, "name_ru": "Тестовая страна", "code": code})
	if err != nil {
		t.Fatal(err)
	}
	var countryObj struct {
		ID int `json:"id"`
	}
	if err := json.Unmarshal(country, &countryObj); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(country), `"name_ru":"Тестовая страна"`) {
		t.Fatalf("country response lacks Russian name: %s", country)
	}
	defer db.Exec(context.Background(), `DELETE FROM countries WHERE id=$1`, countryObj.ID)
	if _, err := r.Update(ctx, "countries", fmt.Sprint(countryObj.ID), map[string]any{"name": name + "-updated"}); err != nil {
		t.Fatal(err)
	}
	currencyCode := string([]byte{'Z', 'A' + uuid.New()[0]%26, 'A' + uuid.New()[0]%26})
	currency, err := r.Create(ctx, "currencies", map[string]any{"code": currencyCode, "name": name, "name_ru": "Тестовая валюта", "is_active": true})
	if err != nil {
		t.Fatal(err)
	}
	defer db.Exec(context.Background(), `DELETE FROM currencies WHERE code=$1`, currencyCode)
	if _, err := r.Update(ctx, "currencies", currencyCode, map[string]any{"name": name + "-updated"}); err != nil {
		t.Fatal(err)
	}
	if len(currency) == 0 {
		t.Fatal("empty currency response")
	}
	rate, err := r.Create(ctx, "exchange_rates", map[string]any{"quote_currency": currencyCode, "rate": decimal.RequireFromString("1.234567"), "effective_from": time.Now().UTC().Add(-time.Minute)})
	if err != nil {
		t.Fatal(err)
	}
	rateID := idOf(rate)
	defer db.Exec(context.Background(), `DELETE FROM exchange_rates WHERE id=$1`, rateID)
	if _, total, err := r.List(ctx, "exchange_rates", map[string]any{"quote_currency": currencyCode}, 20, 0); err != nil || total != 1 {
		t.Fatalf("rates: total=%d err=%v", total, err)
	}
	location, err := r.Create(ctx, "locations", map[string]any{"name": name, "name_ru": "Тестовый город", "country_id": ruID})
	if err != nil {
		t.Fatal(err)
	}
	var locationObj struct {
		ID int `json:"id"`
	}
	if err := json.Unmarshal(location, &locationObj); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(context.Background(), `DELETE FROM locations WHERE id=$1`, locationObj.ID)
	if _, err := r.Update(ctx, "locations", fmt.Sprint(locationObj.ID), map[string]any{"name": name + "-updated"}); err != nil {
		t.Fatal(err)
	}
	items, total, err := r.List(ctx, "locations", map[string]any{"country_id": ruID}, 20, 0)
	if err != nil || total < 1 || len(items) < 1 {
		t.Fatalf("list locations: total=%d items=%d err=%v", total, len(items), err)
	}

	listingType, err := r.Create(ctx, "listing_types", map[string]any{"name": name, "name_ru": "Тестовый тип", "slug": name})
	if err != nil {
		t.Fatal(err)
	}
	var typeObj struct {
		ID int `json:"id"`
	}
	if err := json.Unmarshal(listingType, &typeObj); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(context.Background(), `DELETE FROM listing_types WHERE id=$1`, typeObj.ID)
	externalID := "way/" + uuid.NewString()
	listing, err := r.Create(ctx, "listings", map[string]any{"title": name, "listing_type_id": typeObj.ID, "location_id": locationObj.ID, "is_active": false, "external_source": "osm", "external_id": externalID})
	if err != nil {
		t.Fatal(err)
	}
	listingID := idOf(listing)
	defer db.Exec(context.Background(), `DELETE FROM listings WHERE id=$1`, listingID)
	if !strings.Contains(string(listing), `"external_source":"osm"`) || !strings.Contains(string(listing), `"external_id":"`+externalID+`"`) {
		t.Fatalf("listing response lacks external identity: %s", listing)
	}
	matched, count, err := r.List(ctx, "listings", map[string]any{"external_source": "osm", "external_id": externalID}, 10, 0)
	if err != nil || count != 1 || len(matched) != 1 || idOf(matched[0]) != listingID {
		t.Fatalf("external identity filter: count=%d items=%v err=%v", count, matched, err)
	}
	if _, err := r.Create(ctx, "listings", map[string]any{"title": name + " duplicate", "listing_type_id": typeObj.ID, "location_id": locationObj.ID, "external_source": "osm", "external_id": externalID}); !errors.Is(err, domain.ErrAlreadyExists) {
		t.Fatalf("duplicate external identity: %v", err)
	}
	if _, err := r.Update(ctx, "listings", listingID, map[string]any{"external_source": nil}); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("incomplete external identity: %v", err)
	}
	if _, err := r.Update(ctx, "listings", listingID, map[string]any{"is_active": true, "title": name + "-updated"}); err != nil {
		t.Fatal(err)
	}
	for _, sortBy := range []string{"title", "title_ru"} {
		found, count, err := r.List(ctx, "listings", map[string]any{"search": name, "sort_by": sortBy, "sort_order": "asc"}, 20, 0)
		if err != nil || count < 1 {
			t.Fatalf("listing search/sort %s: count=%d err=%v", sortBy, count, err)
		}
		matched := false
		for _, item := range found {
			matched = matched || idOf(item) == listingID
		}
		if !matched {
			t.Fatalf("listing search/sort %s did not return created listing", sortBy)
		}
	}
	if _, err := r.Update(ctx, "listings", listingID, map[string]any{"external_source": nil, "external_id": nil}); err != nil {
		t.Fatalf("clear external identity: %v", err)
	}
	image, err := r.Create(ctx, "listing_images", map[string]any{"listing_id": listingID, "url": "https://example.invalid/a.jpg", "sort_order": 0})
	if err != nil {
		t.Fatal(err)
	}
	imageID := idOf(image)
	if _, err := r.Update(ctx, "listing_images", imageID, map[string]any{"sort_order": 1}); err != nil {
		t.Fatal(err)
	}
	listing, err = r.Get(ctx, "listings", listingID)
	if err != nil {
		t.Fatal(err)
	}
	var listingDetail struct {
		Images []json.RawMessage `json:"images"`
	}
	if err := json.Unmarshal(listing, &listingDetail); err != nil || len(listingDetail.Images) != 1 {
		t.Fatalf("listing images: %s %v", listing, err)
	}
	if err := r.DeleteImage(ctx, "listing_images", listingID, imageID); err != nil {
		t.Fatal(err)
	}

	var unitID string
	if err := db.QueryRow(ctx, `INSERT INTO listing_units(listing_id,type,name,capacity_adults,price_per_night,currency)
		VALUES($1,'property',$2,2,100,'RUB') RETURNING id::text`, listingID, name).Scan(&unitID); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(context.Background(), `DELETE FROM listing_units WHERE id=$1`, unitID)
	unit, err := r.Get(ctx, "listing_units", unitID)
	if err != nil {
		t.Fatal(err)
	}
	var unitObj struct {
		ListingID string            `json:"listing_id"`
		Images    []json.RawMessage `json:"images"`
	}
	if err := json.Unmarshal(unit, &unitObj); err != nil || unitObj.ListingID != listingID || unitObj.Images == nil {
		t.Fatalf("unit: %s %v", unit, err)
	}
	unitImage, err := r.Create(ctx, "unit_images", map[string]any{"unit_id": unitID, "url": "https://example.invalid/u.jpg", "sort_order": 0})
	if err != nil {
		t.Fatal(err)
	}
	unitImageID := idOf(unitImage)
	if _, err := r.Update(ctx, "unit_images", unitImageID, map[string]any{"sort_order": 1}); err != nil {
		t.Fatal(err)
	}
	unit, err = r.Get(ctx, "listing_units", unitID)
	if err := json.Unmarshal(unit, &unitObj); err != nil || len(unitObj.Images) != 1 {
		t.Fatalf("unit images after adding photo: %s %v", unit, err)
	}
	if err := r.DeleteImage(ctx, "unit_images", unitID, unitImageID); err != nil {
		t.Fatal(err)
	}

	partner, err := r.Create(ctx, "counterparties", map[string]any{"name": name, "location_id": locationObj.ID})
	if err != nil {
		t.Fatal(err)
	}
	partnerID := idOf(partner)
	defer db.Exec(context.Background(), `DELETE FROM counterparties WHERE id=$1`, partnerID)
	product, err := r.Create(ctx, "products", map[string]any{"name": name, "product_type": "goods", "price": decimal.NewFromInt(100), "currency": "RUB", "description": "", "location_id": locationObj.ID, "counterparty_id": partnerID, "thumbnail": "{}", "images": "[]", "attributes": "{}", "is_active": false})
	if err != nil {
		t.Fatal(err)
	}
	productID := idOf(product)
	defer db.Exec(context.Background(), `DELETE FROM products WHERE id=$1`, productID)
	if _, err := r.Update(ctx, "products", productID, map[string]any{"is_active": true, "price": decimal.NewFromInt(150)}); err != nil {
		t.Fatal(err)
	}
	if _, err := service.NewAdminService(r, "RUB").Update(ctx, "products", productID, map[string]json.RawMessage{"name": json.RawMessage(`"Updated product"`)}); err != nil {
		t.Fatal(err)
	}
	if _, err := r.Get(ctx, "products", productID); err != nil {
		t.Fatal(err)
	}

	staff, err := r.CreateStaff(ctx, name+"@example.invalid", "hash", domain.RoleManager)
	if err != nil {
		t.Fatal(err)
	}
	staffID := idOf(staff)
	defer db.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, staffID)
	if _, err := r.UpdateRole(ctx, staffID, "other-admin", domain.RoleAdmin); err != nil {
		t.Fatal(err)
	}
	if _, err := r.UpdateRole(ctx, staffID, staffID, domain.RoleManager); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("self-demotion should be forbidden: %v", err)
	}
	userView, err := r.Get(ctx, "users", staffID)
	if err != nil {
		t.Fatal(err)
	}
	var account struct {
		Role domain.Role `json:"role"`
	}
	if err := json.Unmarshal(userView, &account); err != nil || account.Role != domain.RoleAdmin || strings.Contains(string(userView), "password_hash") {
		t.Fatalf("unsafe account view: %s %v", userView, err)
	}
}
