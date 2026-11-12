package service

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ListingReviewRepository interface {
	Get(context.Context, string) (*domain.ListingReview, error)
	List(context.Context, domain.ListingReviewFilter, int, int) ([]domain.ListingReview, int, error)
	PatchDraft(context.Context, string, string, domain.ListingReviewPatch, time.Time) (*domain.ListingReview, error)
	Submit(context.Context, string, string, time.Time) (*domain.ListingReview, error)
	Moderate(context.Context, string, string, string, string) (*domain.ListingReview, error)
}

type ListingReviewService struct {
	repo          ListingReviewRepository
	draftLifetime time.Duration
}

func NewListingReviewService(repo ListingReviewRepository, draftLifetime time.Duration) *ListingReviewService {
	return &ListingReviewService{repo: repo, draftLifetime: draftLifetime}
}

func (s *ListingReviewService) List(ctx context.Context, filter domain.ListingReviewFilter, limit, offset int) ([]domain.ListingReview, int, error) {
	if filter.Status != "" && !filter.Status.Valid() {
		return nil, 0, fmt.Errorf("%w: invalid listing review status", domain.ErrInvalidInput)
	}
	for _, direction := range []string{filter.Sort.CreatedAt, filter.Sort.OverallRating} {
		if direction != "" && direction != "asc" && direction != "desc" {
			return nil, 0, fmt.Errorf("%w: invalid listing review sort direction", domain.ErrInvalidInput)
		}
	}
	return s.repo.List(ctx, filter, limit, offset)
}

func (s *ListingReviewService) Get(ctx context.Context, id, userID string, staff bool) (*domain.ListingReview, error) {
	v, err := s.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if !staff && (v.ReviewerUserID == nil || *v.ReviewerUserID != userID) {
		return nil, domain.NewNotFound("listing review not found")
	}
	return v, nil
}

func validateListingRating(name string, field domain.ListingReviewField[float64]) error {
	if !field.Set || field.Value == nil {
		return nil
	}
	v := *field.Value
	step := 2.0
	if name == "overall_rating" {
		step = 10
	}
	if math.IsNaN(v) || math.IsInf(v, 0) || v < 1 || v > 10 || math.Abs(v*step-math.Round(v*step)) > 1e-9 {
		return fmt.Errorf("%w: %s must be 1 to 10 in %g steps", domain.ErrInvalidInput, name, 1/step)
	}
	return nil
}

func validateListingText(name string, field *domain.ListingReviewField[string], allowed ...string) error {
	if !field.Set || field.Value == nil {
		return nil
	}
	v := strings.TrimSpace(*field.Value)
	if v == "" {
		field.Value = nil
		return nil
	}
	if len(v) > 5000 {
		return fmt.Errorf("%w: %s is too long", domain.ErrInvalidInput, name)
	}
	if len(allowed) != 0 {
		for _, candidate := range allowed {
			if v == candidate {
				field.Value = &v
				return nil
			}
		}
		return fmt.Errorf("%w: invalid %s", domain.ErrInvalidInput, name)
	}
	field.Value = &v
	return nil
}

func validateListingPatch(p *domain.ListingReviewPatch) error {
	if !p.OverallRating.Set && !p.PositiveReview.Set && !p.NegativeReview.Set && !p.CleanlinessRating.Set && !p.StaffRating.Set &&
		!p.ComfortRating.Set && !p.LocationRating.Set && !p.SleepRating.Set && !p.BathroomRating.Set &&
		!p.WifiRating.Set && !p.TripPurpose.Set && !p.PartyType.Set && !p.ReviewerAge.Set &&
		!p.ReviewerGender.Set && !p.ReviewerCountry.Set {
		return fmt.Errorf("%w: empty listing review patch", domain.ErrInvalidInput)
	}
	for _, item := range []struct {
		name  string
		field domain.ListingReviewField[float64]
	}{
		{"overall_rating", p.OverallRating},
		{"cleanliness_rating", p.CleanlinessRating}, {"staff_rating", p.StaffRating},
		{"comfort_rating", p.ComfortRating}, {"location_rating", p.LocationRating},
		{"sleep_rating", p.SleepRating}, {"bathroom_rating", p.BathroomRating}, {"wifi_rating", p.WifiRating},
	} {
		if err := validateListingRating(item.name, item.field); err != nil {
			return err
		}
	}
	for _, item := range []struct {
		name    string
		field   *domain.ListingReviewField[string]
		allowed []string
	}{
		{"positive_review", &p.PositiveReview, nil}, {"negative_review", &p.NegativeReview, nil},
		{"trip_purpose", &p.TripPurpose, []string{"tourism", "business", "other"}},
		{"party_type", &p.PartyType, []string{"alone", "couple", "family", "friends", "colleagues", "other"}},
		{"reviewer_gender", &p.ReviewerGender, []string{"male", "female", "other"}},
		{"reviewer_country", &p.ReviewerCountry, nil},
	} {
		if err := validateListingText(item.name, item.field, item.allowed...); err != nil {
			return err
		}
	}
	if err := validateListingText("reviewer_age", &p.ReviewerAge); err != nil {
		return err
	}
	if p.ReviewerAge.Value != nil {
		age, err := strconv.Atoi(*p.ReviewerAge.Value)
		if err != nil || age < 1 || age > 120 || strconv.Itoa(age) != *p.ReviewerAge.Value {
			return fmt.Errorf("%w: reviewer_age must be an age from 1 to 120", domain.ErrInvalidInput)
		}
	}
	return nil
}

func (s *ListingReviewService) PatchDraft(ctx context.Context, id, userID string, patch domain.ListingReviewPatch) (*domain.ListingReview, error) {
	if err := validateListingPatch(&patch); err != nil {
		return nil, err
	}
	if _, err := s.Get(ctx, id, userID, false); err != nil {
		return nil, err
	}
	return s.repo.PatchDraft(ctx, id, userID, patch, time.Now().UTC().Add(-s.draftLifetime))
}

func (s *ListingReviewService) Submit(ctx context.Context, id, userID string) (*domain.ListingReview, error) {
	if _, err := s.Get(ctx, id, userID, false); err != nil {
		return nil, err
	}
	return s.repo.Submit(ctx, id, userID, time.Now().UTC().Add(-s.draftLifetime))
}

func (s *ListingReviewService) Moderate(ctx context.Context, id, moderatorID, action, reason string) (*domain.ListingReview, error) {
	if action == "reject" || action == "hide" {
		reason = strings.TrimSpace(reason)
		if reason == "" {
			return nil, fmt.Errorf("%w: reason is required", domain.ErrInvalidInput)
		}
	}
	if _, err := s.repo.Get(ctx, id); err != nil {
		return nil, err
	}
	return s.repo.Moderate(ctx, id, moderatorID, action, reason)
}
