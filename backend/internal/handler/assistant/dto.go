package assistant

type ChatRequest struct {
	Message   string  `json:"message"`
	SessionID *string `json:"session_id,omitempty"`
}

type ChatResponse struct {
	SessionID string `json:"session_id"`
	Message   string `json:"message"`
}

type ChatResult struct {
	StatusCode  int
	ContentType string
	RetryAfter  string
	Body        []byte
}
