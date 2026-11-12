package feed

import (
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"go.uber.org/zap"
)

var (
	validIDRegex   = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	validFileRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]+\.(m3u8|ts|jpg|jpeg|png)$`)
)

type FeedHandler struct {
	service                FeedService
	mediaDir               string
	defaultLimit, maxLimit int
	logger                 *zap.Logger
}

func NewFeedHandler(service FeedService, mediaDir string, defaultLimit, maxLimit int, logger *zap.Logger) *FeedHandler {
	return &FeedHandler{
		service:      service,
		mediaDir:     mediaDir,
		defaultLimit: defaultLimit,
		maxLimit:     maxLimit,
		logger:       logger,
	}
}

// GetClips godoc
// @Summary      List video clips for vertical feed
// @Description  Get ordered list of video clips with optional location or listing filtering.
// @Tags Client: Feed
// @Produce      json
// @Param        location_id query int false "Location ID"
// @Param        listing_id query string false "Listing UUID"
// @Param        limit query int false "Maximum results (default 20, max 100)"
// @Param        offset query int false "Number of results to skip"
// @Success      200 {object} handler.Response{data=[]ClipResponse}
// @Failure      400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      500 {object} handler.Response{error=handler.ErrorInfo}
// @Router       /feed/clips [get]
func (h *FeedHandler) GetClips(w http.ResponseWriter, r *http.Request) {
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	filter := domain.FeedFilter{
		Limit:  limit,
		Offset: offset,
	}

	q := r.URL.Query()
	if locStr := q.Get("location_id"); locStr != "" {
		locID, err := strconv.Atoi(locStr)
		if err != nil || locID <= 0 {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid location ID")
			return
		}
		filter.LocationID = &locID
	}

	if listStr := q.Get("listing_id"); listStr != "" {
		if _, err := uuid.Parse(listStr); err != nil {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid listing ID")
			return
		}
		filter.ListingID = &listStr
	}

	videos, err := h.service.GetClips(r.Context(), filter)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to get feed clips", err)
		return
	}

	handlers.Success(w, http.StatusOK, toClipsResponse(videos))
}

// ServeVideoFile godoc
// @Summary      Stream HLS video file
// @Description  Stream HLS playlist (.m3u8) or video segment (.ts) file.
// @Tags Client: Feed
// @Produce      application/vnd.apple.mpegurl,video/mp2t
// @Param        id path string true "Video ID or Demo ID"
// @Param        file path string true "File name (.m3u8 or .ts)"
// @Success      200
// @Failure      400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      403 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      404 {object} handler.Response{error=handler.ErrorInfo}
// @Router       /feed/videos/{id}/{file} [get]
func (h *FeedHandler) ServeVideoFile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	file := vars["file"]

	if !validIDRegex.MatchString(id) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid video identifier")
		return
	}
	if !validFileRegex.MatchString(file) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid video file name")
		return
	}

	cleanMediaDir := filepath.Clean(h.mediaDir)
	target := filepath.Clean(filepath.Join(cleanMediaDir, id, file))

	// Path traversal protection
	if !strings.HasPrefix(target, cleanMediaDir+string(filepath.Separator)) {
		handlers.Error(w, http.StatusForbidden, "FORBIDDEN", "access denied")
		return
	}

	stat, err := os.Stat(target)
	if err != nil || stat.IsDir() {
		handlers.Error(w, http.StatusNotFound, "NOT_FOUND", "video file not found")
		return
	}

	// Set streaming headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if strings.HasSuffix(file, ".m3u8") {
		w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
		w.Header().Set("Cache-Control", "no-cache")
	} else if strings.HasSuffix(file, ".ts") {
		w.Header().Set("Content-Type", "video/mp2t")
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else if strings.HasSuffix(file, ".jpg") || strings.HasSuffix(file, ".jpeg") {
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Cache-Control", "public, max-age=86400")
	} else if strings.HasSuffix(file, ".png") {
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Cache-Control", "public, max-age=86400")
	}

	http.ServeFile(w, r, target)
}
