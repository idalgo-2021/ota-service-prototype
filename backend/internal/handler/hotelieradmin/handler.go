package hotelieradmin

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	base "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"go.uber.org/zap"
)

// ListingAssignments godoc
// @Summary List assigned listings and assignment timestamps for a hotelier
// @Tags Admin: Hoteliers
// @Produce json
// @Param id path string true "User UUID"
// @Success 200 {object} handler.Response{data=[]domain.HotelierListingAssignment}
// @Security BearerAuth
// @Router /admin/users/{id}/listing-assignments [get]
func (h *Handler) ListingAssignments(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if _, err := uuid.Parse(id); err != nil {
		base.Error(w, 400, "INVALID_INPUT", "invalid user ID")
		return
	}
	assignments, err := h.service.AdminListingAssignments(r.Context(), id)
	if err != nil {
		base.HandleError(w, h.logger, "list hotelier listing assignments", err)
		return
	}
	base.Success(w, 200, assignments)
}

type Handler struct {
	service Service
	logger  *zap.Logger
}

func New(s Service, logger *zap.Logger) *Handler { return &Handler{service: s, logger: logger} }

// ListingIDs godoc
// @Summary List assigned listings for a hotelier
// @Tags Admin: Hoteliers
// @Produce json
// @Param id path string true "User UUID"
// @Success 200 {object} handler.Response{data=[]string}
// @Security BearerAuth
// @Router /admin/users/{id}/listings [get]
func (h *Handler) ListingIDs(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if _, err := uuid.Parse(id); err != nil {
		base.Error(w, 400, "INVALID_INPUT", "invalid user ID")
		return
	}
	ids, err := h.service.AdminListingIDs(r.Context(), id)
	if err != nil {
		base.HandleError(w, h.logger, "list hotelier listings", err)
		return
	}
	base.Success(w, 200, ids)
}

// SetListingIDs godoc
// @Summary Replace listings assigned to a hotelier
// @Tags Admin: Hoteliers
// @Accept json
// @Produce json
// @Param id path string true "User UUID"
// @Param input body map[string]interface{} true "listing_ids"
// @Success 200 {object} handler.Response{data=[]string}
// @Security BearerAuth
// @Router /admin/users/{id}/listings [put]
func (h *Handler) SetListingIDs(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if _, err := uuid.Parse(id); err != nil {
		base.Error(w, 400, "INVALID_INPUT", "invalid user ID")
		return
	}
	var req SetListingIDsRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil || req.ListingIDs == nil {
		base.Error(w, 400, "INVALID_REQUEST", "listing_ids must be an array")
		return
	}
	if len(req.ListingIDs) > 500 {
		base.Error(w, 400, "INVALID_INPUT", "too many listing IDs")
		return
	}
	seen := map[string]bool{}
	for i, id := range req.ListingIDs {
		parsed, err := uuid.Parse(id)
		if err != nil || seen[parsed.String()] {
			base.Error(w, 400, "INVALID_INPUT", "invalid or duplicate listing ID")
			return
		}
		req.ListingIDs[i] = parsed.String()
		seen[parsed.String()] = true
	}
	ids, err := h.service.SetAdminListingIDs(r.Context(), id, req.ListingIDs)
	if err != nil {
		base.HandleError(w, h.logger, "set hotelier listings", err)
		return
	}
	base.Success(w, 200, ids)
}

// CreateMessage godoc
// @Summary Ingest an incoming hotelier message
// @Tags Admin: Hoteliers
// @Accept json
// @Produce json
// @Param input body map[string]interface{} true "Incoming message"
// @Success 201 {object} handler.Response{data=domain.HotelierMessage}
// @Security BearerAuth
// @Router /admin/hotelier/messages [post]
func (h *Handler) CreateMessage(w http.ResponseWriter, r *http.Request) {
	var in CreateMessageRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		base.Error(w, 400, "INVALID_REQUEST", "invalid message")
		return
	}
	if _, err := uuid.Parse(in.HotelierID); err != nil {
		base.Error(w, 400, "INVALID_INPUT", "invalid hotelier ID")
		return
	}
	if _, err := uuid.Parse(in.ListingID); err != nil {
		base.Error(w, 400, "INVALID_INPUT", "invalid listing ID")
		return
	}
	if in.MessageType != "client_question" && in.MessageType != "ota_notification" && in.MessageType != "ota_recommendation" {
		base.Error(w, 400, "INVALID_INPUT", "invalid message_type")
		return
	}
	if in.SenderType != "ota" && in.SenderType != "known_client" && in.SenderType != "unknown_client" && in.SenderType != "staff" && in.SenderType != "system" {
		base.Error(w, 400, "INVALID_INPUT", "invalid sender_type")
		return
	}
	in.MessageText = strings.TrimSpace(in.MessageText)
	if in.MessageText == "" || len(in.MessageText) > 10000 {
		base.Error(w, 400, "INVALID_INPUT", "message_text is required and must be at most 10000 characters")
		return
	}
	if (in.Source == nil) != (in.ExternalMessageID == nil) {
		base.Error(w, 400, "INVALID_INPUT", "source and external_message_id must be provided together")
		return
	}
	if in.Source != nil {
		*in.Source = strings.TrimSpace(*in.Source)
		*in.ExternalMessageID = strings.TrimSpace(*in.ExternalMessageID)
		if *in.Source == "" || len(*in.Source) > 100 || *in.ExternalMessageID == "" || len(*in.ExternalMessageID) > 255 {
			base.Error(w, 400, "INVALID_INPUT", "invalid external message identity")
			return
		}
	}
	if in.SenderUserID != nil {
		if _, err := uuid.Parse(*in.SenderUserID); err != nil {
			base.Error(w, 400, "INVALID_INPUT", "invalid sender_user_id")
			return
		}
	}
	item, err := h.service.CreateIncomingMessage(r.Context(), domain.HotelierMessage{HotelierID: in.HotelierID, ListingID: in.ListingID, MessageType: in.MessageType, SenderType: in.SenderType, SenderUserID: in.SenderUserID, SenderName: in.SenderName, SenderEmail: in.SenderEmail, Source: in.Source, ExternalMessageID: in.ExternalMessageID, MessageText: in.MessageText})
	if err != nil {
		base.HandleError(w, h.logger, "create incoming hotelier message", err)
		return
	}
	base.Success(w, 201, item)
}
