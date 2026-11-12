package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type orderRepoStub struct {
	order   *domain.Order
	updates int
	created *domain.Order
}

func (r *orderRepoStub) GetByID(context.Context, string) (*domain.Order, error) {
	copy := *r.order
	copy.Items = append([]domain.OrderItem(nil), r.order.Items...)
	return &copy, nil
}
func (r *orderRepoStub) Create(_ context.Context, order *domain.Order) error {
	r.created = order
	return nil
}
func (r *orderRepoStub) Update(_ context.Context, o *domain.Order) error {
	r.order = o
	r.updates++
	return nil
}
func (r *orderRepoStub) UpdatePending(ctx context.Context, o *domain.Order, cutoff time.Time) error {
	if !o.CreatedAt.After(cutoff) {
		return domain.ErrOrderConflict
	}
	return r.Update(ctx, o)
}
func (r *orderRepoStub) GetByUserID(context.Context, string, domain.Sort, []domain.OrderStatus, int, int) ([]domain.Order, int, error) {
	panic("unexpected GetByUserID")
}
func (r *orderRepoStub) GetAll(context.Context, domain.OrderFilter, int, int) ([]domain.Order, int, error) {
	panic("unexpected GetAll")
}

type productRepoStub struct{ product *domain.Product }

func (r *productRepoStub) GetByID(context.Context, string, bool) (*domain.Product, error) {
	return r.product, nil
}
func (r *productRepoStub) GetByIDs(context.Context, []string) (map[string]*domain.Product, error) {
	return map[string]*domain.Product{r.product.ID: r.product}, nil
}
func (r *productRepoStub) List(context.Context, int, int, domain.ProductFilter) ([]domain.Product, int, error) {
	panic("unexpected List")
}

type bookingRepoStub struct {
	BookingRepository
	booking *domain.Booking
}

type orderListingRepoStub struct{ listing *domain.Listing }

func (r *orderListingRepoStub) GetByID(context.Context, string, *domain.ListingFilter) (*domain.Listing, error) {
	return r.listing, nil
}

func (r *bookingRepoStub) GetBooking(context.Context, string) (*domain.Booking, error) {
	return r.booking, nil
}

func pendingOrder() *domain.Order {
	return &domain.Order{ID: "order-1", UserID: "owner", Status: domain.StatusPending,
		Total: decimal.NewFromInt(100), Currency: "RUB", CreatedAt: time.Now().Add(-time.Hour), UpdatedAt: time.Now(),
		Items: []domain.OrderItem{{ProductID: "product-1", Quantity: 1, Price: decimal.NewFromInt(100), Currency: "RUB"}}}
}

func TestCreateOrderStoresProductUnitPricesAndCalculatedTotal(t *testing.T) {
	repo := &orderRepoStub{}
	products := &productRepoStub{product: &domain.Product{ID: "product-1", Price: decimal.NewFromFloat(125.50), Currency: "RUB", IsActive: true}}
	s := NewOrderService(repo, products, zap.NewNop(), 24*time.Hour)

	order, err := s.CreateOrder(context.Background(), "owner", "RUB", nil, []domain.OrderItem{{ProductID: "product-1", Quantity: 3}})
	if err != nil {
		t.Fatal(err)
	}
	if repo.created != order || !order.Items[0].Price.Equal(decimal.NewFromFloat(125.50)) || order.Items[0].Currency != "RUB" {
		t.Fatalf("stored item = %+v", order.Items[0])
	}
	wantTotal := decimal.NewFromFloat(376.50)
	calculated := *order
	calculated.CalculateTotal()
	if !order.Total.Equal(wantTotal) || !calculated.Total.Equal(order.Total) {
		t.Fatalf("total = %s, items = %+v", order.Total, order.Items)
	}
}

func TestBookingLinkIsInformationalAndRequiresSameOwner(t *testing.T) {
	order := pendingOrder()
	order.Status = domain.StatusConfirmed
	repo := &orderRepoStub{order: order}
	locationID := 1
	s := NewOrderService(repo, &productRepoStub{product: &domain.Product{ID: "product-1", LocationID: &locationID}}, zap.NewNop(), 24*time.Hour)
	bookingID := "booking-1"
	s.SetBookingRepository(&bookingRepoStub{booking: &domain.Booking{ID: bookingID, UserID: "owner", Status: "confirmed"}})
	s.SetListingRepository(&orderListingRepoStub{listing: &domain.Listing{ID: "listing-1", LocationID: locationID}})

	linked, err := s.LinkBooking(context.Background(), order.ID, "owner", &bookingID)
	if err != nil {
		t.Fatal(err)
	}
	if linked.BookingID == nil || *linked.BookingID != bookingID || linked.Status != domain.StatusConfirmed || !linked.Total.Equal(decimal.NewFromInt(100)) {
		t.Fatalf("linked order changed business data: %+v", linked)
	}

	foreignID := "booking-2"
	s.SetBookingRepository(&bookingRepoStub{booking: &domain.Booking{ID: foreignID, UserID: "other"}})
	if _, err := s.LinkBooking(context.Background(), order.ID, "owner", &foreignID); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("foreign booking link: %v", err)
	}
}

func TestConfirmOrderRequiresCurrentPrice(t *testing.T) {
	repo := &orderRepoStub{order: pendingOrder()}
	products := &productRepoStub{product: &domain.Product{ID: "product-1", Price: decimal.NewFromInt(120), Currency: "RUB", IsActive: true}}
	s := NewOrderService(repo, products, zap.NewNop(), 24*time.Hour)
	order, err := s.ConfirmOrder(context.Background(), "order-1", "owner")
	if !errors.Is(err, domain.ErrOrderConflict) || order != nil || repo.order.Status != domain.StatusPending || !repo.order.Total.Equal(decimal.NewFromInt(100)) || repo.updates != 0 {
		t.Fatalf("changed price: order=%+v err=%v updates=%d", order, err, repo.updates)
	}
	items := []domain.OrderItem{{ProductID: "product-1", Quantity: 1}}
	if _, err := s.UpdateOrder(context.Background(), "order-1", "owner", domain.RoleUser, domain.UpdateOrderInput{Items: &items}); err != nil {
		t.Fatal(err)
	}
	order, err = s.ConfirmOrder(context.Background(), "order-1", "owner")
	if err != nil || order.Status != domain.StatusConfirmed || repo.updates != 2 {
		t.Fatalf("confirm: order=%+v err=%v", order, err)
	}
}

func TestInactiveProductCannotBeOrdered(t *testing.T) {
	repo := &orderRepoStub{order: pendingOrder()}
	products := &productRepoStub{product: &domain.Product{ID: "product-1", Price: decimal.NewFromInt(100), Currency: "RUB", IsActive: false}}
	s := NewOrderService(repo, products, zap.NewNop(), 24*time.Hour)
	items := []domain.OrderItem{{ProductID: "product-1", Quantity: 1}}
	if _, err := s.UpdateOrder(context.Background(), "order-1", "owner", domain.RoleUser, domain.UpdateOrderInput{Items: &items}); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("update with inactive product: %v", err)
	}
	if _, err := s.ConfirmOrder(context.Background(), "order-1", "owner"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("confirm with inactive product: %v", err)
	}
	if repo.updates != 0 {
		t.Fatalf("updated inactive product order %d times", repo.updates)
	}
}

func TestUpdateOrderChecksTourSchedule(t *testing.T) {
	repo := &orderRepoStub{order: pendingOrder()}
	products := &productRepoStub{product: &domain.Product{ID: "product-1", ProductType: "tour", Price: decimal.NewFromInt(100), Currency: "RUB", IsActive: true, Schedule: []domain.TourScheduleEntry{{Weekday: 2, Time: "10:00"}}}}
	s := NewOrderService(repo, products, zap.NewNop(), 24*time.Hour)
	badDate := "2026-11-18"
	items := []domain.OrderItem{{ProductID: "product-1", Quantity: 1, Date: &badDate}}
	if _, err := s.UpdateOrder(context.Background(), "order-1", "owner", domain.RoleUser, domain.UpdateOrderInput{Items: &items}); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("wrong weekday: %v", err)
	}
	goodDate := "2026-11-17"
	items[0].Date = &goodDate
	if _, err := s.UpdateOrder(context.Background(), "order-1", "owner", domain.RoleUser, domain.UpdateOrderInput{Items: &items}); err != nil {
		t.Fatalf("scheduled date: %v", err)
	}
	items[0].Date = nil
	if _, err := s.UpdateOrder(context.Background(), "order-1", "owner", domain.RoleUser, domain.UpdateOrderInput{Items: &items}); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("date omitted: %v", err)
	}
}

func TestOrderCancellationRights(t *testing.T) {
	repo := &orderRepoStub{order: pendingOrder()}
	s := NewOrderService(repo, &productRepoStub{}, zap.NewNop(), 24*time.Hour)
	if _, err := s.CancelOrder(context.Background(), "order-1", "other", false, nil); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("other user: %v", err)
	}
	repo.order.Status = domain.StatusConfirmed
	if order, err := s.CancelOrder(context.Background(), "order-1", "owner", false, nil); err != nil || order.Status != domain.StatusCancelled {
		t.Fatalf("client confirmed: order=%+v err=%v", order, err)
	}
	repo.order.Status = domain.StatusConfirmed
	reason := "Client called"
	order, err := s.CancelOrder(context.Background(), "order-1", "staff", true, &reason)
	if err != nil || order.Status != domain.StatusCancelled || order.CancelledBy == nil || *order.CancelledBy != "staff" || order.CancellationReason == nil || *order.CancellationReason != reason {
		t.Fatalf("staff cancellation: order=%+v err=%v", order, err)
	}
}

func TestExpiredPendingOrderCannotBeChangedOrConfirmed(t *testing.T) {
	order := pendingOrder()
	order.CreatedAt = time.Now().Add(-25 * time.Hour)
	repo := &orderRepoStub{order: order}
	s := NewOrderService(repo, &productRepoStub{}, zap.NewNop(), 24*time.Hour)
	items := []domain.OrderItem{{ProductID: "product-1", Quantity: 1}}
	if _, err := s.UpdateOrder(context.Background(), order.ID, order.UserID, domain.RoleUser, domain.UpdateOrderInput{Items: &items}); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("update expired order: %v", err)
	}
	if _, err := s.ConfirmOrder(context.Background(), order.ID, order.UserID); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("confirm expired order: %v", err)
	}
	if repo.updates != 0 {
		t.Fatalf("expired order was updated %d times", repo.updates)
	}
}
