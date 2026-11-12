package postgres

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

// Run with TEST_DATABASE_URL against a migrated, seeded disposable database.
func TestBookingPriceSnapshotIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var userID, listingID, firstID, secondID string
	var firstPrice, secondPrice decimal.Decimal
	err = db.QueryRow(ctx, `SELECT id FROM users ORDER BY created_at LIMIT 1`).Scan(&userID)
	if err != nil {
		t.Fatal(err)
	}
	err = db.QueryRow(ctx, `SELECT a.listing_id,a.id,b.id,a.price_per_night,b.price_per_night
      FROM listing_units a JOIN listing_units b ON b.parent_unit_id=a.parent_unit_id AND b.id>a.id
      WHERE a.type='bed' AND b.type='bed' AND a.currency='RUB' AND b.currency='RUB'
      ORDER BY a.id,b.id LIMIT 1`).Scan(&listingID, &firstID, &secondID, &firstPrice, &secondPrice)
	if err != nil {
		t.Fatal(err)
	}
	repo := NewBookingRepo(db)
	start, end := "2035-01-15", "2035-01-17"
	id, err := repo.CreateBooking(ctx, userID, domain.CreateBookingInput{ListingID: listingID, UnitIDs: []string{strings.ToUpper(firstID), secondID}, CheckInDate: start, Nights: 2, AdultsCount: 2}, end, domain.CurrencyQuote{Currency: "RUB", Rate: decimal.NewFromInt(1), QuotedAt: time.Now()})
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := db.Exec(context.Background(), `DELETE FROM booking_units WHERE booking_id=$1`, id); err != nil {
			t.Errorf("clean up booking units: %v", err)
		}
		if _, err := db.Exec(context.Background(), `DELETE FROM bookings WHERE id=$1`, id); err != nil {
			t.Errorf("clean up booking: %v", err)
		}
	}()
	booking, err := repo.GetBooking(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	expected := firstPrice.Add(secondPrice).Mul(decimal.NewFromInt(2))
	if !booking.Total.Equal(expected) || booking.Currency != "RUB" || len(booking.Units) != 2 {
		t.Fatalf("unexpected price snapshot: total=%s currency=%s units=%+v, want %s RUB", booking.Total, booking.Currency, booking.Units, expected)
	}
	prices := map[string]decimal.Decimal{firstID: firstPrice, secondID: secondPrice}
	for _, unit := range booking.Units {
		if !unit.PricePerNight.Equal(prices[unit.UnitID]) {
			t.Fatalf("unexpected nightly rate for %s: %s", unit.UnitID, unit.PricePerNight)
		}
	}
}

func TestAdminBookingFiltersIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	const bookingID = "b0000000-0000-4000-8000-000000000004"
	var clientID, listingID string
	if err := db.QueryRow(ctx, `SELECT user_id,listing_id FROM bookings WHERE id=$1`, bookingID).Scan(&clientID, &listingID); err != nil {
		t.Fatal(err)
	}
	repo := NewBookingRepo(db)
	f := domain.BookingFilter{ListingID: listingID, ClientID: clientID, Status: "confirmed", CheckInFrom: "2026-11-13", CheckInTo: "2026-11-13", CheckOutFrom: "2026-11-17", CheckOutTo: "2026-11-17"}
	items, total, err := repo.ListBookings(ctx, clientID, true, f, 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 || len(items) != 1 || items[0].ID != bookingID {
		t.Fatalf("unexpected bookings: total=%d items=%+v", total, items)
	}
	f.CheckOutFrom = "2026-11-18"
	items, total, err = repo.ListBookings(ctx, clientID, true, f, 20, 0)
	if err != nil || total != 0 || len(items) != 0 {
		t.Fatalf("checkout filter did not exclude booking: total=%d items=%+v err=%v", total, items, err)
	}
}
