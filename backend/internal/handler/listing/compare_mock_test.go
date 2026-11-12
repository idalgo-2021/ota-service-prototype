package listing

import (
	"encoding/json"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
)

func TestCompareHotelsMock(t *testing.T) {
	for _, tc := range []struct {
		name, query string
		status      int
		ids         []string
	}{
		{"selected hotels", "ids=hotel-a,hotel-b", 200, []string{"hotel-a", "hotel-b"}},
		{"deduplicates in order", "ids=hotel-b,hotel-a,hotel-b", 200, []string{"hotel-b", "hotel-a"}},
		{"empty selection", "", 200, []string{}},
		{"empty ID", "ids=a,,b", 400, nil},
		{"too many IDs", "ids=" + strings.Repeat("a,", 100) + "b", 400, nil},
		{"oversized ID", "ids=" + strings.Repeat("a", 129), 400, nil},
	} {
		t.Run(tc.name, func(t *testing.T) {
			res := httptest.NewRecorder()
			CompareHotelsMock(res, httptest.NewRequest("GET", "/api/v1/hotel/compare?"+tc.query, nil))
			if res.Code != tc.status {
				t.Fatalf("status %d, want %d: %s", res.Code, tc.status, res.Body.String())
			}
			if tc.status != 200 {
				return
			}
			var body struct {
				Data []ComparisonHotel `json:"data"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if body.Data == nil {
				t.Fatal("data must be an array, not null")
			}
			ids := make([]string, 0, len(body.Data))
			for _, hotel := range body.Data {
				ids = append(ids, hotel.ID)
				if !hotel.Demo {
					t.Fatal("mock must identify demo recommendations")
				}
				for _, lang := range []string{"ru", "en"} {
					advice := hotel.Advice[lang]
					if advice.Focus == "" || advice.Likes == "" || advice.Missing == "" || advice.Verdict == "" {
						t.Fatalf("missing recommendation in %s", lang)
					}
				}
				if hotel.StartingPrice == nil || hotel.StartingPrice.Currency != "RUB" || !strings.HasPrefix(hotel.Title, "Демо-отель") {
					t.Fatalf("incomplete demo hotel: %+v", hotel)
				}
			}
			if !reflect.DeepEqual(ids, tc.ids) {
				t.Fatalf("IDs %v, want %v", ids, tc.ids)
			}
		})
	}
	// Removing/reordering other selections must not change a hotel's demo values.
	first := mockComparisonHotel("hotel-a")
	_ = mockComparisonHotel("hotel-b")
	if !reflect.DeepEqual(first, mockComparisonHotel("hotel-a")) {
		t.Fatal("mock data is unstable")
	}
}
