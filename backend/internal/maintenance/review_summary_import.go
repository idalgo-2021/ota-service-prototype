package maintenance

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

const (
	DefaultReviewSummaryPageSize = 100
	MaxReviewSummaryPageSize     = 500
)

type reviewSummaryPage struct {
	Items  []domain.ReviewSummary `json:"items"`
	Total  int                    `json:"total"`
	Limit  int                    `json:"limit"`
	Offset int                    `json:"offset"`
}

type ReviewSummaryStore interface {
	UpsertListingReviewSummary(context.Context, domain.ReviewSummary) (bool, error)
	UpsertProductReviewSummary(context.Context, domain.ReviewSummary) (bool, error)
}

type ReviewSummaryImporter struct {
	baseURL  string
	apiKey   string
	store    ReviewSummaryStore
	client   *http.Client
	pageSize int
}

type ReviewSummaryImportResult struct {
	Received  int
	Updated   int
	Unchanged int
}

func NewReviewSummaryImporter(baseURL, apiKey string, store ReviewSummaryStore, pageSize int) (*ReviewSummaryImporter, error) {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		return nil, errors.New("AI_SERVICE_BASE_URL is required")
	}
	parsedURL, err := url.ParseRequestURI(baseURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return nil, fmt.Errorf("AI_SERVICE_BASE_URL must be an absolute URL")
	}
	if strings.TrimSpace(apiKey) == "" {
		return nil, errors.New("AI_INTERNAL_API_KEY is required")
	}
	if store == nil {
		return nil, errors.New("review summary store is required")
	}
	if pageSize == 0 {
		pageSize = DefaultReviewSummaryPageSize
	}
	if pageSize < 1 || pageSize > MaxReviewSummaryPageSize {
		return nil, fmt.Errorf("page size must be between 1 and %d", MaxReviewSummaryPageSize)
	}
	return &ReviewSummaryImporter{
		baseURL:  baseURL,
		apiKey:   apiKey,
		store:    store,
		client:   &http.Client{Timeout: 30 * time.Second},
		pageSize: pageSize,
	}, nil
}

func (i *ReviewSummaryImporter) Run(ctx context.Context) (ReviewSummaryImportResult, error) {
	var result ReviewSummaryImportResult
	for offset := 0; ; {
		page, err := i.fetchPage(ctx, offset)
		if err != nil {
			return result, err
		}
		if page.Total < 0 || len(page.Items) > i.pageSize {
			return result, fmt.Errorf("AI service returned invalid review summary pagination metadata")
		}
		for _, summary := range page.Items {
			if err := validateReviewSummary(summary); err != nil {
				return result, err
			}
			var changed bool
			switch summary.EntityType {
			case "listing":
				changed, err = i.store.UpsertListingReviewSummary(ctx, summary)
			case "product":
				changed, err = i.store.UpsertProductReviewSummary(ctx, summary)
			default:
				err = fmt.Errorf("unsupported review summary entity_type %q", summary.EntityType)
			}
			if err != nil {
				return result, fmt.Errorf("save %s review summary %s: %w", summary.EntityType, summary.EntityID, err)
			}
			result.Received++
			if changed {
				result.Updated++
			} else {
				result.Unchanged++
			}
		}
		if len(page.Items) == 0 || offset+len(page.Items) >= page.Total {
			break
		}
		offset += len(page.Items)
	}
	return result, nil
}

func (i *ReviewSummaryImporter) fetchPage(ctx context.Context, offset int) (reviewSummaryPage, error) {
	endpoint := i.baseURL + "/internal/v1/review-summaries"
	requestURL, err := url.Parse(endpoint)
	if err != nil {
		return reviewSummaryPage{}, fmt.Errorf("build AI service URL: %w", err)
	}
	query := requestURL.Query()
	query.Set("limit", fmt.Sprint(i.pageSize))
	query.Set("offset", fmt.Sprint(offset))
	requestURL.RawQuery = query.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL.String(), nil)
	if err != nil {
		return reviewSummaryPage{}, fmt.Errorf("create AI service request: %w", err)
	}
	request.Header.Set("X-Internal-API-Key", i.apiKey)
	response, err := i.client.Do(request)
	if err != nil {
		return reviewSummaryPage{}, fmt.Errorf("request AI service review summaries: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return reviewSummaryPage{}, fmt.Errorf("AI service returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	var page reviewSummaryPage
	if err := json.NewDecoder(response.Body).Decode(&page); err != nil {
		return reviewSummaryPage{}, fmt.Errorf("decode AI service review summaries: %w", err)
	}
	return page, nil
}

func validateReviewSummary(summary domain.ReviewSummary) error {
	if strings.TrimSpace(summary.EntityID) == "" {
		return errors.New("AI service returned a review summary without entity_id")
	}
	if strings.TrimSpace(summary.Summary) == "" {
		return fmt.Errorf("AI service returned an empty summary for %s %s", summary.EntityType, summary.EntityID)
	}
	if summary.SourceReviewCount < 0 {
		return fmt.Errorf("AI service returned a negative source_review_count for %s %s", summary.EntityType, summary.EntityID)
	}
	if strings.TrimSpace(summary.ModelID) == "" || strings.TrimSpace(summary.PromptVersion) == "" || summary.GeneratedAt.IsZero() {
		return fmt.Errorf("AI service returned incomplete metadata for %s %s", summary.EntityType, summary.EntityID)
	}
	return nil
}
