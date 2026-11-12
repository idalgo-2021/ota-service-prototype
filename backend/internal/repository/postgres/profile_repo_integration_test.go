package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/idalgo-2021/product-catalog-backend/internal/config"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/service"
)

// Run against a migrated disposable database with TEST_DATABASE_URL, or the local
// Docker database with PROFILE_INTEGRATION_TEST=1. The test removes its own user.
func TestProfileRepositoryIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		if os.Getenv("PROFILE_INTEGRATION_TEST") != "1" {
			t.Skip("TEST_DATABASE_URL or PROFILE_INTEGRATION_TEST is not set")
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
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	user := &domain.User{
		ID: uuid.NewString(), Email: "profile-test-" + uuid.NewString() + "@example.invalid",
		PasswordHash: "temporary-test-hash", CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	if err := NewUserRepo(db).Create(ctx, user); err != nil {
		t.Fatal(err)
	}
	defer func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cleanupCancel()
		if _, err := db.Exec(cleanupCtx, `DELETE FROM users WHERE id=$1`, user.ID); err != nil {
			t.Errorf("clean up user: %v", err)
		}
	}()
	repo := NewProfileRepo(db)
	p, err := repo.GetByUserID(ctx, user.ID)
	if err != nil {
		t.Fatal(err)
	}
	if p.SearchPreferences != nil || p.Gender != nil || p.Nationality != nil || p.Language != "RU" || p.Currency != "RUB" {
		t.Fatalf("unexpected new profile defaults: %+v", p)
	}
	if _, err := db.Exec(ctx, `UPDATE user_profiles SET first_name='Changed concurrently' WHERE user_id=$1`, user.ID); err != nil {
		t.Fatal(err)
	}
	prefs := &domain.SearchPreferences{Version: 1, LocationIDs: []int{1}, ListingTypeIDs: []int{}, Nights: 2, AdultsCount: 1, ListingPriceSort: "asc", ListingRatingSort: "desc", ProductPriceSort: "asc", ProductRatingSort: "desc"}
	p.SearchPreferences = prefs
	updated, err := repo.Update(ctx, p, domain.ProfilePatch{SearchPreferences: domain.PatchValue[domain.SearchPreferences]{Set: true, Value: prefs}})
	if err != nil {
		t.Fatal(err)
	}
	if updated.FirstName != "Changed concurrently" || updated.SearchPreferences == nil || updated.SearchPreferences.Nights != 2 {
		t.Fatalf("partial update lost a field or preferences: %+v", updated)
	}
	clientView, err := repo.GetClientByUserID(ctx, user.ID)
	if err != nil || clientView.SearchPreferences != nil {
		t.Fatalf("staff profile view exposed preferences: %+v %v", clientView, err)
	}
	lang := "EN"
	staffUpdated, err := service.NewProfileService(repo).UpdateClient(ctx, user.ID, domain.ProfilePatch{Language: domain.PatchValue[string]{Set: true, Value: &lang}})
	if err != nil || staffUpdated.Language != "EN" || staffUpdated.SearchPreferences == nil {
		t.Fatalf("staff profile update: %+v %v", staffUpdated, err)
	}
	gender, nationality := "female", "  Кыргызка  "
	staffUpdated, err = service.NewProfileService(repo).UpdateClient(ctx, user.ID, domain.ProfilePatch{
		Gender:      domain.PatchValue[string]{Set: true, Value: &gender},
		Nationality: domain.PatchValue[string]{Set: true, Value: &nationality},
	})
	if err != nil || staffUpdated.Gender == nil || *staffUpdated.Gender != "female" || staffUpdated.Nationality == nil || *staffUpdated.Nationality != "Кыргызка" {
		t.Fatalf("staff demographics update: %+v %v", staffUpdated, err)
	}
	clientView, err = repo.GetClientByUserID(ctx, user.ID)
	if err != nil || clientView.Gender == nil || *clientView.Gender != "female" || clientView.Nationality == nil || *clientView.Nationality != "Кыргызка" {
		t.Fatalf("staff demographics read: %+v %v", clientView, err)
	}
	clients, _, err := repo.ListClients(ctx, 100, 0)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, client := range clients {
		if client.UserID == user.ID {
			found = client.Gender != nil && *client.Gender == "female" && client.Nationality != nil && *client.Nationality == "Кыргызка"
		}
	}
	if !found {
		t.Fatal("client list did not include demographics")
	}
	empty := " \t "
	clearedDemographics, err := service.NewProfileService(repo).Update(ctx, user.ID, domain.ProfilePatch{
		Gender:      domain.PatchValue[string]{Set: true},
		Nationality: domain.PatchValue[string]{Set: true, Value: &empty},
	})
	if err != nil || clearedDemographics.Gender != nil || clearedDemographics.Nationality != nil {
		t.Fatalf("demographics were not cleared: %+v %v", clearedDemographics, err)
	}
	updated.SearchPreferences = nil
	cleared, err := repo.Update(ctx, updated, domain.ProfilePatch{SearchPreferences: domain.PatchValue[domain.SearchPreferences]{Set: true}})
	if err != nil {
		t.Fatal(err)
	}
	if cleared.SearchPreferences != nil {
		t.Fatalf("preferences were not cleared: %+v", cleared.SearchPreferences)
	}
}
