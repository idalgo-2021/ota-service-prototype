package feed

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type mockFeedService struct {
	clips []domain.FeedVideo
	err   error
}

func (m *mockFeedService) GetClips(ctx context.Context, filter domain.FeedFilter) ([]domain.FeedVideo, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.clips, nil
}

func TestFeedHandler_GetClips(t *testing.T) {
	hotelID := "a9d0d501-b723-48e0-9f52-93db2e16f905"
	locID := 2
	demoID := "02"

	mockService := &mockFeedService{
		clips: []domain.FeedVideo{
			{
				ID:         "00000000-0000-4000-8000-000000000002",
				ListingID:  &hotelID,
				LocationID: &locID,
				DemoID:     &demoID,
				Title:      "Приморская Жемчужина",
				Subtitle:   "Сочи",
				Author:     "@explore",
				SortOrder:  1,
				IsActive:   true,
				CreatedAt:  time.Now(),
			},
			{
				ID:        "00000000-0000-4000-8000-000000000004",
				Title:     "Общее промо",
				Subtitle:  "Вдохновение",
				Author:    "@travel",
				SortOrder: 0,
				IsActive:  true,
				CreatedAt: time.Now(),
			},
		},
	}

	handler := NewFeedHandler(mockService, t.TempDir(), 20, 100, zap.NewNop())

	req := httptest.NewRequest(http.MethodGet, "/api/v1/feed/clips?location_id=2", nil)
	w := httptest.NewRecorder()

	handler.GetClips(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp handlers.Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	data, ok := resp.Data.([]any)
	require.True(t, ok)
	assert.Len(t, data, 2)

	first := data[0].(map[string]any)
	assert.Equal(t, "listing", first["type"])
	assert.Equal(t, "/api/feed/videos/02/index.m3u8", first["src"])
	assert.Equal(t, hotelID, first["listing_id"])

	second := data[1].(map[string]any)
	assert.Equal(t, "general", second["type"])
	assert.Equal(t, "/api/feed/videos/00000000-0000-4000-8000-000000000004/index.m3u8", second["src"])
}

func TestFeedHandler_ServeVideoFile(t *testing.T) {
	tempDir := t.TempDir()
	videoDir := filepath.Join(tempDir, "02")
	require.NoError(t, os.MkdirAll(videoDir, 0755))

	playlistContent := "#EXTM3U\nsegment0.ts\n"
	require.NoError(t, os.WriteFile(filepath.Join(videoDir, "index.m3u8"), []byte(playlistContent), 0644))

	segmentContent := []byte{0x47, 0x00, 0x00, 0x10}
	require.NoError(t, os.WriteFile(filepath.Join(videoDir, "segment0.ts"), segmentContent, 0644))

	handler := NewFeedHandler(&mockFeedService{}, tempDir, 20, 100, zap.NewNop())

	router := mux.NewRouter()
	router.HandleFunc("/api/v1/feed/videos/{id}/{file}", handler.ServeVideoFile).Methods("GET")

	// Test serving .m3u8
	req := httptest.NewRequest(http.MethodGet, "/api/v1/feed/videos/02/index.m3u8", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/vnd.apple.mpegurl", w.Header().Get("Content-Type"))
	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, playlistContent, w.Body.String())

	// Test serving .ts
	reqTS := httptest.NewRequest(http.MethodGet, "/api/v1/feed/videos/02/segment0.ts", nil)
	wTS := httptest.NewRecorder()
	router.ServeHTTP(wTS, reqTS)

	assert.Equal(t, http.StatusOK, wTS.Code)
	assert.Equal(t, "video/mp2t", wTS.Header().Get("Content-Type"))
	assert.Equal(t, segmentContent, wTS.Body.Bytes())

	// Test invalid file (not found)
	req404 := httptest.NewRequest(http.MethodGet, "/api/v1/feed/videos/02/not_existing.ts", nil)
	w404 := httptest.NewRecorder()
	router.ServeHTTP(w404, req404)
	assert.Equal(t, http.StatusNotFound, w404.Code)

	// Test path traversal attempt
	reqBad := httptest.NewRequest(http.MethodGet, "/api/v1/feed/videos/02/../../../etc/passwd", nil)
	wBad := httptest.NewRecorder()
	router.ServeHTTP(wBad, reqBad)
	assert.NotEqual(t, http.StatusOK, wBad.Code)
}
