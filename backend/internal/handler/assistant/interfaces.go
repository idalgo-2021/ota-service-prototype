package assistant

import (
	"context"
)

type AIService interface {
	Chat(ctx context.Context, request ChatRequest, userID, userToken string) (*ChatResult, error)
}
