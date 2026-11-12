package service

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type profileRepoStub struct {
	profile *domain.Profile
	updated *domain.Profile
	patch   domain.ProfilePatch
}

func (r *profileRepoStub) GetByUserID(_ context.Context, id string) (*domain.Profile, error) {
	if r.profile.UserID != id {
		return nil, domain.ErrProfileNotFound
	}
	p := *r.profile
	return &p, nil
}
func (r *profileRepoStub) Update(_ context.Context, p *domain.Profile, patch domain.ProfilePatch) (*domain.Profile, error) {
	r.updated = p
	r.patch = patch
	return p, nil
}
func (r *profileRepoStub) ListClients(context.Context, int, int) ([]domain.Profile, int, error) {
	return nil, 0, nil
}

func TestProfileUpdateAppliesPartialFieldsAndClearsOptionalValues(t *testing.T) {
	year, location := 1990, 3
	repo := &profileRepoStub{profile: &domain.Profile{UserID: "client-1", FirstName: "Анна", BirthYear: &year, LocationID: &location, CountryID: 1, Language: "RU", Currency: "RUB"}}
	name := "Мария"
	patch := domain.ProfilePatch{
		FirstName:  domain.PatchValue[string]{Set: true, Value: &name},
		BirthYear:  domain.PatchValue[int]{Set: true},
		LocationID: domain.PatchValue[int]{Set: true},
	}
	got, err := NewProfileService(repo).Update(context.Background(), "client-1", patch)
	if err != nil {
		t.Fatal(err)
	}
	if got.FirstName != "Мария" || got.BirthYear != nil || got.LocationID != nil || got.CountryID != 1 || got.Currency != "RUB" {
		t.Fatalf("unexpected profile after patch: %+v", got)
	}
}

func TestProfileUpdateRejectsInvalidYearAndOtherUser(t *testing.T) {
	repo := &profileRepoStub{profile: &domain.Profile{UserID: "client-1", CountryID: 1, Language: "RU", Currency: "RUB"}}
	year := 3000
	_, err := NewProfileService(repo).Update(context.Background(), "client-1", domain.ProfilePatch{
		BirthYear: domain.PatchValue[int]{Set: true, Value: &year},
	})
	if !errors.Is(err, domain.ErrInvalidInput) || repo.updated != nil {
		t.Fatalf("expected invalid input without update, got %v", err)
	}
	_, err = NewProfileService(repo).Update(context.Background(), "client-2", domain.ProfilePatch{})
	if !errors.Is(err, domain.ErrProfileNotFound) {
		t.Fatalf("expected not found, got %v", err)
	}
}

func TestProfileUpdateSavesAndClearsSearchPreferences(t *testing.T) {
	repo := &profileRepoStub{profile: &domain.Profile{UserID: "client-1", CountryID: 1, Language: "RU", Currency: "RUB"}}
	prefs := domain.SearchPreferences{Version: 1, LocationIDs: []int{1}, ListingTypeIDs: []int{}, Nights: 3, AdultsCount: 2, ChildrenCount: 0, ListingPriceSort: "asc", ListingRatingSort: "desc", ProductPriceSort: "asc", ProductRatingSort: "desc"}
	s := NewProfileService(repo)
	got, err := s.Update(context.Background(), "client-1", domain.ProfilePatch{
		SearchPreferences: domain.PatchValue[domain.SearchPreferences]{Set: true, Value: &prefs},
	})
	if err != nil || got.SearchPreferences == nil || got.SearchPreferences.Nights != 3 || !repo.patch.SearchPreferences.Set {
		t.Fatalf("preferences not saved: profile=%+v err=%v", got, err)
	}
	repo.profile = got
	got, err = s.Update(context.Background(), "client-1", domain.ProfilePatch{
		SearchPreferences: domain.PatchValue[domain.SearchPreferences]{Set: true},
	})
	if err != nil || got.SearchPreferences != nil {
		t.Fatalf("preferences not cleared: profile=%+v err=%v", got, err)
	}
}

func TestProfileUpdateRejectsInvalidSearchPreferences(t *testing.T) {
	repo := &profileRepoStub{profile: &domain.Profile{UserID: "client-1", CountryID: 1, Language: "RU", Currency: "RUB"}}
	for _, prefs := range []domain.SearchPreferences{
		{Version: 2, LocationIDs: []int{}, ListingTypeIDs: []int{}, Nights: 1, AdultsCount: 1, ListingPriceSort: "asc", ListingRatingSort: "desc", ProductPriceSort: "asc", ProductRatingSort: "desc"},
		{Version: 1, LocationIDs: []int{1, 1}, ListingTypeIDs: []int{}, Nights: 1, AdultsCount: 1, ListingPriceSort: "asc", ListingRatingSort: "desc", ProductPriceSort: "asc", ProductRatingSort: "desc"},
		{Version: 1, LocationIDs: []int{}, ListingTypeIDs: []int{}, Nights: 0, AdultsCount: 1, ListingPriceSort: "asc", ListingRatingSort: "desc", ProductPriceSort: "asc", ProductRatingSort: "desc"},
		{Version: 1, LocationIDs: []int{}, ListingTypeIDs: []int{}, Nights: 1, AdultsCount: 1, ListingPriceSort: "invalid", ListingRatingSort: "desc", ProductPriceSort: "asc", ProductRatingSort: "desc"},
	} {
		_, err := NewProfileService(repo).Update(context.Background(), "client-1", domain.ProfilePatch{
			SearchPreferences: domain.PatchValue[domain.SearchPreferences]{Set: true, Value: &prefs},
		})
		if !errors.Is(err, domain.ErrInvalidInput) || repo.updated != nil {
			t.Fatalf("invalid preferences accepted: %+v, %v", prefs, err)
		}
	}
}

func TestProfileUpdateNormalizesOptionalDemographics(t *testing.T) {
	oldGender, oldNationality := "male", "Русский"
	repo := &profileRepoStub{profile: &domain.Profile{UserID: "client-1", CountryID: 1, Language: "RU", Currency: "RUB", Gender: &oldGender, Nationality: &oldNationality}}
	service := NewProfileService(repo)

	gender, nationality := "female", "  Кыргызка  "
	got, err := service.Update(context.Background(), "client-1", domain.ProfilePatch{
		Gender:      domain.PatchValue[string]{Set: true, Value: &gender},
		Nationality: domain.PatchValue[string]{Set: true, Value: &nationality},
	})
	if err != nil || got.Gender == nil || *got.Gender != "female" || got.Nationality == nil || *got.Nationality != "Кыргызка" {
		t.Fatalf("demographics not saved and trimmed: %+v %v", got, err)
	}
	repo.profile = got
	spaces := " \t "
	got, err = service.Update(context.Background(), "client-1", domain.ProfilePatch{
		Gender:      domain.PatchValue[string]{Set: true},
		Nationality: domain.PatchValue[string]{Set: true, Value: &spaces},
	})
	if err != nil || got.Gender != nil || got.Nationality != nil || !repo.patch.Nationality.Set {
		t.Fatalf("demographics not cleared: %+v %v", got, err)
	}
	repo.profile = &domain.Profile{UserID: "client-1", CountryID: 1, Language: "RU", Currency: "RUB", Nationality: &oldNationality}
	empty := ""
	got, err = service.Update(context.Background(), "client-1", domain.ProfilePatch{
		Nationality: domain.PatchValue[string]{Set: true, Value: &empty},
	})
	if err != nil || got.Nationality != nil {
		t.Fatalf("empty nationality was not cleared: %+v %v", got, err)
	}
	repo.profile = got
	if _, err = service.Update(context.Background(), "client-1", domain.ProfilePatch{}); err != nil {
		t.Fatal(err)
	}
	if repo.patch.Gender.Set || repo.patch.Nationality.Set {
		t.Fatalf("omitted demographics were marked for update: %+v", repo.patch)
	}
}

func TestProfileUpdateRejectsInvalidDemographics(t *testing.T) {
	for _, tc := range []struct {
		gender, nationality string
	}{
		{gender: "unknown"},
		{nationality: strings.Repeat("я", 101)},
	} {
		repo := &profileRepoStub{profile: &domain.Profile{UserID: "client-1", CountryID: 1, Language: "RU", Currency: "RUB"}}
		patch := domain.ProfilePatch{}
		if tc.gender != "" {
			patch.Gender = domain.PatchValue[string]{Set: true, Value: &tc.gender}
		}
		if tc.nationality != "" {
			patch.Nationality = domain.PatchValue[string]{Set: true, Value: &tc.nationality}
		}
		_, err := NewProfileService(repo).Update(context.Background(), "client-1", patch)
		if !errors.Is(err, domain.ErrInvalidInput) || repo.updated != nil {
			t.Fatalf("invalid demographics accepted: %+v %v", tc, err)
		}
	}
}
