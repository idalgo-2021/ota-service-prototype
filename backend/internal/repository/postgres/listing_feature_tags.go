package postgres

import (
	"context"
	"fmt"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func (r *ListingRepo) attachFeatureTags(ctx context.Context, listings []domain.Listing) error {
	if len(listings) == 0 {
		return nil
	}
	ids := make([]string, 0, len(listings))
	byID := make(map[string]int, len(listings))
	for i := range listings {
		ids = append(ids, listings[i].ID)
		byID[listings[i].ID] = i
		listings[i].Features = make([]domain.FeatureTag, 0)
	}
	rows, err := r.db.Query(ctx, `SELECT a.listing_id::text, t.id, t.slug, t.name, t.name_ru
		FROM listing_feature_tag_assignments a
		JOIN listing_feature_tags t ON t.id=a.tag_id
		WHERE a.listing_id=ANY($1::uuid[]) AND t.is_active
		ORDER BY a.listing_id, a.sort_order, t.id`, ids)
	if err != nil {
		return fmt.Errorf("query listing feature tags: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var listingID string
		var tag domain.FeatureTag
		if err := rows.Scan(&listingID, &tag.ID, &tag.Slug, &tag.Name, &tag.NameRU); err != nil {
			return fmt.Errorf("scan listing feature tag: %w", err)
		}
		if i, ok := byID[listingID]; ok {
			listings[i].Features = append(listings[i].Features, tag)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate listing feature tags: %w", err)
	}
	return nil
}
