package router

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"go.uber.org/zap"
)

func TestHotelComparisonMockIsPublicAndIndependentOfServices(t *testing.T) {
	handler := New(nil, nil, nil, nil, nil, nil, nil, nil, nil, "test-secret", zap.NewNop())
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest("GET", "/api/v1/hotel/compare?ids=hotel-a,hotel-b", nil))
	if response.Code != 200 {
		t.Fatalf("status %d: %s", response.Code, response.Body.String())
	}
	var body struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Data) != 2 || body.Data[0].ID != "hotel-a" || body.Data[1].ID != "hotel-b" {
		t.Fatalf("unexpected response: %s", response.Body.String())
	}
}
