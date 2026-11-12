package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ProductReviewRepository interface {
	Get(context.Context, string) (*domain.ProductReview, error)
	List(context.Context, domain.ProductReviewFilter, int, int) ([]domain.ProductReview, int, error)
	PatchDraft(context.Context, string, string, *int, *string, time.Time) (*domain.ProductReview, error)
	Submit(context.Context, string, string, time.Time) (*domain.ProductReview, error)
	Moderate(context.Context, string, string, string, string) (*domain.ProductReview, error)
}

type ProductReviewService struct {
	repo          ProductReviewRepository
	draftLifetime time.Duration
}

func NewProductReviewService(repo ProductReviewRepository, draftLifetime time.Duration) *ProductReviewService {
	return &ProductReviewService{repo: repo, draftLifetime: draftLifetime}
}

func (s *ProductReviewService) List(ctx context.Context, filter domain.ProductReviewFilter, limit, offset int) ([]domain.ProductReview, int, error) {
	if filter.Status != "" && !filter.Status.Valid() {
		return nil, 0, fmt.Errorf("%w: invalid review status", domain.ErrInvalidInput)
	}
	return s.repo.List(ctx, filter, limit, offset)
}

func (s *ProductReviewService) Get(ctx context.Context, id, userID string, staff bool) (*domain.ProductReview, error) {
	v, err := s.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if !staff && (v.AuthorID == nil || *v.AuthorID != userID) {
		return nil, domain.NewNotFound("review not found")
	}
	return v, nil
}

func (s *ProductReviewService) PatchDraft(ctx context.Context, id, userID string, rating *int, body *string) (*domain.ProductReview, error) {
	if rating == nil && body == nil {
		return nil, fmt.Errorf("%w: rating or review_text is required", domain.ErrInvalidInput)
	}
	if rating != nil && (*rating < 1 || *rating > 5) {
		return nil, fmt.Errorf("%w: rating must be between 1 and 5", domain.ErrInvalidInput)
	}
	if body != nil {
		trimmed := strings.TrimSpace(*body)
		if trimmed == "" {
			return nil, fmt.Errorf("%w: review_text cannot be empty", domain.ErrInvalidInput)
		}
		body = &trimmed
	}
	if _, err := s.Get(ctx, id, userID, false); err != nil {
		return nil, err
	}
	return s.repo.PatchDraft(ctx, id, userID, rating, body, time.Now().UTC().Add(-s.draftLifetime))
}

func (s *ProductReviewService) Submit(ctx context.Context, id, userID string) (*domain.ProductReview, error) {
	if _, err := s.Get(ctx, id, userID, false); err != nil {
		return nil, err
	}
	return s.repo.Submit(ctx, id, userID, time.Now().UTC().Add(-s.draftLifetime))
}

func (s *ProductReviewService) Moderate(ctx context.Context, id, moderatorID, action, reason string) (*domain.ProductReview, error) {
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
