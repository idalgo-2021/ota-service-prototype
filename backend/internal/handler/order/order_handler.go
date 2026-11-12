package order

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
)

type OrderHandler struct {
	service      OrderService
	defaultLimit int
	maxLimit     int
	logger       *zap.Logger
}

func NewOrderHandler(service OrderService, defaultLimit, maxLimit int, logger *zap.Logger) *OrderHandler {
	return &OrderHandler{
		service:      service,
		defaultLimit: defaultLimit,
		maxLimit:     maxLimit,
		logger:       logger,
	}
}

type OrderItemRequest struct {
	ProductID string  `json:"product_id" binding:"required"`
	Quantity  int     `json:"quantity" binding:"required" minimum:"1"`
	Date      *string `json:"date,omitempty" example:"2026-11-17"` // Optional; for tours, must match the product's schedule.
}

type CreateOrderRequest struct {
	Items     []OrderItemRequest `json:"items" binding:"required" min:"1"`
	Currency  string             `json:"currency" binding:"required" example:"RUB"`
	BookingID *string            `json:"booking_id,omitempty"`
}

type UpdateOrderRequest struct {
	Items *[]OrderItemRequest `json:"items,omitempty"`
}

type LinkBookingRequest struct {
	BookingID *string `json:"booking_id"`
}

type CancelOrderRequest struct {
	Reason *string `json:"reason,omitempty" example:"Plans changed"`
}

type AdminCancelOrderRequest struct {
	Reason string `json:"reason" example:"Client request" binding:"required"`
}

func decodeCancelOrderAction(r *http.Request, requireReason bool) (*string, error) {
	var req CancelOrderRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		if errors.Is(err, io.EOF) && !requireReason {
			return nil, nil
		}
		return nil, err
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return nil, fmt.Errorf("request body must contain exactly one JSON object")
	}
	if req.Reason == nil {
		if requireReason {
			return nil, fmt.Errorf("reason is required")
		}
		return nil, nil
	}
	reason := strings.TrimSpace(*req.Reason)
	if reason == "" {
		if requireReason {
			return nil, fmt.Errorf("reason is required")
		}
		return nil, nil
	}
	return &reason, nil
}

// ListOrders godoc
// @Summary      List orders
// @Description  Get a paginated list of the current user's orders, newest first. Client-side sorting parameters are not supported. Invalid limit values use the configured default; limits are clamped to the configured maximum. Negative or invalid offsets are treated as zero.
// @Tags Client: Orders
// @Accept       json
// @Produce      json
// @Param        limit query int false "Maximum results; default and maximum are configured by the server."
// @Param        offset query int false "Number of results to skip; invalid or negative values are treated as zero."
// @Param        status query []string false "Order statuses; repeat parameter or use comma separation"
// @Success      200  {object}  handler.Response{data=[]OrderResponse,meta=handler.Meta}
// @Failure      400  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      401  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Security     BearerAuth
// @Router       /orders [get]
func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	h.listOrders(w, r, domain.RoleUser)
}

// ListAdminOrders godoc
// @Summary      List all orders (staff)
// @Description  Date filters use YYYY-MM-DD in UTC, inclusive on both ends. An order matches location or counterparty when at least one item has a matching product. Moderator is the employee who fulfilled or cancelled the order.
// @Tags Admin: Orders
// @Produce      json
// @Param        limit query int false "Maximum results"
// @Param        offset query int false "Number of results to skip"
// @Param        created_from query string false "Created on or after this date (UTC)"
// @Param        created_to query string false "Created on or before this date (UTC)"
// @Param        fulfilled_from query string false "Fulfilled on or after this date (UTC)"
// @Param        fulfilled_to query string false "Fulfilled on or before this date (UTC)"
// @Param        status query []string false "Order statuses; repeat parameter or use comma separation"
// @Param        client_id query string false "Client UUID"
// @Param        moderator_id query string false "Employee UUID"
// @Param        location_id query int false "Product location ID"
// @Param        counterparty_id query string false "Product counterparty UUID"
// @Param        sort_by query string false "Sort field: created_at or fulfilled_at (default created_at)" Enums(created_at,fulfilled_at)
// @Param        sort_order query string false "Sort direction: asc or desc (default desc); unfulfilled orders are last when sorting by fulfilled_at" Enums(asc,desc)
// @Success      200 {object} handler.Response{data=[]OrderResponse,meta=handler.Meta}
// @Failure      400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      403 {object} handler.Response{error=handler.ErrorInfo}
// @Security     BearerAuth
// @Router       /admin/orders [get]
func (h *OrderHandler) ListAdminOrders(w http.ResponseWriter, r *http.Request) {
	filter, err := parseAdminOrderFilter(r)
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_FILTER", err.Error())
		return
	}
	filter.Sort, err = handlers.ParseSort(r, "created_at", "created_at", "fulfilled_at")
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_FILTER", err.Error())
		return
	}
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	orders, total, err := h.service.ListAdminOrders(r.Context(), filter, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to list orders", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, toOrdersResponse(orders), &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

func parseAdminOrderFilter(r *http.Request) (domain.OrderFilter, error) {
	q := r.URL.Query()
	var f domain.OrderFilter
	parseDate := func(key string, inclusiveEnd bool) (*time.Time, error) {
		value := q.Get(key)
		if value == "" {
			return nil, nil
		}
		date, err := time.Parse("2006-01-02", value)
		if err != nil {
			return nil, fmt.Errorf("%s must use YYYY-MM-DD", key)
		}
		if inclusiveEnd {
			date = date.AddDate(0, 0, 1)
		}
		return &date, nil
	}
	var err error
	if f.CreatedFrom, err = parseDate("created_from", false); err != nil {
		return f, err
	}
	if f.CreatedTo, err = parseDate("created_to", true); err != nil {
		return f, err
	}
	if f.FulfilledFrom, err = parseDate("fulfilled_from", false); err != nil {
		return f, err
	}
	if f.FulfilledTo, err = parseDate("fulfilled_to", true); err != nil {
		return f, err
	}
	if f.CreatedFrom != nil && f.CreatedTo != nil && !f.CreatedFrom.Before(*f.CreatedTo) {
		return f, fmt.Errorf("created_from must not be after created_to")
	}
	if f.FulfilledFrom != nil && f.FulfilledTo != nil && !f.FulfilledFrom.Before(*f.FulfilledTo) {
		return f, fmt.Errorf("fulfilled_from must not be after fulfilled_to")
	}
	for _, raw := range q["status"] {
		for _, value := range strings.Split(raw, ",") {
			status := domain.OrderStatus(strings.TrimSpace(value))
			if !status.IsValid() {
				return f, fmt.Errorf("invalid status %q", value)
			}
			f.Statuses = append(f.Statuses, status)
		}
	}
	parseUUID := func(key string) (*string, error) {
		value := q.Get(key)
		if value == "" {
			return nil, nil
		}
		id, err := uuid.Parse(value)
		if err != nil {
			return nil, fmt.Errorf("%s must be a UUID", key)
		}
		canonical := id.String()
		return &canonical, nil
	}
	if f.ClientID, err = parseUUID("client_id"); err != nil {
		return f, err
	}
	if f.ModeratorID, err = parseUUID("moderator_id"); err != nil {
		return f, err
	}
	if f.CounterpartyID, err = parseUUID("counterparty_id"); err != nil {
		return f, err
	}
	if value := q.Get("location_id"); value != "" {
		id, err := strconv.Atoi(value)
		if err != nil || id <= 0 {
			return f, fmt.Errorf("location_id must be a positive integer")
		}
		f.LocationID = &id
	}
	return f, nil
}

func (h *OrderHandler) listOrders(w http.ResponseWriter, r *http.Request, scope domain.Role) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	q := r.URL.Query()
	var statuses []domain.OrderStatus
	for _, raw := range q["status"] {
		for _, value := range strings.Split(raw, ",") {
			status := domain.OrderStatus(strings.TrimSpace(value))
			if !status.IsValid() {
				handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid order status")
				return
			}
			statuses = append(statuses, status)
		}
	}
	if q.Get("sort_by") != "" || q.Get("sort_order") != "" {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "client order sorting is not supported")
		return
	}
	sort := domain.Sort{By: "created_at", Order: "desc"}

	orders, total, err := h.service.ListOrders(r.Context(), userID, scope, sort, statuses, limit, offset)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to list orders", err)
		return
	}

	ordersDTO := toOrdersResponse(orders)

	handlers.SuccessWithMeta(w, http.StatusOK, ordersDTO, &handlers.Meta{
		Limit:  limit,
		Offset: offset,
		Total:  total,
	})
}

func toOrdersResponse(orders []domain.Order) []OrderResponse {
	if len(orders) == 0 {
		return []OrderResponse{}
	}

	result := make([]OrderResponse, 0, len(orders))

	for _, o := range orders {
		result = append(result, toOrderResponse(&o))
	}

	return result
}

// GetOrder godoc
// @Summary      Get an order by ID
// @Description  Get detailed information about a specific order
// @Tags Client: Orders
// @Accept       json
// @Produce      json
// @Param        order_id path string true "Order ID"
// @Success      200  {object}  handler.Response{data=OrderResponse}
// @Failure      401  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      403  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      404  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Security     BearerAuth
// @Router       /orders/{order_id} [get]
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	h.getOrder(w, r, domain.RoleUser)
}

// GetAdminOrder godoc
// @Summary      Get any order (staff)
// @Tags Admin: Orders
// @Produce      json
// @Param        order_id path string true "Order ID"
// @Success      200 {object} handler.Response{data=OrderResponse}
// @Failure      401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      403 {object} handler.Response{error=handler.ErrorInfo}
// @Security     BearerAuth
// @Router       /admin/orders/{order_id} [get]
func (h *OrderHandler) GetAdminOrder(w http.ResponseWriter, r *http.Request) {
	h.getOrder(w, r, domain.RoleManager)
}

func (h *OrderHandler) getOrder(w http.ResponseWriter, r *http.Request, scope domain.Role) {
	vars := mux.Vars(r)
	id := vars["order_id"]

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}
	order, err := h.service.GetOrder(r.Context(), id, userID, scope)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to get order", err)
		return
	}

	orderDTO := toOrderResponse(order)

	handlers.Success(w, http.StatusOK, orderDTO)
}

func toOrderResponse(o *domain.Order) OrderResponse {
	items := make([]OrderItemResponse, 0, len(o.Items))

	for _, item := range o.Items {
		items = append(items, OrderItemResponse{
			ProductID:           item.ProductID,
			ProductName:         item.ProductName,
			ProductNameRU:       item.ProductNameRU,
			ProductThumbnailURL: item.ProductThumbnailURL,
			Quantity:            item.Quantity,
			Price:               item.Price,
			Currency:            item.Currency,
			Date:                item.Date,
		})
	}

	return OrderResponse{
		ID:                 o.ID,
		UserID:             o.UserID,
		BookingID:          o.BookingID,
		ClientName:         o.ClientName,
		ClientEmail:        o.ClientEmail,
		Status:             string(o.Status),
		Total:              o.Total,
		Currency:           o.Currency,
		BaseTotal:          o.BaseTotal,
		RateID:             o.RateID,
		QuotedAt:           o.QuotedAt,
		CreatedAt:          o.CreatedAt,
		UpdatedAt:          o.UpdatedAt,
		CancelledAt:        o.CancelledAt,
		CancelledBy:        o.CancelledBy,
		CancellationReason: o.CancellationReason,
		FulfilledAt:        o.FulfilledAt,
		ModeratedAt:        o.ModeratedAt,
		ModeratedBy:        o.ModeratedBy,
		Items:              items,
	}
}

// CreateOrder godoc
// @Summary      Create a new order
// @Description  Create an order in the required currency. The selected currency and exchange rate are fixed on the order.
// @Tags Client: Orders
// @Accept       json
// @Produce      json
// @Param        input body CreateOrderRequest true "Order details"
// @Success      201  {object}  handler.Response{data=CreateOrderResponse}
// @Failure      400  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      401  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      404  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Security     BearerAuth
// @Router       /orders [post]
func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	domainItems := make([]domain.OrderItem, len(req.Items))
	for i, item := range req.Items {
		domainItems[i] = domain.OrderItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			Date:      item.Date,
		}
	}

	if req.BookingID != nil {
		id, parseErr := uuid.Parse(*req.BookingID)
		if parseErr != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "booking_id must be a UUID")
			return
		}
		canonical := id.String()
		req.BookingID = &canonical
	}
	order, err := h.service.CreateOrder(r.Context(), userID, req.Currency, req.BookingID, domainItems)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to create order", err)
		return
	}

	// Отдельный маппер и отдельная DTO
	orderDTO := toCreateOrderResponse(order)

	handlers.Success(w, http.StatusCreated, orderDTO)
}

func toCreateOrderResponse(o *domain.Order) CreateOrderResponse {
	items := make([]OrderItemResponse, 0, len(o.Items))

	for _, item := range o.Items {
		items = append(items, OrderItemResponse{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			Price:     item.Price,
			Currency:  item.Currency,
			Date:      item.Date,
		})
	}

	return CreateOrderResponse{
		ID:        o.ID,
		BookingID: o.BookingID,
		Status:    string(o.Status),
		Total:     o.Total,
		Currency:  o.Currency,
		BaseTotal: o.BaseTotal,
		RateID:    o.RateID,
		QuotedAt:  o.QuotedAt,
		Items:     items,
		CreatedAt: o.CreatedAt,
	}
}

// LinkBooking godoc
// @Summary      Set or clear an order's booking link
// @Description  Changes only the optional informational relation; order items, total and status stay unchanged.
// @Tags Client: Orders
// @Accept       json
// @Produce      json
// @Param        order_id path string true "Order ID"
// @Param        input body LinkBookingRequest true "Booking ID or null"
// @Success      200 {object} handler.Response{data=OrderResponse}
// @Failure      400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      403 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      404 {object} handler.Response{error=handler.ErrorInfo}
// @Security     BearerAuth
// @Router       /orders/{order_id}/booking [patch]
// LinkBooking sets or clears the optional informational booking link.
func (h *OrderHandler) LinkBooking(w http.ResponseWriter, r *http.Request) {
	var req LinkBookingRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}
	if req.BookingID != nil {
		id, err := uuid.Parse(*req.BookingID)
		if err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "booking_id must be a UUID or null")
			return
		}
		canonical := id.String()
		req.BookingID = &canonical
	}
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}
	linked, err := h.service.LinkBooking(r.Context(), mux.Vars(r)["order_id"], userID, req.BookingID)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to link booking", err)
		return
	}
	handlers.Success(w, http.StatusOK, toOrderResponse(linked))
}

// UpdateOrder godoc
// @Summary      Update an order
// @Description  Change items of a pending order
// @Tags Client: Orders
// @Accept       json
// @Produce      json
// @Param        order_id path string true "Order ID"
// @Param        input body UpdateOrderRequest true "Order update details"
// @Success      200  {object}  handler.Response{data=OrderResponse}
// @Failure      400  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      401  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      403  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      404  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Security     BearerAuth
// @Router       /orders/{order_id} [patch]
func (h *OrderHandler) UpdateOrder(w http.ResponseWriter, r *http.Request) {
	h.updateOrder(w, r, domain.RoleUser)
}

func (h *OrderHandler) updateOrder(w http.ResponseWriter, r *http.Request, scope domain.Role) {
	vars := mux.Vars(r)
	id := vars["order_id"]

	var req UpdateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	input := domain.UpdateOrderInput{}
	if req.Items != nil {
		domainItems := make([]domain.OrderItem, len(*req.Items))
		for i, item := range *req.Items {
			domainItems[i] = domain.OrderItem{
				ProductID: item.ProductID,
				Quantity:  item.Quantity,
				Date:      item.Date,
			}
		}
		input.Items = &domainItems
	}
	if req.Items == nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "items are required")
		return
	}

	order, err := h.service.UpdateOrder(r.Context(), id, userID, scope, input)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to update order", err)
		return
	}

	orderDTO := toOrderResponse(order)

	handlers.Success(w, http.StatusOK, orderDTO)
}

// ConfirmOrder godoc
// @Summary Confirm a pending order
// @Tags Client: Orders
// @Produce json
// @Param order_id path string true "Order ID"
// @Success 200 {object} handler.Response{data=OrderResponse}
// @Failure 409 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /orders/{order_id}/confirm [patch]
func (h *OrderHandler) ConfirmOrder(w http.ResponseWriter, r *http.Request) {
	if err := handlers.RequireEmptyActionBody(r); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}
	order, err := h.service.ConfirmOrder(r.Context(), mux.Vars(r)["order_id"], userID)
	if errors.Is(err, domain.ErrOrderConflict) {
		handlers.Error(w, http.StatusConflict, "ORDER_STALE", "Update the pending order before confirming")
		return
	}
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to confirm order", err)
		return
	}
	handlers.Success(w, http.StatusOK, toOrderResponse(order))
}

// FulfillOrder godoc
// @Summary Mark a confirmed order fulfilled (staff)
// @Tags Admin: Orders
// @Produce json
// @Param order_id path string true "Order ID"
// @Success 200 {object} handler.Response{data=OrderResponse}
// @Security BearerAuth
// @Router /admin/orders/{order_id}/fulfill [patch]
func (h *OrderHandler) FulfillOrder(w http.ResponseWriter, r *http.Request) {
	if err := handlers.RequireEmptyActionBody(r); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	actorID, ok := middleware.GetUserID(r.Context())
	if !ok {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}
	order, err := h.service.FulfillOrder(r.Context(), mux.Vars(r)["order_id"], actorID)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to fulfill order", err)
		return
	}
	handlers.Success(w, http.StatusOK, toOrderResponse(order))
}

// CancelOrder godoc
// @Summary Cancel own pending or confirmed order
// @Tags Client: Orders
// @Accept json
// @Produce json
// @Param order_id path string true "Order ID"
// @Param input body CancelOrderRequest false "Optional cancellation reason"
// @Success 200 {object} handler.Response{data=OrderResponse}
// @Security BearerAuth
// @Router /orders/{order_id}/cancel [patch]
func (h *OrderHandler) CancelOrder(w http.ResponseWriter, r *http.Request) {
	h.cancelOrder(w, r, false)
}

// CancelAdminOrder godoc
// @Summary Cancel a pending or confirmed order (staff)
// @Tags Admin: Orders
// @Accept json
// @Produce json
// @Param order_id path string true "Order ID"
// @Param input body AdminCancelOrderRequest true "Cancellation reason is required"
// @Success 200 {object} handler.Response{data=OrderResponse}
// @Security BearerAuth
// @Router /admin/orders/{order_id}/cancel [patch]
func (h *OrderHandler) CancelAdminOrder(w http.ResponseWriter, r *http.Request) {
	h.cancelOrder(w, r, true)
}

func (h *OrderHandler) cancelOrder(w http.ResponseWriter, r *http.Request, staff bool) {
	reason, err := decodeCancelOrderAction(r, staff)
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		handlers.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}
	order, err := h.service.CancelOrder(r.Context(), mux.Vars(r)["order_id"], userID, staff, reason)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to cancel order", err)
		return
	}
	handlers.Success(w, http.StatusOK, toOrderResponse(order))
}
