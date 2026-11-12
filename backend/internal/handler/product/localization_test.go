package product

import (
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func TestProductLanguageAndAdminTranslations(t *testing.T) {
	nameRU, descriptionRU := "Набор для пикника", "Плед и термос"
	item := &domain.Product{Name: "Picnic Set", NameRU: &nameRU, Description: "A blanket and thermos", DescriptionRU: &descriptionRU}
	public := toProductResponse(item, "ru", false)
	if public.Name != nameRU || public.Description != descriptionRU || public.NameRU != nil || public.DescriptionRU != nil {
		t.Fatalf("Russian product: %+v", public)
	}
	admin := toProductResponse(item, "en", true)
	if admin.Name != "Picnic Set" || admin.NameRU == nil || *admin.NameRU != nameRU || admin.DescriptionRU == nil {
		t.Fatalf("admin product: %+v", admin)
	}
	item.NameRU, item.DescriptionRU = nil, nil
	fallback := toProductResponse(item, "ru", false)
	if fallback.Name != item.Name || fallback.Description != item.Description {
		t.Fatalf("fallback product: %+v", fallback)
	}
}
