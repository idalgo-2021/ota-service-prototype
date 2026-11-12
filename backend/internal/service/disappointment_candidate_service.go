package service

import (
	"context"
	"fmt"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type DisappointmentCandidateRepository interface {
	List(context.Context, int, int) ([]domain.DisappointmentCandidate, int, error)
}

type DisappointmentCandidateService struct {
	repo DisappointmentCandidateRepository
}

func NewDisappointmentCandidateService(repo DisappointmentCandidateRepository) *DisappointmentCandidateService {
	return &DisappointmentCandidateService{repo: repo}
}

func (s *DisappointmentCandidateService) List(ctx context.Context, limit, offset int) ([]domain.DisappointmentCandidate, int, error) {
	if limit < 1 || offset < 0 {
		return nil, 0, fmt.Errorf("%w: invalid pagination", domain.ErrInvalidInput)
	}
	return s.repo.List(ctx, limit, offset)
}
