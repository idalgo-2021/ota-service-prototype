package service

import (
	"encoding/json"
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func TestListingReviewPatchValidation(t *testing.T) {
	for _, tc := range []struct {
		name string
		body string
		good bool
	}{
		{"half step", `{"cleanliness_rating":4.5,"positive_review":" Good "}`, true},
		{"manual overall", `{"overall_rating":3.5}`, true},
		{"clear overall", `{"overall_rating":null}`, true},
		{"overall tenth", `{"overall_rating":8.3}`, true},
		{"invalid overall step", `{"overall_rating":8.35}`, false},
		{"explicit null", `{"wifi_rating":null}`, true},
		{"zero", `{"wifi_rating":0}`, false},
		{"wrong step", `{"wifi_rating":4.25}`, false},
		{"ten point criterion", `{"wifi_rating":9.5}`, true},
		{"too high", `{"wifi_rating":10.5}`, false},
		{"empty patch", `{}`, false},
		{"valid context", `{"trip_purpose":"tourism","party_type":"friends","reviewer_gender":"other","reviewer_age":"34"}`, true},
		{"invalid purpose", `{"trip_purpose":"holiday"}`, false},
		{"invalid age", `{"reviewer_age":"034"}`, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var patch domain.ListingReviewPatch
			if err := json.Unmarshal([]byte(tc.body), &patch); err != nil {
				t.Fatal(err)
			}
			err := validateListingPatch(&patch)
			if (err == nil) != tc.good {
				t.Fatalf("validation err=%v", err)
			}
			if tc.name == "explicit null" && (!patch.WifiRating.Set || patch.WifiRating.Value != nil) {
				t.Fatal("explicit null was not preserved")
			}
		})
	}
}
