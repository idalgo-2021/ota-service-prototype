package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"github.com/shopspring/decimal"
	"golang.org/x/crypto/bcrypt"
)

type AdminRepository interface {
	Get(context.Context, string, string) (json.RawMessage, error)
	List(context.Context, string, map[string]any, int, int) ([]json.RawMessage, int, error)
	Create(context.Context, string, map[string]any) (json.RawMessage, error)
	Update(context.Context, string, string, map[string]any) (json.RawMessage, error)
	DeleteImage(context.Context, string, string, string) error
	CreateStaff(context.Context, string, string, domain.Role) (json.RawMessage, error)
	UpdateRole(context.Context, string, string, domain.Role) (json.RawMessage, error)
}

type AdminService struct {
	repo         AdminRepository
	baseCurrency string
}

func NewAdminService(repo AdminRepository, baseCurrency string) *AdminService {
	return &AdminService{repo: repo, baseCurrency: strings.ToUpper(baseCurrency)}
}

var adminFields = map[string]map[string]string{
	"countries":            {"name": "string", "name_ru": "nullable_string", "code": "country_code"},
	"locations":            {"name": "string", "name_ru": "nullable_string", "country_id": "positive_int", "center_latitude": "lat", "center_longitude": "lng"},
	"listing_types":        {"slug": "slug", "name": "string", "name_ru": "nullable_string"},
	"currencies":           {"code": "currency_code", "name": "string", "name_ru": "nullable_string", "is_active": "bool"},
	"counterparties":       {"name": "string", "location_id": "positive_int"},
	"listing_feature_tags": {"slug": "slug", "name": "string", "name_ru": "string", "is_active": "bool"},
	"listings":             {"title": "string", "title_ru": "nullable_string", "description": "nullable_string", "description_ru": "nullable_string", "main_picture": "nullable_url", "feature_ids": "feature_ids", "listing_type_id": "positive_int", "address": "nullable_string", "address_ru": "nullable_string", "location_id": "positive_int", "latitude": "nullable_lat", "longitude": "nullable_lng", "check_in_time": "clock", "is_active": "bool", "external_source": "nullable_external_source", "external_id": "nullable_external_id"},
	"products":             {"name": "string", "name_ru": "nullable_string", "product_type": "product_type", "price": "money", "currency": "currency_code", "description": "string", "description_ru": "nullable_string", "location_id": "nullable_positive_int", "counterparty_id": "nullable_uuid", "thumbnail": "image", "images": "images", "attributes": "attributes", "schedule": "schedule", "is_active": "bool"},
	"exchange_rates":       {"quote_currency": "currency_code", "rate": "rate", "effective_from": "timestamp"},
	"listing_images":       {"listing_id": "uuid", "url": "url", "sort_order": "nonnegative_int"},
	"unit_images":          {"unit_id": "uuid", "url": "url", "sort_order": "nonnegative_int"},
}

var adminRequired = map[string][]string{
	"countries": {"name", "code"}, "locations": {"name", "country_id", "center_latitude", "center_longitude"},
	"listing_types": {"name", "slug"}, "currencies": {"code", "name"},
	"counterparties":       {"name", "location_id"},
	"listing_feature_tags": {"slug", "name", "name_ru"},
	"listings":             {"title", "listing_type_id", "location_id"},
	"products":             {"name", "product_type", "price", "currency"},
	"exchange_rates":       {"quote_currency", "rate", "effective_from"},
	"listing_images":       {"listing_id", "url"}, "unit_images": {"unit_id", "url"},
}

var adminSlug = regexp.MustCompile(`^[a-z0-9]+(?:[-_][a-z0-9]+)*$`)
var adminExternalSource = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)
var cyrillicName = regexp.MustCompile(`\p{Cyrillic}`)

func invalidAdminField(field string) error {
	return fmt.Errorf("invalid %s: %w", field, domain.ErrInvalidInput)
}

func decodeStrictAdminJSON(raw json.RawMessage, value any) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		return err
	}
	var extra any
	if decoder.Decode(&extra) != io.EOF {
		return domain.ErrInvalidInput
	}
	return nil
}

func parseAdminValue(field, kind string, raw json.RawMessage) (any, error) {
	if string(raw) == "null" {
		if strings.HasPrefix(kind, "nullable_") || kind == "schedule" {
			return nil, nil
		}
		return nil, invalidAdminField(field)
	}
	switch kind {
	case "string", "nullable_string", "nullable_external_source", "nullable_external_id", "country_code", "currency_code", "slug", "product_type", "clock", "uuid", "nullable_uuid", "url", "nullable_url", "timestamp":
		var v string
		if err := json.Unmarshal(raw, &v); err != nil {
			return nil, invalidAdminField(field)
		}
		if strings.TrimSpace(v) != v {
			return nil, invalidAdminField(field)
		}
		switch kind {
		case "string", "nullable_string":
			if kind == "string" && v == "" || len(v) > 5000 {
				return nil, invalidAdminField(field)
			}
		case "nullable_external_source":
			if !adminExternalSource.MatchString(v) {
				return nil, invalidAdminField(field)
			}
		case "nullable_external_id":
			if v == "" || len(v) > 255 || strings.TrimSpace(v) != v {
				return nil, invalidAdminField(field)
			}
		case "country_code":
			if len(v) != 2 || v[0] < 'A' || v[0] > 'Z' || v[1] < 'A' || v[1] > 'Z' {
				return nil, invalidAdminField(field)
			}
		case "currency_code":
			if !currencyCode.MatchString(v) {
				return nil, invalidAdminField(field)
			}
		case "slug":
			if !adminSlug.MatchString(v) {
				return nil, invalidAdminField(field)
			}
		case "product_type":
			if v != "tour" && v != "goods" && v != "service" {
				return nil, invalidAdminField(field)
			}
		case "clock":
			if _, err := time.Parse("15:04", v); err != nil {
				return nil, invalidAdminField(field)
			}
		case "uuid", "nullable_uuid":
			if _, err := uuid.Parse(v); err != nil {
				return nil, invalidAdminField(field)
			}
		case "url", "nullable_url":
			if v != "" || kind == "url" {
				parsed, err := url.Parse(v)
				if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
					return nil, invalidAdminField(field)
				}
			}
		case "timestamp":
			t, err := time.Parse(time.RFC3339, v)
			if err != nil {
				return nil, invalidAdminField(field)
			}
			return t, nil
		}
		return v, nil
	case "positive_int", "nullable_positive_int", "nonnegative_int":
		var v int
		if err := json.Unmarshal(raw, &v); err != nil || (kind == "nonnegative_int" && v < 0) || (kind != "nonnegative_int" && v <= 0) {
			return nil, invalidAdminField(field)
		}
		return v, nil
	case "nullable_lat", "nullable_lng", "lat", "lng":
		var v float64
		if err := json.Unmarshal(raw, &v); err != nil || ((kind == "nullable_lat" || kind == "lat") && (v < -90 || v > 90)) || ((kind == "nullable_lng" || kind == "lng") && (v < -180 || v > 180)) {
			return nil, invalidAdminField(field)
		}
		return v, nil
	case "bool":
		var v bool
		if err := json.Unmarshal(raw, &v); err != nil {
			return nil, invalidAdminField(field)
		}
		return v, nil
	case "money", "rate":
		var v decimal.Decimal
		if err := json.Unmarshal(raw, &v); err != nil || (kind == "money" && (v.IsNegative() || v.Exponent() < -2)) || (kind == "rate" && (!v.IsPositive() || v.Exponent() < -12)) {
			return nil, invalidAdminField(field)
		}
		return v, nil
	case "image":
		var v domain.Image
		if string(raw) == "null" || len(raw) == 0 || raw[0] != '{' || decodeStrictAdminJSON(raw, &v) != nil || v.Width < 0 || v.Height < 0 {
			return nil, invalidAdminField(field)
		}
		if v.URL != "" {
			parsed, err := url.Parse(v.URL)
			if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
				return nil, invalidAdminField(field)
			}
		}
		return string(raw), nil
	case "images":
		var v []domain.Image
		if decodeStrictAdminJSON(raw, &v) != nil || v == nil || len(v) > 100 {
			return nil, invalidAdminField(field)
		}
		for _, image := range v {
			if image.Width < 0 || image.Height < 0 {
				return nil, invalidAdminField(field)
			}
			parsed, err := url.Parse(image.URL)
			if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
				return nil, invalidAdminField(field)
			}
		}
		return string(raw), nil
	case "feature_ids":
		var ids []int64
		if decodeStrictAdminJSON(raw, &ids) != nil || ids == nil || len(ids) > 100 {
			return nil, invalidAdminField(field)
		}
		seen := make(map[int64]struct{}, len(ids))
		for _, id := range ids {
			if id <= 0 {
				return nil, invalidAdminField(field)
			}
			if _, ok := seen[id]; ok {
				return nil, invalidAdminField(field)
			}
			seen[id] = struct{}{}
		}
		return ids, nil
	case "attributes":
		var v map[string]string
		if err := json.Unmarshal(raw, &v); err != nil || v == nil || len(v) > 100 {
			return nil, invalidAdminField(field)
		}
		return string(raw), nil
	case "schedule":
		var v []domain.TourScheduleEntry
		if decodeStrictAdminJSON(raw, &v) != nil || len(v) == 0 || len(v) > 100 {
			return nil, invalidAdminField(field)
		}
		for _, entry := range v {
			if entry.Weekday < 1 || entry.Weekday > 7 {
				return nil, invalidAdminField(field)
			}
			if _, err := time.Parse("15:04", entry.Time); err != nil {
				return nil, invalidAdminField(field)
			}
		}
		return string(raw), nil
	}
	return nil, invalidAdminField(field)
}

func (s *AdminService) normalize(kind string, fields map[string]json.RawMessage, create bool) (map[string]any, error) {
	allowed, ok := adminFields[kind]
	if !ok {
		return nil, domain.ErrInvalidInput
	}
	if len(fields) == 0 {
		return nil, fmt.Errorf("empty request: %w", domain.ErrInvalidInput)
	}
	values := make(map[string]any, len(fields)+4)
	for field, raw := range fields {
		fieldKind, ok := allowed[field]
		if !ok || (!create && (field == "code" && kind == "currencies" || kind == "exchange_rates" || field == "listing_id" || field == "unit_id")) {
			return nil, invalidAdminField(field)
		}
		value, err := parseAdminValue(field, fieldKind, raw)
		if err != nil {
			return nil, err
		}
		if (field == "name" && (kind == "countries" || kind == "locations" || kind == "listing_types" || kind == "currencies" || kind == "products") || field == "title" && kind == "listings" || field == "description" && (kind == "listings" || kind == "products")) && value != nil && cyrillicName.MatchString(value.(string)) {
			return nil, invalidAdminField(field)
		}
		values[field] = value
	}
	if create {
		for _, field := range adminRequired[kind] {
			if _, ok := values[field]; !ok {
				return nil, invalidAdminField(field)
			}
		}
		if kind == "listings" && (values["external_source"] == nil) != (values["external_id"] == nil) {
			return nil, invalidAdminField("external_source and external_id")
		}
		if kind == "listings" || kind == "products" {
			if _, ok := values["is_active"]; !ok {
				values["is_active"] = false
			}
		}
		if kind == "products" {
			if _, ok := values["description"]; !ok {
				values["description"] = ""
			}
			if _, ok := values["thumbnail"]; !ok {
				values["thumbnail"] = `{}`
			}
			if _, ok := values["images"]; !ok {
				values["images"] = `[]`
			}
			if _, ok := values["attributes"]; !ok {
				values["attributes"] = `{}`
			}
		}
	}
	if kind == "products" {
		if currency, ok := values["currency"].(string); ok && currency != s.baseCurrency {
			return nil, invalidAdminField("currency")
		}
		if create || values["schedule"] != nil || values["product_type"] != nil {
			productType, _ := values["product_type"].(string)
			if productType != "" && productType != "tour" && values["schedule"] != nil {
				return nil, invalidAdminField("schedule")
			}
		}
	}
	if kind == "exchange_rates" && values["quote_currency"] == s.baseCurrency {
		return nil, invalidAdminField("quote_currency")
	}
	if kind == "currencies" && values["is_active"] == false {
		// The base currency must always remain usable by pricing and profiles.
		if values["code"] == s.baseCurrency {
			return nil, invalidAdminField("is_active")
		}
	}
	return values, nil
}

func (s *AdminService) Get(ctx context.Context, kind, id string) (json.RawMessage, error) {
	return s.repo.Get(ctx, kind, id)
}
func (s *AdminService) List(ctx context.Context, kind string, filters map[string]any, limit, offset int) ([]json.RawMessage, int, error) {
	return s.repo.List(ctx, kind, filters, limit, offset)
}
func (s *AdminService) Create(ctx context.Context, kind string, fields map[string]json.RawMessage) (json.RawMessage, error) {
	values, err := s.normalize(kind, fields, true)
	if err != nil {
		return nil, err
	}
	if kind == "exchange_rates" {
		currency, err := s.repo.Get(ctx, "currencies", values["quote_currency"].(string))
		if err != nil {
			var notFound domain.NotFoundError
			if errors.As(err, &notFound) {
				return nil, invalidAdminField("quote_currency")
			}
			return nil, err
		}
		var active struct {
			IsActive bool `json:"is_active"`
		}
		if err := json.Unmarshal(currency, &active); err != nil {
			return nil, err
		}
		if !active.IsActive {
			return nil, invalidAdminField("quote_currency")
		}
	}
	return s.repo.Create(ctx, kind, values)
}
func (s *AdminService) Update(ctx context.Context, kind, id string, fields map[string]json.RawMessage) (json.RawMessage, error) {
	values, err := s.normalize(kind, fields, false)
	if err != nil {
		return nil, err
	}
	if kind == "currencies" && id == s.baseCurrency && values["is_active"] == false {
		return nil, invalidAdminField("is_active")
	}
	if kind == "countries" {
		current, err := s.repo.Get(ctx, kind, id)
		if err != nil {
			return nil, err
		}
		var country domain.Country
		if err := json.Unmarshal(current, &country); err != nil {
			return nil, err
		}
		if country.Code == "RU" && values["code"] != nil && values["code"] != "RU" {
			return nil, invalidAdminField("code")
		}
	}
	if kind == "products" {
		current, err := s.repo.Get(ctx, kind, id)
		if err != nil {
			return nil, err
		}
		var p domain.Product
		if err := json.Unmarshal(current, &p); err != nil {
			return nil, err
		}
		if v, ok := values["product_type"].(string); ok {
			p.ProductType = v
		}
		if v, ok := values["schedule"].(string); ok {
			if err := json.Unmarshal([]byte(v), &p.Schedule); err != nil {
				return nil, err
			}
		}
		if values["schedule"] == nil {
			if _, ok := values["schedule"]; ok {
				p.Schedule = nil
			}
		}
		if err := p.ValidateSchedule(); err != nil {
			return nil, err
		}
	}
	return s.repo.Update(ctx, kind, id, values)
}
func (s *AdminService) DeleteImage(ctx context.Context, kind, parentID, imageID string) error {
	return s.repo.DeleteImage(ctx, kind, parentID, imageID)
}

func (s *AdminService) CreateStaff(ctx context.Context, email, password string, role domain.Role) (json.RawMessage, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email || len(email) > 255 || len(password) < 8 || len(password) > 72 || (role != domain.RoleAdmin && role != domain.RoleManager && role != domain.RoleHotelier && role != domain.RoleAIRobot) {
		return nil, domain.ErrInvalidInput
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateStaff(ctx, email, string(hash), role)
}
func (s *AdminService) UpdateRole(ctx context.Context, id, actorID string, role domain.Role) (json.RawMessage, error) {
	if role != domain.RoleAdmin && role != domain.RoleManager && role != domain.RoleUser && role != domain.RoleHotelier && role != domain.RoleAIRobot {
		return nil, domain.ErrInvalidInput
	}
	return s.repo.UpdateRole(ctx, id, actorID, role)
}
