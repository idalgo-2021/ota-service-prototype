package hotelieradmin

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type Service interface {
	AdminListingIDs(context.Context, string) ([]string, error)
	AdminListingAssignments(context.Context, string) ([]domain.HotelierListingAssignment, error)
	SetAdminListingIDs(context.Context, string, []string) ([]string, error)
	CreateIncomingMessage(context.Context, domain.HotelierMessage) (*domain.HotelierMessage, error)
}
