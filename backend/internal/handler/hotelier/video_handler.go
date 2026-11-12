package hotelier

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	base "github.com/idalgo-2021/product-catalog-backend/internal/handler"
)

// ListListingVideos godoc
// @Summary List videos for an assigned listing
// @Description Returns all videos attached to the specified listing, including inactive ones.
// @Tags Hotelier: Listings & Units
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Success 200 {object} handler.Response{data=[]ListingVideoResponse}
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 404 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/videos [get]
func (h *Handler) ListListingVideos(w http.ResponseWriter, r *http.Request) {
	uid, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	videos, err := h.service.ListListingVideos(r.Context(), uid, listingID)
	if err != nil {
		h.err(w, "list hotelier listing videos", err)
		return
	}
	base.Success(w, http.StatusOK, toListingVideosResponse(videos))
}

// UploadListingVideo godoc
// @Summary Upload and transcode a video for an assigned listing
// @Description Accepts a video file via multipart/form-data, converts it to HLS, and attaches it to the listing.
// @Tags Hotelier: Listings & Units
// @Accept multipart/form-data
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param video formData file true "Video file (MP4/MOV/WebM)"
// @Param title formData string true "Video title"
// @Param subtitle formData string false "Video subtitle"
// @Param author formData string false "Video author"
// @Param sort_order formData int false "Sort order (default 100)"
// @Param is_active formData bool false "Active status (default true)"
// @Success 201 {object} handler.Response{data=ListingVideoResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 404 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 500 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/videos [post]
func (h *Handler) UploadListingVideo(w http.ResponseWriter, r *http.Request) {
	uid, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		base.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "failed to parse multipart form")
		return
	}

	title := strings.TrimSpace(r.FormValue("title"))
	if title == "" {
		base.Error(w, http.StatusBadRequest, "INVALID_INPUT", "title is required")
		return
	}
	if len(title) > 255 {
		base.Error(w, http.StatusBadRequest, "INVALID_INPUT", "title must be at most 255 characters")
		return
	}

	subtitle := strings.TrimSpace(r.FormValue("subtitle"))
	if len(subtitle) > 255 {
		base.Error(w, http.StatusBadRequest, "INVALID_INPUT", "subtitle must be at most 255 characters")
		return
	}

	author := strings.TrimSpace(r.FormValue("author"))
	if len(author) > 255 {
		base.Error(w, http.StatusBadRequest, "INVALID_INPUT", "author must be at most 255 characters")
		return
	}

	sortOrder := 100
	if rawSort := strings.TrimSpace(r.FormValue("sort_order")); rawSort != "" {
		if val, err := strconv.Atoi(rawSort); err == nil {
			sortOrder = val
		}
	}

	isActive := true
	if rawActive := strings.TrimSpace(r.FormValue("is_active")); rawActive != "" {
		if val, err := strconv.ParseBool(rawActive); err == nil {
			isActive = val
		}
	}

	file, _, err := r.FormFile("video")
	if err != nil {
		base.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "video file is required")
		return
	}
	defer file.Close()

	tempFile, err := os.CreateTemp("", "hotelier-upload-*.mp4")
	if err != nil {
		h.err(w, "create temporary upload file", err)
		return
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	if _, err := io.Copy(tempFile, file); err != nil {
		h.err(w, "write temporary upload file", err)
		return
	}
	_ = tempFile.Close()

	input := domain.CreateListingVideoInput{
		Title:     title,
		Subtitle:  subtitle,
		Author:    author,
		SortOrder: sortOrder,
		IsActive:  isActive,
	}

	video, err := h.service.UploadListingVideo(r.Context(), uid, listingID, tempFile.Name(), input)
	if err != nil {
		h.err(w, "upload and transcode listing video", err)
		return
	}

	base.Success(w, http.StatusCreated, toListingVideoResponse(*video))
}

// UpdateListingVideo godoc
// @Summary Update video metadata for an assigned listing
// @Tags Hotelier: Listings & Units
// @Accept json
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param video_id path string true "Video UUID"
// @Param input body UpdateListingVideoRequest true "Fields to update"
// @Success 200 {object} handler.Response{data=ListingVideoResponse}
// @Failure 400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 404 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/videos/{video_id} [patch]
func (h *Handler) UpdateListingVideo(w http.ResponseWriter, r *http.Request) {
	uid, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	videoID := mux.Vars(r)["video_id"]
	if !validPathID(w, videoID, "video") {
		return
	}

	var req UpdateListingVideoRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		base.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	patch := domain.UpdateListingVideoInput{
		Title:     req.Title,
		Subtitle:  req.Subtitle,
		Author:    req.Author,
		SortOrder: req.SortOrder,
		IsActive:  req.IsActive,
	}

	video, err := h.service.UpdateListingVideo(r.Context(), uid, listingID, videoID, patch)
	if err != nil {
		h.err(w, "update listing video", err)
		return
	}

	base.Success(w, http.StatusOK, toListingVideoResponse(*video))
}

// DeleteListingVideo godoc
// @Summary Delete a video for an assigned listing
// @Description Deletes the video record from the database and removes all media files from disk.
// @Tags Hotelier: Listings & Units
// @Produce json
// @Param listing_id path string true "Listing UUID"
// @Param video_id path string true "Video UUID"
// @Success 204 "Video deleted"
// @Failure 401 {object} handler.Response{error=handler.ErrorInfo}
// @Failure 404 {object} handler.Response{error=handler.ErrorInfo}
// @Security BearerAuth
// @Router /hotelier/listings/{listing_id}/videos/{video_id} [delete]
func (h *Handler) DeleteListingVideo(w http.ResponseWriter, r *http.Request) {
	uid, listingID, ok := h.listingAccess(w, r)
	if !ok {
		return
	}
	videoID := mux.Vars(r)["video_id"]
	if !validPathID(w, videoID, "video") {
		return
	}

	if err := h.service.DeleteListingVideo(r.Context(), uid, listingID, videoID); err != nil {
		h.err(w, "delete listing video", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
