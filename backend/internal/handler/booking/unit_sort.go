package booking

import (
	"sort"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

// sortUnits operates on the complete, unpaginated inventory returned by the service.
func sortUnits(units []domain.ListingUnit, order domain.Sort) {
	sort.Slice(units, func(i, j int) bool {
		a, b := units[i], units[j]
		if order.By == "price_per_night" {
			if cmp := a.PricePerNight.Cmp(b.PricePerNight); cmp != 0 {
				return (cmp < 0) == (order.Order == "asc")
			}
		} else {
			// Preserve the existing parent-first, then name order by default.
			if (a.ParentUnitID == nil) != (b.ParentUnitID == nil) {
				return a.ParentUnitID == nil
			}
			if a.ParentUnitID != nil && *a.ParentUnitID != *b.ParentUnitID {
				return (*a.ParentUnitID < *b.ParentUnitID) == (order.Order == "asc")
			}
			if a.Name != b.Name {
				return (a.Name < b.Name) == (order.Order == "asc")
			}
		}
		return (a.ID < b.ID) == (order.Order == "asc")
	})
}

func unitsInCurrency(units []domain.ListingUnit, currency string) []domain.ListingUnit {
	if currency == "" {
		return units
	}
	filtered := make([]domain.ListingUnit, 0, len(units))
	for _, unit := range units {
		if unit.Currency == currency {
			filtered = append(filtered, unit)
		}
	}
	return filtered
}
