package config

import (
	"testing"
	"time"
)

func TestLoadLifetimes(t *testing.T) {
	t.Setenv("PENDING_ORDER_LIFETIME_HOURS", "")
	t.Setenv("REVIEW_DRAFT_LIFETIME_HOURS", "")
	got, err := LoadLifetimes()
	if err != nil || got.PendingOrder != 24*time.Hour || got.ReviewDraft != 7*24*time.Hour {
		t.Fatalf("defaults: %+v, %v", got, err)
	}
	t.Setenv("PENDING_ORDER_LIFETIME_HOURS", "12")
	t.Setenv("REVIEW_DRAFT_LIFETIME_HOURS", "48")
	got, err = LoadLifetimes()
	if err != nil || got.PendingOrder != 12*time.Hour || got.ReviewDraft != 48*time.Hour {
		t.Fatalf("overrides: %+v, %v", got, err)
	}
	t.Setenv("REVIEW_DRAFT_LIFETIME_HOURS", "0")
	if _, err := LoadLifetimes(); err == nil {
		t.Fatal("zero review lifetime must be rejected")
	}
}
