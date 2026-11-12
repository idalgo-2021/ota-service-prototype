package postgres

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

func TestCatalogLocalizationIntegration(t *testing.T) {
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

	var listingID, productID string
	if err := db.QueryRow(ctx, `SELECT id FROM listings WHERE title_ru='Квартира у моря' LIMIT 1`).Scan(&listingID); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `SELECT id FROM products WHERE name_ru='Набор для пикника' LIMIT 1`).Scan(&productID); err != nil {
		t.Fatal(err)
	}
	listing, err := NewListingRepo(db).GetByID(ctx, listingID, nil)
	if err != nil || listing.Title != "Seaside Apartment" || listing.TitleRU == nil || *listing.TitleRU != "Квартира у моря" || listing.Address == nil || *listing.Address != "112 Lenina Street" || listing.AddressRU == nil || *listing.AddressRU != "ул. Ленина, д. 112" {
		t.Fatalf("listing: %+v, err: %v", listing, err)
	}
	product, err := NewProductRepo(db).GetByID(ctx, productID, true)
	if err != nil || product.Name != "Picnic Set" || product.NameRU == nil || *product.NameRU != "Набор для пикника" {
		t.Fatalf("product: %+v, err: %v", product, err)
	}
	admin := NewAdminRepo(db)
	for _, item := range []struct {
		kind, id, expected string
	}{
		{"listings", listingID, `"address_ru":"ул. Ленина, д. 112"`},
		{"products", productID, `"name_ru":"Набор для пикника"`},
	} {
		raw, err := admin.Get(ctx, item.kind, item.id)
		if err != nil || !strings.Contains(string(raw), item.expected) {
			t.Fatalf("admin %s: %s, err: %v", item.kind, raw, err)
		}
	}

	unitName := "Localization test " + uuid.NewString()
	unitRU := "Тест локализации"
	unit := &domain.ListingUnit{
		ListingID: listingID, Type: "property", Name: unitName, NameRU: &unitRU,
		CapacityAdults: 2, PricePerNight: decimal.NewFromInt(100), Currency: "RUB", IsActive: true,
	}
	repo := NewBookingRepo(db)
	if err := repo.CreateUnit(ctx, unit); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(context.Background(), `DELETE FROM listing_units WHERE id=$1`, unit.ID)
	got, err := repo.GetUnit(ctx, listingID, unit.ID)
	if err != nil || got.NameRU == nil || *got.NameRU != unitRU {
		t.Fatalf("get unit: %+v, err: %v", got, err)
	}
	updatedRU := "Обновлённый тест"
	got.NameRU = &updatedRU
	if err := repo.UpdateUnit(ctx, got); err != nil {
		t.Fatal(err)
	}
	if got.NameRU == nil || *got.NameRU != updatedRU {
		t.Fatalf("updated unit: %+v", got)
	}
	raw, err := admin.Get(ctx, "listing_units", unit.ID)
	if err != nil || !strings.Contains(string(raw), `"name_ru":"Обновлённый тест"`) {
		t.Fatalf("admin unit: %s, err: %v", raw, err)
	}
}
