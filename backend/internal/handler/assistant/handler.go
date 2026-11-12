package assistant

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	base "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
	"go.uber.org/zap"
)

type Handler struct {
	aiService AIService
	logger    *zap.Logger
}

func NewHandler(aiService AIService, logger *zap.Logger) *Handler {
	return &Handler{aiService: aiService, logger: logger}
}

// Chat godoc
// @Summary Send a message to the OTA assistant
// @Description Available to guests and customer accounts. The optional bearer token is verified by OTA; other roles are rejected.
// @Tags Client: Assistant
// @Accept json
// @Produce json
// @Param request body ChatRequest true "Assistant message"
// @Success 200 {object} assistant.ChatResponse
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 403 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 502 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 503 {object} map[string]string "AI service returned an unavailable response"
// @Router /assistant/chat [post]
func (h *Handler) Chat(w http.ResponseWriter, r *http.Request) {
	if role, authenticated := middleware.GetUserRole(r.Context()); authenticated && role != domain.RoleUser {
		base.Error(w, http.StatusForbidden, "FORBIDDEN", "Assistant chat is available to guests and customer accounts")
		return
	}
	var payload ChatRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024)).Decode(&payload); err != nil {
		base.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid chat request")
		return
	}
	if strings.TrimSpace(payload.Message) == "" || len(payload.Message) > 4000 {
		base.Error(w, http.StatusBadRequest, "INVALID_INPUT", "message must contain 1 to 4000 characters")
		return
	}
	userToken := ""
	userID := ""
	if role, authenticated := middleware.GetUserRole(r.Context()); authenticated && role == domain.RoleUser {
		userToken = r.Header.Get("Authorization")
		userID, _ = middleware.GetUserID(r.Context())
	}
	response, err := h.aiService.Chat(r.Context(), payload, userID, userToken)
	if err != nil {
		h.logger.Error("forward assistant chat request", zap.Error(err))
		base.Error(w, http.StatusBadGateway, "AI_SERVICE_UNAVAILABLE", "Assistant is temporarily unavailable")
		return
	}
	if response.ContentType != "" {
		w.Header().Set("Content-Type", response.ContentType)
	}
	if response.RetryAfter != "" {
		w.Header().Set("Retry-After", response.RetryAfter)
	}
	w.WriteHeader(response.StatusCode)
	if _, err := w.Write(response.Body); err != nil {
		h.logger.Warn("copy assistant response", zap.Error(err))
	}
}
