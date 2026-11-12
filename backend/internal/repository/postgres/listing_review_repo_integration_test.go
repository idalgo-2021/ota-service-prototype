package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/config"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/maintenance"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func TestListingReviewRepositoryIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		if os.Getenv("REVIEW_INTEGRATION_TEST") != "1" {
			t.Skip("set TEST_DATABASE_URL or REVIEW_INTEGRATION_TEST=1 to run against a migrated database")
		}
		if err := godotenv.Load("../../../.env"); err != nil {
			t.Fatal(err)
		}
		var err error
		dsn, err = config.BuildDatabaseURL()
		if err != nil {
			t.Fatal(err)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	var otherCountryID int
	if err := pool.QueryRow(ctx, `INSERT INTO countries (name,name_ru,code) VALUES ('Test country','Тестовая страна','ZZ') RETURNING id`).Scan(&otherCountryID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM countries WHERE id=$1`, otherCountryID) })
	user := &domain.User{
		ID: uuid.NewString(), Email: "listing-review-test-" + uuid.NewString() + "@example.invalid",
		PasswordHash: "temporary-test-hash", CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	if err := NewUserRepo(pool).Create(ctx, user); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, user.ID) })
	userID := user.ID
	var listingID, unitID, unitType, listingSlug string
	if err := pool.QueryRow(ctx, `SELECT l.id,u.id,u.type,lt.slug FROM listings l
		JOIN listing_types lt ON lt.id=l.listing_type_id
		JOIN listing_units u ON u.listing_id=l.id AND u.type IN ('bed','property')
		ORDER BY l.id,u.id LIMIT 1`).Scan(&listingID, &unitID, &unitType, &listingSlug); err != nil {
		t.Fatal(err)
	}
	repo := NewListingReviewRepo(pool)
	maintenanceRepo := NewListingReviewMaintenanceRepo(pool)
	createDraft := func() string {
		var bookingID, reviewID string
		err := pool.QueryRow(ctx, `INSERT INTO bookings (listing_id,user_id,check_in_date,check_out_date,adults_count,children_count,has_pets,status,completed_at)
			VALUES ($1,$2,current_date-40,current_date-37,2,1,true,'completed',now()) RETURNING id`, listingID, userID).Scan(&bookingID)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM bookings WHERE id=$1`, bookingID) })
		if _, err := pool.Exec(ctx, `INSERT INTO booking_units (booking_id,listing_id,unit_id) VALUES ($1,$2,$3)`, bookingID, listingID, unitID); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() {
			_, _ = pool.Exec(context.Background(), `DELETE FROM booking_units WHERE booking_id=$1`, bookingID)
		})
		created, err := maintenanceRepo.CreateListingReviewDraft(ctx, maintenance.ListingReviewDraftCandidate{BookingID: bookingID, ListingID: listingID})
		if err != nil || !created {
			t.Fatalf("create booking review draft: created=%v err=%v", created, err)
		}
		if err := pool.QueryRow(ctx, `SELECT id FROM listing_reviews WHERE booking_id=$1`, bookingID).Scan(&reviewID); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM listing_reviews WHERE id=$1`, reviewID) })
		return reviewID
	}
	id := createDraft()
	var importedReviewID string
	if err := pool.QueryRow(ctx, `INSERT INTO listing_reviews (is_imported,external_source,external_review_id,listing_id,positive_review,status)
		VALUES (true,'integration_test',$1,$2,'Imported stay','approved') RETURNING id`, uuid.NewString(), listingID).Scan(&importedReviewID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM listing_reviews WHERE id=$1`, importedReviewID)
	})
	imported, err := repo.Get(ctx, importedReviewID)
	if err != nil || !imported.IsImported {
		t.Fatalf("imported listing review: %+v err=%v", imported, err)
	}
	if imported.CityName == "" || imported.CountryName == "" || imported.StayCheckInDate != nil || imported.StayAdultsCount != nil {
		t.Fatalf("imported review location or absent stay: %+v", imported)
	}
	v, err := repo.Get(ctx, id)
	wantType := unitType
	if unitType == "bed" && listingSlug == "hostel" {
		wantType = "hostel_bed"
	} else if unitType == "property" && listingSlug == "apartment" {
		wantType = "apartment"
	}
	if err != nil || v.IsImported || v.Nights == nil || *v.Nights != 3 || v.AccommodationType == nil || *v.AccommodationType != wantType || v.OverallRating != nil || v.ReviewerGender != nil || v.ReviewerAge != nil || v.ReviewerCountry == nil || *v.ReviewerCountry != "Russia" {
		t.Fatalf("draft snapshot: %+v err=%v", v, err)
	}
	if v.CityName == "" || v.CountryName == "" || v.StayCheckInDate == nil || v.StayCheckOutDate == nil || int(v.StayCheckOutDate.Sub(*v.StayCheckInDate).Hours()/24) != 3 || v.StayAdultsCount == nil || *v.StayAdultsCount != 2 || v.StayChildrenCount == nil || *v.StayChildrenCount != 1 || v.StayHasPets == nil || !*v.StayHasPets {
		t.Fatalf("booking stay details: %+v", v)
	}
	var city, country string
	var cityRU, countryRU *string
	if err := pool.QueryRow(ctx, `SELECT loc.name,loc.name_ru,c.name,c.name_ru FROM listings l
		JOIN locations loc ON loc.id=l.location_id JOIN countries c ON c.id=loc.country_id
		WHERE l.id=$1`, listingID).Scan(&city, &cityRU, &country, &countryRU); err != nil {
		t.Fatal(err)
	}
	if v.CityName != city || v.CountryName != country || (v.CityNameRU == nil) != (cityRU == nil) || (v.CountryNameRU == nil) != (countryRU == nil) || (cityRU != nil && *v.CityNameRU != *cityRU) || (countryRU != nil && *v.CountryNameRU != *countryRU) {
		t.Fatalf("localized listing location: %+v", v)
	}
	positive, country, age := "Good stay", "Россия", "34"
	overall, cleanliness, comfort, location, wifi := 3.5, 5.0, 4.5, 4.0, 3.0
	patch := domain.ListingReviewPatch{
		OverallRating:     domain.ListingReviewField[float64]{Set: true, Value: &overall},
		PositiveReview:    domain.ListingReviewField[string]{Set: true, Value: &positive},
		ReviewerCountry:   domain.ListingReviewField[string]{Set: true, Value: &country},
		ReviewerAge:       domain.ListingReviewField[string]{Set: true, Value: &age},
		CleanlinessRating: domain.ListingReviewField[float64]{Set: true, Value: &cleanliness},
		ComfortRating:     domain.ListingReviewField[float64]{Set: true, Value: &comfort},
		LocationRating:    domain.ListingReviewField[float64]{Set: true, Value: &location},
		WifiRating:        domain.ListingReviewField[float64]{Set: true, Value: &wifi},
	}
	v, err = repo.PatchDraft(ctx, id, userID, patch, time.Now().Add(-7*24*time.Hour))
	if err != nil || v.ReviewerCountry == nil || *v.ReviewerCountry != "Russia" {
		t.Fatalf("patch draft: %+v err=%v", v, err)
	}
	v, err = repo.PatchDraft(ctx, id, userID, domain.ListingReviewPatch{
		WifiRating: domain.ListingReviewField[float64]{Set: true},
	}, time.Now().Add(-7*24*time.Hour))
	if err != nil || v.WifiRating != nil || v.CleanlinessRating == nil {
		t.Fatalf("clear one rating: %+v err=%v", v, err)
	}
	v, err = repo.PatchDraft(ctx, id, userID, domain.ListingReviewPatch{
		OverallRating: domain.ListingReviewField[float64]{Set: true},
	}, time.Now().Add(-7*24*time.Hour))
	if err != nil || v.OverallRating != nil {
		t.Fatalf("clear overall rating: %+v err=%v", v, err)
	}
	v, err = repo.PatchDraft(ctx, id, userID, domain.ListingReviewPatch{
		OverallRating: domain.ListingReviewField[float64]{Set: true, Value: &overall},
	}, time.Now().Add(-7*24*time.Hour))
	if err != nil || v.OverallRating == nil || *v.OverallRating != overall {
		t.Fatalf("restore overall rating: %+v err=%v", v, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE listing_reviews SET staff_rating=4.25 WHERE id=$1`, id); err == nil {
		t.Fatal("database accepted a rating outside 0.5 steps")
	}
	v, err = repo.Submit(ctx, id, userID, time.Now().Add(-7*24*time.Hour))
	if err != nil || v.OverallRating == nil || *v.OverallRating != overall || v.Status != domain.ListingReviewPending {
		t.Fatalf("submitted review: %+v err=%v", v, err)
	}
	if _, err := repo.PatchDraft(ctx, id, userID, patch, time.Now().Add(-7*24*time.Hour)); err == nil {
		t.Fatal("submitted review was editable")
	}
	v, err = repo.Moderate(ctx, id, userID, "approve", "")
	if err != nil || v.ModeratedAt == nil || v.ModeratedBy == nil || *v.ModeratedBy != userID {
		t.Fatalf("moderation audit: %+v err=%v", v, err)
	}
	var listingTitle string
	if err := pool.QueryRow(ctx, `SELECT title FROM listings WHERE id=$1`, listingID).Scan(&listingTitle); err != nil {
		t.Fatal(err)
	}
	filtered, count, err := repo.List(ctx, domain.ListingReviewFilter{
		ReviewerUserID: userID, ListingSearch: listingTitle, RatingField: "overall_rating",
		MinRating: &overall, MaxRating: &overall,
	}, 20, 0)
	if err != nil || count != 1 || len(filtered) != 1 || filtered[0].ID != id || filtered[0].ListingTitle == "" || filtered[0].ClientName == "" || filtered[0].CityName == "" || filtered[0].CountryName == "" || filtered[0].StayCheckInDate == nil || filtered[0].StayAdultsCount == nil {
		t.Fatalf("filtered listing review: count=%d rows=%+v err=%v", count, filtered, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE user_profiles SET gender='female',
		birth_year=EXTRACT(YEAR FROM current_date-37)::integer-34 WHERE user_id=$1`, userID); err != nil {
		t.Fatal(err)
	}
	textOnlyID := createDraft()
	v, err = repo.Get(ctx, textOnlyID)
	if err != nil || v.ReviewerGender == nil || *v.ReviewerGender != "female" || v.ReviewerAge == nil || *v.ReviewerAge != "34" || v.ReviewerCountry == nil || *v.ReviewerCountry != "Russia" {
		t.Fatalf("profile snapshot: %+v err=%v", v, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE user_profiles SET gender='male', birth_year=2000, country_id=$2 WHERE user_id=$1`, userID, otherCountryID); err != nil {
		t.Fatal(err)
	}
	v, err = repo.Get(ctx, textOnlyID)
	if err != nil || v.ReviewerGender == nil || *v.ReviewerGender != "female" || v.ReviewerAge == nil || *v.ReviewerAge != "34" || v.ReviewerCountry == nil || *v.ReviewerCountry != "Russia" {
		t.Fatalf("review snapshot changed with profile: %+v err=%v", v, err)
	}
	changedCountryID := createDraft()
	v, err = repo.Get(ctx, changedCountryID)
	if err != nil || v.ReviewerCountry == nil || *v.ReviewerCountry != "Test country" {
		t.Fatalf("changed profile country was not copied: %+v err=%v", v, err)
	}
	if _, err := repo.PatchDraft(ctx, textOnlyID, userID, domain.ListingReviewPatch{
		PositiveReview: domain.ListingReviewField[string]{Set: true, Value: &positive},
	}, time.Now().Add(-7*24*time.Hour)); err != nil {
		t.Fatal(err)
	}
	v, err = repo.Submit(ctx, textOnlyID, userID, time.Now().Add(-7*24*time.Hour))
	if err != nil || v.OverallRating != nil {
		t.Fatalf("text only review: %+v err=%v", v, err)
	}
}
