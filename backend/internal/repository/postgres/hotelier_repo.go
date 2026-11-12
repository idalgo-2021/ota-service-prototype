package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type HotelierRepo struct{ db *pgxpool.Pool }

func NewHotelierRepo(db *pgxpool.Pool) *HotelierRepo { return &HotelierRepo{db: db} }

func replaceListingFeatureTags(ctx context.Context, tx pgx.Tx, listingID string, ids []int64) error {
	if len(ids) > 100 {
		return domain.ErrInvalidInput
	}
	if len(ids) > 0 {
		var activeCount int
		if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM listing_feature_tags WHERE id=ANY($1::bigint[]) AND is_active`, ids).Scan(&activeCount); err != nil {
			return err
		}
		if activeCount != len(ids) {
			return domain.ErrInvalidInput
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM listing_feature_tag_assignments WHERE listing_id=$1`, listingID); err != nil {
		return err
	}
	for order, id := range ids {
		if _, err := tx.Exec(ctx, `INSERT INTO listing_feature_tag_assignments(listing_id,tag_id,sort_order) VALUES($1,$2,$3)`, listingID, id, order); err != nil {
			return err
		}
	}
	return nil
}

func (r *HotelierRepo) GetHotelierProfile(ctx context.Context, hotelierID string) (*domain.HotelierProfile, error) {
	var profile domain.HotelierProfile
	err := r.db.QueryRow(ctx, `SELECT u.email,COALESCE(p.first_name,''),COALESCE(p.last_name,''),COALESCE(p.language,'RU')
		FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id
		WHERE u.id=$1 AND u.role='hotelier'`, hotelierID).Scan(&profile.Email, &profile.FirstName, &profile.LastName, &profile.Language)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *HotelierRepo) UpdateHotelierListingCard(ctx context.Context, hotelierID, listingID string, input domain.HotelierListingCardInput) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM hotelier_listings WHERE hotelier_id=$1 AND listing_id=$2)`, hotelierID, listingID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return domain.ErrNotFound
	}
	var mainPicture *string
	if len(input.Images) > 0 {
		mainPicture = &input.Images[0]
	}
	if _, err := tx.Exec(ctx, `UPDATE listings SET title=$3,title_ru=NULLIF(btrim($4),''),address=NULLIF(btrim($5),''),address_ru=NULLIF(btrim($6),''),description=NULLIF(btrim($7),''),description_ru=NULLIF(btrim($8),''),main_picture=$9,is_active=COALESCE($10::boolean,is_active),deactivated_at=CASE WHEN COALESCE($10::boolean,is_active) THEN NULL ELSE COALESCE(deactivated_at,now()) END,check_in_time=$11::time,updated_at=now() WHERE id=$1 AND EXISTS(SELECT 1 FROM hotelier_listings WHERE hotelier_id=$2 AND listing_id=$1)`, listingID, hotelierID, input.Title, input.TitleRU, input.Address, input.AddressRU, input.Description, input.DescriptionRU, mainPicture, input.IsActive, input.CheckInTime); err != nil {
		return err
	}
	if err := replaceListingFeatureTags(ctx, tx, listingID, input.FeatureIDs); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM listing_images WHERE listing_id=$1`, listingID); err != nil {
		return err
	}
	for i, url := range input.Images {
		if _, err := tx.Exec(ctx, `INSERT INTO listing_images(listing_id,url,sort_order) VALUES($1,$2,$3)`, listingID, url, i); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *HotelierRepo) CreateHotelierListing(ctx context.Context, hotelierID string, input domain.CreateHotelierListingInput) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)
	var refsExist bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM listing_types WHERE id=$1) AND EXISTS(SELECT 1 FROM locations WHERE id=$2)`, input.ListingTypeID, input.LocationID).Scan(&refsExist); err != nil {
		return "", err
	}
	if !refsExist {
		return "", domain.ErrInvalidInput
	}
	var mainPicture *string
	if len(input.Images) > 0 {
		mainPicture = &input.Images[0]
	}
	var listingID string
	err = tx.QueryRow(ctx, `INSERT INTO listings(title,title_ru,description,description_ru,main_picture,listing_type_id,address,address_ru,location_id)
		VALUES(btrim($1),NULLIF(btrim($2),''),NULLIF(btrim($3),''),NULLIF(btrim($4),''),$5,$6,NULLIF(btrim($7),''),NULLIF(btrim($8),''),$9) RETURNING id::text`,
		input.Title, input.TitleRU, input.Description, input.DescriptionRU, mainPicture, input.ListingTypeID, input.Address, input.AddressRU, input.LocationID).Scan(&listingID)
	if err != nil {
		return "", err
	}
	if err := replaceListingFeatureTags(ctx, tx, listingID, input.FeatureIDs); err != nil {
		return "", err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO hotelier_listings(hotelier_id,listing_id) VALUES($1,$2)`, hotelierID, listingID); err != nil {
		return "", err
	}
	for i, url := range input.Images {
		if _, err := tx.Exec(ctx, `INSERT INTO listing_images(listing_id,url,sort_order) VALUES($1,$2,$3)`, listingID, url, i); err != nil {
			return "", err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return listingID, nil
}

func (r *HotelierRepo) SetHotelierListingActive(ctx context.Context, hotelierID, listingID string, active bool) error {
	command, err := r.db.Exec(ctx, `UPDATE listings l SET is_active=$3,
		deactivated_at=CASE WHEN $3 THEN NULL ELSE COALESCE(l.deactivated_at,now()) END,updated_at=now()
		WHERE l.id=$2 AND EXISTS(SELECT 1 FROM hotelier_listings hl WHERE hl.hotelier_id=$1 AND hl.listing_id=l.id)`, hotelierID, listingID, active)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *HotelierRepo) CanAccessListing(ctx context.Context, hotelierID, listingID string) (bool, error) {
	var ok bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM hotelier_listings WHERE hotelier_id=$1 AND listing_id=$2)`, hotelierID, listingID).Scan(&ok)
	return ok, err
}

func (r *HotelierRepo) ListHotelierListings(ctx context.Context, hotelierID string) ([]domain.HotelierListing, error) {
	rows, err := r.db.Query(ctx, `SELECT l.id::text,l.title,l.title_ru,
		COALESCE(l.main_picture,(SELECT li.url FROM listing_images li WHERE li.listing_id=l.id ORDER BY li.sort_order,li.created_at LIMIT 1)),
		l.address,l.address_ru,l.is_active,loc.name,loc.name_ru,l.check_in_time::text,l.created_at,l.deactivated_at,lt.name,lt.name_ru,l.average_overall_rating,
		COUNT(lr.id) FILTER (WHERE lr.status='approved' AND NOT lr.is_hidden)::integer,
		(SELECT COUNT(*)::integer FROM feed_videos fv WHERE fv.listing_id=l.id),
		l.description,l.description_ru,
		COALESCE((SELECT jsonb_agg(jsonb_build_object('id',li.id,'url',li.url,'sort_order',li.sort_order,'created_at',li.created_at AT TIME ZONE 'UTC') ORDER BY li.sort_order,li.created_at) FROM listing_images li WHERE li.listing_id=l.id),'[]'::jsonb)
		FROM listings l
		JOIN hotelier_listings hl ON hl.listing_id=l.id
		JOIN listing_types lt ON lt.id=l.listing_type_id
		JOIN locations loc ON loc.id=l.location_id
		LEFT JOIN listing_reviews lr ON lr.listing_id=l.id
		WHERE hl.hotelier_id=$1
		GROUP BY l.id,lt.id,loc.id
		ORDER BY l.title,l.id`, hotelierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.HotelierListing{}
	for rows.Next() {
		var item domain.HotelierListing
		var images []byte
		if err := rows.Scan(&item.ID, &item.Title, &item.TitleRU, &item.MainPicture, &item.Address, &item.AddressRU, &item.IsActive, &item.LocationName, &item.LocationNameRU, &item.CheckInTime, &item.CreatedAt, &item.DeactivatedAt, &item.ListingTypeName, &item.ListingTypeNameRU, &item.AverageOverallRating, &item.PublishedReviewCount, &item.VideoCount, &item.Description, &item.DescriptionRU, &images); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(images, &item.Images); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	if len(items) == 0 {
		return items, nil
	}
	ids := make([]string, 0, len(items))
	byID := make(map[string]int, len(items))
	for i := range items {
		ids = append(ids, items[i].ID)
		byID[items[i].ID] = i
		items[i].Features = make([]domain.FeatureTag, 0)
	}
	tagRows, err := r.db.Query(ctx, `SELECT a.listing_id::text,t.id,t.slug,t.name,t.name_ru FROM listing_feature_tag_assignments a JOIN listing_feature_tags t ON t.id=a.tag_id WHERE a.listing_id=ANY($1::uuid[]) AND t.is_active ORDER BY a.listing_id,a.sort_order,t.id`, ids)
	if err != nil {
		return nil, err
	}
	defer tagRows.Close()
	for tagRows.Next() {
		var listingID string
		var tag domain.FeatureTag
		if err := tagRows.Scan(&listingID, &tag.ID, &tag.Slug, &tag.Name, &tag.NameRU); err != nil {
			return nil, err
		}
		if i, ok := byID[listingID]; ok {
			items[i].Features = append(items[i].Features, tag)
		}
	}
	return items, tagRows.Err()
}

func (r *HotelierRepo) HotelierListingIDs(ctx context.Context, hotelierID string) ([]string, error) {
	rows, err := r.db.Query(ctx, `SELECT listing_id::text FROM hotelier_listings WHERE hotelier_id=$1`, hotelierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *HotelierRepo) AdminListingIDs(ctx context.Context, userID string) ([]string, error) {
	var role string
	if err := r.db.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, userID).Scan(&role); errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if role != string(domain.RoleHotelier) {
		return nil, fmt.Errorf("user is not a hotelier: %w", domain.ErrInvalidInput)
	}
	rows, err := r.db.Query(ctx, `SELECT listing_id::text FROM hotelier_listings WHERE hotelier_id=$1 ORDER BY listing_id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *HotelierRepo) AdminListingAssignments(ctx context.Context, userID string) ([]domain.HotelierListingAssignment, error) {
	if _, err := r.AdminListingIDs(ctx, userID); err != nil {
		return nil, err
	}
	rows, err := r.db.Query(ctx, `SELECT listing_id::text,created_at FROM hotelier_listings WHERE hotelier_id=$1 ORDER BY listing_id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	assignments := make([]domain.HotelierListingAssignment, 0)
	for rows.Next() {
		var assignment domain.HotelierListingAssignment
		if err := rows.Scan(&assignment.ListingID, &assignment.CreatedAt); err != nil {
			return nil, err
		}
		assignments = append(assignments, assignment)
	}
	return assignments, rows.Err()
}

func (r *HotelierRepo) SetAdminListingIDs(ctx context.Context, userID string, listingIDs []string) ([]string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var role string
	if err = tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1 FOR UPDATE`, userID).Scan(&role); errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if role != string(domain.RoleHotelier) {
		return nil, fmt.Errorf("user is not a hotelier: %w", domain.ErrInvalidInput)
	}
	if len(listingIDs) > 0 {
		var count int
		if err = tx.QueryRow(ctx, `SELECT count(DISTINCT id) FROM listings WHERE id=ANY($1::uuid[])`, listingIDs).Scan(&count); err != nil {
			return nil, err
		}
		if count != len(listingIDs) {
			return nil, fmt.Errorf("one or more listings do not exist: %w", domain.ErrInvalidInput)
		}
	}
	if _, err = tx.Exec(ctx, `DELETE FROM hotelier_listings WHERE hotelier_id=$1 AND NOT (listing_id=ANY($2::uuid[]))`, userID, listingIDs); err != nil {
		return nil, err
	}
	for _, listingID := range listingIDs {
		if _, err = tx.Exec(ctx, `INSERT INTO hotelier_listings(hotelier_id,listing_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, userID, listingID); err != nil {
			return nil, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.AdminListingIDs(ctx, userID)
}

func (r *HotelierRepo) ListMessages(ctx context.Context, hotelierID, listingID, messageType, status, sortBy, sortOrder string, limit, offset int) ([]domain.HotelierMessage, int, error) {
	order := map[string]string{"created_at": "m.created_at", "status": "m.status", "listing_id": "m.listing_id", "id": "m.id"}[sortBy]
	if order == "" {
		order = "m.created_at"
		sortOrder = "desc"
	}
	if sortOrder != "asc" {
		sortOrder = "desc"
	}
	where := `m.hotelier_id=$1 AND (m.listing_id IS NULL OR EXISTS(SELECT 1 FROM hotelier_listings hl WHERE hl.hotelier_id=m.hotelier_id AND hl.listing_id=m.listing_id)) AND (NULLIF($2::text,'') IS NULL OR m.listing_id=NULLIF($2::text,'')::uuid) AND (NULLIF($3::text,'') IS NULL OR m.message_type=$3) AND (NULLIF($4::text,'') IS NULL OR m.status=$4)`
	var total int
	if err := r.db.QueryRow(ctx, `SELECT count(*) FROM hotelier_messages m WHERE `+where, hotelierID, listingID, messageType, status).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.Query(ctx, `SELECT m.id::text,m.hotelier_id::text,COALESCE(m.listing_id::text,''),COALESCE(l.title,''),m.message_type,m.sender_type,m.sender_user_id::text,m.sender_name,m.sender_email,m.source,m.external_message_id,m.message_text,m.hotelier_reply,m.status,m.created_at,m.replied_at,m.processed_at FROM hotelier_messages m LEFT JOIN listings l ON l.id=m.listing_id WHERE `+where+` ORDER BY `+order+` `+sortOrder+`,m.id `+sortOrder+` LIMIT $5 OFFSET $6`, hotelierID, listingID, messageType, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []domain.HotelierMessage{}
	for rows.Next() {
		var m domain.HotelierMessage
		if err := rows.Scan(&m.ID, &m.HotelierID, &m.ListingID, &m.ListingTitle, &m.MessageType, &m.SenderType, &m.SenderUserID, &m.SenderName, &m.SenderEmail, &m.Source, &m.ExternalMessageID, &m.MessageText, &m.HotelierReply, &m.Status, &m.CreatedAt, &m.RepliedAt, &m.ProcessedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, m)
	}
	return items, total, rows.Err()
}

const hotelierMessageSelect = `SELECT m.id::text,m.hotelier_id::text,COALESCE(m.listing_id::text,''),COALESCE(l.title,''),m.message_type,m.sender_type,m.sender_user_id::text,m.sender_name,m.sender_email,m.source,m.external_message_id,m.message_text,m.hotelier_reply,m.status,m.created_at,m.replied_at,m.processed_at FROM hotelier_messages m LEFT JOIN listings l ON l.id=m.listing_id`

func (r *HotelierRepo) GetMessage(ctx context.Context, hotelierID, messageID string) (*domain.HotelierMessage, error) {
	var m domain.HotelierMessage
	err := r.db.QueryRow(ctx, hotelierMessageSelect+` WHERE m.id=$1 AND m.hotelier_id=$2 AND (m.listing_id IS NULL OR EXISTS(SELECT 1 FROM hotelier_listings hl WHERE hl.hotelier_id=m.hotelier_id AND hl.listing_id=m.listing_id))`, messageID, hotelierID).Scan(&m.ID, &m.HotelierID, &m.ListingID, &m.ListingTitle, &m.MessageType, &m.SenderType, &m.SenderUserID, &m.SenderName, &m.SenderEmail, &m.Source, &m.ExternalMessageID, &m.MessageText, &m.HotelierReply, &m.Status, &m.CreatedAt, &m.RepliedAt, &m.ProcessedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.NewNotFound("message not found")
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *HotelierRepo) ReplyMessage(ctx context.Context, hotelierID, messageID, reply string, processed bool) (*domain.HotelierMessage, error) {
	status := "new"
	if processed {
		status = "processed"
	}
	command, err := r.db.Exec(ctx, `UPDATE hotelier_messages m SET hotelier_reply=NULLIF($3,''),replied_at=CASE WHEN NULLIF($3,'') IS NULL THEN NULL ELSE now() END,status=$4,processed_at=CASE WHEN $5 THEN now() ELSE NULL END WHERE id=$1 AND hotelier_id=$2 AND (EXISTS(SELECT 1 FROM hotelier_listings hl WHERE hl.hotelier_id=m.hotelier_id AND hl.listing_id=m.listing_id) OR (m.listing_id IS NULL AND m.sender_type='system' AND NULLIF($3,'') IS NULL AND $5))`, messageID, hotelierID, reply, status, processed)
	if err != nil {
		return nil, err
	}
	if command.RowsAffected() == 0 {
		return nil, domain.NewNotFound("message not found")
	}
	return r.GetMessage(ctx, hotelierID, messageID)
}

func (r *HotelierRepo) CreateIncomingMessage(ctx context.Context, m domain.HotelierMessage) (*domain.HotelierMessage, error) {
	var role string
	err := r.db.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, m.HotelierID).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if role != string(domain.RoleHotelier) {
		return nil, domain.ErrInvalidInput
	}
	allowed, err := r.CanAccessListing(ctx, m.HotelierID, m.ListingID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, domain.ErrInvalidInput
	}
	err = r.db.QueryRow(ctx, `INSERT INTO hotelier_messages(hotelier_id,listing_id,message_type,sender_type,sender_user_id,sender_name,sender_email,source,external_message_id,message_text) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text`, m.HotelierID, m.ListingID, m.MessageType, m.SenderType, m.SenderUserID, m.SenderName, m.SenderEmail, m.Source, m.ExternalMessageID, m.MessageText).Scan(&m.ID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23505" {
				return nil, domain.ErrAlreadyExists
			}
			if pgErr.Code == "23503" || pgErr.Code == "23514" {
				return nil, domain.ErrInvalidInput
			}
		}
		return nil, err
	}
	return r.GetMessage(ctx, m.HotelierID, m.ID)
}

func (r *HotelierRepo) CreateClientQuestion(ctx context.Context, listingID, clientID, messageText string) ([]domain.HotelierMessage, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var role string
	if err = tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, clientID).Scan(&role); errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if role != string(domain.RoleUser) {
		return nil, domain.ErrForbidden
	}
	var listingExists bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM listings WHERE id=$1 AND is_active)`, listingID).Scan(&listingExists); err != nil {
		return nil, err
	}
	if !listingExists {
		return nil, domain.ErrNotFound
	}
	rows, err := tx.Query(ctx, `INSERT INTO hotelier_messages(hotelier_id,listing_id,message_type,sender_type,sender_user_id,sender_name,sender_email,message_text)
	SELECT hl.hotelier_id,hl.listing_id,'client_question','known_client',$2,NULLIF(trim(concat_ws(' ',p.first_name,p.last_name)),''),u.email,$3
	FROM hotelier_listings hl JOIN users u ON u.id=$2 LEFT JOIN user_profiles p ON p.user_id=u.id WHERE hl.listing_id=$1 RETURNING id::text,hotelier_id::text`, listingID, clientID, messageText)
	if err != nil {
		return nil, err
	}
	type ref struct{ id, owner string }
	refs := []ref{}
	for rows.Next() {
		var v ref
		if err := rows.Scan(&v.id, &v.owner); err != nil {
			rows.Close()
			return nil, err
		}
		refs = append(refs, v)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()
	if len(refs) == 0 {
		return nil, domain.NewNotFound("no hotelier assigned to listing")
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	items := make([]domain.HotelierMessage, 0, len(refs))
	for _, ref := range refs {
		m, err := r.GetMessage(ctx, ref.owner, ref.id)
		if err != nil {
			return nil, err
		}
		items = append(items, *m)
	}
	return items, nil
}
