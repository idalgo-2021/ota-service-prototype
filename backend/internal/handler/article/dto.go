package article

import (
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

// ArticleCreateRequest is the administrative API payload for a new draft.
type ArticleCreateRequest struct {
	Slug          string   `json:"slug"`
	Title         string   `json:"title"`
	ContentHTML   string   `json:"content_html"`
	CoverImageURL string   `json:"cover_image_url"`
	LocationID    int      `json:"location_id"` // Required destination ID.
	Tags          []string `json:"tags"`
}

// ArticlePatchRequest contains only fields that staff may edit.
type ArticlePatchRequest struct {
	Slug          *string   `json:"slug"`
	Title         *string   `json:"title"`
	ContentHTML   *string   `json:"content_html"`
	CoverImageURL *string   `json:"cover_image_url"`
	LocationID    *int      `json:"location_id"` // Destination ID.
	Tags          *[]string `json:"tags"`
}

// ArticleResponse is the stable HTTP representation of an article.
type ArticleResponse struct {
	ID            string     `json:"id"`
	Slug          string     `json:"slug"`
	Title         string     `json:"title"`
	ContentHTML   string     `json:"content_html"`
	CoverImageURL string     `json:"cover_image_url"`
	LocationID    int        `json:"location_id"` // Destination ID used by search.
	Tags          []string   `json:"tags"`
	AuthorID      string     `json:"author_id"`
	AuthorName    string     `json:"author_name"`
	IsPublished   bool       `json:"is_published"`
	PublishedAt   *time.Time `json:"published_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func toArticleResponse(a *domain.Article) ArticleResponse {
	return ArticleResponse{
		ID: a.ID, Slug: a.Slug, Title: a.Title, ContentHTML: a.ContentHTML,
		CoverImageURL: a.CoverImageURL, LocationID: a.LocationID,
		Tags: a.Tags, AuthorID: a.AuthorID,
		AuthorName: a.AuthorName, IsPublished: a.IsPublished, PublishedAt: a.PublishedAt,
		CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
	}
}

func articleResponses(items []domain.Article) []ArticleResponse {
	out := make([]ArticleResponse, 0, len(items))
	for i := range items {
		out = append(out, toArticleResponse(&items[i]))
	}
	return out
}
