package counterparty

import (
	"net/http"
	"strconv"

	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
)

type CounterpartyHandler struct {
	service      CounterpartyService
	defaultLimit int
	maxLimit     int
	logger       *zap.Logger
}

func NewCounterpartyHandler(service CounterpartyService, defaultLimit, maxLimit int, logger *zap.Logger) *CounterpartyHandler {
	return &CounterpartyHandler{
		service:      service,
		defaultLimit: defaultLimit,
		maxLimit:     maxLimit,
		logger:       logger,
	}
}

// ListCounterparties godoc
// @Summary      List counterparties
// @Description  List counterparties, optionally filtered by location. Available to managers and administrators.
// @Tags Admin: Counterparties
// @Produce      json
// @Security     BearerAuth
// @Param        location_id query int false "Location ID"
// @Param        limit query int false "Maximum results"
// @Param        offset query int false "Number of results to skip"
// @Success      200 {object} handler.Response{data=[]CounterpartyResponse,meta=handler.Meta}
// @Failure      400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      403 {object} handler.Response{error=handler.ErrorInfo}
// @Router       /admin/counterparties [get]
func (h *CounterpartyHandler) ListCounterparties(w http.ResponseWriter, r *http.Request) {
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)

	var locationID *int
	if raw := r.URL.Query().Get("location_id"); raw != "" {
		id, err := strconv.Atoi(raw)
		if err != nil || id <= 0 {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "location_id must be a positive integer")
			return
		}
		locationID = &id
	}

	counterparties, total, err := h.service.ListCounterparties(r.Context(), locationID, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to list counterparties", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, toCounterpartiesResponse(counterparties), &handlers.Meta{
		Limit:  limit,
		Offset: offset,
		Total:  total,
	})
}

func toCounterpartyResponse(c domain.Counterparty) CounterpartyResponse {
	return CounterpartyResponse{ID: c.ID, Name: c.Name, LocationID: c.LocationID}
}

func toCounterpartiesResponse(items []domain.Counterparty) []CounterpartyResponse {
	result := make([]CounterpartyResponse, 0, len(items))
	for _, c := range items {
		result = append(result, toCounterpartyResponse(c))
	}
	return result
}
