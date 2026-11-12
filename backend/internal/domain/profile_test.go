package domain

import (
	"encoding/json"
	"strings"
	"testing"
)

const validPreferencesJSON = `{"version":1,"location_ids":[1,4],"listing_type_ids":[],"nights":3,"adults_count":2,"children_count":0,"has_pets":false,"sort":"price_asc"}`

func TestSearchPreferencesPatchDistinguishesOmittedSavedAndCleared(t *testing.T) {
	var omitted, saved, cleared ProfilePatch
	if err := json.Unmarshal([]byte(`{"first_name":"Анна"}`), &omitted); err != nil {
		t.Fatal(err)
	}
	if omitted.SearchPreferences.Set {
		t.Fatal("omitted preferences marked as set")
	}
	if err := json.Unmarshal([]byte(`{"search_preferences":`+validPreferencesJSON+`}`), &saved); err != nil {
		t.Fatal(err)
	}
	if !saved.SearchPreferences.Set || saved.SearchPreferences.Value == nil || saved.SearchPreferences.Value.Nights != 3 {
		t.Fatalf("preferences not decoded: %+v", saved.SearchPreferences)
	}
	if err := json.Unmarshal([]byte(`{"search_preferences":null}`), &cleared); err != nil {
		t.Fatal(err)
	}
	if !cleared.SearchPreferences.Set || cleared.SearchPreferences.Value != nil {
		t.Fatal("null did not clear preferences")
	}
}

func TestSearchPreferencesRequireCompleteKnownObject(t *testing.T) {
	for _, raw := range []string{
		`{"version":1}`,
		strings.Replace(validPreferencesJSON, `"children_count":0`, `"children_count":null`, 1),
		strings.Replace(validPreferencesJSON, `"sort":"price_asc"`, `"unknown":true`, 1),
	} {
		var patch ProfilePatch
		if err := json.Unmarshal([]byte(`{"search_preferences":`+raw+`}`), &patch); err == nil {
			t.Fatalf("incomplete or unknown preferences accepted: %s", raw)
		}
	}
}

func TestProfileOmitsUnsetSearchPreferences(t *testing.T) {
	data, err := json.Marshal(Profile{UserID: "client-1"})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), "search_preferences") {
		t.Fatalf("unset preferences exposed: %s", data)
	}
}

func TestOptionalDemographicsPatchDistinguishesOmittedValueAndNull(t *testing.T) {
	var omitted, saved, cleared ProfilePatch
	if err := json.Unmarshal([]byte(`{}`), &omitted); err != nil {
		t.Fatal(err)
	}
	if omitted.Gender.Set || omitted.Nationality.Set {
		t.Fatal("omitted demographics marked as set")
	}
	if err := json.Unmarshal([]byte(`{"gender":"female","nationality":"Кыргызка"}`), &saved); err != nil {
		t.Fatal(err)
	}
	if saved.Gender.Value == nil || *saved.Gender.Value != "female" || saved.Nationality.Value == nil || *saved.Nationality.Value != "Кыргызка" {
		t.Fatalf("demographics not decoded: %+v", saved)
	}
	if err := json.Unmarshal([]byte(`{"gender":null,"nationality":null}`), &cleared); err != nil {
		t.Fatal(err)
	}
	if !cleared.Gender.Set || cleared.Gender.Value != nil || !cleared.Nationality.Set || cleared.Nationality.Value != nil {
		t.Fatalf("null did not clear demographics: %+v", cleared)
	}
}
