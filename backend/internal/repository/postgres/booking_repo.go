package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type BookingRepo struct {
	db *pgxpool.Pool
}

func NewBookingRepo(db *pgxpool.Pool) *BookingRepo {
	return &BookingRepo{db: db}
}

func mapUnitWriteError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return err
	}
	switch pgErr.Code {
	case "23505":
		return domain.ErrAlreadyExists
	case "23503", "23514", "P0001":
		return fmt.Errorf("invalid listing or unit relationship: %w", domain.ErrInvalidInput)
	default:
		return err
	}
}

const unitColumns = `id, listing_id, parent_unit_id, (SELECT p.name FROM listing_units p WHERE p.id=listing_units.parent_unit_id) AS parent_name, (SELECT p.name_ru FROM listing_units p WHERE p.id=listing_units.parent_unit_id) AS parent_name_ru, type, name, name_ru, capacity_adults, capacity_children, pets_allowed, is_active, price_per_night, currency, created_at, updated_at`

func scanUnit(row pgx.Row) (domain.ListingUnit, error) {
	var u domain.ListingUnit
	err := row.Scan(&u.ID, &u.ListingID, &u.ParentUnitID, &u.ParentName, &u.ParentNameRU, &u.Type, &u.Name, &u.NameRU, &u.CapacityAdults, &u.CapacityChildren, &u.PetsAllowed, &u.IsActive, &u.PricePerNight, &u.Currency, &u.CreatedAt, &u.UpdatedAt)
	u.Images = []domain.ListingUnitImage{}
	return u, err
}

func (r *BookingRepo) loadUnitImages(ctx context.Context, units []domain.ListingUnit) error {
	if len(units) == 0 {
		return nil
	}
	ids := make([]pgtype.UUID, 0, len(units))
	byID := make(map[string]int, len(units))
	for i := range units {
		parsed, err := uuid.Parse(units[i].ID)
		if err != nil {
			return err
		}
		ids = append(ids, pgtype.UUID{Bytes: [16]byte(parsed), Valid: true})
		byID[units[i].ID] = i
	}
	rows, err := r.db.Query(ctx, `SELECT id,unit_id,url,sort_order,created_at FROM listing_unit_images WHERE unit_id=ANY($1::uuid[]) ORDER BY unit_id,sort_order`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var image domain.ListingUnitImage
		if err := rows.Scan(&image.ID, &image.UnitID, &image.URL, &image.SortOrder, &image.CreatedAt); err != nil {
			return err
		}
		units[byID[image.UnitID]].Images = append(units[byID[image.UnitID]].Images, image)
	}
	return rows.Err()
}

func (r *BookingRepo) ListUnits(ctx context.Context, listingID string, activeOnly bool) ([]domain.ListingUnit, error) {
	q := `SELECT ` + unitColumns + ` FROM listing_units WHERE listing_id=$1`
	if activeOnly {
		q += ` AND is_active`
	}
	q += ` ORDER BY parent_unit_id NULLS FIRST, name, id`
	rows, err := r.db.Query(ctx, q, listingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []domain.ListingUnit{}
	for rows.Next() {
		u, err := scanUnit(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	if err := r.loadUnitImages(ctx, result); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *BookingRepo) CreateUnit(ctx context.Context, u *domain.ListingUnit) error {
	if u.ParentUnitID != nil {
		tx, err := r.db.Begin(ctx)
		if err != nil {
			return err
		}
		defer tx.Rollback(ctx)
		var parentType string
		err = tx.QueryRow(ctx, `SELECT type FROM listing_units WHERE id=$1 AND listing_id=$2 FOR UPDATE`, *u.ParentUnitID, u.ListingID).Scan(&parentType)
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.NewNotFound("parent unit not found")
		}
		if err != nil {
			return err
		}
		if parentType != "room" {
			return fmt.Errorf("bed parent must be a room: %w", domain.ErrInvalidInput)
		}
		var used bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM booking_units WHERE unit_id=$1)`, *u.ParentUnitID).Scan(&used); err != nil {
			return err
		}
		if used {
			return domain.NewConflict("room has booking history")
		}
		if err = tx.QueryRow(ctx, `INSERT INTO listing_units (listing_id,parent_unit_id,type,name,name_ru,capacity_adults,capacity_children,pets_allowed,is_active,price_per_night,currency)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,created_at,updated_at`, u.ListingID, u.ParentUnitID, u.Type, u.Name, u.NameRU, u.CapacityAdults, u.CapacityChildren, u.PetsAllowed, u.IsActive, u.PricePerNight, u.Currency).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return mapUnitWriteError(err)
		}
		return tx.Commit(ctx)
	}
	err := r.db.QueryRow(ctx, `INSERT INTO listing_units (listing_id,parent_unit_id,type,name,name_ru,capacity_adults,capacity_children,pets_allowed,is_active,price_per_night,currency)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,created_at,updated_at`, u.ListingID, u.ParentUnitID, u.Type, u.Name, u.NameRU, u.CapacityAdults, u.CapacityChildren, u.PetsAllowed, u.IsActive, u.PricePerNight, u.Currency).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
	return mapUnitWriteError(err)
}

func (r *BookingRepo) UpdateUnit(ctx context.Context, u *domain.ListingUnit) error {
	row := r.db.QueryRow(ctx, `UPDATE listing_units SET name=$3,name_ru=$4,capacity_adults=$5,capacity_children=$6,pets_allowed=$7,is_active=$8,price_per_night=$9,currency=$10,updated_at=now()
	WHERE id=$1 AND listing_id=$2 RETURNING `+unitColumns, u.ID, u.ListingID, u.Name, u.NameRU, u.CapacityAdults, u.CapacityChildren, u.PetsAllowed, u.IsActive, u.PricePerNight, u.Currency)
	updated, err := scanUnit(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.NewNotFound("unit not found")
	}
	if err != nil {
		return mapUnitWriteError(err)
	}
	*u = updated
	items := []domain.ListingUnit{*u}
	if err := r.loadUnitImages(ctx, items); err != nil {
		return err
	}
	*u = items[0]
	return nil
}

func (r *BookingRepo) GetUnit(ctx context.Context, listingID, unitID string) (*domain.ListingUnit, error) {
	u, err := scanUnit(r.db.QueryRow(ctx, `SELECT `+unitColumns+` FROM listing_units WHERE listing_id=$1 AND id=$2`, listingID, unitID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("unit not found")
	}
	if err != nil {
		return nil, err
	}
	items := []domain.ListingUnit{u}
	if err := r.loadUnitImages(ctx, items); err != nil {
		return nil, err
	}
	return &items[0], nil
}

func (r *BookingRepo) AvailableUnits(ctx context.Context, listingID, start, end string, pets bool) ([]domain.ListingUnit, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM listings WHERE id=$1 AND is_active)`, listingID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, domain.NewNotFound("listing not found")
	}
	rows, err := r.db.Query(ctx, `SELECT u.id,u.listing_id,u.parent_unit_id,p.name,p.name_ru,u.type,u.name,u.name_ru,u.capacity_adults,u.capacity_children,u.pets_allowed,u.is_active,u.price_per_night,u.currency,u.created_at,u.updated_at
	FROM listing_units u JOIN listings l ON l.id=u.listing_id LEFT JOIN listing_units p ON p.id=u.parent_unit_id
	WHERE u.listing_id=$1 AND l.is_active AND u.is_active AND (u.parent_unit_id IS NULL OR EXISTS (SELECT 1 FROM listing_units p WHERE p.id=u.parent_unit_id AND p.is_active)) AND (NOT $4 OR u.pets_allowed)
	AND (u.type <> 'room' OR NOT EXISTS (SELECT 1 FROM listing_units child WHERE child.parent_unit_id=u.id))
	AND NOT EXISTS (SELECT 1 FROM booking_units bu JOIN bookings b ON b.id=bu.booking_id
	 WHERE bu.unit_id=u.id AND b.status <> 'canceled' AND b.check_in_date < $3::date AND b.check_out_date > $2::date)
	ORDER BY u.parent_unit_id NULLS FIRST,u.name,u.id`, listingID, start, end, pets)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []domain.ListingUnit{}
	for rows.Next() {
		u, err := scanUnit(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	if err := r.loadUnitImages(ctx, result); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *BookingRepo) CreateUnitImage(ctx context.Context, listingID, unitID, url string, sortOrder int) (*domain.ListingUnitImage, error) {
	var image domain.ListingUnitImage
	err := r.db.QueryRow(ctx, `INSERT INTO listing_unit_images(unit_id,url,sort_order)
	SELECT id,$3,$4 FROM listing_units WHERE id=$2 AND listing_id=$1
	RETURNING id,unit_id,url,sort_order,created_at`, listingID, unitID, url, sortOrder).Scan(&image.ID, &image.UnitID, &image.URL, &image.SortOrder, &image.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("unit not found")
	}
	if err != nil {
		return nil, mapUnitWriteError(err)
	}
	return &image, nil
}
func (r *BookingRepo) DeleteUnitImage(ctx context.Context, listingID, unitID, imageID string) error {
	command, err := r.db.Exec(ctx, `DELETE FROM listing_unit_images i USING listing_units u WHERE i.id=$3 AND i.unit_id=$2 AND u.id=i.unit_id AND u.listing_id=$1`, listingID, unitID, imageID)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return domain.NewNotFound("image not found")
	}
	return nil
}

func (r *BookingRepo) UpdateUnitImage(ctx context.Context, listingID, unitID, imageID string, url *string, sortOrder *int) (*domain.ListingUnitImage, error) {
	var image domain.ListingUnitImage
	err := r.db.QueryRow(ctx, `UPDATE listing_unit_images i SET url=COALESCE($4,i.url),sort_order=COALESCE($5,i.sort_order) FROM listing_units u WHERE i.id=$3 AND i.unit_id=u.id AND u.id=$2 AND u.listing_id=$1 RETURNING i.id,i.unit_id,i.url,i.sort_order,i.created_at`, listingID, unitID, imageID, url, sortOrder).Scan(&image.ID, &image.UnitID, &image.URL, &image.SortOrder, &image.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("image not found")
	}
	if err != nil {
		return nil, mapUnitWriteError(err)
	}
	return &image, nil
}

const bookingColumns = `b.id,b.listing_id,b.user_id,b.check_in_date,b.check_out_date,b.adults_count,b.children_count,b.has_pets,b.total,b.currency,COALESCE(b.base_total,b.total),b.rate_id,b.quoted_at,b.status,b.cancellation_reason,b.canceled_by,b.canceled_at,b.checked_in_by,b.checked_in_at,b.completed_by,b.completed_at,b.created_at,b.updated_at`

func scanBooking(row pgx.Row) (domain.Booking, error) {
	var b domain.Booking
	var start, end time.Time
	err := row.Scan(&b.ID, &b.ListingID, &b.UserID, &start, &end, &b.AdultsCount, &b.ChildrenCount, &b.HasPets, &b.Total, &b.Currency, &b.BaseTotal, &b.RateID, &b.QuotedAt, &b.Status, &b.CancellationReason, &b.CanceledBy, &b.CanceledAt, &b.CheckedInBy, &b.CheckedInAt, &b.CompletedBy, &b.CompletedAt, &b.CreatedAt, &b.UpdatedAt)
	if err == nil {
		b.CheckInDate = start.Format("2006-01-02")
		b.CheckOutDate = end.Format("2006-01-02")
	}
	return b, err
}

func (r *BookingRepo) GetBooking(ctx context.Context, id string) (*domain.Booking, error) {
	b, err := scanBooking(r.db.QueryRow(ctx, `SELECT `+bookingColumns+` FROM bookings b WHERE b.id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("booking not found")
	}
	if err != nil {
		return nil, err
	}
	if err := r.loadBookedUnits(ctx, []*domain.Booking{&b}); err != nil {
		return nil, err
	}
	if err := r.loadBookingLabels(ctx, []*domain.Booking{&b}); err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *BookingRepo) loadBookedUnits(ctx context.Context, bookings []*domain.Booking) error {
	if len(bookings) == 0 {
		return nil
	}
	ids := make([]string, len(bookings))
	byID := make(map[string]*domain.Booking, len(bookings))
	for i, booking := range bookings {
		ids[i] = booking.ID
		byID[booking.ID] = booking
		booking.UnitIDs = []string{}
		booking.Units = []domain.BookedUnit{}
	}
	rows, err := r.db.Query(ctx, `SELECT bu.booking_id,bu.unit_id,u.name,u.name_ru,bu.price_per_night
		FROM booking_units bu JOIN listing_units u ON u.id=bu.unit_id
		WHERE bu.booking_id=ANY($1::uuid[]) ORDER BY bu.booking_id,bu.unit_id`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var bookingID string
		var item domain.BookedUnit
		if err := rows.Scan(&bookingID, &item.UnitID, &item.Name, &item.NameRU, &item.PricePerNight); err != nil {
			return err
		}
		booking := byID[bookingID]
		booking.UnitIDs = append(booking.UnitIDs, item.UnitID)
		booking.Units = append(booking.Units, item)
	}
	return rows.Err()
}

func (r *BookingRepo) loadBookingLabels(ctx context.Context, bookings []*domain.Booking) error {
	if len(bookings) == 0 {
		return nil
	}
	ids := make([]string, len(bookings))
	byID := make(map[string]*domain.Booking, len(bookings))
	for i, booking := range bookings {
		ids[i] = booking.ID
		byID[booking.ID] = booking
	}
	rows, err := r.db.Query(ctx, `SELECT b.id,l.title,l.title_ru,l.main_picture,u.email,
		COALESCE(NULLIF(trim(concat_ws(' ',p.first_name,p.last_name)),''),u.email)
		FROM bookings b JOIN listings l ON l.id=b.listing_id
		JOIN users u ON u.id=b.user_id LEFT JOIN user_profiles p ON p.user_id=b.user_id
		WHERE b.id=ANY($1::uuid[])`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		var title, email, name string
		var titleRU, thumbnailURL *string
		if err := rows.Scan(&id, &title, &titleRU, &thumbnailURL, &email, &name); err != nil {
			return err
		}
		booking := byID[id]
		booking.ListingTitle, booking.ListingTitleRU = title, titleRU
		booking.ListingThumbnailURL = thumbnailURL
		booking.ClientName, booking.ClientEmail = name, email
	}
	return rows.Err()
}

func (r *BookingRepo) ListBookings(ctx context.Context, userID string, staff bool, f domain.BookingFilter, limit, offset int) ([]domain.Booking, int, error) {
	orderBy := `b.created_at DESC,b.id DESC`
	switch f.Sort.By {
	case "status", "listing_id", "id":
		dir := "ASC"
		if f.Sort.Order == "desc" {
			dir = "DESC"
		}
		orderBy = `b.` + f.Sort.By + ` ` + dir + `,b.id ` + dir
	case "created_at":
		if f.Sort.Order == "asc" {
			orderBy = `b.created_at ASC,b.id ASC`
		}
	case "check_in_date", "check_out_date":
		if f.Sort.Order == "desc" {
			orderBy = `b.` + f.Sort.By + ` DESC,b.id DESC`
		} else {
			orderBy = `b.` + f.Sort.By + ` ASC,b.id ASC`
		}
	}
	rows, err := r.db.Query(ctx, `SELECT `+bookingColumns+`, count(*) over() FROM bookings b
	WHERE ($1::boolean OR b.user_id=$2::uuid OR ($12::boolean AND EXISTS (SELECT 1 FROM hotelier_listings hl WHERE hl.hotelier_id=$2::uuid AND hl.listing_id=b.listing_id))) AND (NULLIF($3::text,'') IS NULL OR b.listing_id=NULLIF($3::text,'')::uuid)
	AND (NULLIF($4::text,'') IS NULL OR b.status=$4) AND (NULLIF($5::text,'') IS NULL OR b.check_in_date >= NULLIF($5::text,'')::date)
	AND (NULLIF($6::text,'') IS NULL OR b.check_in_date <= NULLIF($6::text,'')::date)
	AND (NULLIF($7::text,'') IS NULL OR b.user_id=NULLIF($7::text,'')::uuid)
	AND (NULLIF($8::text,'') IS NULL OR b.check_out_date >= NULLIF($8::text,'')::date)
	AND (NULLIF($9::text,'') IS NULL OR b.check_out_date <= NULLIF($9::text,'')::date)
		ORDER BY `+orderBy+` LIMIT $10 OFFSET $11`, staff, userID, f.ListingID, f.Status, f.CheckInFrom, f.CheckInTo, f.ClientID, f.CheckOutFrom, f.CheckOutTo, limit, offset, f.HotelierOnly)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	result := []domain.Booking{}
	total := 0
	for rows.Next() {
		var b domain.Booking
		var start, end time.Time
		err := rows.Scan(&b.ID, &b.ListingID, &b.UserID, &start, &end, &b.AdultsCount, &b.ChildrenCount, &b.HasPets, &b.Total, &b.Currency, &b.BaseTotal, &b.RateID, &b.QuotedAt, &b.Status, &b.CancellationReason, &b.CanceledBy, &b.CanceledAt, &b.CheckedInBy, &b.CheckedInAt, &b.CompletedBy, &b.CompletedAt, &b.CreatedAt, &b.UpdatedAt, &total)
		if err != nil {
			return nil, 0, err
		}
		b.CheckInDate = start.Format("2006-01-02")
		b.CheckOutDate = end.Format("2006-01-02")
		b.UnitIDs = []string{}
		result = append(result, b)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	rows.Close()
	ptrs := make([]*domain.Booking, len(result))
	for i := range result {
		ptrs[i] = &result[i]
	}
	if err := r.loadBookedUnits(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	if err := r.loadBookingLabels(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	return result, total, nil
}

func (r *BookingRepo) GetBookingForHotelier(ctx context.Context, id, hotelierID string) (*domain.Booking, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM bookings b JOIN hotelier_listings hl ON hl.listing_id=b.listing_id WHERE b.id=$1 AND hl.hotelier_id=$2)`, id, hotelierID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, domain.NewNotFound("booking not found")
	}
	return r.GetBooking(ctx, id)
}

func (r *BookingRepo) TransitionHotelier(ctx context.Context, id, actor, action, reason string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var status string
	err = tx.QueryRow(ctx, `SELECT b.status FROM bookings b JOIN hotelier_listings hl ON hl.listing_id=b.listing_id WHERE b.id=$1 AND hl.hotelier_id=$2 FOR UPDATE OF b`, id, actor).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.NewNotFound("booking not found")
	}
	if err != nil {
		return err
	}
	switch action {
	case "check-in":
		if status != "confirmed" {
			return domain.NewConflict("booking cannot be checked in")
		}
		_, err = tx.Exec(ctx, `UPDATE bookings SET status='checked_in',checked_in_by=$2,checked_in_at=now(),updated_at=now() WHERE id=$1`, id, actor)
	case "check-out":
		if status != "checked_in" {
			return domain.NewConflict("booking cannot be completed")
		}
		_, err = tx.Exec(ctx, `UPDATE bookings SET status='completed',completed_by=$2,completed_at=now(),updated_at=now() WHERE id=$1`, id, actor)
	case "cancel":
		if status != "confirmed" && status != "checked_in" {
			return domain.NewConflict("booking cannot be canceled")
		}
		_, err = tx.Exec(ctx, `UPDATE bookings SET status='canceled',cancellation_reason=$2,canceled_by=$3,canceled_at=now(),updated_at=now() WHERE id=$1`, id, reason, actor)
	default:
		return domain.ErrInvalidInput
	}
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *BookingRepo) CreateBooking(ctx context.Context, userID string, in domain.CreateBookingInput, end string, quote domain.CurrencyQuote) (string, error) {
	unitIDs := make([]pgtype.UUID, 0, len(in.UnitIDs))
	canonicalIDs := make([]string, 0, len(in.UnitIDs))
	for _, raw := range in.UnitIDs {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return "", err
		}
		unitIDs = append(unitIDs, pgtype.UUID{Bytes: [16]byte(parsed), Valid: true})
		canonicalIDs = append(canonicalIDs, parsed.String())
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)
	var active bool
	err = tx.QueryRow(ctx, `SELECT is_active FROM listings WHERE id=$1`, in.ListingID).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", domain.NewNotFound("listing not found")
	}
	if err != nil {
		return "", err
	}
	if !active {
		return "", domain.NewConflict("listing inactive")
	}
	// Sorted IDs and a row lock serialize all writers for each selected physical unit.
	rows, err := tx.Query(ctx, `SELECT u.id,u.capacity_adults,u.capacity_children,u.pets_allowed,u.is_active,u.type,u.price_per_night,u.currency,
	EXISTS(SELECT 1 FROM listing_units child WHERE child.parent_unit_id=u.id),
	COALESCE((SELECT p.is_active FROM listing_units p WHERE p.id=u.parent_unit_id),true)
	FROM listing_units u WHERE u.listing_id=$1 AND u.id=ANY($2::uuid[]) ORDER BY u.id FOR UPDATE OF u`, in.ListingID, unitIDs)
	if err != nil {
		return "", err
	}
	count, adults, children := 0, 0, 0
	prices := make(map[string]decimal.Decimal, len(in.UnitIDs))
	totalPerNight := decimal.Zero
	for rows.Next() {
		var id, typ, unitCurrency string
		var price decimal.Decimal
		var ca, cc int
		var pets, active, hasChildren, parentActive bool
		if err := rows.Scan(&id, &ca, &cc, &pets, &active, &typ, &price, &unitCurrency, &hasChildren, &parentActive); err != nil {
			rows.Close()
			return "", err
		}
		if !active || !parentActive || (in.HasPets && !pets) || (typ == "room" && hasChildren) {
			rows.Close()
			return "", domain.ErrUnitUnavailable
		}
		// Unit prices are stored in the system base currency. Their legacy
		// currency column is retained for compatibility and is not used here.
		_ = unitCurrency
		prices[id] = price
		totalPerNight = totalPerNight.Add(price)
		count++
		adults += ca
		children += cc
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return "", err
	}
	if count != len(in.UnitIDs) {
		return "", domain.ErrUnitUnavailable
	}
	if adults < in.AdultsCount || children < in.ChildrenCount {
		return "", fmt.Errorf("capacity exceeded: %w", domain.ErrInvalidInput)
	}
	var occupied bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM booking_units bu JOIN bookings b ON b.id=bu.booking_id
	 WHERE bu.unit_id=ANY($1::uuid[]) AND b.status <> 'canceled' AND b.check_in_date < $3::date AND b.check_out_date > $2::date)`, unitIDs, in.CheckInDate, end).Scan(&occupied)
	if err != nil {
		return "", err
	}
	if occupied {
		return "", domain.ErrUnitUnavailable
	}
	var id string
	baseTotal := totalPerNight.Mul(decimal.NewFromInt(int64(in.Nights)))
	if quote.Currency == "" || quote.Rate.IsNegative() || quote.Rate.IsZero() || quote.QuotedAt.IsZero() {
		return "", fmt.Errorf("%w: invalid currency quote", domain.ErrInvalidInput)
	}
	total := baseTotal.Mul(quote.Rate)
	err = tx.QueryRow(ctx, `INSERT INTO bookings(listing_id,user_id,check_in_date,check_out_date,adults_count,children_count,has_pets,total,currency,base_total,rate_id,quoted_at)
	VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, in.ListingID, userID, in.CheckInDate, end, in.AdultsCount, in.ChildrenCount, in.HasPets, total, quote.Currency, baseTotal, quote.RateID, quote.QuotedAt).Scan(&id)
	if err != nil {
		return "", err
	}
	for _, uid := range canonicalIDs {
		if _, err = tx.Exec(ctx, `INSERT INTO booking_units(booking_id,listing_id,unit_id,price_per_night) VALUES($1,$2,$3,$4)`, id, in.ListingID, uid, prices[uid]); err != nil {
			return "", err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return "", err
	}
	return id, nil
}

func (r *BookingRepo) Transition(ctx context.Context, id, actor, action, reason string, staff bool) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var owner, status string
	var start time.Time
	var checkInTime string
	err = tx.QueryRow(ctx, `SELECT b.user_id,b.status,b.check_in_date,l.check_in_time::text FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE b.id=$1 FOR UPDATE OF b`, id).Scan(&owner, &status, &start, &checkInTime)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.NewNotFound("booking not found")
	}
	if err != nil {
		return err
	}
	if !staff && owner != actor {
		return domain.NewNotFound("booking not found")
	}
	if action == "cancel" {
		if status != "confirmed" {
			return domain.NewConflict("booking cannot be canceled")
		}
		clock, parseErr := time.Parse("15:04:05", checkInTime)
		if parseErr != nil {
			return parseErr
		}
		deadline := time.Date(start.Year(), start.Month(), start.Day(), clock.Hour(), clock.Minute(), 0, 0, time.Local)
		if !time.Now().Before(deadline) {
			return domain.NewConflict("cancellation deadline passed")
		}
		_, err = tx.Exec(ctx, `UPDATE bookings SET status='canceled',cancellation_reason=$2,canceled_by=$3,canceled_at=now(),updated_at=now() WHERE id=$1`, id, reason, actor)
	} else if action == "check-in" && staff && status == "confirmed" {
		_, err = tx.Exec(ctx, `UPDATE bookings SET status='checked_in',checked_in_by=$2,checked_in_at=now(),updated_at=now() WHERE id=$1`, id, actor)
	} else if action == "check-out" && staff && status == "checked_in" {
		_, err = tx.Exec(ctx, `UPDATE bookings SET status='completed',completed_by=$2,completed_at=now(),updated_at=now() WHERE id=$1`, id, actor)
	} else {
		return domain.NewConflict("invalid booking transition")
	}
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
