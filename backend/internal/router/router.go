package router

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	httpSwagger "github.com/swaggo/http-swagger"
	"go.uber.org/zap"

	_ "github.com/idalgo-2021/product-catalog-backend/docs"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/admin"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/ai"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/article"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/assistant"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/auth"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/booking"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/counterparty"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/dictionary"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/feed"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/hotelier"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/hotelieradmin"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/listing"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/listingreview"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/order"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/product"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/productreview"
	"github.com/idalgo-2021/product-catalog-backend/internal/handler/profile"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
)

type ExtraHandlers struct {
	Article       *article.Handler
	AI            *ai.Handler
	Assistant     *assistant.Handler
	Admin         *admin.Handler
	ProductReview *productreview.ProductReviewHandler
	ListingReview *listingreview.Handler
	Hotelier      *hotelier.Handler
	HotelierAdmin *hotelieradmin.Handler
	Feed          *feed.FeedHandler
}

func New(
	authHandler *auth.AuthHandler,
	productHandler *product.ProductHandler,
	counterpartyHandler *counterparty.CounterpartyHandler,
	listingHandler *listing.ListingHandler,
	dictionaryHandler *dictionary.DictionaryHandler,
	orderHandler *order.OrderHandler,
	bookingHandler *booking.BookingHandler,
	profileHandler *profile.ProfileHandler,
	dbpool Pinger,
	jwtSecret string,
	logger *zap.Logger,
	extraHandlers ...ExtraHandlers,
) http.Handler {
	var adminHandler *admin.Handler
	var aiHandler *ai.Handler
	var assistantHandler *assistant.Handler
	var productReviewHandler *productreview.ProductReviewHandler
	var listingReviewHandler *listingreview.Handler
	var hotelierHandler *hotelier.Handler
	var hotelierAdminHandler *hotelieradmin.Handler
	var articleHandler *article.Handler
	var feedHandler *feed.FeedHandler
	if len(extraHandlers) > 0 {
		adminHandler = extraHandlers[0].Admin
		aiHandler = extraHandlers[0].AI
		assistantHandler = extraHandlers[0].Assistant
		productReviewHandler = extraHandlers[0].ProductReview
		listingReviewHandler = extraHandlers[0].ListingReview
		hotelierHandler = extraHandlers[0].Hotelier
		hotelierAdminHandler = extraHandlers[0].HotelierAdmin
		articleHandler = extraHandlers[0].Article
		feedHandler = extraHandlers[0].Feed
	}
	router := mux.NewRouter()

	router.Use(middleware.Recovery(logger))
	router.Use(middleware.Logging(logger))

	// Infrastructure endpoints (no auth required).
	router.HandleFunc("/health", healthHandler).Methods("GET")
	router.HandleFunc("/ready", readyHandler(dbpool)).Methods("GET")

	// Swagger documentation endpoint
	router.PathPrefix("/swagger/").Handler(httpSwagger.Handler(
		httpSwagger.DocExpansion("none"),
		httpSwagger.DeepLinking(true),
		httpSwagger.PersistAuthorization(true),
		httpSwagger.UIConfig(map[string]string{
			"filter":           "true",
			"tagsSorter":       "'alpha'",
			"operationsSorter": "'method'",
		}),
	))

	api := router.PathPrefix("/api/v1").Subrouter()

	// Temporary comparison mock, independent of the database and authentication.
	api.HandleFunc("/hotel/compare", listing.CompareHotelsMock).Methods("GET")

	// Public endpoints.
	api.HandleFunc("/auth/register", authHandler.Register).Methods("POST")
	api.HandleFunc("/auth/login", authHandler.Login).Methods("POST")
	api.HandleFunc("/auth/refresh", authHandler.Refresh).Methods("POST")
	api.HandleFunc("/auth/validate", authHandler.Validate).Methods("POST")
	if articleHandler != nil {
		api.HandleFunc("/articles", articleHandler.ListPublic).Methods("GET")
		api.HandleFunc("/articles/{slug}", articleHandler.GetPublic).Methods("GET")
	}
	if feedHandler != nil {
		api.HandleFunc("/feed/clips", feedHandler.GetClips).Methods("GET")
		api.HandleFunc("/feed/videos/{id}/{file:[a-zA-Z0-9_.-]+}", feedHandler.ServeVideoFile).Methods("GET")
	}

	productsRouter := api.PathPrefix("").Subrouter()
	productsRouter.Use(middleware.OptionalAuth(jwtSecret, logger))
	productsRouter.HandleFunc("/products", productHandler.ListProducts).Methods("GET")
	productsRouter.HandleFunc("/products/search", productHandler.SearchProducts).Methods("POST")
	productsRouter.HandleFunc("/products/{product_id}", productHandler.GetProduct).Methods("GET")
	if productReviewHandler != nil {
		productsRouter.HandleFunc("/products/{product_id}/reviews/search", productReviewHandler.SearchProduct).Methods("POST")
	}

	// Dictionary endpoints — public, no auth required
	api.HandleFunc("/dictionaries", dictionaryHandler.GetDictionaries).Methods("GET")
	api.HandleFunc("/listing_types", dictionaryHandler.GetListingTypes).Methods("GET")
	api.HandleFunc("/countries", dictionaryHandler.GetCountries).Methods("GET")
	api.HandleFunc("/locations", dictionaryHandler.GetLocations).Methods("GET")
	api.HandleFunc("/currencies", dictionaryHandler.GetCurrencies).Methods("GET")
	if aiHandler != nil {
		aiAPI := api.PathPrefix("/ai").Subrouter()
		aiAPI.Use(middleware.Auth(jwtSecret, logger))
		aiAPI.Use(middleware.RequireRole(domain.RoleAIRobot))
		aiAPI.HandleFunc("/reviews/listings", aiHandler.ListListingReviews).Methods("GET")
		aiAPI.HandleFunc("/reviews/products", aiHandler.ListProductReviews).Methods("GET")
		aiAPI.HandleFunc("/listings/disappointment-candidates", aiHandler.ListDisappointmentCandidates).Methods("GET")
	}
	if assistantHandler != nil {
		assistantAPI := api.PathPrefix("/assistant").Subrouter()
		assistantAPI.Use(middleware.OptionalAuth(jwtSecret, logger))
		assistantAPI.HandleFunc("/chat", assistantHandler.Chat).Methods("POST")
	}

	// Listings endpoints with OptionalAuth so we know the role if user is logged in
	listingsRouter := api.PathPrefix("").Subrouter()
	listingsRouter.Use(middleware.OptionalAuth(jwtSecret, logger))
	listingsRouter.HandleFunc("/listings/search", listingHandler.SearchListings).Methods("POST")
	listingsRouter.HandleFunc("/listings/{id:[0-9a-fA-F-]{36}}", listingHandler.GetListing).Methods("GET")
	if listingReviewHandler != nil {
		listingsRouter.HandleFunc("/listings/{id}/reviews/search", listingReviewHandler.SearchPublic).Methods("POST")
	}
	if bookingHandler != nil {
		listingsRouter.HandleFunc("/listings/{id}/available-units", bookingHandler.Available).Methods("GET")
	}

	// Register the admin router before the catch-all protected router.
	admin := api.PathPrefix("/admin").Subrouter()
	admin.Use(middleware.Auth(jwtSecret, logger))
	admin.Use(middleware.RequireRole(domain.RoleManager, domain.RoleAdmin))
	if articleHandler != nil {
		admin.HandleFunc("/articles", articleHandler.ListAdmin).Methods("GET")
		admin.HandleFunc("/articles", articleHandler.Create).Methods("POST")
		admin.HandleFunc("/articles/{id}", articleHandler.GetAdmin).Methods("GET")
		admin.HandleFunc("/articles/{id}", articleHandler.Patch).Methods("PATCH")
		admin.HandleFunc("/articles/{id}/publish", articleHandler.Publish(true)).Methods("PATCH")
		admin.HandleFunc("/articles/{id}/unpublish", articleHandler.Publish(false)).Methods("PATCH")
	}
	admin.HandleFunc("/counterparties", counterpartyHandler.ListCounterparties).Methods("GET")
	admin.HandleFunc("/products", productHandler.ListAdminProducts).Methods("GET")
	admin.HandleFunc("/products/{product_id}", productHandler.GetAdminProduct).Methods("GET")
	admin.HandleFunc("/orders", orderHandler.ListAdminOrders).Methods("GET")
	admin.HandleFunc("/orders/{order_id}", orderHandler.GetAdminOrder).Methods("GET")
	admin.HandleFunc("/orders/{order_id}/fulfill", orderHandler.FulfillOrder).Methods("PATCH")
	admin.HandleFunc("/orders/{order_id}/cancel", orderHandler.CancelAdminOrder).Methods("PATCH")
	if profileHandler != nil {
		admin.HandleFunc("/client-profiles", profileHandler.ListClients).Methods("GET")
		admin.HandleFunc("/client-profiles/{user_id}", profileHandler.GetClient).Methods("GET")
		admin.HandleFunc("/client-profiles/{user_id}", profileHandler.UpdateClient).Methods("PATCH")
	}
	if productReviewHandler != nil {
		admin.HandleFunc("/product-reviews", productReviewHandler.ListAdminProduct).Methods("GET")
		admin.HandleFunc("/product-reviews/{id}", productReviewHandler.GetAdminProduct).Methods("GET")
		admin.HandleFunc("/product-reviews/{id}/approve", productReviewHandler.ApproveProduct).Methods("PATCH")
		admin.HandleFunc("/product-reviews/{id}/reject", productReviewHandler.RejectProduct).Methods("PATCH")
		admin.HandleFunc("/product-reviews/{id}/hide", productReviewHandler.HideProduct).Methods("PATCH")
		admin.HandleFunc("/product-reviews/{id}/unhide", productReviewHandler.UnhideProduct).Methods("PATCH")
	}
	if listingReviewHandler != nil {
		admin.HandleFunc("/listing-reviews", listingReviewHandler.ListAdmin).Methods("GET")
		admin.HandleFunc("/listing-reviews/{id}", listingReviewHandler.GetAdmin).Methods("GET")
		admin.HandleFunc("/listing-reviews/{id}/approve", listingReviewHandler.Approve).Methods("PATCH")
		admin.HandleFunc("/listing-reviews/{id}/reject", listingReviewHandler.Reject).Methods("PATCH")
		admin.HandleFunc("/listing-reviews/{id}/hide", listingReviewHandler.Hide).Methods("PATCH")
		admin.HandleFunc("/listing-reviews/{id}/unhide", listingReviewHandler.Unhide).Methods("PATCH")
	}
	if adminHandler != nil {
		ah := adminHandler
		admin.HandleFunc("/listings", ah.ListListings).Methods("GET")
		admin.HandleFunc("/listings/{id}", ah.Get("listings")).Methods("GET")
		admin.HandleFunc("/listings", ah.Create("listings")).Methods("POST")
		admin.HandleFunc("/listings/{id}", ah.Update("listings")).Methods("PATCH")
		admin.HandleFunc("/listings/{id}/images", ah.CreateImage("listing_images")).Methods("POST")
		admin.HandleFunc("/listings/{id}/images/{image_id}", ah.Image("listing_images", true)).Methods("PATCH")
		admin.HandleFunc("/listings/{id}/images/{image_id}", ah.Image("listing_images", false)).Methods("DELETE")
		admin.HandleFunc("/listings/{id}/units/{unit_id}", ah.Unit).Methods("GET")
		admin.HandleFunc("/listings/{id}/units/{unit_id}/images/{image_id}", ah.Image("unit_images", true)).Methods("PATCH")
		admin.HandleFunc("/products", ah.Create("products")).Methods("POST")
		admin.HandleFunc("/products/{id}", ah.Update("products")).Methods("PATCH")
		admin.HandleFunc("/counterparties/{id}", ah.Get("counterparties")).Methods("GET")
		admin.HandleFunc("/counterparties", ah.Create("counterparties")).Methods("POST")
		admin.HandleFunc("/counterparties/{id}", ah.Update("counterparties")).Methods("PATCH")
		admin.HandleFunc("/listing-feature-tags", ah.ListListingFeatureTags).Methods("GET")
		admin.HandleFunc("/listing-feature-tags/{id}", ah.Get("listing_feature_tags")).Methods("GET")
		admin.HandleFunc("/listing-review-summaries", ah.ListListingReviewSummaries).Methods("GET")

		adminOnly := admin.PathPrefix("").Subrouter()
		adminOnly.Use(middleware.RequireRole(domain.RoleAdmin))
		for _, resource := range []string{"countries", "locations", "listing_types", "currencies", "exchange_rates"} {
			path := resource
			if resource == "exchange_rates" {
				path = "exchange-rates"
			}
			adminOnly.HandleFunc("/"+path, ah.List(resource)).Methods("GET")
			adminOnly.HandleFunc("/"+path+"/{id}", ah.Get(resource)).Methods("GET")
			adminOnly.HandleFunc("/"+path, ah.Create(resource)).Methods("POST")
			if resource != "exchange_rates" {
				adminOnly.HandleFunc("/"+path+"/{id}", ah.Update(resource)).Methods("PATCH")
			}
		}
		adminOnly.HandleFunc("/users", ah.List("users")).Methods("GET")
		adminOnly.HandleFunc("/users/{id}", ah.Get("users")).Methods("GET")
		adminOnly.HandleFunc("/users", ah.CreateStaff).Methods("POST")
		adminOnly.HandleFunc("/users/{id}", ah.UpdateRole).Methods("PATCH")
		adminOnly.HandleFunc("/listing-feature-tags", ah.Create("listing_feature_tags")).Methods("POST")
		adminOnly.HandleFunc("/listing-feature-tags/{id}", ah.Update("listing_feature_tags")).Methods("PATCH")
	}
	if hotelierAdminHandler != nil {
		admin.HandleFunc("/users/{id}/listings", hotelierAdminHandler.ListingIDs).Methods("GET")
		admin.HandleFunc("/users/{id}/listing-assignments", hotelierAdminHandler.ListingAssignments).Methods("GET")
		admin.HandleFunc("/users/{id}/listings", hotelierAdminHandler.SetListingIDs).Methods("PUT")
		admin.HandleFunc("/hotelier/messages", hotelierAdminHandler.CreateMessage).Methods("POST")
	}
	if bookingHandler != nil {
		bh := bookingHandler
		admin.HandleFunc("/listings/{id}/units", bh.ListUnits).Methods("GET")
		admin.HandleFunc("/listings/{id}/units", bh.CreateUnit).Methods("POST")
		admin.HandleFunc("/listings/{id}/units/{unit_id}", bh.UpdateUnit).Methods("PATCH")
		admin.HandleFunc("/listings/{id}/units/{unit_id}/images", bh.CreateUnitImage).Methods("POST")
		admin.HandleFunc("/listings/{id}/units/{unit_id}/images/{image_id}", bh.DeleteUnitImage).Methods("DELETE")
		admin.HandleFunc("/bookings", bh.ListAdmin).Methods("GET")
		admin.HandleFunc("/bookings/{id}", bh.GetAdmin).Methods("GET")
		admin.HandleFunc("/bookings/{id}/cancel", bh.CancelAdmin).Methods("PATCH")
		admin.HandleFunc("/bookings/{id}/check-in", bh.CheckIn).Methods("PATCH")
		admin.HandleFunc("/bookings/{id}/check-out", bh.CheckOut).Methods("PATCH")
	}

	if hotelierHandler != nil {
		hoteliers := api.PathPrefix("/hotelier").Subrouter()
		hoteliers.Use(middleware.Auth(jwtSecret, logger))
		hoteliers.Use(middleware.RequireRole(domain.RoleHotelier))
		hoteliers.HandleFunc("/profile", hotelierHandler.Profile).Methods("GET")
		hoteliers.HandleFunc("/listings", hotelierHandler.Listings).Methods("GET")
		hoteliers.HandleFunc("/listings", hotelierHandler.CreateListing).Methods("POST")
		hoteliers.HandleFunc("/listings/{listing_id}", hotelierHandler.DeactivateListing).Methods("DELETE")
		hoteliers.HandleFunc("/listings/{listing_id}/status", hotelierHandler.SetListingActive).Methods("PATCH")
		hoteliers.HandleFunc("/listings/{listing_id}/card", hotelierHandler.UpdateListingCard).Methods("PATCH")
		hoteliers.HandleFunc("/listings/{listing_id}/units", hotelierHandler.ListUnits).Methods("GET")
		hoteliers.HandleFunc("/listings/{listing_id}/units", hotelierHandler.CreateUnit).Methods("POST")
		hoteliers.HandleFunc("/listings/{listing_id}/units/{unit_id}", hotelierHandler.UpdateUnit).Methods("PATCH")
		hoteliers.HandleFunc("/listings/{listing_id}/units/{unit_id}", hotelierHandler.GetUnit).Methods("GET")
		hoteliers.HandleFunc("/listings/{listing_id}/units/{unit_id}/images", hotelierHandler.CreateUnitImage).Methods("POST")
		hoteliers.HandleFunc("/listings/{listing_id}/units/{unit_id}/images/{image_id}", hotelierHandler.DeleteUnitImage).Methods("DELETE")
		hoteliers.HandleFunc("/listings/{listing_id}/units/{unit_id}/images/{image_id}", hotelierHandler.UpdateUnitImage).Methods("PATCH")
		hoteliers.HandleFunc("/listings/{listing_id}/videos", hotelierHandler.ListListingVideos).Methods("GET")
		hoteliers.HandleFunc("/listings/{listing_id}/videos", hotelierHandler.UploadListingVideo).Methods("POST")
		hoteliers.HandleFunc("/listings/{listing_id}/videos/{video_id}", hotelierHandler.UpdateListingVideo).Methods("PATCH")
		hoteliers.HandleFunc("/listings/{listing_id}/videos/{video_id}", hotelierHandler.DeleteListingVideo).Methods("DELETE")
		hoteliers.HandleFunc("/bookings", hotelierHandler.ListBookings).Methods("GET")
		hoteliers.HandleFunc("/bookings/{id}", hotelierHandler.GetBooking).Methods("GET")
		hoteliers.HandleFunc("/bookings/{id}/check-in", hotelierHandler.BookingAction("check-in")).Methods("PATCH")
		hoteliers.HandleFunc("/bookings/{id}/check-out", hotelierHandler.BookingAction("check-out")).Methods("PATCH")
		hoteliers.HandleFunc("/bookings/{id}/cancel", hotelierHandler.BookingAction("cancel")).Methods("PATCH")
		hoteliers.HandleFunc("/listing-reviews", hotelierHandler.ListReviews).Methods("GET")
		hoteliers.HandleFunc("/listing-reviews/{id}", hotelierHandler.GetReview).Methods("GET")
		hoteliers.HandleFunc("/messages", hotelierHandler.ListMessages).Methods("GET")
		hoteliers.HandleFunc("/messages/{id}", hotelierHandler.GetMessage).Methods("GET")
		hoteliers.HandleFunc("/messages/{id}", hotelierHandler.ReplyMessage).Methods("PATCH")
	}

	// Interactive accounts use their own profile for personal details and language/currency settings.
	if profileHandler != nil {
		profiles := api.PathPrefix("").Subrouter()
		profiles.Use(middleware.Auth(jwtSecret, logger))
		profiles.Use(middleware.RequireRole(
			domain.RoleUser,
			domain.RoleHotelier,
			domain.RoleManager,
			domain.RoleAdmin,
		))
		profiles.HandleFunc("/profile", profileHandler.GetMine).Methods("GET")
		profiles.HandleFunc("/profile", profileHandler.UpdateMine).Methods("PATCH")
	}

	// Client endpoints.
	protected := api.PathPrefix("").Subrouter()
	protected.Use(middleware.Auth(jwtSecret, logger))
	protected.Use(middleware.RequireRole(domain.RoleUser, domain.RoleManager, domain.RoleAdmin))

	protected.HandleFunc("/orders", orderHandler.ListOrders).Methods("GET")
	protected.HandleFunc("/orders", orderHandler.CreateOrder).Methods("POST")
	protected.HandleFunc("/orders/{order_id}", orderHandler.GetOrder).Methods("GET")
	protected.HandleFunc("/orders/{order_id}", orderHandler.UpdateOrder).Methods("PATCH")
	protected.HandleFunc("/orders/{order_id}/confirm", orderHandler.ConfirmOrder).Methods("PATCH")
	protected.HandleFunc("/orders/{order_id}/booking", orderHandler.LinkBooking).Methods("PATCH")
	protected.HandleFunc("/orders/{order_id}/cancel", orderHandler.CancelOrder).Methods("PATCH")
	if productReviewHandler != nil {
		protected.HandleFunc("/product-reviews", productReviewHandler.ListMineProduct).Methods("GET")
		protected.HandleFunc("/product-reviews/{id}", productReviewHandler.GetMineProduct).Methods("GET")
		protected.HandleFunc("/product-reviews/{id}", productReviewHandler.PatchDraftProduct).Methods("PATCH")
		protected.HandleFunc("/product-reviews/{id}/submit", productReviewHandler.SubmitProduct).Methods("PATCH")
	}
	if listingReviewHandler != nil {
		protected.HandleFunc("/listing-reviews", listingReviewHandler.ListMine).Methods("GET")
		protected.HandleFunc("/listing-reviews/{id}", listingReviewHandler.GetMine).Methods("GET")
		protected.HandleFunc("/listing-reviews/{id}", listingReviewHandler.PatchDraft).Methods("PATCH")
		protected.HandleFunc("/listing-reviews/{id}/submit", listingReviewHandler.Submit).Methods("PATCH")
	}
	if bookingHandler != nil {
		bh := bookingHandler
		protected.HandleFunc("/bookings", bh.Create).Methods("POST")
		protected.HandleFunc("/bookings", bh.List).Methods("GET")
		protected.HandleFunc("/bookings/{id}", bh.Get).Methods("GET")
		protected.HandleFunc("/bookings/{id}/cancel", bh.Cancel).Methods("PATCH")
	}
	if hotelierHandler != nil {
		protected.HandleFunc("/listings/{id:[0-9a-fA-F-]{36}}/questions", hotelierHandler.CreateClientQuestion).Methods("POST")
	}

	return router
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

type Pinger interface {
	Ping(ctx context.Context) error
}

func readyHandler(db Pinger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if err := db.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{
				"status": "error",
				"detail": "database unavailable",
			})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
	}
}
