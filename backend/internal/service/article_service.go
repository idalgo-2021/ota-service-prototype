package service

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"golang.org/x/net/html"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ArticleRepository interface {
	List(context.Context, domain.ArticleFilter, int, int) ([]domain.Article, int, error)
	GetBySlug(context.Context, string) (*domain.Article, error)
	Get(context.Context, string) (*domain.Article, error)
	Create(context.Context, domain.Article) (*domain.Article, error)
	Patch(context.Context, string, domain.ArticlePatch) (*domain.Article, error)
	Publish(context.Context, string, bool) (*domain.Article, error)
}

type ArticleService struct{ repo ArticleRepository }

func NewArticleService(repo ArticleRepository) *ArticleService { return &ArticleService{repo: repo} }

var articleSlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var allowedArticleTags = map[string]bool{"p": true, "h1": true, "h2": true, "h3": true, "h4": true, "h5": true, "h6": true, "ul": true, "ol": true, "li": true, "blockquote": true, "strong": true, "b": true, "em": true, "i": true, "u": true, "s": true, "del": true, "br": true, "hr": true, "a": true, "img": true, "pre": true, "code": true, "table": true, "thead": true, "tbody": true, "tr": true, "th": true, "td": true}
var droppedArticleTags = map[string]bool{"script": true, "style": true, "iframe": true, "object": true, "embed": true, "svg": true, "math": true, "form": true}

func safeArticleURL(raw string) bool {
	v, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	if v.Scheme == "" {
		return !strings.HasPrefix(raw, "//")
	}
	return strings.EqualFold(v.Scheme, "https") || strings.EqualFold(v.Scheme, "http")
}

func sanitizeArticleNode(n *html.Node) *html.Node {
	if n.Type == html.ElementNode {
		name := strings.ToLower(n.Data)
		if droppedArticleTags[name] {
			return nil
		}
		if !allowedArticleTags[name] {
			out := &html.Node{Type: html.DocumentNode}
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				if v := sanitizeArticleNode(c); v != nil {
					out.AppendChild(v)
				}
			}
			return out
		}
		out := &html.Node{Type: html.ElementNode, Data: name, DataAtom: n.DataAtom}
		for _, a := range n.Attr {
			key := strings.ToLower(a.Key)
			value := strings.TrimSpace(a.Val)
			keep := false
			switch name {
			case "a":
				if key == "href" {
					keep = safeArticleURL(value)
				} else if key == "title" {
					keep = true
				}
			case "img":
				if key == "src" {
					keep = safeArticleURL(value)
				} else if key == "alt" || key == "title" || key == "width" || key == "height" {
					keep = true
				}
			case "ol":
				keep = key == "start"
			case "td", "th":
				keep = key == "colspan" || key == "rowspan"
			}
			if keep {
				out.Attr = append(out.Attr, html.Attribute{Key: key, Val: value})
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if v := sanitizeArticleNode(c); v != nil {
				if v.Type == html.DocumentNode {
					for child := v.FirstChild; child != nil; {
						next := child.NextSibling
						v.RemoveChild(child)
						out.AppendChild(child)
						child = next
					}
				} else {
					out.AppendChild(v)
				}
			}
		}
		return out
	}
	if n.Type == html.TextNode {
		return &html.Node{Type: html.TextNode, Data: n.Data}
	}
	return nil
}

func sanitizeArticleHTML(input string) (string, error) {
	root, err := html.Parse(strings.NewReader(input))
	if err != nil {
		return "", fmt.Errorf("%w: invalid HTML", domain.ErrInvalidInput)
	}
	var body *html.Node
	var find func(*html.Node)
	find = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "body" {
			body = n
			return
		}
		for c := n.FirstChild; c != nil && body == nil; c = c.NextSibling {
			find(c)
		}
	}
	find(root)
	var buf bytes.Buffer
	if body != nil {
		for c := body.FirstChild; c != nil; c = c.NextSibling {
			v := sanitizeArticleNode(c)
			if v == nil {
				continue
			}
			if v.Type == html.DocumentNode {
				for child := v.FirstChild; child != nil; child = child.NextSibling {
					_ = html.Render(&buf, child)
				}
			} else {
				_ = html.Render(&buf, v)
			}
		}
	}
	return buf.String(), nil
}

func cleanTags(tags []string) ([]string, error) {
	out := make([]string, 0, len(tags))
	seen := map[string]bool{}
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag == "" || len([]rune(tag)) > 64 {
			return nil, fmt.Errorf("%w: tags must contain 1 to 64 characters", domain.ErrInvalidInput)
		}
		key := strings.ToLower(tag)
		if !seen[key] {
			seen[key] = true
			out = append(out, tag)
		}
	}
	if len(out) > 20 {
		return nil, fmt.Errorf("%w: no more than 20 tags are allowed", domain.ErrInvalidInput)
	}
	return out, nil
}

func validateArticle(slug, title, cover string) error {
	if !articleSlugPattern.MatchString(slug) || len(slug) > 160 {
		return fmt.Errorf("%w: slug must contain lowercase letters, numbers and hyphens", domain.ErrInvalidInput)
	}
	if strings.TrimSpace(title) == "" || len([]rune(title)) > 300 {
		return fmt.Errorf("%w: title must contain 1 to 300 characters", domain.ErrInvalidInput)
	}
	if cover != "" && !safeArticleURL(cover) {
		return fmt.Errorf("%w: cover_image_url must be an HTTP(S) or relative URL", domain.ErrInvalidInput)
	}
	return nil
}

func (s *ArticleService) List(ctx context.Context, f domain.ArticleFilter, limit, offset int) ([]domain.Article, int, error) {
	return s.repo.List(ctx, f, limit, offset)
}
func (s *ArticleService) GetBySlug(ctx context.Context, slug string) (*domain.Article, error) {
	return s.repo.GetBySlug(ctx, slug)
}
func (s *ArticleService) Get(ctx context.Context, id string) (*domain.Article, error) {
	return s.repo.Get(ctx, id)
}
func (s *ArticleService) Create(ctx context.Context, authorID string, a domain.Article) (*domain.Article, error) {
	if a.LocationID <= 0 {
		return nil, fmt.Errorf("%w: location_id is required", domain.ErrInvalidInput)
	}
	a.Slug = strings.TrimSpace(a.Slug)
	a.Title = strings.TrimSpace(a.Title)
	a.CoverImageURL = strings.TrimSpace(a.CoverImageURL)
	if err := validateArticle(a.Slug, a.Title, a.CoverImageURL); err != nil {
		return nil, err
	}
	var err error
	a.Tags, err = cleanTags(a.Tags)
	if err != nil {
		return nil, err
	}
	a.ContentHTML, err = sanitizeArticleHTML(a.ContentHTML)
	if err != nil {
		return nil, err
	}
	a.AuthorID = authorID
	return s.repo.Create(ctx, a)
}
func (s *ArticleService) Patch(ctx context.Context, id string, p domain.ArticlePatch) (*domain.Article, error) {
	if p.Slug != nil {
		v := strings.TrimSpace(*p.Slug)
		p.Slug = &v
		if !articleSlugPattern.MatchString(v) || len(v) > 160 {
			return nil, fmt.Errorf("%w: invalid slug", domain.ErrInvalidInput)
		}
	}
	if p.Title != nil {
		v := strings.TrimSpace(*p.Title)
		p.Title = &v
		if v == "" || len([]rune(v)) > 300 {
			return nil, fmt.Errorf("%w: invalid title", domain.ErrInvalidInput)
		}
	}
	if p.CoverImageURL != nil {
		v := strings.TrimSpace(*p.CoverImageURL)
		p.CoverImageURL = &v
		if v != "" && !safeArticleURL(v) {
			return nil, fmt.Errorf("%w: invalid cover_image_url", domain.ErrInvalidInput)
		}
	}
	if p.LocationID != nil && *p.LocationID <= 0 {
		return nil, fmt.Errorf("%w: location_id must be positive", domain.ErrInvalidInput)
	}
	if p.ContentHTML != nil {
		v, err := sanitizeArticleHTML(*p.ContentHTML)
		if err != nil {
			return nil, err
		}
		p.ContentHTML = &v
	}
	if p.Tags != nil {
		v, err := cleanTags(*p.Tags)
		if err != nil {
			return nil, err
		}
		p.Tags = &v
	}
	if p.Slug == nil && p.Title == nil && p.ContentHTML == nil && p.CoverImageURL == nil && p.Tags == nil {
		return nil, fmt.Errorf("%w: patch must contain at least one field", domain.ErrInvalidInput)
	}
	return s.repo.Patch(ctx, id, p)
}
func (s *ArticleService) Publish(ctx context.Context, id string, published bool) (*domain.Article, error) {
	return s.repo.Publish(ctx, id, published)
}
