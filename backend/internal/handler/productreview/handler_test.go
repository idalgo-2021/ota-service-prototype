package productreview

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
	"go.uber.org/zap"
)

type productTransitionProbe struct {
	called string
	reason string
}

func (*productTransitionProbe) List(context.Context, domain.ProductReviewFilter, int, int) ([]domain.ProductReview, int, error) {
	panic("unexpected List")
}
func (*productTransitionProbe) Get(context.Context, string, string, bool) (*domain.ProductReview, error) {
	panic("unexpected Get")
}
func (*productTransitionProbe) PatchDraft(context.Context, string, string, *int, *string) (*domain.ProductReview, error) {
	panic("unexpected PatchDraft")
}
func (p *productTransitionProbe) Submit(_ context.Context, id, _ string) (*domain.ProductReview, error) {
	p.called = "submit"
	return &domain.ProductReview{ID: id, ProductID: id, Status: domain.ProductReviewPending}, nil
}
func (p *productTransitionProbe) Moderate(_ context.Context, id, _, action, reason string) (*domain.ProductReview, error) {
	p.called, p.reason = action, reason
	return &domain.ProductReview{ID: id, ProductID: id, Status: domain.ProductReviewApproved}, nil
}

func TestProductReviewInvalidUUID(t *testing.T) {
	h := NewProductReviewHandler(nil, 20, 100, zap.NewNop())
	r := mux.NewRouter()
	r.HandleFunc("/products/{product_id}/reviews/search", h.SearchProduct).Methods("POST")
	r.HandleFunc("/product-reviews/{id}/submit", h.SubmitProduct).Methods("PATCH")
	for _, tc := range []struct{ method, path string }{
		{"POST", "/products/nope/reviews/search"}, {"PATCH", "/product-reviews/nope/submit"},
	} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(tc.method, tc.path, nil))
		if w.Code != http.StatusBadRequest || !strings.Contains(w.Body.String(), "INVALID_INPUT") {
			t.Fatalf("%s: status=%d body=%s", tc.path, w.Code, w.Body.String())
		}
	}
}

func TestProductReviewTransitionBodies(t *testing.T) {
	const id = "11111111-1111-1111-1111-111111111111"
	for _, tc := range []struct {
		name, path, valid, invalid, action, reason string
		handler                                    func(*ProductReviewHandler, http.ResponseWriter, *http.Request)
	}{
		{"submit", "/product-reviews/" + id + "/submit", "", `{"status":"approved"}`, "submit", "", (*ProductReviewHandler).SubmitProduct},
		{"approve", "/admin/product-reviews/" + id + "/approve", "", `{"status":"approved"}`, "approve", "", (*ProductReviewHandler).ApproveProduct},
		{"reject", "/admin/product-reviews/" + id + "/reject", `{"reason":"Spam"}`, `{"reason":" "}`, "reject", "Spam", (*ProductReviewHandler).RejectProduct},
		{"hide", "/admin/product-reviews/" + id + "/hide", `{"reason":"Spam"}`, `{"reason":" "}`, "hide", "Spam", (*ProductReviewHandler).HideProduct},
		{"unhide", "/admin/product-reviews/" + id + "/unhide", "", `{"is_hidden":false}`, "unhide", "", (*ProductReviewHandler).UnhideProduct},
	} {
		t.Run(tc.name, func(t *testing.T) {
			for _, body := range []struct {
				value string
				valid bool
			}{{tc.valid, true}, {tc.invalid, false}} {
				probe := &productTransitionProbe{}
				h := NewProductReviewHandler(probe, 20, 100, zap.NewNop())
				routes := mux.NewRouter()
				routes.HandleFunc(strings.Replace(tc.path, id, "{id}", 1), func(w http.ResponseWriter, r *http.Request) {
					tc.handler(h, w, r)
				}).Methods("PATCH")
				req := httptest.NewRequest("PATCH", tc.path, strings.NewReader(body.value))
				req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "actor-1"))
				res := httptest.NewRecorder()
				routes.ServeHTTP(res, req)
				if body.valid {
					if res.Code != http.StatusOK || probe.called != tc.action || probe.reason != tc.reason {
						t.Fatalf("status=%d call=%q reason=%q body=%s", res.Code, probe.called, probe.reason, res.Body.String())
					}
				} else if res.Code != http.StatusBadRequest || probe.called != "" {
					t.Fatalf("invalid body: status=%d call=%q body=%s", res.Code, probe.called, res.Body.String())
				}
			}
		})
	}
}
