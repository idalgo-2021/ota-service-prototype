package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type ListingRepo struct {
	db *pgxpool.Pool
}

func NewListingRepo(db *pgxpool.Pool) *ListingRepo {
	return &ListingRepo{
		db: db,
	}
}

// A room containing separately bookable beds is a grouping node, not a second offer.
const startingPriceJoin = ` LEFT JOIN LATERAL (
	SELECT u.price_per_night::text AS amount, u.currency, u.type AS unit_type
	FROM listing_units u
	LEFT JOIN listing_units parent ON parent.id=u.parent_unit_id
	WHERE u.listing_id=listings.id AND u.is_active AND u.price_per_night>0
	  AND (u.parent_unit_id IS NULL OR parent.is_active)
	  AND (u.type <> 'room' OR NOT EXISTS (
		SELECT 1 FROM listing_units child WHERE child.parent_unit_id=u.id))
	ORDER BY u.price_per_night ASC,u.id ASC LIMIT 1
) starting_price ON true`

func scanStartingPrice(amount, currency, unitType *string) (*domain.StartingPrice, error) {
	if amount == nil {
		return nil, nil
	}
	price, err := decimal.NewFromString(*amount)
	if err != nil {
		return nil, fmt.Errorf("invalid starting price: %w", err)
	}
	if currency == nil || unitType == nil {
		return nil, fmt.Errorf("incomplete starting price")
	}
	return &domain.StartingPrice{Amount: price, Currency: *currency, UnitType: *unitType}, nil
}

func (r *ListingRepo) reviewSummaries(ctx context.Context, listingIDs []string) (map[string]string, error) {
	summaries := make(map[string]string, len(listingIDs))
	if len(listingIDs) == 0 {
		return summaries, nil
	}

	rows, err := r.db.Query(ctx,
		`SELECT listing_id::text, summary FROM listing_review_summaries WHERE listing_id = ANY($1::uuid[])`,
		listingIDs,
	)
	if err != nil {
		return nil, fmt.Errorf("query listing review summaries: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var listingID, summary string
		if err := rows.Scan(&listingID, &summary); err != nil {
			return nil, fmt.Errorf("scan listing review summary: %w", err)
		}
		summaries[listingID] = summary
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate listing review summaries: %w", err)
	}
	return summaries, nil
}

func (r *ListingRepo) GetByID(ctx context.Context, id string, filter *domain.ListingFilter) (*domain.Listing, error) {
	query := `SELECT id, title, title_ru, description, description_ru, main_picture, listing_type_id, address, address_ru, location_id, latitude, longitude, distance_from_center_km, average_overall_rating, average_rating_details, overall_rating_count, is_active, check_in_time::text, deactivated_at, created_at, updated_at,
		starting_price.amount,starting_price.currency,starting_price.unit_type,review_summary.summary FROM listings` + startingPriceJoin + ` LEFT JOIN listing_review_summaries review_summary ON review_summary.listing_id = listings.id WHERE id = $1`
	args := []any{id}

	if filter != nil && filter.IsActive != nil {
		query += ` AND is_active = $2`
		args = append(args, *filter.IsActive)
	}

	var l domain.Listing
	var priceAmount, priceCurrency, priceUnitType *string
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&l.ID, &l.Title, &l.TitleRU, &l.Description, &l.DescriptionRU, &l.MainPicture, &l.ListingTypeID,
		&l.Address, &l.AddressRU, &l.LocationID, &l.Latitude, &l.Longitude, &l.DistanceFromCenterKM, &l.AverageOverallRating, &l.AverageRatingDetails, &l.OverallRatingCount,
		&l.IsActive, &l.CheckInTime, &l.DeactivatedAt, &l.CreatedAt, &l.UpdatedAt,
		&priceAmount, &priceCurrency, &priceUnitType, &l.ReviewSummary,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("listing %s: %w [%w]", id, domain.ErrListingNotFound, err)
		}
		return nil, fmt.Errorf("failed to get listing: %w", err)
	}
	l.StartingPrice, err = scanStartingPrice(priceAmount, priceCurrency, priceUnitType)
	if err != nil {
		return nil, err
	}

	l.Images, err = loadListingImages(ctx, id, func(ctx context.Context, query string, args ...any) (listingImageRows, error) {
		return r.db.Query(ctx, query, args...)
	})
	if err != nil {
		return nil, err
	}
	counts, err := r.publishedReviewCounts(ctx, []string{l.ID})
	if err != nil {
		return nil, err
	}
	l.PublishedReviewCount = counts[l.ID]

	withTags := []domain.Listing{l}
	if err := r.attachFeatureTags(ctx, withTags); err != nil {
		return nil, err
	}
	l.Features = withTags[0].Features
	return &l, nil
}

type listingImageRows interface {
	Next() bool
	Scan(dest ...any) error
	Err() error
	Close()
}

type listingImageQuery func(context.Context, string, ...any) (listingImageRows, error)

func loadListingImages(ctx context.Context, listingID string, query listingImageQuery) ([]domain.ListingImage, error) {
	const imagesQuery = `SELECT id, url, sort_order, created_at FROM listing_images WHERE listing_id = $1 ORDER BY sort_order ASC`
	rows, err := query(ctx, imagesQuery, listingID)
	if err != nil {
		return nil, fmt.Errorf("failed to query listing images: %w", err)
	}
	defer rows.Close()

	images := make([]domain.ListingImage, 0)
	for rows.Next() {
		var image domain.ListingImage
		if err := rows.Scan(&image.ID, &image.URL, &image.SortOrder, &image.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan listing image: %w", err)
		}
		images = append(images, image)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate listing images: %w", err)
	}

	return images, nil
}

func geoClause(geo *domain.GeoFilter, column string, firstArg int) (string, []any, error) {
	if geo == nil {
		return "", nil, nil
	}
	geometry, err := json.Marshal(struct {
		Type        string       `json:"type"`
		Coordinates [][2]float64 `json:"coordinates"`
	}{Type: "MultiPoint", Coordinates: geo.Points})
	if err != nil {
		return "", nil, fmt.Errorf("encode search geometry: %w", err)
	}
	return fmt.Sprintf(` AND %s IS NOT NULL AND ST_DWithin(%s, ST_ConvexHull(ST_GeomFromGeoJSON($%d::text))::geography, $%d::double precision)`, column, column, firstArg, firstArg+1), []any{string(geometry), geo.RadiusM}, nil
}

func distanceClause(min, max *float64, column string, firstArg int) (string, []any) {
	var clause string
	var args []any
	if min != nil {
		clause += fmt.Sprintf(" AND %s >= $%d", column, firstArg)
		args = append(args, *min)
		firstArg++
	}
	if max != nil {
		clause += fmt.Sprintf(" AND %s <= $%d", column, firstArg)
		args = append(args, *max)
	}
	return clause, args
}

func ratingClause(min, max *float64, column string, firstArg int) (string, []any) {
	var clause string
	var args []any
	if min != nil {
		clause += fmt.Sprintf(" AND %s >= $%d", column, firstArg)
		args = append(args, *min)
		firstArg++
	}
	if max != nil {
		clause += fmt.Sprintf(" AND %s <= $%d", column, firstArg)
		args = append(args, *max)
	}
	return clause, args
}

func (r *ListingRepo) List(ctx context.Context, limit, offset int, filter *domain.ListingFilter) ([]domain.Listing, int, error) {
	return r.list(ctx, limit, offset, filter, true)
}

func (r *ListingRepo) ListAll(ctx context.Context, filter *domain.ListingFilter) ([]domain.Listing, error) {
	listings, _, err := r.list(ctx, 0, 0, filter, false)
	if err != nil {
		return nil, err
	}
	if err := r.attachReviewSummaries(ctx, listings); err != nil {
		return nil, err
	}
	if err := r.attachListingImages(ctx, listings); err != nil {
		return nil, err
	}
	return listings, nil
}

func (r *ListingRepo) attachListingImages(ctx context.Context, listings []domain.Listing) error {
	if len(listings) == 0 {
		return nil
	}
	listingIDs := make([]string, len(listings))
	for i, listing := range listings {
		listingIDs[i] = listing.ID
	}
	rows, err := r.db.Query(ctx, `SELECT listing_id, id, url, sort_order, created_at FROM listing_images WHERE listing_id = ANY($1::uuid[]) ORDER BY listing_id, sort_order`, listingIDs)
	if err != nil {
		return fmt.Errorf("query listing images: %w", err)
	}
	defer rows.Close()

	m := make(map[string][]domain.ListingImage)
	for rows.Next() {
		var listingID string
		var img domain.ListingImage
		if err := rows.Scan(&listingID, &img.ID, &img.URL, &img.SortOrder, &img.CreatedAt); err != nil {
			return fmt.Errorf("scan listing image: %w", err)
		}
		m[listingID] = append(m[listingID], img)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate listing images: %w", err)
	}

	var missingIDs []string
	for _, l := range listings {
		if len(m[l.ID]) == 0 {
			missingIDs = append(missingIDs, l.ID)
		}
	}
	if len(missingIDs) > 0 {
		unitRows, err := r.db.Query(ctx, `
			SELECT DISTINCT ON (lu.listing_id, lui.url) lu.listing_id, lui.id, lui.url, lui.sort_order, lui.created_at
			FROM listing_unit_images lui
			JOIN listing_units lu ON lui.unit_id = lu.id
			WHERE lu.listing_id = ANY($1::uuid[])
			ORDER BY lu.listing_id, lui.url, lui.sort_order
		`, missingIDs)
		if err == nil {
			defer unitRows.Close()
			for unitRows.Next() {
				var listingID string
				var img domain.ListingImage
				if err := unitRows.Scan(&listingID, &img.ID, &img.URL, &img.SortOrder, &img.CreatedAt); err == nil {
					m[listingID] = append(m[listingID], img)
				}
			}
		}
	}

	for i := range listings {
		listings[i].Images = m[listings[i].ID]
	}
	return nil
}

func (r *ListingRepo) attachReviewSummaries(ctx context.Context, listings []domain.Listing) error {
	listingIDs := make([]string, 0, len(listings))
	for _, listing := range listings {
		listingIDs = append(listingIDs, listing.ID)
	}
	summaries, err := r.reviewSummaries(ctx, listingIDs)
	if err != nil {
		return err
	}
	for i := range listings {
		if summary, ok := summaries[listings[i].ID]; ok {
			listings[i].ReviewSummary = &summary
		}
	}
	return nil
}

func (r *ListingRepo) list(ctx context.Context, limit, offset int, filter *domain.ListingFilter, paginated bool) ([]domain.Listing, int, error) {
	const selectColumns = `SELECT id, title, title_ru, description, description_ru, main_picture, listing_type_id, address, address_ru, location_id, latitude, longitude, distance_from_center_km, average_overall_rating, average_rating_details, overall_rating_count, is_active, check_in_time::text, deactivated_at, created_at, updated_at,
		starting_price.amount,starting_price.currency,starting_price.unit_type, COUNT(*) OVER() FROM listings`
	where := ` WHERE 1=1`
	args := []any{}
	argCount := 1

	if filter != nil {
		if filter.IsActive != nil {
			where += ` AND is_active = $` + strconv.Itoa(argCount)
			args = append(args, *filter.IsActive)
			argCount++
		}
		if len(filter.ListingTypeIDs) > 0 {
			where += ` AND listing_type_id = ANY($` + strconv.Itoa(argCount) + `)`
			args = append(args, filter.ListingTypeIDs)
			argCount++
		}
		if len(filter.LocationIDs) > 0 {
			where += ` AND location_id = ANY($` + strconv.Itoa(argCount) + `)`
			args = append(args, filter.LocationIDs)
			argCount++
		}
		clause, geoArgs, err := geoClause(filter.Geo, "listings.geo", argCount)
		if err != nil {
			return nil, 0, err
		}
		where += clause
		args = append(args, geoArgs...)
		argCount += len(geoArgs)
		distanceSQL, distanceArgs := distanceClause(filter.MinDistanceKM, filter.MaxDistanceKM, "listings.distance_from_center_km", argCount)
		where += distanceSQL
		args = append(args, distanceArgs...)
		argCount += len(distanceArgs)
		ratingSQL, ratingArgs := ratingClause(filter.MinOverallRating, filter.MaxOverallRating, "listings.average_overall_rating", argCount)
		where += ratingSQL
		args = append(args, ratingArgs...)
		argCount += len(ratingArgs)
		if filter.CheckInDate != "" {
			where += ` AND EXISTS (
				SELECT 1 FROM listing_units u
				WHERE u.listing_id = listings.id AND u.is_active
				AND (u.parent_unit_id IS NULL OR EXISTS (SELECT 1 FROM listing_units parent WHERE parent.id = u.parent_unit_id AND parent.is_active))
				AND (u.type <> 'room' OR NOT EXISTS (SELECT 1 FROM listing_units child WHERE child.parent_unit_id = u.id))
				AND NOT EXISTS (
					SELECT 1 FROM booking_units bu JOIN bookings b ON b.id = bu.booking_id
					WHERE bu.unit_id = u.id AND b.status <> 'canceled'
					AND b.check_in_date < $` + strconv.Itoa(argCount+1) + `::date
					AND b.check_out_date > $` + strconv.Itoa(argCount) + `::date
				)
			)`
			args = append(args, filter.CheckInDate, filter.CheckOutDate)
			argCount += 2
		}
	}

	orderParts := make([]string, 0, 2)
	if filter != nil {
		appendSort := func(field, direction string) {
			order := " ASC"
			if direction == "desc" {
				order = " DESC"
			}
			switch field {
			case "starting_price":
				orderParts = append(orderParts, "starting_price.amount::numeric"+order+" NULLS LAST")
			case "average_overall_rating":
				orderParts = append(orderParts, "listings.average_overall_rating"+order+" NULLS LAST")
			}
		}
		appendSort(filter.Sort.By, filter.Sort.Order)
		appendSort(filter.Sort.ThenBy, filter.Sort.ThenOrder)
	}
	orderBy := ` ORDER BY listings.created_at DESC, listings.id DESC`
	if len(orderParts) > 0 {
		orderBy = ` ORDER BY ` + strings.Join(orderParts, ", ") + `, listings.created_at DESC, listings.id DESC`
	}
	query := selectColumns + startingPriceJoin + where + orderBy
	if paginated {
		query += ` LIMIT $` + strconv.Itoa(argCount) + ` OFFSET $` + strconv.Itoa(argCount+1)
		args = append(args, limit, offset)
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list listings: %w", err)
	}
	defer rows.Close()

	var listings []domain.Listing
	var total int
	for rows.Next() {
		var l domain.Listing
		var priceAmount, priceCurrency, priceUnitType *string
		err := rows.Scan(
			&l.ID, &l.Title, &l.TitleRU, &l.Description, &l.DescriptionRU, &l.MainPicture, &l.ListingTypeID,
			&l.Address, &l.AddressRU, &l.LocationID, &l.Latitude, &l.Longitude, &l.DistanceFromCenterKM, &l.AverageOverallRating, &l.AverageRatingDetails, &l.OverallRatingCount,
			&l.IsActive, &l.CheckInTime, &l.DeactivatedAt, &l.CreatedAt, &l.UpdatedAt,
			&priceAmount, &priceCurrency, &priceUnitType,
			&total,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan listing: %w", err)
		}
		l.StartingPrice, err = scanStartingPrice(priceAmount, priceCurrency, priceUnitType)
		if err != nil {
			return nil, 0, err
		}
		listings = append(listings, l)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate listings: %w", err)
	}
	rows.Close()
	if err := r.attachFeatureTags(ctx, listings); err != nil {
		return nil, 0, err
	}
	if err := r.attachPublishedReviewCounts(ctx, listings); err != nil {
		return nil, 0, err
	}
	if paginated && len(listings) == 0 && offset > 0 {
		if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM listings`+where, args[:len(args)-2]...).Scan(&total); err != nil {
			return nil, 0, fmt.Errorf("count listings: %w", err)
		}
	}

	return listings, total, nil
}

func (r *ListingRepo) attachPublishedReviewCounts(ctx context.Context, listings []domain.Listing) error {
	ids := make([]string, 0, len(listings))
	for _, listing := range listings {
		ids = append(ids, listing.ID)
	}
	counts, err := r.publishedReviewCounts(ctx, ids)
	if err != nil {
		return err
	}
	for i := range listings {
		listings[i].PublishedReviewCount = counts[listings[i].ID]
	}
	return nil
}

func (r *ListingRepo) publishedReviewCounts(ctx context.Context, listingIDs []string) (map[string]int, error) {
	counts := make(map[string]int, len(listingIDs))
	if len(listingIDs) == 0 {
		return counts, nil
	}
	rows, err := r.db.Query(ctx, `SELECT listing_id::text, COUNT(*)::integer
		FROM listing_reviews
		WHERE listing_id = ANY($1::uuid[]) AND status = 'approved' AND NOT is_hidden
		GROUP BY listing_id`, listingIDs)
	if err != nil {
		return nil, fmt.Errorf("query published listing review counts: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var listingID string
		var count int
		if err := rows.Scan(&listingID, &count); err != nil {
			return nil, fmt.Errorf("scan published listing review count: %w", err)
		}
		counts[listingID] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate published listing review counts: %w", err)
	}
	return counts, nil
}

// SearchAvailable returns the cheapest suitable option per listing and unit type.
// For bed inventory an option may contain several beds to satisfy the requested occupancy.
// Pagination is applied by the service after rows are grouped by listing.
func (r *ListingRepo) SearchAvailable(ctx context.Context, filter domain.AvailableListingsFilter) ([]domain.AvailableListing, int, error) {
	geoSQL, geoArgs, err := geoClause(filter.Geo, "l.geo", 8)
	if err != nil {
		return nil, 0, err
	}
	distanceSQL, distanceArgs := distanceClause(filter.MinDistanceKM, filter.MaxDistanceKM, "l.distance_from_center_km", 8+len(geoArgs))
	ratingSQL, ratingArgs := ratingClause(filter.MinOverallRating, filter.MaxOverallRating, "l.average_overall_rating", 8+len(geoArgs)+len(distanceArgs))
	query := `WITH candidates AS (
SELECT l.id,l.title,l.title_ru,l.description,l.description_ru,l.main_picture,l.listing_type_id,l.address,l.address_ru,l.location_id,l.latitude,l.longitude,l.distance_from_center_km,l.average_overall_rating,l.average_rating_details,l.overall_rating_count,l.is_active,l.check_in_time::text,l.deactivated_at,l.created_at,l.updated_at,
u.id AS unit_id,u.listing_id AS unit_listing_id,u.parent_unit_id,p.name AS parent_name,p.name_ru AS parent_name_ru,u.type,u.name AS unit_name,u.name_ru AS unit_name_ru,u.capacity_adults,u.capacity_children,u.pets_allowed,u.is_active AS unit_active,u.price_per_night,u.currency AS unit_currency,u.created_at AS unit_created_at,u.updated_at AS unit_updated_at
FROM listings l JOIN listing_units u ON u.listing_id=l.id
LEFT JOIN listing_units p ON p.id=u.parent_unit_id
WHERE l.is_active AND (COALESCE(cardinality($1::int[]), 0) = 0 OR l.location_id = ANY($1::int[]))
  AND (COALESCE(cardinality($2::int[]), 0) = 0 OR l.listing_type_id = ANY($2::int[]))
  /*geo_filter*/
  /*distance_filter*/
  /*rating_filter*/
  AND u.is_active
  AND (u.parent_unit_id IS NULL OR p.is_active)
  AND (u.type <> 'room' OR NOT EXISTS (SELECT 1 FROM listing_units child WHERE child.parent_unit_id=u.id))
  AND (NOT $5 OR u.pets_allowed)
  AND NOT EXISTS (SELECT 1 FROM booking_units bu JOIN bookings b ON b.id=bu.booking_id
      WHERE bu.unit_id=u.id AND b.status <> 'canceled' AND b.check_in_date < $7::date AND b.check_out_date > $6::date)
),
single_units AS (
SELECT c.* FROM (
SELECT c.*, ROW_NUMBER() OVER (PARTITION BY c.unit_listing_id,c.type ORDER BY c.price_per_night ASC,c.unit_id ASC) AS single_rn
FROM candidates c WHERE c.type <> 'bed' AND c.capacity_adults >= $3 AND c.capacity_children >= $4
) c WHERE c.single_rn = 1
),
ordered_beds AS (
SELECT c.*,
ROW_NUMBER() OVER (PARTITION BY c.unit_listing_id,c.type ORDER BY c.price_per_night ASC,c.unit_id ASC) AS bed_rn,
SUM(c.capacity_adults) OVER (PARTITION BY c.unit_listing_id,c.type ORDER BY c.price_per_night ASC,c.unit_id ASC ROWS UNBOUNDED PRECEDING) AS adults_total,
SUM(c.capacity_children) OVER (PARTITION BY c.unit_listing_id,c.type ORDER BY c.price_per_night ASC,c.unit_id ASC ROWS UNBOUNDED PRECEDING) AS children_total
FROM candidates c WHERE c.type = 'bed'
),
bed_targets AS (
SELECT b.*, MIN(CASE WHEN b.adults_total >= $3 AND b.children_total >= $4 THEN b.bed_rn END) OVER (PARTITION BY b.unit_listing_id,b.type) AS target_rn
FROM ordered_beds b
),
selected AS (
SELECT id,title,title_ru,description,description_ru,main_picture,listing_type_id,address,address_ru,location_id,latitude,longitude,distance_from_center_km,average_overall_rating,average_rating_details,overall_rating_count,is_active,check_in_time,deactivated_at,created_at,updated_at,
unit_id,unit_listing_id,parent_unit_id,parent_name,parent_name_ru,type,unit_name,unit_name_ru,capacity_adults,capacity_children,pets_allowed,unit_active,price_per_night,unit_currency,unit_created_at,unit_updated_at
FROM single_units
UNION ALL
SELECT id,title,title_ru,description,description_ru,main_picture,listing_type_id,address,address_ru,location_id,latitude,longitude,distance_from_center_km,average_overall_rating,average_rating_details,overall_rating_count,is_active,check_in_time,deactivated_at,created_at,updated_at,
unit_id,unit_listing_id,parent_unit_id,parent_name,parent_name_ru,type,unit_name,unit_name_ru,capacity_adults,capacity_children,pets_allowed,unit_active,price_per_night,unit_currency,unit_created_at,unit_updated_at
FROM bed_targets WHERE bed_rn <= target_rn
)
SELECT id,title,title_ru,description,description_ru,main_picture,listing_type_id,address,address_ru,location_id,latitude,longitude,distance_from_center_km,average_overall_rating,average_rating_details,overall_rating_count,is_active,check_in_time,deactivated_at,created_at,updated_at,
unit_id,unit_listing_id,parent_unit_id,parent_name,parent_name_ru,type,unit_name,unit_name_ru,capacity_adults,capacity_children,pets_allowed,unit_active,price_per_night,unit_currency,unit_created_at,unit_updated_at
FROM selected ORDER BY id ASC,type ASC,price_per_night ASC,unit_id ASC`
	query = strings.Replace(query, "/*geo_filter*/", geoSQL, 1)
	query = strings.Replace(query, "/*distance_filter*/", distanceSQL, 1)
	query = strings.Replace(query, "/*rating_filter*/", ratingSQL, 1)
	args := []any{filter.LocationIDs, filter.ListingTypeIDs, filter.AdultsCount, filter.ChildrenCount, filter.HasPets, filter.CheckInDate, filter.CheckOutDate}
	args = append(args, geoArgs...)
	args = append(args, distanceArgs...)
	args = append(args, ratingArgs...)
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("search available listings: %w", err)
	}
	defer rows.Close()
	result := make([]domain.AvailableListing, 0)
	byID := make(map[string]int)
	optionByListingType := make(map[string]int)
	for rows.Next() {
		var l domain.Listing
		var u domain.ListingUnit
		if err := rows.Scan(&l.ID, &l.Title, &l.TitleRU, &l.Description, &l.DescriptionRU, &l.MainPicture, &l.ListingTypeID, &l.Address, &l.AddressRU, &l.LocationID, &l.Latitude, &l.Longitude, &l.DistanceFromCenterKM, &l.AverageOverallRating, &l.AverageRatingDetails, &l.OverallRatingCount, &l.IsActive, &l.CheckInTime, &l.DeactivatedAt, &l.CreatedAt, &l.UpdatedAt,
			&u.ID, &u.ListingID, &u.ParentUnitID, &u.ParentName, &u.ParentNameRU, &u.Type, &u.Name, &u.NameRU, &u.CapacityAdults, &u.CapacityChildren, &u.PetsAllowed, &u.IsActive, &u.PricePerNight, &u.Currency, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan available listing: %w", err)
		}
		i, ok := byID[l.ID]
		if !ok {
			i = len(result)
			byID[l.ID] = i
			result = append(result, domain.AvailableListing{Listing: l, LowestPriceOptions: []domain.LowestPriceOption{}})
		}
		optionKey := l.ID + "\x00" + u.Type
		optionIndex, exists := optionByListingType[optionKey]
		if !exists {
			optionIndex = len(result[i].LowestPriceOptions)
			optionByListingType[optionKey] = optionIndex
			result[i].LowestPriceOptions = append(result[i].LowestPriceOptions, domain.LowestPriceOption{Type: u.Type, TotalPricePerNight: u.PricePerNight, Currency: u.Currency, Units: []domain.ListingUnit{u}})
		} else {
			option := &result[i].LowestPriceOptions[optionIndex]
			option.TotalPricePerNight = option.TotalPricePerNight.Add(u.PricePerNight)
			option.Units = append(option.Units, u)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	rows.Close()
	listingIDs := make([]string, 0, len(result))
	for _, listing := range result {
		listingIDs = append(listingIDs, listing.ID)
	}
	summaries, err := r.reviewSummaries(ctx, listingIDs)
	if err != nil {
		return nil, 0, err
	}
	for i := range result {
		if summary, ok := summaries[result[i].ID]; ok {
			result[i].ReviewSummary = &summary
		}
	}
	baseListings := make([]domain.Listing, len(result))
	for i := range result {
		baseListings[i] = result[i].Listing
	}
	if err := r.attachFeatureTags(ctx, baseListings); err != nil {
		return nil, 0, err
	}
	if err := r.attachPublishedReviewCounts(ctx, baseListings); err != nil {
		return nil, 0, err
	}
	for i := range result {
		result[i].Features = baseListings[i].Features
		result[i].PublishedReviewCount = baseListings[i].PublishedReviewCount
	}
	return result, len(result), nil
}

func (r *ListingRepo) LoadAvailableImages(ctx context.Context, listings []domain.AvailableListing) error {
	if len(listings) == 0 {
		return nil
	}
	listingIDs := make([]string, 0, len(listings))
	unitIDs := make([]string, 0)
	for _, item := range listings {
		listingIDs = append(listingIDs, item.ID)
		for _, option := range item.LowestPriceOptions {
			for _, unit := range option.Units {
				unitIDs = append(unitIDs, unit.ID)
			}
		}
	}

	listingImages, err := r.db.Query(ctx, `SELECT listing_id, id, url, sort_order, created_at FROM listing_images WHERE listing_id = ANY($1::uuid[]) ORDER BY listing_id, sort_order`, listingIDs)
	if err != nil {
		return fmt.Errorf("query available listing images: %w", err)
	}
	listingImageMap := make(map[string][]domain.ListingImage)
	for listingImages.Next() {
		var listingID string
		var image domain.ListingImage
		if err := listingImages.Scan(&listingID, &image.ID, &image.URL, &image.SortOrder, &image.CreatedAt); err != nil {
			listingImages.Close()
			return fmt.Errorf("scan available listing image: %w", err)
		}
		listingImageMap[listingID] = append(listingImageMap[listingID], image)
	}
	if err := listingImages.Err(); err != nil {
		listingImages.Close()
		return fmt.Errorf("iterate available listing images: %w", err)
	}
	listingImages.Close()

	unitImageMap := make(map[string][]domain.ListingUnitImage)
	if len(unitIDs) > 0 {
		unitImages, err := r.db.Query(ctx, `SELECT unit_id, id, url, sort_order, created_at FROM listing_unit_images WHERE unit_id = ANY($1::uuid[]) ORDER BY unit_id, sort_order`, unitIDs)
		if err != nil {
			return fmt.Errorf("query available unit images: %w", err)
		}
		for unitImages.Next() {
			var unitID string
			var image domain.ListingUnitImage
			if err := unitImages.Scan(&unitID, &image.ID, &image.URL, &image.SortOrder, &image.CreatedAt); err != nil {
				unitImages.Close()
				return fmt.Errorf("scan available unit image: %w", err)
			}
			image.UnitID = unitID
			unitImageMap[unitID] = append(unitImageMap[unitID], image)
		}
		if err := unitImages.Err(); err != nil {
			unitImages.Close()
			return fmt.Errorf("iterate available unit images: %w", err)
		}
		unitImages.Close()
	}

	for i := range listings {
		imgs := listingImageMap[listings[i].ID]
		if len(imgs) == 0 {
			seen := make(map[string]bool)
			if listings[i].MainPicture != nil {
				seen[*listings[i].MainPicture] = true
			}
			for _, option := range listings[i].LowestPriceOptions {
				for _, unit := range option.Units {
					for _, uImg := range unitImageMap[unit.ID] {
						if !seen[uImg.URL] {
							seen[uImg.URL] = true
							imgs = append(imgs, domain.ListingImage{
								ID:        uImg.ID,
								URL:       uImg.URL,
								SortOrder: uImg.SortOrder,
								CreatedAt: uImg.CreatedAt,
							})
						}
					}
				}
			}
		}
		listings[i].Images = imgs
		for j := range listings[i].LowestPriceOptions {
			for k := range listings[i].LowestPriceOptions[j].Units {
				unit := &listings[i].LowestPriceOptions[j].Units[k]
				unit.Images = unitImageMap[unit.ID]
			}
		}
	}
	return nil
}
