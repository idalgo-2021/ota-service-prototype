package assistant

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

type HTTPAIService struct {
	baseURL     string
	internalKey string
	client      *http.Client
}

func NewHTTPAIService(baseURL, internalKey string) *HTTPAIService {
	return &HTTPAIService{
		baseURL:     strings.TrimRight(baseURL, "/"),
		internalKey: internalKey,
		client: &http.Client{
			Timeout: 90 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

func (s *HTTPAIService) Chat(
	ctx context.Context, request ChatRequest, userID, userToken string,
) (*ChatResult, error) {
	body, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(
		ctx, http.MethodPost, s.baseURL+"/api/v1/chat", bytes.NewReader(body),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-API-Key", s.internalKey)
	if userToken != "" {
		req.Header.Set("Authorization", userToken)
		req.Header.Set("X-Assistant-User-ID", userID)
	}
	response, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	return &ChatResult{
		StatusCode:  response.StatusCode,
		ContentType: response.Header.Get("Content-Type"),
		RetryAfter:  response.Header.Get("Retry-After"),
		Body:        responseBody,
	}, nil
}
