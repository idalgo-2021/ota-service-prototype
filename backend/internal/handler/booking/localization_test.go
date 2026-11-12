package booking

import (
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func TestUnitAndParentLanguage(t *testing.T) {
	nameRU, parentName, parentRU := "Койка 01", "Dormitory A", "Общая комната А"
	unit := &domain.ListingUnit{Name: "Bed 01", NameRU: &nameRU, ParentName: &parentName, ParentNameRU: &parentRU}
	public := toUnitResponse(unit, "ru", false)
	if public.Name != nameRU || public.ParentName == nil || *public.ParentName != parentRU || public.NameRU != nil {
		t.Fatalf("Russian unit: %+v", public)
	}
	admin := toUnitResponse(unit, "en", true)
	if admin.Name != "Bed 01" || admin.ParentName == nil || *admin.ParentName != parentName || admin.NameRU == nil || *admin.NameRU != nameRU {
		t.Fatalf("admin unit: %+v", admin)
	}
}
