package service

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

func TestAdminServiceValidatesCatalogFields(t *testing.T) {
	s := NewAdminService(nil, "RUB")
	tests := []struct {
		kind   string
		create bool
		fields map[string]string
		valid  bool
	}{
		{"products", true, map[string]string{"name": `"Tour"`, "product_type": `"tour"`, "price": `100`, "currency": `"RUB"`, "schedule": `[{"weekday":2,"time":"10:00"}]`}, true},
		{"products", true, map[string]string{"name": `"Tour"`, "product_type": `"tour"`, "price": `100`, "currency": `"USD"`}, false},
		{"products", true, map[string]string{"name": `"Goods"`, "product_type": `"goods"`, "price": `100`, "currency": `"RUB"`, "schedule": `[{"weekday":2,"time":"10:00"}]`}, false},
		{"products", false, map[string]string{"is_active": `true`, "password_hash": `"x"`}, false},
		{"products", false, map[string]string{"images": `[{"url":"https://example.com/a.jpg","width":100,"height":100,"unexpected":1}]`}, false},
		{"listings", true, map[string]string{"title": `"Hotel"`, "listing_type_id": `1`, "location_id": `2`}, true},
		{"listings", true, map[string]string{"title": `"Hotel"`, "listing_type_id": `1`, "location_id": `2`, "external_source": `"osm"`, "external_id": `"way/36823763"`}, true},
		{"listings", true, map[string]string{"title": `"Hotel"`, "listing_type_id": `1`, "location_id": `2`, "external_source": `"osm"`}, false},
		{"listings", true, map[string]string{"title": `"Hotel"`, "listing_type_id": `1`, "location_id": `2`, "external_id": `"way/36823763"`}, false},
		{"listings", true, map[string]string{"title": `"Hotel"`, "listing_type_id": `1`, "location_id": `2`, "external_source": `null`, "external_id": `null`}, true},
		{"listings", false, map[string]string{"external_source": `"OSM"`}, false},
		{"listings", false, map[string]string{"external_id": `" way/36823763"`}, false},
		{"listings", false, map[string]string{"external_source": `null`, "external_id": `null`}, true},
		{"listings", true, map[string]string{"title": `"Hotel"`, "title_ru": `"Отель"`, "description": `"City center"`, "description_ru": `"Центр города"`, "address": `"1 Lenina Street"`, "address_ru": `"ул. Ленина, 1"`, "listing_type_id": `1`, "location_id": `2`}, true},
		{"listings", false, map[string]string{"title_ru": `null`, "description_ru": `null`, "address_ru": `null`}, true},
		{"listings", true, map[string]string{"title": `"Отель"`, "listing_type_id": `1`, "location_id": `2`}, false},
		{"products", true, map[string]string{"name": `"Picnic Set"`, "name_ru": `"Набор для пикника"`, "description": `"Blanket and thermos"`, "description_ru": `"Плед и термос"`, "product_type": `"goods"`, "price": `100`, "currency": `"RUB"`}, true},
		{"products", false, map[string]string{"name_ru": `null`, "description_ru": `null`}, true},
		{"products", true, map[string]string{"name": `"Набор"`, "product_type": `"goods"`, "price": `100`, "currency": `"RUB"`}, false},
		{"countries", true, map[string]string{"code": `"RU"`, "name": `"Russia"`, "name_ru": `"Россия"`}, true},
		{"locations", true, map[string]string{"country_id": `1`, "name": `"Moscow"`, "name_ru": `"Москва"`, "center_latitude": `55.750556`, "center_longitude": `37.6175`}, true},
		{"locations", true, map[string]string{"country_id": `1`, "name": `"Moscow"`, "center_latitude": `55.75`}, false},
		{"locations", true, map[string]string{"country_id": `1`, "name": `"Moscow"`, "center_latitude": `91`, "center_longitude": `37.62`}, false},
		{"listing_types", true, map[string]string{"slug": `"hotel"`, "name": `"Hotel"`, "name_ru": `"Отель"`}, true},
		{"currencies", true, map[string]string{"code": `"USD"`, "name": `"US dollar"`, "name_ru": `"Доллар США"`}, true},
		{"countries", false, map[string]string{"name_ru": `null`}, true},
		{"countries", true, map[string]string{"code": `"RU"`, "name": `"Россия"`, "name_ru": `"Россия"`}, false},
		{"exchange_rates", true, map[string]string{"quote_currency": `"RUB"`, "rate": `1`, "effective_from": `"2026-01-01T00:00:00Z"`}, false},
	}
	for _, tc := range tests {
		fields := make(map[string]json.RawMessage, len(tc.fields))
		for key, raw := range tc.fields {
			fields[key] = json.RawMessage(raw)
		}
		values, err := s.normalize(tc.kind, fields, tc.create)
		if tc.valid && err != nil || !tc.valid && !errors.Is(err, domain.ErrInvalidInput) {
			t.Fatalf("kind=%s fields=%v valid=%v err=%v", tc.kind, tc.fields, tc.valid, err)
		}
		if tc.valid && tc.create && (tc.kind == "products" || tc.kind == "listings") && values["is_active"] != false {
			t.Fatalf("new %s must start inactive", tc.kind)
		}
	}
}
