package order

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type OrderService interface {
	GetOrder(ctx context.Context, id, userID string, role domain.Role) (*domain.Order, error)
	ListOrders(ctx context.Context, userID string, role domain.Role, sort domain.Sort, statuses []domain.OrderStatus, limit, offset int) ([]domain.Order, int, error)
	ListAdminOrders(ctx context.Context, filter domain.OrderFilter, limit, offset int) ([]domain.Order, int, error)
	CreateOrder(ctx context.Context, userID, currency string, bookingID *string, items []domain.OrderItem) (*domain.Order, error)
	LinkBooking(ctx context.Context, id, userID string, bookingID *string) (*domain.Order, error)
	UpdateOrder(ctx context.Context, id, userID string, role domain.Role, input domain.UpdateOrderInput) (*domain.Order, error)
	ConfirmOrder(ctx context.Context, id, userID string) (*domain.Order, error)
	FulfillOrder(ctx context.Context, id, actorID string) (*domain.Order, error)
	CancelOrder(ctx context.Context, id, actorID string, staff bool, reason *string) (*domain.Order, error)
}
