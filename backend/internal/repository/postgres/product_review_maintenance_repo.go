package postgres

import (
	"context"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/maintenance"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductReviewMaintenanceRepo struct{ db *pgxpool.Pool }

func NewProductReviewMaintenanceRepo(db *pgxpool.Pool) *ProductReviewMaintenanceRepo {
	return &ProductReviewMaintenanceRepo{db: db}
}

func (r *ProductReviewMaintenanceRepo) PreviewProductReviewDrafts(ctx context.Context, since, until time.Time, limit int) ([]maintenance.ProductReviewDraftCandidate, error) {
	rows, err := r.db.Query(ctx, `SELECT o.id, oi.product_id FROM orders o
		JOIN order_items oi ON oi.order_id=o.id
		WHERE o.status='fulfilled' AND o.fulfilled_at >= $1 AND o.fulfilled_at < $2
			AND NOT EXISTS (SELECT 1 FROM product_reviews rv WHERE rv.order_id=o.id AND rv.product_id=oi.product_id)
		GROUP BY o.id, oi.product_id
		ORDER BY min(o.fulfilled_at), o.id, oi.product_id LIMIT $3`, since, until, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []maintenance.ProductReviewDraftCandidate{}
	for rows.Next() {
		var c maintenance.ProductReviewDraftCandidate
		if err := rows.Scan(&c.OrderID, &c.ProductID); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func (r *ProductReviewMaintenanceRepo) PendingProductReviewDrafts(ctx context.Context, after *maintenance.ProductReviewDraftCandidate, limit int) ([]maintenance.ProductReviewDraftCandidate, error) {
	var afterOrder, afterProduct any
	if after != nil {
		afterOrder, afterProduct = after.OrderID, after.ProductID
	}
	rows, err := r.db.Query(ctx, `SELECT DISTINCT o.id, oi.product_id FROM orders o
		JOIN order_items oi ON oi.order_id=o.id
		WHERE o.status='fulfilled'
			AND NOT EXISTS (SELECT 1 FROM product_reviews rv WHERE rv.order_id=o.id AND rv.product_id=oi.product_id)
			AND ($1::uuid IS NULL OR (o.id,oi.product_id)>($1::uuid,$2::uuid))
		ORDER BY o.id, oi.product_id LIMIT $3`, afterOrder, afterProduct, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []maintenance.ProductReviewDraftCandidate{}
	for rows.Next() {
		var c maintenance.ProductReviewDraftCandidate
		if err := rows.Scan(&c.OrderID, &c.ProductID); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func (r *ProductReviewMaintenanceRepo) CreateProductReviewDraft(ctx context.Context, c maintenance.ProductReviewDraftCandidate) (bool, error) {
	var id string
	err := r.db.QueryRow(ctx, `INSERT INTO product_reviews (is_imported,author_id,product_id,order_id,status)
		SELECT DISTINCT false, o.user_id, oi.product_id, o.id, 'draft'
		FROM orders o JOIN order_items oi ON oi.order_id=o.id
		WHERE o.id=$1 AND oi.product_id=$2 AND o.status='fulfilled'
		ON CONFLICT DO NOTHING RETURNING id`, c.OrderID, c.ProductID).Scan(&id)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	return err == nil, err
}

func (r *ProductReviewMaintenanceRepo) ExpireProductReviewDrafts(ctx context.Context, cutoff time.Time) (int64, error) {
	ct, err := r.db.Exec(ctx, `UPDATE product_reviews SET status='rejected', rejection_reason='expired',
		updated_at=now() WHERE status='draft' AND created_at <= $1`, cutoff)
	if err != nil {
		return 0, err
	}
	return ct.RowsAffected(), nil
}
