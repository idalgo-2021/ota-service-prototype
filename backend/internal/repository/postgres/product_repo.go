package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

// scanProduct is a helper that scans a single product row and unmarshals JSONB fields.
func scanProduct(scannable interface {
	Scan(dest ...any) error
}, product *domain.Product) error {
	var thumbnailJSON, imagesJSON, attributesJSON, scheduleJSON []byte

	err := scannable.Scan(
		&product.ID,
		&product.ProductType, &product.LocationID, &product.LocationName, &product.LocationNameRU, &product.CountryName, &product.CountryNameRU,
		&product.CounterpartyID, &product.CounterpartyName, &product.IsActive, &product.DeactivatedAt,
		&product.Name,
		&product.NameRU,
		&product.Description,
		&product.DescriptionRU,
		&product.Price,
		&product.Currency,
		&thumbnailJSON,
		&imagesJSON,
		&attributesJSON,
		&scheduleJSON,
		&product.AverageRating,
		&product.ReviewCount,
		&product.CreatedAt,
		&product.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to scan product: %w", err)
	}

	if err := json.Unmarshal(thumbnailJSON, &product.Thumbnail); err != nil {
		return fmt.Errorf("failed to unmarshal thumbnail: %w", err)
	}
	if err := json.Unmarshal(imagesJSON, &product.Images); err != nil {
		return fmt.Errorf("failed to unmarshal images: %w", err)
	}
	if err := json.Unmarshal(attributesJSON, &product.Attributes); err != nil {
		return fmt.Errorf("failed to unmarshal attributes: %w", err)
	}
	if len(scheduleJSON) > 0 {
		if err := json.Unmarshal(scheduleJSON, &product.Schedule); err != nil {
			return fmt.Errorf("failed to unmarshal schedule: %w", err)
		}
	}
	if err := product.ValidateSchedule(); err != nil {
		return fmt.Errorf("invalid product schedule: %w", err)
	}

	return nil
}

type ProductRepo struct {
	db *pgxpool.Pool
}

func NewProductRepo(db *pgxpool.Pool) *ProductRepo {
	return &ProductRepo{db: db}
}

func (r *ProductRepo) GetByID(ctx context.Context, id string, activeOnly bool) (*domain.Product, error) {
	query := `
		SELECT p.id, p.product_type, p.location_id, l.name, l.name_ru, country.name, country.name_ru,
		       p.counterparty_id, c.name, p.is_active, p.deactivated_at, p.name, p.name_ru, p.description, p.description_ru, p.price, p.currency, p.thumbnail, p.images, p.attributes, p.schedule,
		       reviews.average_rating, reviews.review_count, p.created_at, p.updated_at
		FROM products p LEFT JOIN counterparties c ON c.id = p.counterparty_id
		LEFT JOIN locations l ON l.id=p.location_id LEFT JOIN countries country ON country.id=l.country_id
		LEFT JOIN LATERAL (SELECT ROUND(AVG(pr.rating), 2) average_rating, COUNT(*)::int review_count FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved' AND NOT pr.is_hidden) reviews ON TRUE
		WHERE p.id = $1 AND (NOT $2 OR p.is_active)
	`

	var product domain.Product
	if err := scanProduct(r.db.QueryRow(ctx, query, id, activeOnly), &product); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("product %s: %w [%w]", id, domain.ErrProductNotFound, err)
		}
		return nil, fmt.Errorf("failed to get product: %w", err)
	}

	return &product, nil
}

func (r *ProductRepo) GetByIDs(ctx context.Context, ids []string) (map[string]*domain.Product, error) {
	if len(ids) == 0 {
		return make(map[string]*domain.Product), nil
	}

	query := `
		SELECT p.id, p.product_type, p.location_id, l.name, l.name_ru, country.name, country.name_ru,
		       p.counterparty_id, c.name, p.is_active, p.deactivated_at, p.name, p.name_ru, p.description, p.description_ru, p.price, p.currency, p.thumbnail, p.images, p.attributes, p.schedule,
		       reviews.average_rating, reviews.review_count, p.created_at, p.updated_at
		FROM products p LEFT JOIN counterparties c ON c.id = p.counterparty_id
		LEFT JOIN locations l ON l.id=p.location_id LEFT JOIN countries country ON country.id=l.country_id
		LEFT JOIN LATERAL (SELECT ROUND(AVG(pr.rating), 2) average_rating, COUNT(*)::int review_count FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved' AND NOT pr.is_hidden) reviews ON TRUE
		WHERE p.id = ANY($1)
	`

	rows, err := r.db.Query(ctx, query, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to get products by ids: %w", err)
	}
	defer rows.Close()

	result := make(map[string]*domain.Product, len(ids))
	for rows.Next() {
		var product domain.Product
		if err := scanProduct(rows, &product); err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		result[product.ID] = &product
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate products: %w", err)
	}

	return result, nil
}

func (r *ProductRepo) List(ctx context.Context, limit, offset int, filter domain.ProductFilter) ([]domain.Product, int, error) {
	priceExpr := `(CASE WHEN $7 = '' OR $7 = p.currency THEN p.price ELSE p.price * COALESCE((SELECT er.rate FROM exchange_rates er WHERE er.quote_currency = $7 AND er.effective_from <= now() ORDER BY er.effective_from DESC LIMIT 1), 0) END)`
	orderBy := `p.created_at DESC, p.id DESC`
	var orderParts []string
	appendSort := func(field, direction string) {
		switch field {
		case "created_at":
			if direction == "asc" {
				orderParts = append(orderParts, `p.created_at ASC`)
			} else {
				orderParts = append(orderParts, `p.created_at DESC`)
			}
		case "price":
			if direction == "desc" {
				orderParts = append(orderParts, priceExpr+` DESC`)
			} else {
				orderParts = append(orderParts, priceExpr+` ASC`)
			}
		case "average_rating":
			if direction == "desc" {
				orderParts = append(orderParts, `reviews.average_rating DESC NULLS LAST`)
			} else {
				orderParts = append(orderParts, `reviews.average_rating ASC NULLS LAST`)
			}
		}
	}
	appendSort(filter.Sort.By, filter.Sort.Order)
	appendSort(filter.Sort.ThenBy, filter.Sort.ThenOrder)
	if len(orderParts) > 0 {
		orderBy = strings.Join(orderParts, `, `) + `, p.id ASC`
	}
	query := `SELECT p.id, p.product_type, p.location_id, l.name, l.name_ru, country.name, country.name_ru,
		 p.counterparty_id, c.name, p.is_active, p.deactivated_at,
		 p.name, p.name_ru, p.description, p.description_ru, ` + priceExpr + `, CASE WHEN $7 = '' THEN p.currency ELSE $7 END, p.thumbnail, p.images, p.attributes, p.schedule,
		 reviews.average_rating, reviews.review_count, p.created_at, p.updated_at
	 FROM products p LEFT JOIN counterparties c ON c.id = p.counterparty_id
	 LEFT JOIN locations l ON l.id=p.location_id LEFT JOIN countries country ON country.id=l.country_id
	 LEFT JOIN LATERAL (SELECT ROUND(AVG(pr.rating), 2) average_rating, COUNT(*)::int review_count FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved' AND NOT pr.is_hidden) reviews ON TRUE
	 WHERE ($1::int IS NULL OR p.location_id = $1) AND (NOT $2 OR p.is_active)
 AND ($6::uuid IS NULL OR p.counterparty_id = $6)
	 AND ($3 = '' OR p.product_type = $3)
	 AND ($4 = '' OR p.attributes ->> $4 = $5)
	 AND ($8 = '' OR concat_ws(' ', p.name, p.name_ru, p.description, p.description_ru, l.name, l.name_ru, country.name, country.name_ru) ILIKE '%' || $8 || '%')
	ORDER BY ` + orderBy + ` LIMIT $9 OFFSET $10`
	countQuery := `SELECT count(*) FROM products p
	 LEFT JOIN locations l ON l.id=p.location_id LEFT JOIN countries country ON country.id=l.country_id
	 WHERE ($1::int IS NULL OR p.location_id = $1) AND (NOT $2 OR p.is_active)
	 AND ($3 = '' OR p.product_type = $3) AND ($4 = '' OR p.attributes ->> $4 = $5)
	 AND ($6::uuid IS NULL OR p.counterparty_id = $6)
	 AND ($7 = '' OR concat_ws(' ', p.name, p.name_ru, p.description, p.description_ru, l.name, l.name_ru, country.name, country.name_ru) ILIKE '%' || $7 || '%')`
	args := []any{filter.LocationID, filter.ActiveOnly, filter.ProductType, filter.AttributeKey, filter.AttributeValue, filter.CounterpartyID, filter.Currency, filter.SearchText}
	countArgs := []any{filter.LocationID, filter.ActiveOnly, filter.ProductType, filter.AttributeKey, filter.AttributeValue, filter.CounterpartyID, filter.SearchText}
	var total int
	if err := r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count products: %w", err)
	}
	rows, err := r.db.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()
	products := make([]domain.Product, 0)
	for rows.Next() {
		var product domain.Product
		if err := scanProduct(rows, &product); err != nil {
			return nil, 0, err
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate products: %w", err)
	}
	return products, total, nil
}
