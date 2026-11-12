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

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

const (
	DefaultDisappointmentAnalysisPageSize = 100
	MaxDisappointmentAnalysisPageSize     = 500
)

type disappointmentAnalysisPage struct {
	Items  []domain.DisappointmentAnalysis `json:"items"`
	Total  int                             `json:"total"`
	Limit  int                             `json:"limit"`
	Offset int                             `json:"offset"`
}

type DisappointmentAnalysisStore interface {
	UpsertListingDisappointmentAnalysis(context.Context, domain.DisappointmentAnalysis) (bool, error)
}

type DisappointmentAnalysisImporter struct {
	baseURL  string
	apiKey   string
	store    DisappointmentAnalysisStore
	client   *http.Client
	pageSize int
}

type DisappointmentAnalysisImportResult struct {
	Received  int
	Updated   int
	Unchanged int
}

func NewDisappointmentAnalysisImporter(baseURL, apiKey string, store DisappointmentAnalysisStore, pageSize int) (*DisappointmentAnalysisImporter, error) {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		return nil, errors.New("AI_SERVICE_BASE_URL is required")
	}
	parsedURL, err := url.ParseRequestURI(baseURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return nil, errors.New("AI_SERVICE_BASE_URL must be an absolute URL")
	}
	if strings.TrimSpace(apiKey) == "" {
		return nil, errors.New("AI_INTERNAL_API_KEY is required")
	}
	if store == nil {
		return nil, errors.New("disappointment analysis store is required")
	}
	if pageSize == 0 {
		pageSize = DefaultDisappointmentAnalysisPageSize
	}
	if pageSize < 1 || pageSize > MaxDisappointmentAnalysisPageSize {
		return nil, fmt.Errorf("page size must be between 1 and %d", MaxDisappointmentAnalysisPageSize)
	}
	return &DisappointmentAnalysisImporter{
		baseURL: baseURL, apiKey: apiKey, store: store,
		client: &http.Client{Timeout: 30 * time.Second}, pageSize: pageSize,
	}, nil
}

func (i *DisappointmentAnalysisImporter) Run(ctx context.Context) (DisappointmentAnalysisImportResult, error) {
	var result DisappointmentAnalysisImportResult
	for offset := 0; ; {
		page, err := i.fetchPage(ctx, offset)
		if err != nil {
			return result, err
		}
		if page.Total < 0 || len(page.Items) > i.pageSize {
			return result, errors.New("AI service returned invalid disappointment analysis pagination metadata")
		}
		for _, analysis := range page.Items {
			if err := validateDisappointmentAnalysis(analysis); err != nil {
				return result, err
			}
			changed, err := i.store.UpsertListingDisappointmentAnalysis(ctx, analysis)
			if err != nil {
				return result, fmt.Errorf("save disappointment analysis for listing %s: %w", analysis.ListingID, err)
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

func (i *DisappointmentAnalysisImporter) fetchPage(ctx context.Context, offset int) (disappointmentAnalysisPage, error) {
	requestURL, err := url.Parse(i.baseURL + "/internal/v1/disappointment-analyses")
	if err != nil {
		return disappointmentAnalysisPage{}, fmt.Errorf("build AI service URL: %w", err)
	}
	query := requestURL.Query()
	query.Set("limit", fmt.Sprint(i.pageSize))
	query.Set("offset", fmt.Sprint(offset))
	requestURL.RawQuery = query.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL.String(), nil)
	if err != nil {
		return disappointmentAnalysisPage{}, fmt.Errorf("create AI service request: %w", err)
	}
	request.Header.Set("X-Internal-API-Key", i.apiKey)
	response, err := i.client.Do(request)
	if err != nil {
		return disappointmentAnalysisPage{}, fmt.Errorf("request AI service disappointment analyses: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return disappointmentAnalysisPage{}, fmt.Errorf("AI service returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	var page disappointmentAnalysisPage
	if err := json.NewDecoder(response.Body).Decode(&page); err != nil {
		return disappointmentAnalysisPage{}, fmt.Errorf("decode AI service disappointment analyses: %w", err)
	}
	return page, nil
}

func validateDisappointmentAnalysis(analysis domain.DisappointmentAnalysis) error {
	if _, err := uuid.Parse(analysis.ListingID); err != nil {
		return fmt.Errorf("AI service returned invalid listing_id %q", analysis.ListingID)
	}
	if strings.TrimSpace(analysis.SourceHash) == "" || !json.Valid(analysis.Result) || len(analysis.Result) == 0 || string(analysis.Result) == "null" {
		return fmt.Errorf("AI service returned incomplete analysis data for listing %s", analysis.ListingID)
	}
	if strings.TrimSpace(analysis.ModelID) == "" || strings.TrimSpace(analysis.PromptVersion) == "" || analysis.GeneratedAt.IsZero() {
		return fmt.Errorf("AI service returned incomplete metadata for listing %s", analysis.ListingID)
	}
	return nil
}
