package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
	"go.uber.org/zap"
)

type mockAdminService struct {
	getFn         func(ctx context.Context, kind, id string) (json.RawMessage, error)
	listFn        func(ctx context.Context, kind string, filters map[string]any, limit, offset int) ([]json.RawMessage, int, error)
	createFn      func(ctx context.Context, kind string, fields map[string]json.RawMessage) (json.RawMessage, error)
	updateFn      func(ctx context.Context, kind, id string, fields map[string]json.RawMessage) (json.RawMessage, error)
	deleteImageFn func(ctx context.Context, kind, parentID, imageID string) error
	createStaffFn func(ctx context.Context, email, password string, role domain.Role) (json.RawMessage, error)
	updateRoleFn  func(ctx context.Context, id, actorID string, role domain.Role) (json.RawMessage, error)
}

func (m *mockAdminService) Get(ctx context.Context, kind, id string) (json.RawMessage, error) {
	if m.getFn != nil {
		return m.getFn(ctx, kind, id)
	}
	return json.RawMessage(`{"id":"` + id + `"}`), nil
}

func (m *mockAdminService) List(ctx context.Context, kind string, filters map[string]any, limit, offset int) ([]json.RawMessage, int, error) {
	if m.listFn != nil {
		return m.listFn(ctx, kind, filters, limit, offset)
	}
	return []json.RawMessage{}, 0, nil
}

func (m *mockAdminService) Create(ctx context.Context, kind string, fields map[string]json.RawMessage) (json.RawMessage, error) {
	if m.createFn != nil {
		return m.createFn(ctx, kind, fields)
	}
	return json.RawMessage(`{"id":"new"}`), nil
}

func (m *mockAdminService) Update(ctx context.Context, kind, id string, fields map[string]json.RawMessage) (json.RawMessage, error) {
	if m.updateFn != nil {
		return m.updateFn(ctx, kind, id, fields)
	}
	return json.RawMessage(`{"id":"` + id + `"}`), nil
}

func (m *mockAdminService) DeleteImage(ctx context.Context, kind, parentID, imageID string) error {
	if m.deleteImageFn != nil {
		return m.deleteImageFn(ctx, kind, parentID, imageID)
	}
	return nil
}

func (m *mockAdminService) CreateStaff(ctx context.Context, email, password string, role domain.Role) (json.RawMessage, error) {
	if m.createStaffFn != nil {
		return m.createStaffFn(ctx, email, password, role)
	}
	return json.RawMessage(`{"email":"` + email + `","role":"` + string(role) + `"}`), nil
}

func (m *mockAdminService) UpdateRole(ctx context.Context, id, actorID string, role domain.Role) (json.RawMessage, error) {
	if m.updateRoleFn != nil {
		return m.updateRoleFn(ctx, id, actorID, role)
	}
	return json.RawMessage(`{"id":"` + id + `","role":"` + string(role) + `"}`), nil
}

func TestHandler_CreateStaff(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		svc := &mockAdminService{
			createStaffFn: func(_ context.Context, email, password string, role domain.Role) (json.RawMessage, error) {
				if email != "staff@example.com" || role != domain.RoleManager {
					t.Errorf("unexpected args: email=%s role=%s", email, role)
				}
				return json.RawMessage(`{"id":"u1","role":"manager"}`), nil
			},
		}
		h := NewHandler(svc, 20, 100, zap.NewNop())

		body := `{"email":"staff@example.com","password":"secretpassword","role":"manager"}`
		req := httptest.NewRequest(http.MethodPost, "/admin/users", bytes.NewBufferString(body))
		rec := httptest.NewRecorder()

		h.CreateStaff(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("expected status %d, got %d. body=%s", http.StatusCreated, rec.Code, rec.Body.String())
		}
	})

	t.Run("invalid unknown fields", func(t *testing.T) {
		svc := &mockAdminService{}
		h := NewHandler(svc, 20, 100, zap.NewNop())

		body := `{"email":"staff@example.com","password":"secret","role":"manager","unknown":"value"}`
		req := httptest.NewRequest(http.MethodPost, "/admin/users", bytes.NewBufferString(body))
		rec := httptest.NewRecorder()

		h.CreateStaff(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
		}
	})
}

func TestHandler_UpdateRole(t *testing.T) {
	targetID := uuid.New().String()

	t.Run("success", func(t *testing.T) {
		svc := &mockAdminService{
			updateRoleFn: func(_ context.Context, id, actorID string, role domain.Role) (json.RawMessage, error) {
				if id != targetID || actorID != "admin-1" || role != domain.RoleManager {
					t.Errorf("unexpected args: id=%s actor=%s role=%s", id, actorID, role)
				}
				return json.RawMessage(`{"id":"` + id + `","role":"manager"}`), nil
			},
		}
		h := NewHandler(svc, 20, 100, zap.NewNop())

		req := httptest.NewRequest(http.MethodPatch, "/admin/users/"+targetID, bytes.NewBufferString(`{"role":"manager"}`))
		req = mux.SetURLVars(req, map[string]string{"id": targetID})
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "admin-1")
		req = req.WithContext(ctx)

		rec := httptest.NewRecorder()
		h.UpdateRole(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d. body=%s", http.StatusOK, rec.Code, rec.Body.String())
		}
	})

	t.Run("invalid multiple fields", func(t *testing.T) {
		svc := &mockAdminService{}
		h := NewHandler(svc, 20, 100, zap.NewNop())

		req := httptest.NewRequest(http.MethodPatch, "/admin/users/"+targetID, bytes.NewBufferString(`{"role":"manager","extra":"bad"}`))
		req = mux.SetURLVars(req, map[string]string{"id": targetID})
		rec := httptest.NewRecorder()
		h.UpdateRole(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
		}
	})
}

func TestHandler_List_Validation(t *testing.T) {
	svc := &mockAdminService{}
	h := NewHandler(svc, 20, 100, zap.NewNop())

	t.Run("invalid sort_order", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/listings?sort_order=invalid", nil)
		rec := httptest.NewRecorder()

		h.List("listings")(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
		}
	})

	t.Run("invalid user role filter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/users?role=superhacker", nil)
		rec := httptest.NewRecorder()

		h.List("users")(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
		}
	})

	t.Run("valid filters success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/listings?sort_by=created_at&sort_order=desc&is_active=true", nil)
		rec := httptest.NewRecorder()

		h.List("listings")(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
		}
	})
}

func TestHandler_PathID_Validation(t *testing.T) {
	svc := &mockAdminService{}
	h := NewHandler(svc, 20, 100, zap.NewNop())

	t.Run("invalid numeric country id", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/countries/abc", nil)
		req = mux.SetURLVars(req, map[string]string{"id": "abc"})
		rec := httptest.NewRecorder()

		h.Get("countries")(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
		}
	})

	t.Run("invalid currency code", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/currencies/usdd", nil)
		req = mux.SetURLVars(req, map[string]string{"id": "usdd"})
		rec := httptest.NewRecorder()

		h.Get("currencies")(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
		}
	})

	t.Run("invalid uuid for listing", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/listings/not-a-uuid", nil)
		req = mux.SetURLVars(req, map[string]string{"id": "not-a-uuid"})
		rec := httptest.NewRecorder()

		h.Get("listings")(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
		}
	})
}

func TestHandler_UnitBelongs(t *testing.T) {
	listingID := uuid.New().String()
	unitID := uuid.New().String()

	t.Run("unit belongs to different listing", func(t *testing.T) {
		svc := &mockAdminService{
			getFn: func(_ context.Context, kind, id string) (json.RawMessage, error) {
				if kind == "listing_units" && id == unitID {
					return json.RawMessage(`{"listing_id":"different-listing-id"}`), nil
				}
				return nil, errors.New("not found")
			},
		}
		h := NewHandler(svc, 20, 100, zap.NewNop())

		req := httptest.NewRequest(http.MethodGet, "/admin/listings/"+listingID+"/units/"+unitID, nil)
		req = mux.SetURLVars(req, map[string]string{
			"id":      listingID,
			"unit_id": unitID,
		})
		rec := httptest.NewRecorder()

		h.Unit(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected status %d, got %d", http.StatusNotFound, rec.Code)
		}
	})
}
