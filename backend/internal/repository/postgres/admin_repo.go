package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminRepo keeps SQL identifiers behind a fixed resource whitelist. Values are
// always passed as parameters; no request-supplied identifier enters SQL text.
type AdminRepo struct{ db *pgxpool.Pool }

func NewAdminRepo(db *pgxpool.Pool) *AdminRepo { return &AdminRepo{db: db} }

type adminTable struct {
	table, id, columns, order string
}

var adminTables = map[string]adminTable{
	"countries":                {"countries", "id", "id,name,name_ru,code", "name,id"},
	"locations":                {"locations", "id", "id,country_id,name,name_ru,center_latitude,center_longitude", "name,id"},
	"listing_types":            {"listing_types", "id", "id,slug,name,name_ru", "id"},
	"currencies":               {"currencies", "code", "code,name,name_ru,is_active,created_at", "code"},
	"counterparties":           {"counterparties", "id", "id,name,location_id,created_at,updated_at", "name,id"},
	"listings":                 {"listings", "id", "id,title,title_ru,description,description_ru,main_picture,listing_type_id,address,address_ru,location_id,latitude,longitude,distance_from_center_km,average_overall_rating,average_rating_details,overall_rating_count,is_active,check_in_time,deactivated_at,created_at,updated_at,external_source,external_id,source_metadata,(SELECT COALESCE(json_agg(a.tag_id ORDER BY a.sort_order),'[]'::json) FROM listing_feature_tag_assignments a WHERE a.listing_id=listings.id) AS feature_ids", "created_at DESC,id DESC"},
	"listing_feature_tags":     {"listing_feature_tags", "id", "id,slug,name,name_ru,is_active,created_at,updated_at", "name,id"},
	"listing_review_summaries": {"(SELECT s.listing_id,s.summary,s.source_review_count,s.model_id,s.prompt_version,s.generated_at,s.synced_at,l.title AS listing_title,l.title_ru AS listing_title_ru,l.main_picture FROM listing_review_summaries s JOIN listings l ON l.id=s.listing_id) AS listing_review_summaries", "listing_id", "listing_id,summary,source_review_count,model_id,prompt_version,generated_at,synced_at,listing_title,listing_title_ru,main_picture", "generated_at DESC,listing_id"},
	"products":                 {"products", "id", "id,product_type,location_id,counterparty_id,(SELECT c.name FROM counterparties c WHERE c.id=counterparty_id) AS counterparty_name,is_active,deactivated_at,name,name_ru,description,description_ru,price,currency,thumbnail,images,attributes,schedule,created_at,updated_at", "created_at DESC,id DESC"},
	"exchange_rates":           {"exchange_rates", "id", "id,quote_currency,rate,effective_from,created_at", "effective_from DESC,id DESC"},
	"users":                    {"users", "id", "id,email,role,(SELECT first_name FROM user_profiles WHERE user_id=users.id) AS first_name,(SELECT last_name FROM user_profiles WHERE user_id=users.id) AS last_name,(SELECT birth_year FROM user_profiles WHERE user_id=users.id) AS birth_year,(SELECT gender FROM user_profiles WHERE user_id=users.id) AS gender,(SELECT nationality FROM user_profiles WHERE user_id=users.id) AS nationality,(SELECT about FROM user_profiles WHERE user_id=users.id) AS about,(SELECT language FROM user_profiles WHERE user_id=users.id) AS language,(SELECT currency FROM user_profiles WHERE user_id=users.id) AS currency,(SELECT country_id FROM user_profiles WHERE user_id=users.id) AS country_id,(SELECT location_id FROM user_profiles WHERE user_id=users.id) AS location_id,(SELECT created_at FROM user_profiles WHERE user_id=users.id) AS profile_created_at,(SELECT updated_at FROM user_profiles WHERE user_id=users.id) AS profile_updated_at,created_at,updated_at", "created_at DESC,id DESC"},
	"listing_images":           {"listing_images", "id", "id,listing_id,url,sort_order,created_at", "sort_order,id"},
	"unit_images":              {"listing_unit_images", "id", "id,unit_id,url,sort_order,created_at", "sort_order,id"},
	"listing_units":            {"listing_units", "id", "id,listing_id,parent_unit_id,(SELECT p.name FROM listing_units p WHERE p.id=listing_units.parent_unit_id) AS parent_name,(SELECT p.name_ru FROM listing_units p WHERE p.id=listing_units.parent_unit_id) AS parent_name_ru,type,name,name_ru,price_per_night,currency,capacity_adults,capacity_children,pets_allowed,is_active,created_at,updated_at", "name,id"},
}

func adminSpec(kind string) (adminTable, error) {
	s, ok := adminTables[kind]
	if !ok {
		return s, fmt.Errorf("unknown resource: %w", domain.ErrInvalidInput)
	}
	return s, nil
}

func adminDBError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return fmt.Errorf("duplicate value: %w", domain.ErrAlreadyExists)
		case "23503", "23502", "23514", "22001", "22003", "22P02", "22007", "22008":
			return fmt.Errorf("invalid field value: %w", domain.ErrInvalidInput)
		}
	}
	return err
}

func (r *AdminRepo) Get(ctx context.Context, kind, id string) (json.RawMessage, error) {
	s, err := adminSpec(kind)
	if err != nil {
		return nil, err
	}
	idCast := "::uuid"
	if kind == "countries" || kind == "locations" || kind == "listing_types" || kind == "listing_feature_tags" {
		idCast = "::bigint"
		if kind != "listing_feature_tags" {
			idCast = "::integer"
		}
	}
	if kind == "currencies" {
		idCast = "::text"
	}
	query := `SELECT row_to_json(t) FROM (SELECT ` + s.columns + ` FROM ` + s.table + ` WHERE ` + s.id + `=$1` + idCast + `) t`
	var raw json.RawMessage
	err = r.db.QueryRow(ctx, query, id).Scan(&raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get %s: %w", kind, adminDBError(err))
	}
	if kind == "listings" {
		var obj map[string]json.RawMessage
		if err := json.Unmarshal(raw, &obj); err != nil {
			return nil, err
		}
		var images json.RawMessage
		err = r.db.QueryRow(ctx, `SELECT COALESCE(json_agg(row_to_json(i) ORDER BY sort_order,id),'[]'::json)
			FROM (SELECT id,url,sort_order,created_at FROM listing_images WHERE listing_id=$1) i`, id).Scan(&images)
		if err != nil {
			return nil, err
		}
		obj["images"] = images
		raw, err = json.Marshal(obj)
		if err != nil {
			return nil, err
		}
	}
	if kind == "listing_units" {
		var obj map[string]json.RawMessage
		if err := json.Unmarshal(raw, &obj); err != nil {
			return nil, err
		}
		var images json.RawMessage
		err = r.db.QueryRow(ctx, `SELECT COALESCE(json_agg(row_to_json(i) ORDER BY sort_order,id),'[]'::json)
			FROM (SELECT id,unit_id,url,sort_order,created_at FROM listing_unit_images WHERE unit_id=$1) i`, id).Scan(&images)
		if err != nil {
			return nil, err
		}
		obj["images"] = images
		raw, err = json.Marshal(obj)
		if err != nil {
			return nil, err
		}
	}
	return raw, nil
}

func (r *AdminRepo) List(ctx context.Context, kind string, filters map[string]any, limit, offset int) ([]json.RawMessage, int, error) {
	s, err := adminSpec(kind)
	if err != nil {
		return nil, 0, err
	}
	where := []string{"1=1"}
	args := make([]any, 0, len(filters)+2)
	// Filter identifiers are constrained by this switch, independent of request JSON.
	for _, field := range []string{"country_id", "location_id", "is_active", "role", "quote_currency", "effective_from", "effective_to", "listing_type_ids", "location_ids", "external_source", "external_id"} {
		value, ok := filters[field]
		if !ok {
			continue
		}
		args = append(args, value)
		p := fmt.Sprintf("$%d", len(args))
		switch field {
		case "effective_from":
			where = append(where, "effective_from >= "+p+"::timestamptz")
		case "effective_to":
			where = append(where, "effective_from <= "+p+"::timestamptz")
		case "listing_type_ids":
			where = append(where, "listing_type_id = ANY("+p+"::int[])")
		case "location_ids":
			where = append(where, "location_id = ANY("+p+"::int[])")
		default:
			where = append(where, field+" = "+p)
		}
	}
	if kind == "listing_review_summaries" {
		if search, ok := filters["listing_search"].(string); ok && search != "" {
			args = append(args, "%"+strings.NewReplacer("\\", "\\\\", "%", "\\%", "_", "\\_").Replace(search)+"%")
			where = append(where, fmt.Sprintf("(listing_title ILIKE $%d ESCAPE '\\' OR listing_title_ru ILIKE $%d ESCAPE '\\')", len(args), len(args)))
		}
	}
	if kind == "listings" {
		if search, ok := filters["search"].(string); ok && search != "" {
			args = append(args, "%"+strings.NewReplacer("\\", "\\\\", "%", "\\%", "_", "\\_").Replace(search)+"%")
			where = append(where, fmt.Sprintf("(title ILIKE $%d ESCAPE '\\' OR title_ru ILIKE $%d ESCAPE '\\')", len(args), len(args)))
		}
	}
	condition := strings.Join(where, " AND ")
	var total int
	if err := r.db.QueryRow(ctx, `SELECT count(*) FROM `+s.table+` WHERE `+condition, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count %s: %w", kind, adminDBError(err))
	}
	args = append(args, limit, offset)
	order := s.order
	if kind == "listings" {
		sortBy, _ := filters["sort_by"].(string)
		sortOrder, _ := filters["sort_order"].(string)
		if sortBy == "title" || sortBy == "title_ru" {
			column := "title"
			if sortBy == "title_ru" {
				column = "COALESCE(NULLIF(title_ru,''),title)"
			}
			direction := "ASC"
			if sortOrder == "desc" {
				direction = "DESC"
			}
			order = "lower(" + column + ") " + direction + ",id " + direction
		} else if sortBy == "created_at" && sortOrder == "asc" {
			order = "created_at ASC,id ASC"
		}
	}
	query := `SELECT row_to_json(t) FROM (SELECT ` + s.columns + ` FROM ` + s.table + ` WHERE ` + condition + ` ORDER BY ` + order +
		fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)-1, len(args)) + `) t`
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list %s: %w", kind, adminDBError(err))
	}
	defer rows.Close()
	items := make([]json.RawMessage, 0)
	for rows.Next() {
		var item json.RawMessage
		if err := rows.Scan(&item); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *AdminRepo) Create(ctx context.Context, kind string, values map[string]any) (json.RawMessage, error) {
	s, err := adminSpec(kind)
	if err != nil {
		return nil, err
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	args := make([]any, 0, len(keys))
	places := make([]string, 0, len(keys))
	for _, key := range keys {
		args = append(args, values[key])
		places = append(places, fmt.Sprintf("$%d", len(args)))
		if key == "thumbnail" || key == "images" || key == "attributes" || key == "schedule" {
			places[len(places)-1] += "::jsonb"
		}
	}
	if (kind == "listings" || kind == "products") && values["is_active"] == false {
		keys = append(keys, "deactivated_at")
		places = append(places, "now()")
	}
	query := `INSERT INTO ` + s.table + ` (` + strings.Join(keys, ",") + `) VALUES (` + strings.Join(places, ",") + `) RETURNING ` + s.id + `::text`
	var id string
	if err := r.db.QueryRow(ctx, query, args...).Scan(&id); err != nil {
		return nil, fmt.Errorf("create %s: %w", kind, adminDBError(err))
	}
	return r.Get(ctx, kind, id)
}

func (r *AdminRepo) Update(ctx context.Context, kind, id string, values map[string]any) (json.RawMessage, error) {
	s, err := adminSpec(kind)
	if err != nil {
		return nil, err
	}
	featureIDsValue, hasFeatureIDs := values["feature_ids"]
	if hasFeatureIDs && kind != "listings" {
		return nil, domain.ErrInvalidInput
	}
	delete(values, "feature_ids")
	var tx pgx.Tx
	if hasFeatureIDs {
		tx, err = r.db.Begin(ctx)
		if err != nil {
			return nil, err
		}
		defer tx.Rollback(ctx)
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	args := []any{id}
	sets := make([]string, 0, len(keys)+2)
	for _, key := range keys {
		args = append(args, values[key])
		p := fmt.Sprintf("$%d", len(args))
		if key == "thumbnail" || key == "images" || key == "attributes" || key == "schedule" {
			p += "::jsonb"
		}
		sets = append(sets, key+"="+p)
	}
	if kind == "listings" || kind == "products" {
		if active, ok := values["is_active"].(bool); ok {
			if active {
				sets = append(sets, "deactivated_at=NULL")
			} else {
				sets = append(sets, "deactivated_at=COALESCE(deactivated_at,now())")
			}
		}
	}
	if kind == "listings" || kind == "products" || kind == "counterparties" || kind == "users" || kind == "listing_feature_tags" {
		sets = append(sets, "updated_at=now()")
	}
	idCast := "::uuid"
	if kind == "countries" || kind == "locations" || kind == "listing_types" || kind == "listing_feature_tags" {
		idCast = "::integer"
		if kind == "listing_feature_tags" {
			idCast = "::bigint"
		}
	}
	if kind == "currencies" {
		idCast = "::text"
	}
	query := `UPDATE ` + s.table + ` SET ` + strings.Join(sets, ",") + ` WHERE ` + s.id + `=$1` + idCast + ` RETURNING ` + s.id + `::text`
	var resultID string
	var row pgx.Row
	if tx != nil {
		row = tx.QueryRow(ctx, query, args...)
	} else {
		row = r.db.QueryRow(ctx, query, args...)
	}
	if err := row.Scan(&resultID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("update %s: %w", kind, adminDBError(err))
	}
	if hasFeatureIDs {
		ids, ok := featureIDsValue.([]int64)
		if !ok {
			return nil, domain.ErrInvalidInput
		}
		if err := replaceAdminListingFeatureTags(ctx, tx, resultID, ids); err != nil {
			return nil, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, adminDBError(err)
		}
	}
	return r.Get(ctx, kind, resultID)
}

func replaceAdminListingFeatureTags(ctx context.Context, tx pgx.Tx, listingID string, ids []int64) error {
	if len(ids) > 100 {
		return domain.ErrInvalidInput
	}
	if len(ids) > 0 {
		var existingCount int
		if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM listing_feature_tags WHERE id=ANY($1::bigint[])`, ids).Scan(&existingCount); err != nil {
			return err
		}
		if existingCount != len(ids) {
			return domain.ErrInvalidInput
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM listing_feature_tag_assignments WHERE listing_id=$1`, listingID); err != nil {
		return err
	}
	for order, id := range ids {
		if _, err := tx.Exec(ctx, `INSERT INTO listing_feature_tag_assignments(listing_id,tag_id,sort_order) VALUES($1,$2,$3)`, listingID, id, order); err != nil {
			return adminDBError(err)
		}
	}
	return nil
}

func (r *AdminRepo) DeleteImage(ctx context.Context, kind, parentID, imageID string) error {
	s, err := adminSpec(kind)
	if err != nil {
		return err
	}
	parent := "listing_id"
	if kind == "unit_images" {
		parent = "unit_id"
	}
	tag, err := r.db.Exec(ctx, `DELETE FROM `+s.table+` WHERE id=$1 AND `+parent+`=$2`, imageID, parentID)
	if err != nil {
		return adminDBError(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// The staff account and its default profile are created atomically.
func (r *AdminRepo) CreateStaff(ctx context.Context, email, hash string, role domain.Role) (json.RawMessage, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO users(email,password_hash,role) VALUES ($1,$2,$3) RETURNING id::text`, email, hash, role).Scan(&id)
	if err != nil {
		return nil, adminDBError(err)
	}
	tag, err := tx.Exec(ctx, `INSERT INTO user_profiles(user_id,country_id) SELECT $1,id FROM countries WHERE code='RU'`, id)
	if err != nil {
		return nil, adminDBError(err)
	}
	if tag.RowsAffected() != 1 {
		return nil, fmt.Errorf("default country RU is missing: %w", domain.ErrInvalidInput)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, "users", id)
}

func (r *AdminRepo) UpdateRole(ctx context.Context, id, actorID string, role domain.Role) (json.RawMessage, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	// Serialize role changes so two admins cannot demote one another concurrently.
	if _, err := tx.Exec(ctx, `LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE`); err != nil {
		return nil, err
	}
	var oldRole domain.Role
	err = tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, id).Scan(&oldRole)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, adminDBError(err)
	}
	if id == actorID && oldRole == domain.RoleAdmin && role != domain.RoleAdmin {
		return nil, domain.ErrForbidden
	}
	if oldRole == domain.RoleAdmin && role != domain.RoleAdmin {
		var count int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM users WHERE role='admin'`).Scan(&count); err != nil {
			return nil, err
		}
		if count <= 1 {
			return nil, domain.NewConflict("cannot demote the last administrator")
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET role=$2,updated_at=now() WHERE id=$1`, id, role); err != nil {
		return nil, adminDBError(err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, "users", id)
}
