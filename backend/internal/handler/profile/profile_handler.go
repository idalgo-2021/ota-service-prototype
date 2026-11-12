package profile

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"io"
	"net/http"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
	"go.uber.org/zap"
)

type ProfileHandler struct {
	service      ProfileService
	defaultLimit int
	maxLimit     int
	logger       *zap.Logger
}

func NewProfileHandler(service ProfileService, defaultLimit, maxLimit int, logger *zap.Logger) *ProfileHandler {
	return &ProfileHandler{service: service, defaultLimit: defaultLimit, maxLimit: maxLimit, logger: logger}
}

// GetMine godoc
// @Summary Get current user's profile
// @Description Returns search_preferences only when the user has saved a complete search settings object.
// @Tags Client: Profile
// @Produce json
// @Security BearerAuth
// @Success 200 {object} handler.Response{data=domain.Profile}
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 404 {object} handler.Response{error=handler.ErrorInfo}
// @Router /profile [get]
func (h *ProfileHandler) GetMine(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	p, err := h.service.Get(r.Context(), userID)
	if err != nil {
		handlers.HandleError(w, h.logger, "get profile", err)
		return
	}
	handlers.Success(w, http.StatusOK, p)
}

// UpdateMine godoc
// @Summary Update current user's profile
// @Description Only supplied profile fields are updated. gender accepts male, female or other. nationality is a free text ethnicity (up to 100 characters); blank text or null clears it. Omit search_preferences to leave it unchanged; send a complete version 1 object to replace it or null to clear it.
// @Tags Client: Profile
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param input body UpdateProfileRequest true "Fields to update"
// @Success 200 {object} handler.Response{data=domain.Profile}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 404 {object} handler.Response{error=handler.ErrorInfo}
// @Router /profile [patch]
func (h *ProfileHandler) UpdateMine(w http.ResponseWriter, r *http.Request) {
	var patch domain.ProfilePatch
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&patch); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid profile fields")
		return
	}
	// Reject trailing JSON values as well.
	var extra any
	if decoder.Decode(&extra) != io.EOF {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}
	userID, _ := middleware.GetUserID(r.Context())
	p, err := h.service.Update(r.Context(), userID, patch)
	if err != nil {
		handlers.HandleError(w, h.logger, "update profile", err)
		return
	}
	handlers.Success(w, http.StatusOK, p)
}

// ListClients godoc
// @Summary List client profiles
// @Tags Admin: Users & Profiles
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Maximum results"
// @Param offset query int false "Number of results to skip"
// @Success 200 {object} handler.Response{data=[]ClientProfileResponse,meta=handler.Meta}
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 403 {object} handler.Response{error=handler.ErrorInfo}
// @Router /admin/client-profiles [get]
func (h *ProfileHandler) ListClients(w http.ResponseWriter, r *http.Request) {
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	items, total, err := h.service.ListClients(r.Context(), limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "list client profiles", err)
		return
	}
	response := make([]ClientProfileResponse, 0, len(items))
	for _, item := range items {
		response = append(response, toClientProfileResponse(item))
	}
	handlers.SuccessWithMeta(w, http.StatusOK, response, &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

type clientAdminService interface {
	GetClient(ctx context.Context, userID string) (*domain.Profile, error)
	UpdateClient(ctx context.Context, userID string, patch domain.ProfilePatch) (*domain.Profile, error)
}

// GetClient godoc
// @Summary Get one client profile (staff)
// @Tags Admin: Users & Profiles
// @Produce json
// @Security BearerAuth
// @Param user_id path string true "Client UUID"
// @Success 200 {object} handler.Response{data=ClientProfileResponse}
// @Router /admin/client-profiles/{user_id} [get]
func (h *ProfileHandler) GetClient(w http.ResponseWriter, r *http.Request) {
	adminService, ok := h.service.(clientAdminService)
	if !ok {
		handlers.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Client profile service unavailable")
		return
	}
	id := mux.Vars(r)["user_id"]
	if _, err := uuid.Parse(id); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid user ID")
		return
	}
	p, err := adminService.GetClient(r.Context(), id)
	if err != nil {
		handlers.HandleError(w, h.logger, "get client profile", err)
		return
	}
	handlers.Success(w, http.StatusOK, toClientProfileResponse(*p))
}

// UpdateClient godoc
// @Summary Update one client profile (staff)
// @Description Staff may update ordinary profile fields, including optional gender and nationality, but not search_preferences, email or role. Blank nationality or null clears it.
// @Tags Admin: Users & Profiles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param user_id path string true "Client UUID"
// @Param input body StaffUpdateProfileRequest true "Editable profile fields"
// @Success 200 {object} handler.Response{data=ClientProfileResponse}
// @Router /admin/client-profiles/{user_id} [patch]
func (h *ProfileHandler) UpdateClient(w http.ResponseWriter, r *http.Request) {
	adminService, ok := h.service.(clientAdminService)
	if !ok {
		handlers.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Client profile service unavailable")
		return
	}
	id := mux.Vars(r)["user_id"]
	if _, err := uuid.Parse(id); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid user ID")
		return
	}
	var patch domain.ProfilePatch
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&patch); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid profile fields")
		return
	}
	var extra any
	if decoder.Decode(&extra) != io.EOF || patch.SearchPreferences.Set {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}
	p, err := adminService.UpdateClient(r.Context(), id, patch)
	if err != nil {
		handlers.HandleError(w, h.logger, "update client profile", err)
		return
	}
	handlers.Success(w, http.StatusOK, toClientProfileResponse(*p))
}
