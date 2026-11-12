package media

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

var validIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

type Transcoder struct {
	ffmpegPath string
	mediaDir   string
}

func NewTranscoder(ffmpegPath, mediaDir string) *Transcoder {
	if ffmpegPath == "" {
		ffmpegPath = "ffmpeg"
	}
	return &Transcoder{
		ffmpegPath: ffmpegPath,
		mediaDir:   mediaDir,
	}
}

func (t *Transcoder) MediaDir() string {
	return t.mediaDir
}

// TranscodeToHLS converts an input video file into an HLS stream (index.m3u8 + segment%d.ts)
// in the directory: <mediaDir>/<videoID>/
func (t *Transcoder) TranscodeToHLS(ctx context.Context, srcPath, videoID string) error {
	if !validIDRegex.MatchString(videoID) {
		return fmt.Errorf("invalid video ID: %s", videoID)
	}

	cleanMediaDir := filepath.Clean(t.mediaDir)
	outDir := filepath.Clean(filepath.Join(cleanMediaDir, videoID))

	// Path traversal protection
	if !strings.HasPrefix(outDir, cleanMediaDir+string(filepath.Separator)) {
		return fmt.Errorf("invalid output directory path")
	}

	if err := os.MkdirAll(outDir, 0755); err != nil {
		return fmt.Errorf("create video directory: %w", err)
	}

	playlistPath := filepath.Join(outDir, "index.m3u8")
	segmentPattern := filepath.Join(outDir, "segment%d.ts")

	cmd := exec.CommandContext(ctx, t.ffmpegPath,
		"-y",
		"-i", srcPath,
		"-codec:v", "libx264",
		"-codec:a", "aac",
		"-hls_time", "4",
		"-hls_playlist_type", "vod",
		"-hls_segment_filename", segmentPattern,
		playlistPath,
	)

	out, err := cmd.CombinedOutput()
	if err != nil {
		_ = os.RemoveAll(outDir)
		return fmt.Errorf("ffmpeg transcoding failed: %w (output: %s)", err, string(out))
	}

	// Try extracting a preview thumbnail; non-fatal if video is empty or short
	previewPath := filepath.Join(outDir, "preview.jpg")
	thumbCmd := exec.CommandContext(ctx, t.ffmpegPath,
		"-y",
		"-ss", "00:00:00.500",
		"-i", srcPath,
		"-vframes", "1",
		"-q:v", "2",
		previewPath,
	)
	_ = thumbCmd.Run()

	return nil
}

// DeleteMedia removes the media directory for the given videoID.
func (t *Transcoder) DeleteMedia(videoID string) error {
	if !validIDRegex.MatchString(videoID) {
		return fmt.Errorf("invalid video ID: %s", videoID)
	}

	cleanMediaDir := filepath.Clean(t.mediaDir)
	targetDir := filepath.Clean(filepath.Join(cleanMediaDir, videoID))

	if !strings.HasPrefix(targetDir, cleanMediaDir+string(filepath.Separator)) {
		return fmt.Errorf("invalid target directory path")
	}

	if err := os.RemoveAll(targetDir); err != nil {
		return fmt.Errorf("remove video files: %w", err)
	}

	return nil
}
