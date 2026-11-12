package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/feed"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

type dummyFeedService struct{}

func (d *dummyFeedService) GetClips(ctx context.Context, filter domain.FeedFilter) ([]domain.FeedVideo, error) {
	return []domain.FeedVideo{}, nil
}

func TestFeedRoutesRegistered(t *testing.T) {
	tempDir := t.TempDir()
	fh := feed.NewFeedHandler(&dummyFeedService{}, tempDir, 20, 100, zap.NewNop())
	r := New(nil, nil, nil, nil, nil, nil, nil, nil, nil, "secret", zap.NewNop(), ExtraHandlers{Feed: fh})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/feed/clips", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	reqNotFound := httptest.NewRequest(http.MethodGet, "/api/v1/feed/videos/01/index.m3u8", nil)
	wNotFound := httptest.NewRecorder()
	r.ServeHTTP(wNotFound, reqNotFound)
	assert.Equal(t, http.StatusNotFound, wNotFound.Code)
	assert.Contains(t, wNotFound.Body.String(), "video file not found")
}
