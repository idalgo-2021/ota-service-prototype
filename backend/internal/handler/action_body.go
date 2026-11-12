package handler

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
)

// RequireEmptyActionBody accepts an omitted body or an empty JSON object.
func RequireEmptyActionBody(r *http.Request) error {
	if r.Body == nil {
		return nil
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, (64<<10)+1))
	if err != nil {
		return err
	}
	if len(body) > (64 << 10) {
		return fmt.Errorf("request body is too large")
	}
	trimmed := bytes.TrimSpace(body)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("{}")) {
		return nil
	}
	return fmt.Errorf("request body must be empty")
}
