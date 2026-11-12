package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ArticleRepo struct{ db *pgxpool.Pool }

func NewArticleRepo(db *pgxpool.Pool) *ArticleRepo { return &ArticleRepo{db: db} }

const articleColumns = `a.id,a.slug,a.title,a.content_html,a.cover_image_url,a.author_id,
COALESCE(NULLIF(btrim(concat_ws(' ',p.first_name,p.last_name)),''),u.email),
a.location_id,
a.is_published,a.published_at,a.created_at,a.updated_at`

func scanArticle(row pgx.Row) (domain.Article, error) {
	var a domain.Article
	err := row.Scan(&a.ID, &a.Slug, &a.Title, &a.ContentHTML, &a.CoverImageURL, &a.AuthorID,
		&a.AuthorName, &a.LocationID, &a.IsPublished,
		&a.PublishedAt, &a.CreatedAt, &a.UpdatedAt)
	return a, err
}

func (r *ArticleRepo) loadTags(ctx context.Context, a *domain.Article) error {
	a.Tags = []string{}
	rows, err := r.db.Query(ctx, `SELECT tag FROM article_tags WHERE article_id=$1 ORDER BY lower(tag),tag`, a.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return err
		}
		a.Tags = append(a.Tags, tag)
	}
	return rows.Err()
}

func (r *ArticleRepo) get(ctx context.Context, where string, value any) (*domain.Article, error) {
	a, err := scanArticle(r.db.QueryRow(ctx, `SELECT `+articleColumns+`
		FROM articles a JOIN users u ON u.id=a.author_id LEFT JOIN user_profiles p ON p.user_id=u.id
		WHERE `+where, value))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("article not found")
	}
	if err != nil {
		return nil, err
	}
	if err := r.loadTags(ctx, &a); err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *ArticleRepo) Get(ctx context.Context, id string) (*domain.Article, error) {
	return r.get(ctx, "a.id=$1", id)
}

func (r *ArticleRepo) GetBySlug(ctx context.Context, slug string) (*domain.Article, error) {
	return r.get(ctx, "a.slug=$1 AND a.is_published", slug)
}

func (r *ArticleRepo) List(ctx context.Context, f domain.ArticleFilter, limit, offset int) ([]domain.Article, int, error) {
	where := []string{"TRUE"}
	args := []any{}
	if f.Published != nil {
		args = append(args, *f.Published)
		where = append(where, fmt.Sprintf("a.is_published=$%d", len(args)))
	}
	if f.Tag != "" {
		args = append(args, f.Tag)
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM article_tags t WHERE t.article_id=a.id AND lower(t.tag)=lower($%d))", len(args)))
	}
	if f.Search != "" {
		args = append(args, "%"+strings.ReplaceAll(strings.ReplaceAll(f.Search, "%", "\\%"), "_", "\\_")+"%")
		where = append(where, fmt.Sprintf("(a.title ILIKE $%d ESCAPE '\\' OR a.content_html ILIKE $%d ESCAPE '\\')", len(args), len(args)))
	}
	condition := strings.Join(where, " AND ")
	var total int
	if err := r.db.QueryRow(ctx, `SELECT count(*) FROM articles a WHERE `+condition, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	query := `SELECT ` + articleColumns + ` FROM articles a JOIN users u ON u.id=a.author_id LEFT JOIN user_profiles p ON p.user_id=u.id
		WHERE ` + condition +
		fmt.Sprintf(` ORDER BY a.published_at DESC NULLS LAST,a.created_at DESC,a.id DESC LIMIT $%d OFFSET $%d`, len(args)+1, len(args)+2)
	rows, err := r.db.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []domain.Article{}
	for rows.Next() {
		a, err := scanArticle(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, a)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	for i := range items {
		if err := r.loadTags(ctx, &items[i]); err != nil {
			return nil, 0, err
		}
	}
	return items, total, nil
}

func articleWriteError(err error) error {
	var pe *pgconn.PgError
	if errors.As(err, &pe) {
		switch pe.Code {
		case "23505":
			return domain.NewConflict("article slug already exists")
		case "23503", "23514", "23502", "22P02":
			return fmt.Errorf("%w: invalid article value", domain.ErrInvalidInput)
		}
	}
	return err
}

func replaceArticleTags(ctx context.Context, tx pgx.Tx, id string, tags []string) error {
	if _, err := tx.Exec(ctx, `DELETE FROM article_tags WHERE article_id=$1`, id); err != nil {
		return err
	}
	for _, tag := range tags {
		if _, err := tx.Exec(ctx, `INSERT INTO article_tags(article_id,tag) VALUES($1,$2)`, id, tag); err != nil {
			return articleWriteError(err)
		}
	}
	return nil
}

func (r *ArticleRepo) Create(ctx context.Context, a domain.Article) (*domain.Article, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO articles(slug,title,content_html,cover_image_url,location_id,author_id)
		VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, a.Slug, a.Title, a.ContentHTML, a.CoverImageURL, a.LocationID, a.AuthorID).Scan(&id)
	if err != nil {
		return nil, articleWriteError(err)
	}
	if err := replaceArticleTags(ctx, tx, id, a.Tags); err != nil {
		return nil, articleWriteError(err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, articleWriteError(err)
	}
	return r.Get(ctx, id)
}

func (r *ArticleRepo) Patch(ctx context.Context, id string, p domain.ArticlePatch) (*domain.Article, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	args := []any{id}
	sets := []string{}
	add := func(col string, v *string) {
		if v != nil {
			args = append(args, *v)
			sets = append(sets, fmt.Sprintf("%s=$%d", col, len(args)))
		}
	}
	add("slug", p.Slug)
	add("title", p.Title)
	add("content_html", p.ContentHTML)
	add("cover_image_url", p.CoverImageURL)
	if p.LocationID != nil {
		args = append(args, *p.LocationID)
		sets = append(sets, fmt.Sprintf("location_id=$%d", len(args)))
	}
	if len(sets) > 0 {
		sets = append(sets, "updated_at=now()")
		ct, err := tx.Exec(ctx, `UPDATE articles SET `+strings.Join(sets, ",")+` WHERE id=$1`, args...)
		if err != nil {
			return nil, articleWriteError(err)
		}
		if ct.RowsAffected() == 0 {
			return nil, domain.NewNotFound("article not found")
		}
	}
	if p.Tags != nil {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM articles WHERE id=$1)`, id).Scan(&exists); err != nil {
			return nil, err
		}
		if !exists {
			return nil, domain.NewNotFound("article not found")
		}
		if err := replaceArticleTags(ctx, tx, id, *p.Tags); err != nil {
			return nil, articleWriteError(err)
		}
		if _, err := tx.Exec(ctx, `UPDATE articles SET updated_at=now() WHERE id=$1`, id); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, articleWriteError(err)
	}
	return r.Get(ctx, id)
}

func (r *ArticleRepo) Publish(ctx context.Context, id string, published bool) (*domain.Article, error) {
	var aID string
	err := r.db.QueryRow(ctx, `UPDATE articles SET is_published=$2,
		published_at=CASE WHEN $2 AND NOT is_published THEN now() ELSE published_at END,updated_at=now()
		WHERE id=$1 RETURNING id`, id, published).Scan(&aID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("article not found")
	}
	if err != nil {
		return nil, articleWriteError(err)
	}
	return r.Get(ctx, aID)
}
