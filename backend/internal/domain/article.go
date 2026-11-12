package domain

import "time"

type Article struct {
	ID            string     `json:"id"`
	Slug          string     `json:"slug"`
	Title         string     `json:"title"`
	ContentHTML   string     `json:"content_html"`
	CoverImageURL string     `json:"cover_image_url"`
	LocationID    int        `json:"location_id"`
	Tags          []string   `json:"tags"`
	AuthorID      string     `json:"author_id"`
	AuthorName    string     `json:"author_name"`
	IsPublished   bool       `json:"is_published"`
	PublishedAt   *time.Time `json:"published_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type ArticleFilter struct {
	Published *bool
	Tag       string
	Search    string
}

type ArticlePatch struct {
	Slug          *string
	Title         *string
	ContentHTML   *string
	CoverImageURL *string
	LocationID    *int
	Tags          *[]string
}
