package service

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type FeedRepository interface {
	ListFeedVideos(ctx context.Context, filter domain.FeedFilter) ([]domain.FeedVideo, error)
	GetFeedVideo(ctx context.Context, idOrDemo string) (*domain.FeedVideo, error)
}

type FeedService struct {
	repo FeedRepository
}

func NewFeedService(repo FeedRepository) *FeedService {
	return &FeedService{repo: repo}
}

func (s *FeedService) GetClips(ctx context.Context, filter domain.FeedFilter) ([]domain.FeedVideo, error) {
	return s.repo.ListFeedVideos(ctx, filter)
}
