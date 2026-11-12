package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/config"
	"github.com/idalgo-2021/product-catalog-backend/internal/listingdistance"
	"github.com/idalgo-2021/product-catalog-backend/internal/maintenance"
	"github.com/idalgo-2021/product-catalog-backend/internal/repository/postgres"
	pkgdb "github.com/idalgo-2021/product-catalog-backend/pkg/db"
	"github.com/joho/godotenv"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		log.Printf("maintenance failed: %v", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) == 0 {
		return errors.New("usage: maintenance expire-orders | review-drafts | review-drafts-preview --since=RFC3339 | refresh-listing-ratings | recalculate-listing-distances [--all | --location-id=ID] | import-review-summaries [--page-size=100] | import-disappointment-analyses [--page-size=100] | sync-disappointment-notifications")
	}

	var since time.Time
	var locationID int
	pageSize := maintenance.DefaultReviewSummaryPageSize
	switch args[0] {
	case "recalculate-listing-distances", "recalculate-distances":
		flags := flag.NewFlagSet(args[0], flag.ContinueOnError)
		all := flags.Bool("all", false, "recalculate every location")
		locID := flags.Int("location-id", 0, "recalculate one location")
		if err := flags.Parse(args[1:]); err != nil {
			return err
		}
		if flags.NArg() != 0 || (*all && *locID != 0) || (!*all && *locID <= 0) {
			return fmt.Errorf("usage: maintenance %s --all | --location-id=ID", args[0])
		}
		locationID = *locID
	case "expire-orders":
		if len(args) != 1 {
			return errors.New("usage: maintenance expire-orders")
		}
	case "review-drafts":
		if len(args) != 1 {
			return errors.New("usage: maintenance review-drafts")
		}
	case "refresh-listing-ratings":
		if len(args) != 1 {
			return errors.New("usage: maintenance refresh-listing-ratings")
		}
	case "import-review-summaries":
		flags := flag.NewFlagSet(args[0], flag.ContinueOnError)
		flags.IntVar(&pageSize, "page-size", maintenance.DefaultReviewSummaryPageSize, "number of summaries fetched per request (1-500)")
		if err := flags.Parse(args[1:]); err != nil {
			return err
		}
		if flags.NArg() != 0 || pageSize < 1 || pageSize > maintenance.MaxReviewSummaryPageSize {
			return fmt.Errorf("usage: maintenance import-review-summaries [--page-size=1..%d]", maintenance.MaxReviewSummaryPageSize)
		}
	case "import-disappointment-analyses":
		flags := flag.NewFlagSet(args[0], flag.ContinueOnError)
		flags.IntVar(&pageSize, "page-size", maintenance.DefaultDisappointmentAnalysisPageSize, "number of analyses fetched per request (1-500)")
		if err := flags.Parse(args[1:]); err != nil {
			return err
		}
		if flags.NArg() != 0 || pageSize < 1 || pageSize > maintenance.MaxDisappointmentAnalysisPageSize {
			return fmt.Errorf("usage: maintenance import-disappointment-analyses [--page-size=1..%d]", maintenance.MaxDisappointmentAnalysisPageSize)
		}
	case "sync-disappointment-notifications":
		if len(args) != 1 {
			return errors.New("usage: maintenance sync-disappointment-notifications")
		}
	case "review-drafts-preview":
		flags := flag.NewFlagSet(args[0], flag.ContinueOnError)
		sinceRaw := flags.String("since", "", "start of completion window, RFC3339")
		if err := flags.Parse(args[1:]); err != nil {
			return err
		}
		if *sinceRaw == "" || flags.NArg() != 0 {
			return errors.New("usage: maintenance review-drafts-preview --since=RFC3339")
		}
		var err error
		since, err = time.Parse(time.RFC3339, *sinceRaw)
		if err != nil {
			return fmt.Errorf("parse --since: %w", err)
		}
	default:
		return fmt.Errorf("unknown maintenance command %q", args[0])
	}

	if err := godotenv.Load(".env"); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	lifetimes, err := config.LoadLifetimes()
	if err != nil {
		return err
	}
	databaseURL, err := config.BuildDatabaseURL()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if args[0] != "review-drafts" {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, 10*time.Minute)
		defer cancel()
	}
	pool, err := pkgdb.NewPostgresPool(ctx, databaseURL, pkgdb.DefaultPoolConfig())
	if err != nil {
		return err
	}
	defer pool.Close()
	repo := postgres.NewMaintenanceRepo(pool)
	runner := maintenance.NewRunner(repo, lifetimes.PendingOrder)
	productRunner := maintenance.NewProductReviewDraftRunner(postgres.NewProductReviewMaintenanceRepo(pool), lifetimes.ReviewDraft)
	listingRunner := maintenance.NewListingReviewDraftRunner(postgres.NewListingReviewMaintenanceRepo(pool), lifetimes.ReviewDraft)

	switch args[0] {
	case "recalculate-listing-distances", "recalculate-distances":
		updated, err := listingdistance.Recalculate(ctx, pool, locationID)
		if err != nil {
			return err
		}
		log.Printf("updated distances for %d listings", updated)
		return nil
	case "refresh-listing-ratings":
		count, err := repo.RefreshListingRatings(ctx)
		log.Printf("listing ratings updated: %d", count)
		return err
	case "import-review-summaries":
		baseURL := os.Getenv("AI_SERVICE_BASE_URL")
		if baseURL == "" {
			baseURL = "http://localhost:8090"
		}
		importer, err := maintenance.NewReviewSummaryImporter(
			baseURL,
			os.Getenv("AI_INTERNAL_API_KEY"),
			postgres.NewReviewSummaryRepo(pool),
			pageSize,
		)
		if err != nil {
			return err
		}
		result, err := importer.Run(ctx)
		log.Printf("review summary import: received=%d inserted_or_updated=%d unchanged_or_older=%d", result.Received, result.Updated, result.Unchanged)
		return err
	case "sync-disappointment-notifications":
		runner := maintenance.NewDisappointmentNotificationRunner(postgres.NewDisappointmentNotificationRepo(pool))
		result, err := runner.Run(ctx)
		log.Printf("disappointment notifications: hoteliers=%d created_or_updated=%d unchanged=%d resolved=%d", result.Hoteliers, result.CreatedOrUpdated, result.Unchanged, result.Resolved)
		return err
	case "import-disappointment-analyses":
		baseURL := os.Getenv("AI_SERVICE_BASE_URL")
		if baseURL == "" {
			baseURL = "http://localhost:8090"
		}
		importer, err := maintenance.NewDisappointmentAnalysisImporter(
			baseURL,
			os.Getenv("AI_INTERNAL_API_KEY"),
			postgres.NewDisappointmentAnalysisRepo(pool),
			pageSize,
		)
		if err != nil {
			return err
		}
		result, err := importer.Run(ctx)
		log.Printf("disappointment analysis import: received=%d inserted_or_updated=%d unchanged_or_older=%d", result.Received, result.Updated, result.Unchanged)
		return err
	case "expire-orders":
		count, err := runner.ExpirePendingOrders(ctx, time.Now().UTC())
		log.Printf("expired pending orders: %d", count)
		return err
	case "review-drafts-preview":
		now := time.Now().UTC()
		productCount, productErr := productRunner.Preview(ctx, since, now, func(c maintenance.ProductReviewDraftCandidate) error {
			log.Printf("product review draft preview: order_id=%s product_id=%s", c.OrderID, c.ProductID)
			return nil
		})
		listingCount, listingErr := listingRunner.Preview(ctx, since, now, func(c maintenance.ListingReviewDraftCandidate) error {
			log.Printf("listing review draft preview: booking_id=%s listing_id=%s", c.BookingID, c.ListingID)
			return nil
		})
		log.Printf("review draft candidates: product=%d listing=%d (preview only)", productCount, listingCount)
		return errors.Join(productErr, listingErr)
	case "review-drafts":
		unlock, acquired, err := repo.TryReviewLock(ctx)
		if err != nil {
			return fmt.Errorf("acquire review maintenance lock: %w", err)
		}
		if !acquired {
			return errors.New("review maintenance is already running")
		}
		defer unlock()
		now := time.Now().UTC()
		productResult, productErr := productRunner.Process(ctx, now, func(c maintenance.ProductReviewDraftCandidate, cause error) {
			log.Printf("product review draft failed: order_id=%s product_id=%s error=%v", c.OrderID, c.ProductID, cause)
		})
		listingResult, listingErr := listingRunner.Process(ctx, now, func(c maintenance.ListingReviewDraftCandidate, cause error) {
			log.Printf("listing review draft failed: booking_id=%s listing_id=%s error=%v", c.BookingID, c.ListingID, cause)
		})
		log.Printf("product review drafts: created=%d skipped=%d failed=%d expired=%d", productResult.Created, productResult.Skipped, productResult.Failed, productResult.Expired)
		log.Printf("listing review drafts: created=%d skipped=%d failed=%d expired=%d", listingResult.Created, listingResult.Skipped, listingResult.Failed, listingResult.Expired)
		return errors.Join(productErr, listingErr)
	}
	return nil
}
