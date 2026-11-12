package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductReviewRepo struct{ db *pgxpool.Pool }

func NewProductReviewRepo(db *pgxpool.Pool) *ProductReviewRepo { return &ProductReviewRepo{db: db} }

const productReviewColumns = `id, is_imported, author_id, external_source, external_review_id, external_author_id,
 author_display_name, product_id, order_id, rating, review_text, status, is_hidden, created_at,
 updated_at, submitted_at, original_at, reviewed_at, reviewed_by, rejection_reason,
 hidden_at, hidden_by, hidden_reason`

func scanProductReview(row pgx.Row) (domain.ProductReview, error) {
	var v domain.ProductReview
	err := row.Scan(&v.ID, &v.IsImported, &v.AuthorID, &v.ExternalSource, &v.ExternalReviewID,
		&v.ExternalAuthorID, &v.AuthorDisplayName, &v.ProductID,
		&v.OrderID, &v.Rating, &v.ReviewText, &v.Status, &v.IsHidden,
		&v.CreatedAt, &v.UpdatedAt, &v.SubmittedAt, &v.OriginalAt, &v.ReviewedAt,
		&v.ReviewedBy, &v.RejectionReason, &v.HiddenAt, &v.HiddenBy, &v.HiddenReason)
	return v, err
}

func productReviewWriteError(err error) error {
	var p *pgconn.PgError
	if errors.As(err, &p) {
		switch p.Code {
		case "23505":
			return domain.ErrAlreadyExists
		case "23503", "23514", "22P02":
			return fmt.Errorf("%w: invalid review reference or value", domain.ErrInvalidInput)
		}
	}
	return err
}

func (r *ProductReviewRepo) Get(ctx context.Context, id string) (*domain.ProductReview, error) {
	v, err := scanProductReview(r.db.QueryRow(ctx, `SELECT `+productReviewColumns+` FROM product_reviews WHERE id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("review not found")
	}
	if err != nil {
		return nil, err
	}
	if err := r.loadProductLabels(ctx, []*domain.ProductReview{&v}); err != nil {
		return nil, err
	}
	if err := r.loadClientNames(ctx, []*domain.ProductReview{&v}); err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *ProductReviewRepo) loadProductLabels(ctx context.Context, reviews []*domain.ProductReview) error {
	if len(reviews) == 0 {
		return nil
	}
	ids := make([]string, len(reviews))
	byID := make(map[string][]*domain.ProductReview)
	for i, review := range reviews {
		ids[i] = review.ProductID
		byID[review.ProductID] = append(byID[review.ProductID], review)
	}
	rows, err := r.db.Query(ctx, `SELECT id,name,name_ru,product_type,thumbnail->>'url' FROM products WHERE id=ANY($1::uuid[])`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id, name, productType string
		var nameRU, thumbnailURL *string
		if err := rows.Scan(&id, &name, &nameRU, &productType, &thumbnailURL); err != nil {
			return err
		}
		for _, review := range byID[id] {
			review.ProductName, review.ProductNameRU, review.ProductType = name, nameRU, productType
			review.ProductThumbnailURL = thumbnailURL
		}
	}
	return rows.Err()
}

func (r *ProductReviewRepo) loadClientNames(ctx context.Context, reviews []*domain.ProductReview) error {
	ids := []string{}
	for _, review := range reviews {
		if review.AuthorID != nil {
			ids = append(ids, *review.AuthorID)
		}
	}
	names, err := reviewClientNames(ctx, r.db, ids)
	if err != nil {
		return err
	}
	for _, review := range reviews {
		if review.AuthorID != nil {
			review.ClientName = names[*review.AuthorID]
		}
	}
	return nil
}

func productReviewWhere(f domain.ProductReviewFilter) (string, []any) {
	parts := []string{"TRUE"}
	args := []any{}
	add := func(column string, value any) {
		args = append(args, value)
		parts = append(parts, fmt.Sprintf("%s=$%d", column, len(args)))
	}
	if f.Public {
		parts = append(parts, "status='approved'", "NOT is_hidden")
	}
	if f.AuthorID != "" {
		add("author_id", f.AuthorID)
	}
	if f.Status != "" {
		add("status", f.Status)
	}
	if f.IsImported != nil {
		add("is_imported", *f.IsImported)
	}
	if f.ProductID != "" {
		add("product_id", f.ProductID)
	}
	if f.ProductType != "" {
		args = append(args, f.ProductType)
		parts = append(parts, fmt.Sprintf("EXISTS (SELECT 1 FROM products p WHERE p.id=product_id AND p.product_type=$%d)", len(args)))
	}
	return strings.Join(parts, " AND "), args
}

func productReviewOrderBy(f domain.ProductReviewFilter) string {
	if !f.Public {
		return "created_at DESC, id DESC"
	}
	direction := func(value string) string {
		if value == "asc" {
			return "ASC"
		}
		return "DESC"
	}
	parts := []string{}
	if f.Sort.CreatedAt != "" {
		parts = append(parts, "created_at "+direction(f.Sort.CreatedAt))
	}
	if f.Sort.Rating != "" {
		parts = append(parts, "rating "+direction(f.Sort.Rating)+" NULLS LAST")
	}
	if len(parts) == 0 {
		return "created_at DESC, id DESC"
	}
	return strings.Join(parts, ", ") + ", id DESC"
}

func (r *ProductReviewRepo) List(ctx context.Context, f domain.ProductReviewFilter, limit, offset int) ([]domain.ProductReview, int, error) {
	where, args := productReviewWhere(f)
	var total int
	if err := r.db.QueryRow(ctx, `SELECT count(*) FROM product_reviews WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	query := `SELECT ` + productReviewColumns + ` FROM product_reviews WHERE ` + where +
		fmt.Sprintf(` ORDER BY %s LIMIT $%d OFFSET $%d`, productReviewOrderBy(f), len(args)+1, len(args)+2)
	rows, err := r.db.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []domain.ProductReview{}
	for rows.Next() {
		v, err := scanProductReview(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, v)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	rows.Close()
	ptrs := make([]*domain.ProductReview, len(items))
	for i := range items {
		ptrs[i] = &items[i]
	}
	if err := r.loadProductLabels(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	if err := r.loadClientNames(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// PatchDraft checks ownership, state and deadline in the same SQL statement as the edit.
func (r *ProductReviewRepo) PatchDraft(ctx context.Context, id, authorID string, rating *int, body *string, cutoff time.Time) (*domain.ProductReview, error) {
	v, err := scanProductReview(r.db.QueryRow(ctx, `UPDATE product_reviews SET rating=coalesce($3,rating), review_text=coalesce($4,review_text), updated_at=now()
		WHERE id=$1 AND author_id=$2 AND NOT is_imported AND status='draft' AND created_at>$5
		RETURNING `+productReviewColumns, id, authorID, rating, body, cutoff))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewConflict("review draft is unavailable or expired")
	}
	if err != nil {
		return nil, productReviewWriteError(err)
	}
	return &v, nil
}

func (r *ProductReviewRepo) Submit(ctx context.Context, id, authorID string, cutoff time.Time) (*domain.ProductReview, error) {
	v, err := scanProductReview(r.db.QueryRow(ctx, `UPDATE product_reviews SET status='pending_moderation', submitted_at=now(), updated_at=now()
		WHERE id=$1 AND author_id=$2 AND NOT is_imported AND status='draft' AND created_at>$3
		AND rating IS NOT NULL AND NULLIF(btrim(review_text),'') IS NOT NULL
		RETURNING `+productReviewColumns, id, authorID, cutoff))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewConflict("review draft is unavailable, incomplete or expired")
	}
	if err != nil {
		return nil, productReviewWriteError(err)
	}
	return &v, nil
}

func (r *ProductReviewRepo) Moderate(ctx context.Context, id, moderatorID, action, reason string) (*domain.ProductReview, error) {
	var query string
	switch action {
	case "approve":
		query = `UPDATE product_reviews SET status='approved', is_hidden=false, reviewed_at=now(), reviewed_by=$2,
			rejection_reason=NULL, updated_at=now() WHERE id=$1 AND status='pending_moderation'`
	case "reject":
		query = `UPDATE product_reviews SET status='rejected', rejection_reason=$3, reviewed_at=now(), reviewed_by=$2,
			updated_at=now() WHERE id=$1 AND status='pending_moderation'`
	case "hide":
		query = `UPDATE product_reviews SET is_hidden=true, hidden_at=now(), hidden_by=$2, hidden_reason=$3,
			updated_at=now() WHERE id=$1 AND status='approved' AND NOT is_hidden`
	case "unhide":
		query = `UPDATE product_reviews SET is_hidden=false, hidden_at=NULL, hidden_by=NULL, hidden_reason=NULL,
			updated_at=now() WHERE id=$1 AND status='approved' AND is_hidden`
	default:
		return nil, fmt.Errorf("%w: invalid moderation action", domain.ErrInvalidInput)
	}
	query += ` RETURNING ` + productReviewColumns
	var row pgx.Row
	switch action {
	case "reject", "hide":
		row = r.db.QueryRow(ctx, query, id, moderatorID, reason)
	case "approve":
		row = r.db.QueryRow(ctx, query, id, moderatorID)
	case "unhide":
		row = r.db.QueryRow(ctx, query, id)
	}
	v, err := scanProductReview(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewConflict("review state does not allow this action")
	}
	if err != nil {
		return nil, productReviewWriteError(err)
	}
	return &v, nil
}
