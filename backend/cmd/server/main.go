package main

// @title           Test Project One API
// @version         1.0
// @description     This is a sample server for a product showcase project.
// @termsOfService  http://swagger.io/terms/

// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

// @tag.name Client: Auth
// @tag.description Аутентификация, регистрация и валидация токенов

// @tag.name Client: Profile
// @tag.description Управление профилем текущего пользователя

// @tag.name Client: Listings
// @tag.description Поиск и просмотр объектов размещения (отелей, апартаментов)

// @tag.name Client: Bookings
// @tag.description Создание, просмотр и отмена клиентских бронирований

// @tag.name Client: Products
// @tag.description Каталог, поиск и детали дополнительных товаров и услуг

// @tag.name Client: Orders
// @tag.description Оформление, оплата и управление заказами товаров/услуг

// @tag.name Client: Reviews
// @tag.description Работа с черновиками и отправка отзывов пользователей

// @tag.name Client: Articles
// @tag.description Публичный просмотр статей блога и гидов для путешественников

// @tag.name Client: Feed
// @tag.description Видеолента и короткие ролики (клипы)

// @tag.name Client: Assistant
// @tag.description Интеллектуальный AI-ассистент в чате

// @tag.name Public: Dictionaries
// @tag.description Общедоступные справочники (страны, валюты, типы жилья, локации)

// @tag.name Hotelier: Listings & Units
// @tag.description Управление объектами размещения, номерами и фотографиями отельера

// @tag.name Hotelier: Bookings
// @tag.description Просмотр бронирований, регистрация заезда и выезда гостей

// @tag.name Hotelier: Reviews
// @tag.description Просмотр отзывов гостей на объекты отельера

// @tag.name Hotelier: Messages
// @tag.description Переписка и уведомления от платформы отельеру

// @tag.name Hotelier: Profile
// @tag.description Профиль отельера и привязанные данные

// @tag.name Admin: Listings & Units
// @tag.description Администрирование объектов размещения, номеров, фото и сводок отзывов

// @tag.name Admin: Bookings
// @tag.description Полный контроль бронирований платформы сотрудниками

// @tag.name Admin: Products
// @tag.description Администрирование каталога дополнительных товаров и услуг

// @tag.name Admin: Orders
// @tag.description Управление и выполнение клиентских заказов

// @tag.name Admin: Reviews
// @tag.description Модерация отзывов (одобрение, скрытие, отклонение)

// @tag.name Admin: Articles
// @tag.description Создание, редактирование и публикация статей блога

// @tag.name Admin: Counterparties
// @tag.description Управление поставщиками, партнерами и контрагентами

// @tag.name Admin: Users & Profiles
// @tag.description Управление учетными записями, ролями и клиентскими профилями

// @tag.name Admin: Hoteliers
// @tag.description Назначение прав отельерам и системные сообщения

// @tag.name Admin: Dictionaries & Rates
// @tag.description Справочники системы, курсы валют и теги удобств

// @tag.name AI: Internal
// @tag.description Внутреннее API интеграции с сервисом искусственного интеллекта

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/handlers"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/config"
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
	"github.com/idalgo-2021/product-catalog-backend/internal/media"

	"github.com/idalgo-2021/product-catalog-backend/internal/repository/postgres"
	"github.com/idalgo-2021/product-catalog-backend/internal/router"
	"github.com/idalgo-2021/product-catalog-backend/internal/service"
	pkgdb "github.com/idalgo-2021/product-catalog-backend/pkg/db"
	pkglogger "github.com/idalgo-2021/product-catalog-backend/pkg/logger"
)

func main() {
	if err := run(); err != nil {
		log.Printf("server stopped: %v", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.LoadConfig(".env")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	logger, err := pkglogger.New(cfg.LogLevel)
	if err != nil {
		return fmt.Errorf("initialize logger: %w", err)
	}
	defer logger.Sync()

	dbCtx, dbCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer dbCancel()
	dbpool, err := pkgdb.NewPostgresPool(dbCtx, cfg.DatabaseURL, pkgdb.PoolConfig{
		MaxConns:        cfg.DBMaxConns,
		MinConns:        cfg.DBMinConns,
		MaxConnIdleTime: cfg.DBMaxConnIdleTime,
		MaxConnLifetime: cfg.DBMaxConnLifetime,
	})
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer dbpool.Close()

	logger.Info("Connected to database")

	userRepo := postgres.NewUserRepo(dbpool)
	productRepo := postgres.NewProductRepo(dbpool)
	counterpartyRepo := postgres.NewCounterpartyRepo(dbpool)
	orderRepo := postgres.NewOrderRepo(dbpool)
	listingRepo := postgres.NewListingRepo(dbpool)
	dictionaryRepo := postgres.NewDictionaryRepo(dbpool)
	bookingRepo := postgres.NewBookingRepo(dbpool)
	profileRepo := postgres.NewProfileRepo(dbpool)
	adminRepo := postgres.NewAdminRepo(dbpool)
	currencyRepo := postgres.NewCurrencyRepo(dbpool)
	productReviewRepo := postgres.NewProductReviewRepo(dbpool)
	listingReviewRepo := postgres.NewListingReviewRepo(dbpool)
	disappointmentCandidateRepo := postgres.NewDisappointmentCandidateRepo(dbpool)
	hotelierRepo := postgres.NewHotelierRepo(dbpool)
	articleRepo := postgres.NewArticleRepo(dbpool)
	feedRepo := postgres.NewFeedRepo(dbpool)

	authService := service.NewAuthService(
		userRepo,
		cfg.JWTSecret,
		cfg.AccessTokenExpiry,
		cfg.RefreshTokenExpiry,
		logger,
	)
	currencyService := service.NewCurrencyService(currencyRepo, cfg.BaseCurrency)
	productService := service.NewProductService(productRepo, logger, currencyService)
	orderService := service.NewOrderService(orderRepo, productRepo, logger, cfg.Lifetimes.PendingOrder, currencyService)
	orderService.SetBookingRepository(bookingRepo)
	orderService.SetListingRepository(listingRepo)
	listingService := service.NewListingService(listingRepo, logger, currencyService)
	dictionaryService := service.NewDictionaryService(dictionaryRepo, logger)
	bookingService := service.NewBookingService(bookingRepo, currencyService)
	profileService := service.NewProfileService(profileRepo)
	adminService := service.NewAdminService(adminRepo, cfg.BaseCurrency)
	productReviewService := service.NewProductReviewService(productReviewRepo, cfg.Lifetimes.ReviewDraft)
	listingReviewService := service.NewListingReviewService(listingReviewRepo, cfg.Lifetimes.ReviewDraft)
	disappointmentCandidateService := service.NewDisappointmentCandidateService(disappointmentCandidateRepo)
	videoTranscoder := media.NewTranscoder(cfg.FFmpegPath, cfg.MediaDir)
	hotelierService := service.NewHotelierService(hotelierRepo, bookingService, bookingService, listingReviewService, feedRepo, videoTranscoder)
	articleService := service.NewArticleService(articleRepo)
	feedService := service.NewFeedService(feedRepo)

	authHTTPHandler := auth.NewAuthHandler(authService, logger)
	productHTTPHandler := product.NewProductHandler(productService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	counterpartyService := service.NewCounterpartyService(counterpartyRepo, logger)
	counterpartyHTTPHandler := counterparty.NewCounterpartyHandler(counterpartyService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	orderHTTPHandler := order.NewOrderHandler(orderService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	listingHTTPHandler := listing.NewListingHandler(listingService, cfg.MaxSearchRadiusM, logger)
	dictionaryHTTPHandler := dictionary.NewDictionaryHandler(dictionaryService, logger)
	bookingHTTPHandler := booking.NewBookingHandler(bookingService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	profileHTTPHandler := profile.NewProfileHandler(profileService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	adminHTTPHandler := admin.NewHandler(adminService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	productReviewHTTPHandler := productreview.NewProductReviewHandler(productReviewService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	listingReviewHTTPHandler := listingreview.NewHandler(listingReviewService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	hotelierHTTPHandler := hotelier.NewHandler(hotelierService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	hotelierAdminHTTPHandler := hotelieradmin.New(hotelierRepo, logger)
	articleHTTPHandler := article.NewHandler(articleService, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	feedHTTPHandler := feed.NewFeedHandler(feedService, cfg.MediaDir, cfg.DefaultListLimit, cfg.MaxListLimit, logger)
	aiHTTPHandler := ai.NewHandler(listingReviewService, productReviewService, disappointmentCandidateService, cfg.MaxListLimit, logger)
	assistantHTTPHandler := assistant.NewHandler(
		assistant.NewHTTPAIService(cfg.AIServiceBaseURL, cfg.AIInternalAPIKey), logger,
	)
	handler := router.New(
		authHTTPHandler,
		productHTTPHandler,
		counterpartyHTTPHandler,
		listingHTTPHandler,
		dictionaryHTTPHandler,
		orderHTTPHandler,
		bookingHTTPHandler,
		profileHTTPHandler,
		dbpool,
		cfg.JWTSecret,
		logger,
		router.ExtraHandlers{
			AI:            aiHTTPHandler,
			Assistant:     assistantHTTPHandler,
			Admin:         adminHTTPHandler,
			ProductReview: productReviewHTTPHandler,
			ListingReview: listingReviewHTTPHandler,
			Hotelier:      hotelierHTTPHandler,
			HotelierAdmin: hotelierAdminHTTPHandler,
			Article:       articleHTTPHandler,
			Feed:          feedHTTPHandler},
	)

	corsMiddleware := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"}),
		handlers.ExposedHeaders([]string{"Link"}),
		handlers.AllowCredentials(),
	)

	addr := net.JoinHostPort("", cfg.HttpServerPort)
	server := &http.Server{
		Addr:         addr,
		Handler:      corsMiddleware(handler),
		ReadTimeout:  cfg.HttpReadTimeout,
		WriteTimeout: cfg.HttpWriteTimeout,
		IdleTimeout:  cfg.HttpIdleTimeout,
	}

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("listen on %s: %w", addr, err)
	}

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("Starting server", zap.String("address", addr))
		serveErr <- server.Serve(listener)
	}()

	signalCtx, stopSignals := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stopSignals()

	select {
	case err := <-serveErr:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("HTTP server failed: %w", err)
	case <-signalCtx.Done():
	}

	logger.Info("Shutting down server")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		_ = server.Close()
		return fmt.Errorf("graceful shutdown: %w", err)
	}

	if err := <-serveErr; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("HTTP server stopped unexpectedly: %w", err)
	}

	logger.Info("Server exited gracefully")
	return nil
}

func envDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
