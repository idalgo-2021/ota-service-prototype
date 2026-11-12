package media

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestTranscoder_TranscodeToHLS(t *testing.T) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("ffmpeg not installed, skipping test")
	}

	tempDir := t.TempDir()
	mediaDir := filepath.Join(tempDir, "_media")
	srcVideo := filepath.Join(tempDir, "test.mp4")

	// Generate a 1-second synthetic video
	cmd := exec.Command("ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=320x240:rate=25", "-f", "lavfi", "-i", "sine=frequency=1000:duration=1", "-c:v", "libx264", "-c:a", "aac", srcVideo)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("failed to generate test video: %v (output: %s)", err, string(out))
	}

	tc := NewTranscoder("ffmpeg", mediaDir)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	videoID := "test-video-123"
	if err := tc.TranscodeToHLS(ctx, srcVideo, videoID); err != nil {
		t.Fatalf("TranscodeToHLS failed: %v", err)
	}

	playlist := filepath.Join(mediaDir, videoID, "index.m3u8")
	if _, err := os.Stat(playlist); err != nil {
		t.Errorf("expected playlist file %s to exist: %v", playlist, err)
	}

	if err := tc.DeleteMedia(videoID); err != nil {
		t.Fatalf("DeleteMedia failed: %v", err)
	}

	if _, err := os.Stat(filepath.Join(mediaDir, videoID)); !os.IsNotExist(err) {
		t.Errorf("expected media directory to be deleted")
	}
}

func TestTranscoder_PathTraversal(t *testing.T) {
	tc := NewTranscoder("ffmpeg", "/tmp/media")
	if err := tc.DeleteMedia("../dangerous"); err == nil {
		t.Errorf("expected error on path traversal in DeleteMedia")
	}
}
