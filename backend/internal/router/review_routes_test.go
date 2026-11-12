package router

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/auth"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/listingreview"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/productreview"
	"github.com/idalgo-2021/product-catalog-backend/internal/service"
	"go.uber.org/zap"
)

type productRouteRepo struct {
	filter domain.ProductReviewFilter
	called string
}

func (p *productRouteRepo) Get(_ context.Context, id string) (*domain.ProductReview, error) {
	p.called = "get"
	author := "user-1"
	return &domain.ProductReview{ID: id, ProductID: id, AuthorID: &author, Status: domain.ProductReviewPending}, nil
}
func (p *productRouteRepo) List(_ context.Context, f domain.ProductReviewFilter, _, _ int) ([]domain.ProductReview, int, error) {
	p.filter = f
	return []domain.ProductReview{}, 7, nil
}
func (*productRouteRepo) PatchDraft(context.Context, string, string, *int, *string, time.Time) (*domain.ProductReview, error) {
	panic("unexpected product patch")
}
func (*productRouteRepo) Submit(context.Context, string, string, time.Time) (*domain.ProductReview, error) {
	panic("unexpected product submit")
}
func (p *productRouteRepo) Moderate(_ context.Context, id, _, action, _ string) (*domain.ProductReview, error) {
	p.called = action
	return &domain.ProductReview{ID: id, ProductID: id, Status: domain.ProductReviewApproved}, nil
}

type listingRouteRepo struct {
	filter domain.ListingReviewFilter
	called string
}

func (p *listingRouteRepo) Get(_ context.Context, id string) (*domain.ListingReview, error) {
	p.called = "get"
	author := "user-1"
	return &domain.ListingReview{ID: id, ListingID: id, ReviewerUserID: &author, Status: domain.ListingReviewPending}, nil
}
func (p *listingRouteRepo) List(_ context.Context, f domain.ListingReviewFilter, _, _ int) ([]domain.ListingReview, int, error) {
	p.filter = f
	return []domain.ListingReview{}, 7, nil
}
func (*listingRouteRepo) PatchDraft(context.Context, string, string, domain.ListingReviewPatch, time.Time) (*domain.ListingReview, error) {
	panic("unexpected listing patch")
}
func (*listingRouteRepo) Submit(context.Context, string, string, time.Time) (*domain.ListingReview, error) {
	panic("unexpected listing submit")
}
func (p *listingRouteRepo) Moderate(_ context.Context, id, _, action, _ string) (*domain.ListingReview, error) {
	p.called = action
	return &domain.ListingReview{ID: id, ListingID: id, Status: domain.ListingReviewApproved}, nil
}

func reviewTestRouter(product *productRouteRepo, listing *listingRouteRepo) http.Handler {
	logger := zap.NewNop()
	return New(nil, nil, nil, nil, nil, nil, nil, nil, nil, "router-test-secret", logger, ExtraHandlers{
		ProductReview: productreview.NewProductReviewHandler(service.NewProductReviewService(product, 7*24*time.Hour), 20, 100, logger),
		ListingReview: listingreview.NewHandler(service.NewListingReviewService(listing, 7*24*time.Hour), 20, 100, logger),
	})
}

func reviewToken(t *testing.T, role domain.Role) string {
	t.Helper()
	token, err := auth.GenerateToken(&domain.User{ID: "user-1", Role: role}, "router-test-secret", time.Hour, auth.TokenTypeAccess)
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func TestReviewRoutesAreSeparated(t *testing.T) {
	const id = "11111111-1111-1111-1111-111111111111"
	for _, tc := range []struct {
		method           string
		path             string
		body             string
		role             domain.Role
		wantStatus       int
		wantProduct      bool
		wantPublic       bool
		wantProductField string
	}{
		{"POST", "/api/v1/products/" + id + "/reviews/search", `{"limit":2,"offset":3,"sort":{"rating":"desc"}}`, "", http.StatusOK, true, true, ""},
		{"POST", "/api/v1/listings/" + id + "/reviews/search", `{"limit":2,"offset":3}`, "", http.StatusOK, false, true, ""},
		{"GET", "/api/v1/product-reviews?limit=2&offset=3", "", domain.RoleUser, http.StatusOK, true, false, ""},
		{"GET", "/api/v1/listing-reviews?limit=2&offset=3", "", domain.RoleUser, http.StatusOK, false, false, ""},
		{"GET", "/api/v1/admin/product-reviews?limit=2&offset=3", "", domain.RoleUser, http.StatusForbidden, true, false, ""},
		{"GET", "/api/v1/admin/listing-reviews?limit=2&offset=3", "", domain.RoleManager, http.StatusOK, false, false, ""},
		{"GET", "/api/v1/product-reviews/" + id, "", domain.RoleUser, http.StatusOK, true, false, "product_id"},
		{"GET", "/api/v1/listing-reviews/" + id, "", domain.RoleUser, http.StatusOK, false, false, "listing_id"},
	} {
		t.Run(tc.path+string(tc.role), func(t *testing.T) {
			p, l := &productRouteRepo{}, &listingRouteRepo{}
			router := reviewTestRouter(p, l)
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			if tc.role != "" {
				req.Header.Set("Authorization", "Bearer "+reviewToken(t, tc.role))
			}
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)
			if res.Code != tc.wantStatus {
				t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
			}
			if tc.wantStatus != http.StatusOK {
				return
			}
			if tc.wantProduct {
				if l.called != "" || !reflect.DeepEqual(l.filter, domain.ListingReviewFilter{}) {
					t.Fatal("product request entered listing review path")
				}
			} else if p.called != "" || p.filter != (domain.ProductReviewFilter{}) {
				t.Fatal("listing request entered product review path")
			}
			var out struct {
				Data map[string]any                     `json:"data"`
				Meta struct{ Limit, Offset, Total int } `json:"meta"`
			}
			if tc.wantProductField != "" {
				if err := json.Unmarshal(res.Body.Bytes(), &out); err != nil {
					t.Fatal(err)
				}
				if out.Data[tc.wantProductField] != id {
					t.Fatalf("missing %s in %v", tc.wantProductField, out.Data)
				}
			} else {
				var page struct {
					Meta struct{ Limit, Offset, Total int } `json:"meta"`
				}
				if err := json.Unmarshal(res.Body.Bytes(), &page); err != nil {
					t.Fatal(err)
				}
				if page.Meta.Limit != 2 || page.Meta.Offset != 3 || page.Meta.Total != 7 {
					t.Fatalf("meta=%+v", page.Meta)
				}
				if tc.wantProduct && p.filter.Public != tc.wantPublic || !tc.wantProduct && l.filter.Public != tc.wantPublic {
					t.Fatal("wrong public filter")
				}
			}
		})
	}
}

func TestOldReviewRoutesAreGone(t *testing.T) {
	router := reviewTestRouter(&productRouteRepo{}, &listingRouteRepo{})
	for _, path := range []string{"/api/v1/reviews", "/api/v1/reviews/11111111-1111-1111-1111-111111111111", "/api/v1/admin/reviews", "/api/v1/listings/11111111-1111-1111-1111-111111111111/reviews", "/api/v1/products/11111111-1111-1111-1111-111111111111/reviews"} {
		res := httptest.NewRecorder()
		router.ServeHTTP(res, httptest.NewRequest("GET", path, nil))
		if res.Code != http.StatusNotFound {
			t.Fatalf("%s: status=%d", path, res.Code)
		}
	}
}
