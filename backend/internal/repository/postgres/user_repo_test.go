package postgres

import (
	"errors"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type userScanRow struct {
	values []any
}

func (r userScanRow) Scan(dest ...any) error {
	if len(dest) != len(r.values) {
		return errors.New("unexpected number of scan destinations")
	}

	for i, value := range r.values {
		switch target := dest[i].(type) {
		case *string:
			v, ok := value.(string)
			if !ok {
				return errors.New("unexpected value type for string destination")
			}
			*target = v
		case *domain.Role:
			v, ok := value.(domain.Role)
			if !ok {
				return errors.New("unexpected value type for role destination")
			}
			*target = v
		case *time.Time:
			v, ok := value.(time.Time)
			if !ok {
				return errors.New("unexpected value type for time destination")
			}
			*target = v
		default:
			return errors.New("unexpected scan destination")
		}
	}
	return nil
}

func TestScanUserIncludesRole(t *testing.T) {
	createdAt := time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)
	updatedAt := createdAt.Add(time.Hour)
	row := userScanRow{values: []any{
		"user-123",
		"admin@example.com",
		"bcrypt-hash",
		domain.RoleAdmin,
		createdAt,
		updatedAt,
	}}

	user, err := scanUser(row)
	if err != nil {
		t.Fatalf("scan user: %v", err)
	}

	if user.ID != "user-123" {
		t.Errorf("ID = %q, want %q", user.ID, "user-123")
	}
	if user.Role != domain.RoleAdmin {
		t.Errorf("role = %q, want %q", user.Role, domain.RoleAdmin)
	}
	if user.CreatedAt != createdAt || user.UpdatedAt != updatedAt {
		t.Errorf("timestamps were not scanned correctly: created_at=%v updated_at=%v", user.CreatedAt, user.UpdatedAt)
	}
}
