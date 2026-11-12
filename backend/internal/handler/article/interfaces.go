package article

import (
	"context"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type Service interface {
	List(context.Context, domain.ArticleFilter, int, int) ([]domain.Article, int, error)
	GetBySlug(context.Context, string) (*domain.Article, error)
	Get(context.Context, string) (*domain.Article, error)
	Create(context.Context, string, domain.Article) (*domain.Article, error)
	Patch(context.Context, string, domain.ArticlePatch) (*domain.Article, error)
	Publish(context.Context, string, bool) (*domain.Article, error)
}
