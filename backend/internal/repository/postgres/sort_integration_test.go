package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/config"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// Read-only checks against the configured migrated database.
func TestListSortingIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		if os.Getenv("REVIEW_INTEGRATION_TEST") != "1" {
			t.Skip("set TEST_DATABASE_URL or REVIEW_INTEGRATION_TEST=1 to run against a migrated database")
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

	var currency string
	if err := db.QueryRow(ctx, `SELECT COALESCE((SELECT currency FROM products ORDER BY currency LIMIT 1), 'RUB')`).Scan(&currency); err != nil {
		t.Fatal(err)
	}
	products, _, err := NewProductRepo(db).List(ctx, 100, 0, domain.ProductFilter{Currency: currency, Sort: domain.Sort{By: "price", Order: "asc"}})
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i < len(products); i++ {
		prev, next := products[i-1], products[i]
		if prev.Currency != currency || next.Currency != currency || prev.Price.Cmp(next.Price) > 0 {
			t.Fatalf("products are not sorted by price within the selected currency at position %d", i)
		}
	}
	productsDesc, _, err := NewProductRepo(db).List(ctx, 100, 0, domain.ProductFilter{Currency: currency, Sort: domain.Sort{By: "price", Order: "desc"}})
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i < len(productsDesc); i++ {
		prev, next := productsDesc[i-1], productsDesc[i]
		if prev.Currency != currency || next.Currency != currency || prev.Price.Cmp(next.Price) < 0 {
			t.Fatalf("products are not sorted by descending price at position %d", i)
		}
	}

	orders, _, err := NewOrderRepo(db).GetAll(ctx, domain.OrderFilter{Sort: domain.Sort{By: "fulfilled_at", Order: "asc"}}, 100, 0)
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i < len(orders); i++ {
		prev, next := orders[i-1], orders[i]
		if (prev.FulfilledAt == nil && next.FulfilledAt != nil) || (prev.FulfilledAt != nil && next.FulfilledAt != nil && prev.FulfilledAt.After(*next.FulfilledAt)) {
			t.Fatalf("orders are not sorted by fulfillment date at position %d", i)
		}
	}
	userID := "00000000-0000-0000-0000-000000000000"
	if len(orders) > 0 {
		userID = orders[0].UserID
	}
	clientOrders, _, err := NewOrderRepo(db).GetByUserID(ctx, userID, domain.Sort{By: "created_at", Order: "asc"}, nil, 100, 0)
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i < len(clientOrders); i++ {
		if clientOrders[i-1].CreatedAt.After(clientOrders[i].CreatedAt) {
			t.Fatalf("client orders are not sorted by creation date at position %d", i)
		}
	}
	pendingOrders, pendingTotal, err := NewOrderRepo(db).GetByUserID(ctx, userID, domain.Sort{By: "created_at", Order: "desc"}, []domain.OrderStatus{domain.StatusPending}, 100, 0)
	if err != nil {
		t.Fatal(err)
	}
	if pendingTotal < len(pendingOrders) {
		t.Fatalf("pending order total %d is less than the returned rows %d", pendingTotal, len(pendingOrders))
	}
	for _, pending := range pendingOrders {
		if pending.Status != domain.StatusPending || pending.UserID != userID {
			t.Fatalf("unexpected order in pending filter: %+v", pending)
		}
	}

	bookings, _, err := NewBookingRepo(db).ListBookings(ctx, "00000000-0000-0000-0000-000000000000", true, domain.BookingFilter{Sort: domain.Sort{By: "check_in_date", Order: "asc"}}, 100, 0)
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i < len(bookings); i++ {
		if bookings[i-1].CheckInDate > bookings[i].CheckInDate {
			t.Fatalf("bookings are not sorted by check-in date at position %d", i)
		}
	}
	bookingsDesc, _, err := NewBookingRepo(db).ListBookings(ctx, "00000000-0000-0000-0000-000000000000", true, domain.BookingFilter{Sort: domain.Sort{By: "check_out_date", Order: "desc"}}, 100, 0)
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i < len(bookingsDesc); i++ {
		if bookingsDesc[i-1].CheckOutDate < bookingsDesc[i].CheckOutDate {
			t.Fatalf("bookings are not sorted by descending check-out date at position %d", i)
		}
	}
	t.Logf("checked %d products, %d orders and %d bookings", len(products), len(orders), len(bookings))
}
