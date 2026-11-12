package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type OrderService struct {
	orderRepo            OrderRepository
	productRepo          ProductRepository
	bookingRepo          BookingRepository
	listingRepo          OrderListingRepository
	currencySvc          *CurrencyService
	pendingOrderLifetime time.Duration
	logger               *zap.Logger
}

// SetBookingRepository enables the optional informational link between an order and a booking.
func (s *OrderService) SetBookingRepository(repo BookingRepository) { s.bookingRepo = repo }

// SetListingRepository enables validation that linked products belong to the booking location.
func (s *OrderService) SetListingRepository(repo OrderListingRepository) { s.listingRepo = repo }

func NewOrderService(orderRepo OrderRepository, productRepo ProductRepository, logger *zap.Logger, pendingOrderLifetime time.Duration, currency ...*CurrencyService) *OrderService {
	var cs *CurrencyService
	if len(currency) > 0 {
		cs = currency[0]
	}
	return &OrderService{
		orderRepo:            orderRepo,
		productRepo:          productRepo,
		currencySvc:          cs,
		pendingOrderLifetime: pendingOrderLifetime,
		logger:               logger,
	}
}

func (s *OrderService) GetOrder(ctx context.Context, id, userID string, role domain.Role) (*domain.Order, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if !isStaff(role) && !order.BelongsTo(userID) {
		return nil, fmt.Errorf("order %s: %w", id, domain.ErrForbidden)
	}

	return order, nil
}

func (s *OrderService) ListOrders(ctx context.Context, userID string, role domain.Role, sort domain.Sort, statuses []domain.OrderStatus, limit, offset int) ([]domain.Order, int, error) {
	var orders []domain.Order
	var total int
	var err error
	if isStaff(role) {
		orders, total, err = s.orderRepo.GetAll(ctx, domain.OrderFilter{Sort: sort}, limit, offset)
	} else {
		orders, total, err = s.orderRepo.GetByUserID(ctx, userID, sort, statuses, limit, offset)
	}
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list orders: %w", err)
	}
	return orders, total, nil
}

func (s *OrderService) ListAdminOrders(ctx context.Context, filter domain.OrderFilter, limit, offset int) ([]domain.Order, int, error) {
	return s.orderRepo.GetAll(ctx, filter, limit, offset)
}

func (s *OrderService) CreateOrder(ctx context.Context, userID, requestedCurrency string, bookingID *string, items []domain.OrderItem) (*domain.Order, error) {
	if len(items) == 0 {
		return nil, fmt.Errorf("%w: order must contain at least one item", domain.ErrInvalidInput)
	}
	if len(items) > domain.MaxOrderItems {
		return nil, fmt.Errorf("%w: order cannot contain more than %d items", domain.ErrInvalidInput, domain.MaxOrderItems)
	}

	// Validate all items first.
	for _, item := range items {
		if err := item.Validate(); err != nil {
			return nil, err
		}
	}

	requestedCurrency = strings.ToUpper(strings.TrimSpace(requestedCurrency))
	if requestedCurrency == "" {
		return nil, fmt.Errorf("%w: currency is required", domain.ErrInvalidInput)
	}
	items, total, baseTotal, currency, rateID, quotedAt, err := s.processOrderItems(ctx, items, requestedCurrency)
	if err != nil {
		return nil, err
	}
	if err := s.validateBookingLink(ctx, userID, bookingID, items); err != nil {
		return nil, err
	}

	now := time.Now()
	order := &domain.Order{
		ID:        uuid.New().String(),
		UserID:    userID,
		BookingID: bookingID,
		Items:     items,
		Status:    domain.StatusPending,
		Total:     total,
		Currency:  currency,
		BaseTotal: baseTotal,
		RateID:    rateID,
		QuotedAt:  &quotedAt,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.orderRepo.Create(ctx, order); err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	s.logger.Info("order created", zap.String("order_id", order.ID), zap.String("user_id", userID))
	return order, nil
}

// LinkBooking changes only the optional informational relation. It never changes
// order items, totals or status, so confirmed orders remain immutable.
func (s *OrderService) LinkBooking(ctx context.Context, id, userID string, bookingID *string) (*domain.Order, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !order.BelongsTo(userID) {
		return nil, domain.ErrForbidden
	}
	if err := s.validateBookingLink(ctx, userID, bookingID, order.Items); err != nil {
		return nil, err
	}
	order.BookingID = bookingID
	order.UpdatedAt = time.Now()
	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, fmt.Errorf("failed to link booking: %w", err)
	}
	return order, nil
}

func (s *OrderService) validateBookingLink(ctx context.Context, userID string, bookingID *string, items []domain.OrderItem) error {
	if bookingID == nil {
		return nil
	}
	if s.bookingRepo == nil {
		return fmt.Errorf("booking repository is not configured")
	}
	booking, err := s.bookingRepo.GetBooking(ctx, *bookingID)
	if err != nil {
		return err
	}
	if booking.UserID != userID {
		return domain.ErrForbidden
	}
	if booking.Status != "confirmed" && booking.Status != "checked_in" {
		return fmt.Errorf("%w: services can only be linked to an active booking", domain.ErrInvalidInput)
	}
	for _, item := range items {
		if item.Date != nil && (*item.Date < booking.CheckInDate || *item.Date > booking.CheckOutDate) {
			return fmt.Errorf("%w: service date must be within the booking dates", domain.ErrInvalidInput)
		}
	}
	if s.listingRepo == nil {
		return fmt.Errorf("listing repository is not configured")
	}
	listing, err := s.listingRepo.GetByID(ctx, booking.ListingID, nil)
	if err != nil {
		return err
	}
	productIDs := make([]string, len(items))
	for i := range items {
		productIDs[i] = items[i].ProductID
	}
	products, err := s.productRepo.GetByIDs(ctx, productIDs)
	if err != nil {
		return fmt.Errorf("failed to validate booking products: %w", err)
	}
	for _, product := range products {
		if product.LocationID != nil && *product.LocationID != listing.LocationID {
			return fmt.Errorf("%w: product location must match the booking location", domain.ErrInvalidInput)
		}
	}
	return nil
}

func (s *OrderService) UpdateOrder(ctx context.Context, id, userID string, role domain.Role, input domain.UpdateOrderInput) (*domain.Order, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if !isStaff(role) && !order.BelongsTo(userID) {
		return nil, fmt.Errorf("order %s: %w", id, domain.ErrForbidden)
	}
	if input.Items == nil {
		return nil, fmt.Errorf("%w: items are required", domain.ErrInvalidInput)
	}
	if order.Status != domain.StatusPending {
		return nil, fmt.Errorf("%w: order items can only be changed while pending", domain.ErrInvalidInput)
	}
	if !order.CreatedAt.After(time.Now().Add(-s.pendingOrderLifetime)) {
		return nil, fmt.Errorf("%w: pending order expired", domain.ErrInvalidInput)
	}
	items := *input.Items
	if len(items) == 0 {
		return nil, fmt.Errorf("%w: order must contain at least one item", domain.ErrInvalidInput)
	}
	if len(items) > domain.MaxOrderItems {
		return nil, fmt.Errorf("%w: order cannot contain more than %d items", domain.ErrInvalidInput, domain.MaxOrderItems)
	}
	for _, item := range items {
		if err := item.Validate(); err != nil {
			return nil, err
		}
	}
	var total decimal.Decimal
	var currency string
	items, total, baseTotal, currency, rateID, quotedAt, err := s.processOrderItems(ctx, items, order.Currency)
	if err != nil {
		return nil, err
	}
	order.Items, order.Total, order.BaseTotal, order.Currency = items, total, baseTotal, currency
	order.RateID, order.QuotedAt = rateID, &quotedAt

	order.UpdatedAt = time.Now()

	if err := s.orderRepo.UpdatePending(ctx, order, time.Now().Add(-s.pendingOrderLifetime)); err != nil {
		return nil, fmt.Errorf("failed to update order: %w", err)
	}

	s.logger.Info("order updated", zap.String("order_id", order.ID))
	return order, nil
}

// ConfirmOrder changes only the status. A stale pending quote must be refreshed
// through UpdateOrder before it can be confirmed.
func (s *OrderService) ConfirmOrder(ctx context.Context, id, userID string) (*domain.Order, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !order.BelongsTo(userID) {
		return nil, domain.ErrForbidden
	}
	if order.Status != domain.StatusPending {
		return nil, fmt.Errorf("%w: order is not pending", domain.ErrInvalidInput)
	}
	if !order.CreatedAt.After(time.Now().Add(-s.pendingOrderLifetime)) {
		return nil, fmt.Errorf("%w: pending order expired", domain.ErrInvalidInput)
	}
	items, total, _, currency, _, _, err := s.processOrderItems(ctx, order.Items, order.Currency)
	if err != nil {
		return nil, err
	}
	if !total.Equal(order.Total) || currency != order.Currency {
		return nil, domain.ErrOrderConflict
	}
	for i := range items {
		if !items[i].Price.Equal(order.Items[i].Price) || items[i].Currency != order.Items[i].Currency {
			return nil, domain.ErrOrderConflict
		}
	}
	order.Status = domain.StatusConfirmed
	order.UpdatedAt = time.Now()
	if err := s.orderRepo.UpdatePending(ctx, order, time.Now().Add(-s.pendingOrderLifetime)); err != nil {
		return nil, err
	}
	return order, nil
}

func (s *OrderService) FulfillOrder(ctx context.Context, id, actorID string) (*domain.Order, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if order.Status != domain.StatusConfirmed {
		return nil, fmt.Errorf("%w: order is not confirmed", domain.ErrInvalidInput)
	}
	order.Status = domain.StatusFulfilled
	now := time.Now()
	order.UpdatedAt, order.FulfilledAt, order.ModeratedAt, order.ModeratedBy = now, &now, &now, &actorID
	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}
	return order, nil
}

func (s *OrderService) CancelOrder(ctx context.Context, id, actorID string, staff bool, reason *string) (*domain.Order, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !staff && !order.BelongsTo(actorID) {
		return nil, domain.ErrForbidden
	}
	if order.Status != domain.StatusPending && order.Status != domain.StatusConfirmed {
		return nil, fmt.Errorf("%w: order cannot be cancelled", domain.ErrInvalidInput)
	}
	now := time.Now()
	order.Status, order.CancelledAt, order.CancelledBy, order.UpdatedAt = domain.StatusCancelled, &now, &actorID, now
	order.CancellationReason = reason
	if staff {
		order.ModeratedAt, order.ModeratedBy = &now, &actorID
	}
	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}
	return order, nil
}

func (s *OrderService) processOrderItems(ctx context.Context, items []domain.OrderItem, requestedCurrency string) ([]domain.OrderItem, decimal.Decimal, decimal.Decimal, string, *string, time.Time, error) {
	// Batch-load all products in a single query.
	productIDs := make([]string, len(items))
	for i, item := range items {
		productIDs[i] = item.ProductID
	}

	products, err := s.productRepo.GetByIDs(ctx, productIDs)
	if err != nil {
		return nil, decimal.Decimal{}, decimal.Decimal{}, "", nil, time.Time{}, fmt.Errorf("failed to load products: %w", err)
	}

	var baseTotal decimal.Decimal
	currency := strings.ToUpper(requestedCurrency)

	for i := range items {
		item := items[i]
		product, ok := products[item.ProductID]
		if !ok {
			return nil, decimal.Decimal{}, decimal.Decimal{}, "", nil, time.Time{}, fmt.Errorf("product %s: %w", item.ProductID, domain.ErrNotFound)
		}

		if !product.IsActive {
			return nil, decimal.Decimal{}, decimal.Decimal{}, "", nil, time.Time{}, fmt.Errorf("%w: product is inactive: %s", domain.ErrInvalidInput, product.Name)
		}
		if err := product.ValidateOrderDate(item.Date); err != nil {
			return nil, decimal.Decimal{}, decimal.Decimal{}, "", nil, time.Time{}, err
		}

		baseTotal = baseTotal.Add(product.Price.Mul(decimal.NewFromInt(int64(item.Quantity))))
		items[i].Price = product.Price
	}
	now := time.Now()
	rate := decimal.NewFromInt(1)
	var rateID *string
	quotedAt := now
	if s.currencySvc != nil {
		id, r, effective, err := s.currencySvc.Quote(ctx, currency, now)
		if err != nil {
			return nil, decimal.Decimal{}, decimal.Decimal{}, "", nil, time.Time{}, err
		}
		rate = r
		quotedAt = effective
		if id != "" {
			rateID = &id
		}
	}
	total := baseTotal.Mul(rate)
	for i := range items {
		items[i].Price = items[i].Price.Mul(rate)
		items[i].Currency = currency
	}
	return items, total, baseTotal, currency, rateID, quotedAt, nil
}

func isStaff(role domain.Role) bool {
	return role == domain.RoleManager || role == domain.RoleAdmin
}
