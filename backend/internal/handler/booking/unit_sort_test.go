package booking

import (
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/shopspring/decimal"
)

func TestSortUnitsOrdersPricesWithinSelectedCurrency(t *testing.T) {
	units := []domain.ListingUnit{
		{ID: "r2", Currency: "RUB", PricePerNight: decimal.NewFromInt(200)},
		{ID: "u1", Currency: "USD", PricePerNight: decimal.NewFromInt(10)},
		{ID: "r1", Currency: "RUB", PricePerNight: decimal.NewFromInt(100)},
	}
	units = unitsInCurrency(units, "RUB")
	sortUnits(units, domain.Sort{By: "price_per_night", Order: "asc"})
	if len(units) != 2 || units[0].ID != "r1" || units[1].ID != "r2" {
		t.Fatalf("ascending units = %+v", units)
	}
	sortUnits(units, domain.Sort{By: "price_per_night", Order: "desc"})
	if units[0].ID != "r2" || units[1].ID != "r1" {
		t.Fatalf("descending units = %+v", units)
	}
}
