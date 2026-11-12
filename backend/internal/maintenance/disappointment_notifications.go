package maintenance

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

type DisappointmentNotificationStore interface {
	ListDisappointmentDigestListings(context.Context) ([]domain.DisappointmentDigestListing, error)
	UpsertHotelierDisappointmentDigest(context.Context, string, string) (bool, error)
	ResolveMissingHotelierDisappointmentDigests(context.Context) (int64, error)
}

type DisappointmentNotificationResult struct {
	Hoteliers        int
	CreatedOrUpdated int
	Unchanged        int
	Resolved         int64
}

type DisappointmentNotificationRunner struct {
	store DisappointmentNotificationStore
}

func NewDisappointmentNotificationRunner(store DisappointmentNotificationStore) *DisappointmentNotificationRunner {
	return &DisappointmentNotificationRunner{store: store}
}

type disappointmentFinding struct {
	Status                     string   `json:"status"`
	Severity                   string   `json:"severity"`
	Summary                    string   `json:"summary"`
	RecommendationRequired     *bool    `json:"recommendation_required"`
	Evidence                   []string `json:"evidence"`
	ServiceRecommendations     []string `json:"service_recommendations"`
	DescriptionRecommendations []string `json:"description_recommendations"`
	TagRecommendations         []string `json:"tag_recommendations"`
}

func (r *DisappointmentNotificationRunner) Run(ctx context.Context) (DisappointmentNotificationResult, error) {
	var stats DisappointmentNotificationResult
	if r.store == nil {
		return stats, errors.New("disappointment notification store is required")
	}
	listings, err := r.store.ListDisappointmentDigestListings(ctx)
	if err != nil {
		return stats, fmt.Errorf("load analyzed listing results: %w", err)
	}
	groups := make(map[string][]domain.DisappointmentDigestListing)
	for _, listing := range listings {
		if listing.HotelierID == "" || listing.ListingID == "" {
			return stats, errors.New("disappointment digest contains an empty hotelier_id or listing_id")
		}
		groups[listing.HotelierID] = append(groups[listing.HotelierID], listing)
	}
	stats.Hoteliers = len(groups)
	hotelierIDs := make([]string, 0, len(groups))
	for hotelierID := range groups {
		hotelierIDs = append(hotelierIDs, hotelierID)
	}
	sort.Strings(hotelierIDs)
	var runErrors []error
	for _, hotelierID := range hotelierIDs {
		if err := ctx.Err(); err != nil {
			return stats, errors.Join(errors.Join(runErrors...), err)
		}
		message, err := formatDisappointmentDigest(groups[hotelierID])
		if err != nil {
			runErrors = append(runErrors, fmt.Errorf("format disappointment digest for hotelier %s: %w", hotelierID, err))
			continue
		}
		changed, err := r.store.UpsertHotelierDisappointmentDigest(ctx, hotelierID, message)
		if err != nil {
			runErrors = append(runErrors, fmt.Errorf("save disappointment digest for hotelier %s: %w", hotelierID, err))
			continue
		}
		if changed {
			stats.CreatedOrUpdated++
		} else {
			stats.Unchanged++
		}
	}
	stats.Resolved, err = r.store.ResolveMissingHotelierDisappointmentDigests(ctx)
	if err != nil {
		runErrors = append(runErrors, fmt.Errorf("resolve stale disappointment digests: %w", err))
	}
	return stats, errors.Join(runErrors...)
}

func formatDisappointmentDigest(items []domain.DisappointmentDigestListing) (string, error) {
	if len(items) == 0 {
		return "", errors.New("empty listing group")
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].TitleRU == items[j].TitleRU {
			return items[i].ListingID < items[j].ListingID
		}
		return items[i].TitleRU < items[j].TitleRU
	})
	english := strings.HasPrefix(strings.ToLower(strings.TrimSpace(items[0].Language)), "en")
	var checkedAt time.Time
	good, attention := make([]string, 0), make([]string, 0)
	for _, item := range items {
		var finding disappointmentFinding
		if err := json.Unmarshal(item.Result, &finding); err != nil {
			return "", fmt.Errorf("decode result for listing %s: %w", item.ListingID, err)
		}
		if (finding.Status != "issue" && finding.Status != "no_issue") || finding.RecommendationRequired == nil {
			return "", fmt.Errorf("result for listing %s is missing detector status fields", item.ListingID)
		}
		if item.GeneratedAt.After(checkedAt) {
			checkedAt = item.GeneratedAt
		}
		title := item.TitleRU
		if english {
			title = item.Title
		}
		if strings.TrimSpace(title) == "" {
			title = item.Title
		}
		if strings.TrimSpace(title) == "" {
			title = item.ListingID
		}
		needsAttention := finding.Status == "issue" || *finding.RecommendationRequired ||
			len(finding.ServiceRecommendations)+len(finding.DescriptionRecommendations)+len(finding.TagRecommendations) > 0
		if !needsAttention {
			good = append(good, title)
			continue
		}
		var lines []string
		severity := finding.Severity
		if severity != "" && severity != "none" {
			if english {
				lines = append(lines, fmt.Sprintf("Severity: %s.", severity))
			} else {
				lines = append(lines, fmt.Sprintf("Серьёзность: %s.", severity))
			}
		}
		if finding.Summary != "" {
			lines = append(lines, finding.Summary)
		}
		if len(finding.Evidence) > 0 {
			prefix := "Основание: "
			if english {
				prefix = "Evidence: "
			}
			lines = append(lines, prefix+strings.Join(finding.Evidence, "; "))
		}
		appendRecommendations := func(label string, recommendations []string) {
			for _, recommendation := range recommendations {
				lines = append(lines, "• "+label+": "+recommendation)
			}
		}
		serviceLabel, descriptionLabel, tagLabel := "Сервис", "Описание", "Теги"
		if english {
			serviceLabel, descriptionLabel, tagLabel = "Service", "Description", "Tags"
		}
		appendRecommendations(serviceLabel, finding.ServiceRecommendations)
		appendRecommendations(descriptionLabel, finding.DescriptionRecommendations)
		appendRecommendations(tagLabel, finding.TagRecommendations)
		attention = append(attention, "• "+title+"\n  "+strings.Join(lines, "\n  "))
	}
	var b strings.Builder
	if english {
		fmt.Fprintf(&b, "Review analysis for your properties (latest result: %s).\n", checkedAt.UTC().Format("2006-01-02 15:04 UTC"))
		fmt.Fprintf(&b, "\nRecommendations — %d properties:\n", len(attention))
	} else {
		fmt.Fprintf(&b, "Результаты анализа отзывов по вашим объектам (последний результат: %s).\n", checkedAt.UTC().Format("2006-01-02 15:04 UTC"))
		fmt.Fprintf(&b, "\nЕсть рекомендации — объектов: %d:\n", len(attention))
	}
	if len(attention) == 0 {
		if english {
			b.WriteString("None.\n")
		} else {
			b.WriteString("Нет.\n")
		}
	} else {
		b.WriteString(strings.Join(attention, "\n\n"))
		b.WriteByte('\n')
	}
	if english {
		fmt.Fprintf(&b, "\nNo recommendations — %d properties:\n", len(good))
	} else {
		fmt.Fprintf(&b, "\nВсё в порядке — объектов: %d:\n", len(good))
	}
	if len(good) == 0 {
		if english {
			b.WriteString("None.\n")
		} else {
			b.WriteString("Нет.\n")
		}
	} else {
		for _, title := range good {
			fmt.Fprintf(&b, "• %s\n", title)
		}
	}
	return strings.TrimSpace(b.String()), nil
}
