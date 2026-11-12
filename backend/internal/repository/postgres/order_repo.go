package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type OrderRepo struct{ db *pgxpool.Pool }

func NewOrderRepo(db *pgxpool.Pool) *OrderRepo { return &OrderRepo{db: db} }

const orderColumns = `id, user_id, booking_id, status, total, currency, COALESCE(base_total,total), rate_id, quoted_at, created_at, updated_at, cancelled_at, cancelled_by, cancellation_reason, fulfilled_at, moderated_at, moderated_by`

func scanOrder(row pgx.Row) (*domain.Order, error) {
	var o domain.Order
	err := row.Scan(&o.ID, &o.UserID, &o.BookingID, &o.Status, &o.Total, &o.Currency, &o.BaseTotal, &o.RateID, &o.QuotedAt,
		&o.CreatedAt, &o.UpdatedAt, &o.CancelledAt, &o.CancelledBy, &o.CancellationReason,
		&o.FulfilledAt, &o.ModeratedAt, &o.ModeratedBy)
	if err != nil {
		return nil, err
	}
	o.LoadedAt = o.UpdatedAt
	return &o, nil
}

func (r *OrderRepo) GetByID(ctx context.Context, id string) (*domain.Order, error) {
	o, err := scanOrder(r.db.QueryRow(ctx, `SELECT `+orderColumns+` FROM orders WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("order %s: %w", id, domain.ErrOrderNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get order: %w", err)
	}
	if err := r.loadItems(ctx, []*domain.Order{o}); err != nil {
		return nil, err
	}
	if err := r.loadClientNames(ctx, []*domain.Order{o}); err != nil {
		return nil, err
	}
	return o, nil
}

func (r *OrderRepo) Create(ctx context.Context, o *domain.Order) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, `INSERT INTO orders (id, user_id, booking_id, status, total, currency, base_total, rate_id, quoted_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, o.ID, o.UserID, o.BookingID, o.Status, o.Total, o.Currency, o.BaseTotal, o.RateID, o.QuotedAt, o.CreatedAt, o.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "orders_one_pending_cart_per_user_idx" {
			return fmt.Errorf("pending cart already exists: %w", domain.ErrOrderConflict)
		}
		return fmt.Errorf("create order: %w", err)
	}
	if err := insertOrderItems(ctx, tx, o); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *OrderRepo) Update(ctx context.Context, o *domain.Order) error {
	return r.update(ctx, o, nil)
}

func (r *OrderRepo) UpdatePending(ctx context.Context, o *domain.Order, cutoff time.Time) error {
	return r.update(ctx, o, &cutoff)
}

func (r *OrderRepo) update(ctx context.Context, o *domain.Order, pendingCutoff *time.Time) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	query := `UPDATE orders SET booking_id=$1, status=$2, total=$3, currency=$4, base_total=$5, rate_id=$6, quoted_at=$7, updated_at=$8,
		cancelled_at=$9, cancelled_by=$10, cancellation_reason=$11,
		fulfilled_at=$12, moderated_at=$13, moderated_by=$14
		WHERE id=$15 AND updated_at=$16`
	args := []any{o.BookingID, o.Status, o.Total, o.Currency, o.BaseTotal, o.RateID, o.QuotedAt, o.UpdatedAt,
		o.CancelledAt, o.CancelledBy, o.CancellationReason, o.FulfilledAt, o.ModeratedAt, o.ModeratedBy, o.ID, o.LoadedAt}
	if pendingCutoff != nil {
		query += ` AND status='pending' AND created_at>$17`
		args = append(args, *pendingCutoff)
	}
	tag, err := tx.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update order: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("order %s: %w", o.ID, domain.ErrOrderConflict)
	}
	allExisting := true
	for _, item := range o.Items {
		if item.ID == "" {
			allExisting = false
			break
		}
	}
	if allExisting {
		for i, item := range o.Items {
			tag, err := tx.Exec(ctx, `UPDATE order_items SET product_id=$1, quantity=$2, unit_price=$3,
				currency=$4, service_date=$5, position=$6 WHERE id=$7 AND order_id=$8`,
				item.ProductID, item.Quantity, item.Price, item.Currency, item.Date, i+1, item.ID, o.ID)
			if err != nil {
				return err
			}
			if tag.RowsAffected() != 1 {
				return fmt.Errorf("order item missing: %w", domain.ErrOrderConflict)
			}
		}
	} else {
		if _, err := tx.Exec(ctx, `DELETE FROM order_items WHERE order_id=$1`, o.ID); err != nil {
			return err
		}
		if err := insertOrderItems(ctx, tx, o); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func insertOrderItems(ctx context.Context, tx pgx.Tx, o *domain.Order) error {
	for i, item := range o.Items {
		_, err := tx.Exec(ctx, `INSERT INTO order_items (order_id, product_id, quantity, unit_price, currency, service_date, position)
			VALUES ($1,$2,$3,$4,$5,$6,$7)`, o.ID, item.ProductID, item.Quantity, item.Price, item.Currency, item.Date, i+1)
		if err != nil {
			return fmt.Errorf("save order item: %w", err)
		}
	}
	return nil
}

func (r *OrderRepo) GetByUserID(ctx context.Context, userID string, sort domain.Sort, statuses []domain.OrderStatus, limit, offset int) ([]domain.Order, int, error) {
	if len(statuses) > 0 {
		values := make([]string, len(statuses))
		for i, status := range statuses {
			values[i] = string(status)
		}
		return r.list(ctx, `WHERE user_id=$1 AND status=ANY($2::text[])`, []any{userID, values, limit, offset}, orderSortSQL(sort, false))
	}
	return r.list(ctx, `WHERE user_id=$1`, []any{userID, limit, offset}, orderSortSQL(sort, false))
}

func orderSortSQL(sort domain.Sort, qualified bool) string {
	prefix := ""
	if qualified {
		prefix = "o."
	}
	field := "created_at"
	if sort.By == "fulfilled_at" {
		field = "fulfilled_at"
	}
	direction := "DESC"
	if sort.Order == "asc" {
		direction = "ASC"
	}
	order := prefix + field + " " + direction
	if field == "fulfilled_at" {
		order += " NULLS LAST"
	}
	return order + ", " + prefix + "id " + direction
}

func (r *OrderRepo) GetAll(ctx context.Context, filter domain.OrderFilter, limit, offset int) ([]domain.Order, int, error) {
	statuses := make([]string, len(filter.Statuses))
	for i, status := range filter.Statuses {
		statuses[i] = string(status)
	}
	args := []any{filter.CreatedFrom, filter.CreatedTo, filter.FulfilledFrom, filter.FulfilledTo,
		statuses, filter.ClientID, filter.ModeratorID, filter.LocationID, filter.CounterpartyID}
	const where = ` WHERE ($1::timestamptz IS NULL OR o.created_at >= $1)
		AND ($2::timestamptz IS NULL OR o.created_at < $2)
		AND ($3::timestamptz IS NULL OR o.fulfilled_at >= $3)
		AND ($4::timestamptz IS NULL OR o.fulfilled_at < $4)
		AND (cardinality($5::text[]) = 0 OR o.status = ANY($5::text[]))
		AND ($6::uuid IS NULL OR o.user_id = $6)
		AND ($7::uuid IS NULL OR o.moderated_by = $7)
		AND ($8::integer IS NULL OR EXISTS (
			SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id
			WHERE oi.order_id = o.id AND p.location_id = $8))
		AND ($9::uuid IS NULL OR EXISTS (
			SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id
			WHERE oi.order_id = o.id AND p.counterparty_id = $9))`
	var total int
	if err := r.db.QueryRow(ctx, `SELECT count(*) FROM orders o`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.Query(ctx, `SELECT `+orderColumns+` FROM orders o`+where+` ORDER BY `+orderSortSQL(filter.Sort, true)+` LIMIT $10 OFFSET $11`, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	orders := make([]domain.Order, 0)
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, 0, err
		}
		orders = append(orders, *o)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	rows.Close()
	ptrs := make([]*domain.Order, len(orders))
	for i := range orders {
		ptrs[i] = &orders[i]
	}
	if err := r.loadItems(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	if err := r.loadClientNames(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	return orders, total, nil
}

func (r *OrderRepo) list(ctx context.Context, where string, args []any, orderBy string) ([]domain.Order, int, error) {
	limitParam := fmt.Sprintf("$%d", len(args)-1)
	offsetParam := fmt.Sprintf("$%d", len(args))
	query := `SELECT ` + orderColumns + `, count(*) OVER() FROM orders ` + where + ` ORDER BY ` + orderBy + ` LIMIT ` + limitParam + ` OFFSET ` + offsetParam
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var orders []domain.Order
	var total int
	for rows.Next() {
		var o domain.Order
		if err := rows.Scan(&o.ID, &o.UserID, &o.BookingID, &o.Status, &o.Total, &o.Currency, &o.BaseTotal, &o.RateID, &o.QuotedAt,
			&o.CreatedAt, &o.UpdatedAt, &o.CancelledAt, &o.CancelledBy, &o.CancellationReason,
			&o.FulfilledAt, &o.ModeratedAt, &o.ModeratedBy, &total); err != nil {
			return nil, 0, err
		}
		o.LoadedAt = o.UpdatedAt
		orders = append(orders, o)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	rows.Close()
	ptrs := make([]*domain.Order, len(orders))
	for i := range orders {
		ptrs[i] = &orders[i]
	}
	if err := r.loadItems(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	if err := r.loadClientNames(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	return orders, total, nil
}

func (r *OrderRepo) loadClientNames(ctx context.Context, orders []*domain.Order) error {
	if len(orders) == 0 {
		return nil
	}
	ids := make([]string, len(orders))
	byID := make(map[string][]*domain.Order)
	for i, order := range orders {
		ids[i] = order.UserID
		byID[order.UserID] = append(byID[order.UserID], order)
	}
	rows, err := r.db.Query(ctx, `SELECT u.id,u.email,
		COALESCE(NULLIF(trim(concat_ws(' ',p.first_name,p.last_name)),''),u.email)
		FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.id=ANY($1::uuid[])`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id, email, name string
		if err := rows.Scan(&id, &email, &name); err != nil {
			return err
		}
		for _, order := range byID[id] {
			order.ClientName, order.ClientEmail = name, email
		}
	}
	return rows.Err()
}

func (r *OrderRepo) loadItems(ctx context.Context, orders []*domain.Order) error {
	if len(orders) == 0 {
		return nil
	}
	ids := make([]string, len(orders))
	byID := make(map[string]*domain.Order, len(orders))
	for i, o := range orders {
		ids[i], byID[o.ID] = o.ID, o
		o.Items = []domain.OrderItem{}
	}
	rows, err := r.db.Query(ctx, `SELECT oi.order_id, oi.id, oi.product_id, p.name, p.name_ru, p.thumbnail->>'url',
		oi.quantity, oi.unit_price, oi.currency, oi.service_date::text
		FROM order_items oi JOIN products p ON p.id=oi.product_id
		WHERE oi.order_id = ANY($1::uuid[]) ORDER BY oi.order_id, oi.position`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var orderID string
		var item domain.OrderItem
		if err := rows.Scan(&orderID, &item.ID, &item.ProductID, &item.ProductName, &item.ProductNameRU, &item.ProductThumbnailURL, &item.Quantity, &item.Price, &item.Currency, &item.Date); err != nil {
			return err
		}
		byID[orderID].Items = append(byID[orderID].Items, item)
	}
	return rows.Err()
}
