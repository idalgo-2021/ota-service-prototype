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

type ListingReviewRepo struct{ db *pgxpool.Pool }

func NewListingReviewRepo(db *pgxpool.Pool) *ListingReviewRepo { return &ListingReviewRepo{db: db} }

const listingReviewColumns = `id, is_imported, reviewer_user_id, external_source, external_review_id, external_reviewer_id,
 reviewer_display_name, listing_id, booking_id, overall_rating, positive_review,
 negative_review, cleanliness_rating, staff_rating, comfort_rating, location_rating, sleep_rating,
 bathroom_rating, wifi_rating, trip_purpose, party_type, accommodation_type, nights, reviewer_age,
 reviewer_gender, reviewer_country, status, is_hidden, created_at, updated_at, submitted_at,
 original_at, moderated_at, moderated_by, rejection_reason, hidden_at, hidden_by, hidden_reason`

func scanListingReview(row pgx.Row) (domain.ListingReview, error) {
	var v domain.ListingReview
	err := row.Scan(&v.ID, &v.IsImported, &v.ReviewerUserID, &v.ExternalSource, &v.ExternalReviewID,
		&v.ExternalReviewerID, &v.ReviewerDisplayName, &v.ListingID, &v.BookingID, &v.OverallRating,
		&v.PositiveReview, &v.NegativeReview, &v.CleanlinessRating,
		&v.StaffRating, &v.ComfortRating, &v.LocationRating, &v.SleepRating,
		&v.BathroomRating, &v.WifiRating, &v.TripPurpose, &v.PartyType,
		&v.AccommodationType, &v.Nights, &v.ReviewerAge, &v.ReviewerGender, &v.ReviewerCountry,
		&v.Status, &v.IsHidden, &v.CreatedAt, &v.UpdatedAt, &v.SubmittedAt, &v.OriginalAt,
		&v.ModeratedAt, &v.ModeratedBy, &v.RejectionReason, &v.HiddenAt, &v.HiddenBy, &v.HiddenReason)
	return v, err
}

func listingReviewWriteError(err error) error {
	var p *pgconn.PgError
	if errors.As(err, &p) {
		switch p.Code {
		case "23505":
			return domain.ErrAlreadyExists
		case "23503", "23514", "22P02":
			return fmt.Errorf("%w: invalid listing review reference or value", domain.ErrInvalidInput)
		}
	}
	return err
}

func (r *ListingReviewRepo) Get(ctx context.Context, id string) (*domain.ListingReview, error) {
	v, err := scanListingReview(r.db.QueryRow(ctx, `SELECT `+listingReviewColumns+` FROM listing_reviews WHERE id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("listing review not found")
	}
	if err != nil {
		return nil, err
	}
	if err := r.loadListingTitles(ctx, []*domain.ListingReview{&v}); err != nil {
		return nil, err
	}
	if err := r.loadBookingStays(ctx, []*domain.ListingReview{&v}); err != nil {
		return nil, err
	}
	if err := r.loadClientNames(ctx, []*domain.ListingReview{&v}); err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *ListingReviewRepo) loadListingTitles(ctx context.Context, reviews []*domain.ListingReview) error {
	if len(reviews) == 0 {
		return nil
	}
	ids := make([]string, len(reviews))
	byID := make(map[string][]*domain.ListingReview)
	for i, review := range reviews {
		ids[i] = review.ListingID
		byID[review.ListingID] = append(byID[review.ListingID], review)
	}
	rows, err := r.db.Query(ctx, `SELECT l.id,l.title,l.title_ru,l.main_picture,
		loc.name,loc.name_ru,c.name,c.name_ru
		FROM listings l
		JOIN locations loc ON loc.id=l.location_id
		JOIN countries c ON c.id=loc.country_id
		WHERE l.id=ANY($1::uuid[])`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id, title, city, country string
		var titleRU, thumbnailURL, cityRU, countryRU *string
		if err := rows.Scan(&id, &title, &titleRU, &thumbnailURL, &city, &cityRU, &country, &countryRU); err != nil {
			return err
		}
		for _, review := range byID[id] {
			review.ListingTitle, review.ListingTitleRU = title, titleRU
			review.ListingThumbnailURL = thumbnailURL
			review.CityName, review.CityNameRU = city, cityRU
			review.CountryName, review.CountryNameRU = country, countryRU
		}
	}
	return rows.Err()
}

func (r *ListingReviewRepo) loadBookingStays(ctx context.Context, reviews []*domain.ListingReview) error {
	ids := make([]string, 0, len(reviews))
	byID := make(map[string][]*domain.ListingReview)
	for _, review := range reviews {
		if review.BookingID != nil {
			ids = append(ids, *review.BookingID)
			byID[*review.BookingID] = append(byID[*review.BookingID], review)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	rows, err := r.db.Query(ctx, `SELECT id,check_in_date,check_out_date,adults_count,children_count,has_pets
		FROM bookings WHERE id=ANY($1::uuid[])`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		var checkIn, checkOut time.Time
		var adults, children int
		var hasPets bool
		if err := rows.Scan(&id, &checkIn, &checkOut, &adults, &children, &hasPets); err != nil {
			return err
		}
		for _, review := range byID[id] {
			review.StayCheckInDate, review.StayCheckOutDate = &checkIn, &checkOut
			review.StayAdultsCount, review.StayChildrenCount, review.StayHasPets = &adults, &children, &hasPets
		}
	}
	return rows.Err()
}

func (r *ListingReviewRepo) loadClientNames(ctx context.Context, reviews []*domain.ListingReview) error {
	ids := []string{}
	for _, review := range reviews {
		if review.ReviewerUserID != nil {
			ids = append(ids, *review.ReviewerUserID)
		}
	}
	names, err := reviewClientNames(ctx, r.db, ids)
	if err != nil {
		return err
	}
	for _, review := range reviews {
		if review.ReviewerUserID != nil {
			review.ClientName = names[*review.ReviewerUserID]
		}
	}
	return nil
}

func listingReviewWhere(f domain.ListingReviewFilter) (string, []any) {
	parts := []string{"TRUE"}
	args := []any{}
	add := func(column string, value any) {
		args = append(args, value)
		parts = append(parts, fmt.Sprintf("%s=$%d", column, len(args)))
	}
	if f.Public {
		parts = append(parts, "status='approved'", "NOT is_hidden")
	}
	if f.ReviewerUserID != "" {
		add("reviewer_user_id", f.ReviewerUserID)
	}
	if f.Status != "" {
		add("status", f.Status)
	}
	if f.CreatedFrom != nil {
		args = append(args, *f.CreatedFrom)
		parts = append(parts, fmt.Sprintf("created_at >= $%d", len(args)))
	}
	if f.CreatedTo != nil {
		args = append(args, *f.CreatedTo)
		parts = append(parts, fmt.Sprintf("created_at < $%d", len(args)))
	}
	if f.IsImported != nil {
		add("is_imported", *f.IsImported)
	}
	if f.ListingID != "" {
		add("listing_id", f.ListingID)
	}
	if f.HotelierOnly || len(f.ListingIDs) > 0 {
		args = append(args, f.ListingIDs)
		parts = append(parts, fmt.Sprintf("listing_id=ANY($%d::uuid[])", len(args)))
	}
	if f.ListingSearch != "" {
		args = append(args, "%"+strings.NewReplacer("\\", "\\\\", "%", "\\%", "_", "\\_").Replace(f.ListingSearch)+"%")
		parts = append(parts, fmt.Sprintf("EXISTS (SELECT 1 FROM listings l WHERE l.id=listing_id AND (l.title ILIKE $%d ESCAPE '\\' OR l.title_ru ILIKE $%d ESCAPE '\\'))", len(args), len(args)))
	}
	if f.RatingField != "" {
		// The column name is chosen from a fixed whitelist before building SQL.
		switch f.RatingField {
		case "overall_rating", "cleanliness_rating", "staff_rating", "comfort_rating", "location_rating", "sleep_rating", "bathroom_rating", "wifi_rating":
			if f.MinRating != nil {
				args = append(args, *f.MinRating)
				parts = append(parts, fmt.Sprintf("%s >= $%d", f.RatingField, len(args)))
			}
			if f.MaxRating != nil {
				args = append(args, *f.MaxRating)
				parts = append(parts, fmt.Sprintf("%s <= $%d", f.RatingField, len(args)))
			}
		}
	}
	return strings.Join(parts, " AND "), args
}

func listingReviewPatchValue[T any](field domain.ListingReviewField[T]) any {
	if field.Value == nil {
		return nil
	}
	return *field.Value
}

func listingReviewOrderBy(sort domain.ListingReviewSort, hotelier domain.Sort) string {
	if hotelier.By != "" {
		column := map[string]string{"status": "status", "created_at": "created_at", "listing_id": "listing_id", "id": "id", "overall_rating": "overall_rating"}[hotelier.By]
		dir := "ASC"
		if hotelier.Order == "desc" {
			dir = "DESC"
		}
		if column != "" {
			if column == "overall_rating" {
				return column + " " + dir + " NULLS LAST, id " + dir
			}
			if column == "id" {
				return "id " + dir
			}
			return column + " " + dir + ", id " + dir
		}
	}
	direction := func(value string) (string, bool) {
		switch value {
		case "asc":
			return "ASC", true
		case "desc":
			return "DESC", true
		default:
			return "", false
		}
	}
	parts := []string{}
	if value, ok := direction(sort.CreatedAt); ok {
		parts = append(parts, "created_at "+value)
	}
	if value, ok := direction(sort.OverallRating); ok {
		parts = append(parts, "overall_rating "+value+" NULLS LAST")
	}
	if len(parts) == 0 {
		return "created_at DESC, id DESC"
	}
	return strings.Join(parts, ", ") + ", id DESC"
}

func (r *ListingReviewRepo) List(ctx context.Context, f domain.ListingReviewFilter, limit, offset int) ([]domain.ListingReview, int, error) {
	where, args := listingReviewWhere(f)
	var total int
	if err := r.db.QueryRow(ctx, `SELECT count(*) FROM listing_reviews WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	query := `SELECT ` + listingReviewColumns + ` FROM listing_reviews WHERE ` + where +
		fmt.Sprintf(` ORDER BY %s LIMIT $%d OFFSET $%d`, listingReviewOrderBy(f.Sort, f.HotelierSort), len(args)+1, len(args)+2)
	rows, err := r.db.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []domain.ListingReview{}
	for rows.Next() {
		v, err := scanListingReview(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, v)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	rows.Close()
	ptrs := make([]*domain.ListingReview, len(items))
	for i := range items {
		ptrs[i] = &items[i]
	}
	if err := r.loadListingTitles(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	if err := r.loadBookingStays(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	if err := r.loadClientNames(ctx, ptrs); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// PatchDraft keeps the ownership, state and expiry checks in the update statement.
func (r *ListingReviewRepo) PatchDraft(ctx context.Context, id, reviewerUserID string, patch domain.ListingReviewPatch, cutoff time.Time) (*domain.ListingReview, error) {
	if patch.ReviewerCountry.Set && patch.ReviewerCountry.Value != nil {
		var canonical string
		err := r.db.QueryRow(ctx, `SELECT name FROM countries
			WHERE lower(name)=lower($1) OR lower(name_ru)=lower($1)
			ORDER BY CASE WHEN lower(name)=lower($1) THEN 0 ELSE 1 END, id
			LIMIT 1`, *patch.ReviewerCountry.Value).Scan(&canonical)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("%w: unknown reviewer_country", domain.ErrInvalidInput)
		}
		if err != nil {
			return nil, err
		}
		patch.ReviewerCountry.Value = &canonical
	}
	args := []any{id, reviewerUserID, cutoff}
	sets := []string{}
	add := func(column string, set bool, value any) {
		if !set {
			return
		}
		args = append(args, value)
		sets = append(sets, fmt.Sprintf("%s=$%d", column, len(args)))
	}
	for _, field := range []struct {
		column string
		set    bool
		value  any
	}{
		{"overall_rating", patch.OverallRating.Set, listingReviewPatchValue(patch.OverallRating)},
		{"positive_review", patch.PositiveReview.Set, listingReviewPatchValue(patch.PositiveReview)},
		{"negative_review", patch.NegativeReview.Set, listingReviewPatchValue(patch.NegativeReview)},
		{"cleanliness_rating", patch.CleanlinessRating.Set, listingReviewPatchValue(patch.CleanlinessRating)},
		{"staff_rating", patch.StaffRating.Set, listingReviewPatchValue(patch.StaffRating)},
		{"comfort_rating", patch.ComfortRating.Set, listingReviewPatchValue(patch.ComfortRating)},
		{"location_rating", patch.LocationRating.Set, listingReviewPatchValue(patch.LocationRating)},
		{"sleep_rating", patch.SleepRating.Set, listingReviewPatchValue(patch.SleepRating)},
		{"bathroom_rating", patch.BathroomRating.Set, listingReviewPatchValue(patch.BathroomRating)},
		{"wifi_rating", patch.WifiRating.Set, listingReviewPatchValue(patch.WifiRating)},
		{"trip_purpose", patch.TripPurpose.Set, listingReviewPatchValue(patch.TripPurpose)},
		{"party_type", patch.PartyType.Set, listingReviewPatchValue(patch.PartyType)},
		{"reviewer_age", patch.ReviewerAge.Set, listingReviewPatchValue(patch.ReviewerAge)},
		{"reviewer_gender", patch.ReviewerGender.Set, listingReviewPatchValue(patch.ReviewerGender)},
		{"reviewer_country", patch.ReviewerCountry.Set, listingReviewPatchValue(patch.ReviewerCountry)},
	} {
		add(field.column, field.set, field.value)
	}
	sets = append(sets, "updated_at=now()")
	query := `UPDATE listing_reviews SET ` + strings.Join(sets, ", ") + `
		WHERE id=$1 AND reviewer_user_id=$2 AND NOT is_imported AND status='draft' AND created_at>$3
		RETURNING ` + listingReviewColumns
	v, err := scanListingReview(r.db.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewConflict("listing review draft is unavailable or expired")
	}
	if err != nil {
		return nil, listingReviewWriteError(err)
	}
	return &v, nil
}

func (r *ListingReviewRepo) Submit(ctx context.Context, id, reviewerUserID string, cutoff time.Time) (*domain.ListingReview, error) {
	query := `UPDATE listing_reviews SET status='pending_moderation', submitted_at=now(), updated_at=now()
		WHERE id=$1 AND reviewer_user_id=$2 AND NOT is_imported AND status='draft' AND created_at>$3
		AND (NULLIF(btrim(positive_review),'') IS NOT NULL OR NULLIF(btrim(negative_review),'') IS NOT NULL)
		RETURNING ` + listingReviewColumns
	v, err := scanListingReview(r.db.QueryRow(ctx, query, id, reviewerUserID, cutoff))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewConflict("listing review draft is unavailable, incomplete or expired")
	}
	if err != nil {
		return nil, listingReviewWriteError(err)
	}
	return &v, nil
}

func (r *ListingReviewRepo) Moderate(ctx context.Context, id, moderatorID, action, reason string) (*domain.ListingReview, error) {
	var query string
	switch action {
	case "approve":
		query = `UPDATE listing_reviews SET status='approved', is_hidden=false, moderated_at=now(), moderated_by=$2,
			rejection_reason=NULL, updated_at=now() WHERE id=$1 AND status='pending_moderation'`
	case "reject":
		query = `UPDATE listing_reviews SET status='rejected', rejection_reason=$3, moderated_at=now(), moderated_by=$2,
			updated_at=now() WHERE id=$1 AND status='pending_moderation'`
	case "hide":
		query = `UPDATE listing_reviews SET is_hidden=true, hidden_at=now(), hidden_by=$2, hidden_reason=$3,
			updated_at=now() WHERE id=$1 AND status='approved' AND NOT is_hidden`
	case "unhide":
		query = `UPDATE listing_reviews SET is_hidden=false, hidden_at=NULL, hidden_by=NULL, hidden_reason=NULL,
			updated_at=now() WHERE id=$1 AND status='approved' AND is_hidden`
	default:
		return nil, fmt.Errorf("%w: invalid listing review action", domain.ErrInvalidInput)
	}
	query += ` RETURNING ` + listingReviewColumns
	var row pgx.Row
	switch action {
	case "reject", "hide":
		row = r.db.QueryRow(ctx, query, id, moderatorID, reason)
	case "approve":
		row = r.db.QueryRow(ctx, query, id, moderatorID)
	case "unhide":
		row = r.db.QueryRow(ctx, query, id)
	}
	v, err := scanListingReview(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewConflict("listing review state does not allow this action")
	}
	if err != nil {
		return nil, listingReviewWriteError(err)
	}
	return &v, nil
}
