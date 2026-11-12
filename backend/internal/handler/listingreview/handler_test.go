package listingreview

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
	"go.uber.org/zap"
)

type listingHandlerProbe struct {
	patch  domain.ListingReviewPatch
	filter domain.ListingReviewFilter
	limit  int
	offset int
}

func (p *listingHandlerProbe) List(_ context.Context, filter domain.ListingReviewFilter, limit, offset int) ([]domain.ListingReview, int, error) {
	p.filter, p.limit, p.offset = filter, limit, offset
	return []domain.ListingReview{{ID: "1", Status: domain.ListingReviewApproved}}, 1, nil
}
func (*listingHandlerProbe) Get(context.Context, string, string, bool) (*domain.ListingReview, error) {
	panic("unexpected Get")
}
func (p *listingHandlerProbe) PatchDraft(_ context.Context, id, _ string, patch domain.ListingReviewPatch) (*domain.ListingReview, error) {
	p.patch = patch
	return &domain.ListingReview{ID: id}, nil
}
func (*listingHandlerProbe) Submit(context.Context, string, string) (*domain.ListingReview, error) {
	panic("unexpected Submit")
}
func (*listingHandlerProbe) Moderate(context.Context, string, string, string, string) (*domain.ListingReview, error) {
	panic("unexpected Moderate")
}

func TestListingReviewPatchDistinguishesNullAndOmission(t *testing.T) {
	const id = "11111111-1111-1111-1111-111111111111"
	probe := &listingHandlerProbe{}
	h := NewHandler(probe, 20, 100, zap.NewNop())
	router := mux.NewRouter()
	router.HandleFunc("/listing-reviews/{id}", h.PatchDraft).Methods("PATCH")
	req := httptest.NewRequest("PATCH", "/listing-reviews/"+id, strings.NewReader(`{"wifi_rating":null,"positive_review":"Good"}`))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "user-1"))
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
	}
	if !probe.patch.WifiRating.Set || probe.patch.WifiRating.Value != nil || probe.patch.StaffRating.Set {
		t.Fatalf("patch=%+v", probe.patch)
	}
}

func TestPublicListingReviewRetainsNullRatings(t *testing.T) {
	h := NewHandler(&listingHandlerProbe{}, 20, 100, zap.NewNop())
	router := mux.NewRouter()
	router.HandleFunc("/listings/{id}/reviews/search", h.SearchPublic).Methods("POST")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, httptest.NewRequest("POST", "/listings/11111111-1111-1111-1111-111111111111/reviews/search", strings.NewReader(`{}`)))
	if res.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
	}
	var out struct {
		Data []map[string]json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if len(out.Data) != 1 || string(out.Data[0]["overall_rating"]) != "null" || string(out.Data[0]["wifi_rating"]) != "null" || string(out.Data[0]["reviewer_display_name"]) != `"Гость"` {
		t.Fatalf("data=%v", out.Data)
	}
	if _, oldName := out.Data[0]["author_display_name"]; oldName {
		t.Fatalf("old author field is still present: %v", out.Data[0])
	}
}

func TestSearchPublicListingReviewsParsesSortAndPagination(t *testing.T) {
	const path = "/listings/11111111-1111-1111-1111-111111111111/reviews/search"
	tests := []struct {
		name        string
		body        string
		wantStatus  int
		wantCreated string
		wantRating  string
		wantLimit   int
		wantOffset  int
	}{
		{"no body", ``, http.StatusOK, "desc", "", 20, 0},
		{"defaults", `{}`, http.StatusOK, "desc", "", 20, 0},
		{"date only", `{"sort":{"created_at":"asc"}}`, http.StatusOK, "asc", "", 20, 0},
		{"rating only", `{"sort":{"overall_rating":"desc"}}`, http.StatusOK, "", "desc", 20, 0},
		{"both with pagination", `{"sort":{"created_at":"desc","overall_rating":"asc"},"limit":25,"offset":7}`, http.StatusOK, "desc", "asc", 25, 7},
		{"limit is clamped", `{"limit":1000}`, http.StatusOK, "desc", "", 100, 0},
		{"invalid direction", `{"sort":{"created_at":"sideways"}}`, http.StatusBadRequest, "", "", 0, 0},
		{"empty direction", `{"sort":{"overall_rating":""}}`, http.StatusBadRequest, "", "", 0, 0},
		{"invalid limit", `{"limit":0}`, http.StatusBadRequest, "", "", 0, 0},
		{"invalid offset", `{"offset":-1}`, http.StatusBadRequest, "", "", 0, 0},
		{"unknown field", `{"filters":{}}`, http.StatusBadRequest, "", "", 0, 0},
		{"invalid json", `{`, http.StatusBadRequest, "", "", 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			probe := &listingHandlerProbe{}
			h := NewHandler(probe, 20, 100, zap.NewNop())
			router := mux.NewRouter()
			router.HandleFunc("/listings/{id}/reviews/search", h.SearchPublic).Methods("POST")
			res := httptest.NewRecorder()
			router.ServeHTTP(res, httptest.NewRequest("POST", path, strings.NewReader(tt.body)))
			if res.Code != tt.wantStatus {
				t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if !probe.filter.Public || probe.filter.ListingID != "11111111-1111-1111-1111-111111111111" ||
				probe.filter.Sort.CreatedAt != tt.wantCreated || probe.filter.Sort.OverallRating != tt.wantRating ||
				probe.limit != tt.wantLimit || probe.offset != tt.wantOffset {
				t.Fatalf("filter=%+v limit=%d offset=%d", probe.filter, probe.limit, probe.offset)
			}
		})
	}
}
