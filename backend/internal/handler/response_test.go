package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.uber.org/zap"
)

func TestHandleErrorHidesInternalDetails(t *testing.T) {
	const internalDetails = "database connection refused at internal-db.example"
	response := httptest.NewRecorder()

	HandleError(response, zap.NewNop(), "failed to login", errors.New(internalDetails))

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	if strings.Contains(response.Body.String(), internalDetails) {
		t.Fatalf("response leaked internal error details: %s", response.Body.String())
	}

	var got Response
	if err := json.Unmarshal(response.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got.Error == nil {
		t.Fatal("response has no error payload")
	}
	if got.Error.Code != "INTERNAL_ERROR" {
		t.Errorf("error code = %q, want INTERNAL_ERROR", got.Error.Code)
	}
	if got.Error.Message != "Internal server error" {
		t.Errorf("error message = %q, want generic message", got.Error.Message)
	}
}
