package admin

import (
	"context"
	"encoding/json"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

// Service defines administrative operations across system resources and accounts.
type Service interface {
	Get(ctx context.Context, kind, id string) (json.RawMessage, error)
	List(ctx context.Context, kind string, filters map[string]any, limit, offset int) ([]json.RawMessage, int, error)
	Create(ctx context.Context, kind string, fields map[string]json.RawMessage) (json.RawMessage, error)
	Update(ctx context.Context, kind, id string, fields map[string]json.RawMessage) (json.RawMessage, error)
	DeleteImage(ctx context.Context, kind, parentID, imageID string) error
	CreateStaff(ctx context.Context, email, password string, role domain.Role) (json.RawMessage, error)
	UpdateRole(ctx context.Context, id, actorID string, role domain.Role) (json.RawMessage, error)
}
