package listing

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func TestListingResponseLanguageAndAddress(t *testing.T) {
	titleRU, descriptionEN, descriptionRU := "Квартира у моря", "A seaside apartment", "Квартира рядом с морем"
	address, addressRU := "112 Lenina Street", "ул. Ленина, д. 112"
	item := &domain.Listing{
		Title: "Seaside Apartment", TitleRU: &titleRU,
		Description: &descriptionEN, DescriptionRU: &descriptionRU,
		Address: &address, AddressRU: &addressRU,
	}
	en := toListingResponse(item, "en")
	ru := toListingResponse(item, "ru")
	if en.Title != "Seaside Apartment" || *en.Description != descriptionEN || *en.Address != address {
		t.Fatalf("English listing: %+v", en)
	}
	if ru.Title != titleRU || *ru.Description != descriptionRU || *ru.Address != addressRU {
		t.Fatalf("Russian listing: %+v", ru)
	}
	item.TitleRU, item.DescriptionRU, item.AddressRU = nil, nil, nil
	fallback := toListingResponse(item, "ru")
	if fallback.Title != item.Title || *fallback.Description != descriptionEN || *fallback.Address != address {
		t.Fatalf("fallback listing: %+v", fallback)
	}
	encoded, err := json.Marshal(fallback)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), "external_source") || strings.Contains(string(encoded), "external_id") {
		t.Fatalf("client listing exposes source identity: %s", encoded)
	}
}
