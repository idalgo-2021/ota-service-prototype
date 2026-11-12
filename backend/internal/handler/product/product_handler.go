package product

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/idalgo-2021/product-catalog-backend/internal/middleware"
)

type ProductHandler struct {
	service      ProductService
	defaultLimit int
	maxLimit     int
	logger       *zap.Logger
}

func NewProductHandler(service ProductService, defaultLimit, maxLimit int, logger *zap.Logger) *ProductHandler {
	return &ProductHandler{
		service:      service,
		defaultLimit: defaultLimit,
		maxLimit:     maxLimit,
		logger:       logger,
	}
}

// GetProduct godoc
// @Summary      Get a product by ID
// @Description  Get detailed information about a product by ID, including inactive products.
// @Tags Client: Products
// @Accept       json
// @Produce      json
// @Param        product_id path string true "Product ID"
// @Param        lang query string false "Language (default en)" Enums(en,ru)
// @Success      200  {object}  handler.Response{data=ProductResponse}
// @Failure      404  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Router       /products/{product_id} [get]
func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	h.getProduct(w, r, false, false)
}

// GetAdminProduct godoc
// @Summary      Get a product by ID (staff)
// @Description  Get detailed information about an active or inactive product
// @Tags Admin: Products
// @Produce      json
// @Param        id path string true "Product ID"
// @Success      200 {object} handler.Response{data=ProductResponse}
// @Failure      404 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      500 {object} handler.Response{error=handler.ErrorInfo}
// @Security     BearerAuth
// @Router       /admin/products/{id} [get]
func (h *ProductHandler) GetAdminProduct(w http.ResponseWriter, r *http.Request) {
	h.getProduct(w, r, false, true)
}

func (h *ProductHandler) getProduct(w http.ResponseWriter, r *http.Request, activeOnly, admin bool) {
	lang := "en"
	if !admin {
		var ok bool
		lang, ok = handlers.RequestLanguage(r)
		if !ok {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
			return
		}
	}
	vars := mux.Vars(r)
	id := vars["product_id"]

	product, err := h.service.GetProduct(r.Context(), id, activeOnly)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to get product", err)
		return
	}

	productDTO := toProductResponse(product, lang, admin)

	handlers.Success(w, http.StatusOK, productDTO)
}

func toProductResponse(p *domain.Product, lang string, admin bool) ProductResponse {
	imgs := make([]ImageResponse, 0, len(p.Images))

	for _, item := range p.Images {
		imgs = append(imgs, ImageResponse{
			URL:    item.URL,
			Width:  item.Width,
			Height: item.Height,
		})
	}

	attrs := make(map[string]string, len(p.Attributes))
	for k, v := range p.Attributes {
		attrs[k] = v
	}

	response := ProductResponse{
		ID:               p.ID,
		ProductType:      p.ProductType,
		LocationID:       p.LocationID,
		LocationName:     localizedOptional(p.LocationName, p.LocationNameRU, lang),
		CountryName:      localizedOptional(p.CountryName, p.CountryNameRU, lang),
		CounterpartyID:   p.CounterpartyID,
		CounterpartyName: p.CounterpartyName,
		IsActive:         p.IsActive,
		DeactivatedAt:    p.DeactivatedAt,
		Name:             handlers.LocalizedString(p.Name, p.NameRU, lang),
		Description:      handlers.LocalizedString(p.Description, p.DescriptionRU, lang),
		Price:            p.Price,
		Currency:         p.Currency,
		Thumbnail: ImageResponse{
			URL:    p.Thumbnail.URL,
			Width:  p.Thumbnail.Width,
			Height: p.Thumbnail.Height,
		},
		Images:        imgs,
		Attributes:    attrs,
		Schedule:      p.Schedule,
		AverageRating: p.AverageRating,
		ReviewCount:   p.ReviewCount,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
	}
	if admin {
		response.NameRU = p.NameRU
		response.DescriptionRU = p.DescriptionRU
	}
	return response
}

func localizedOptional(primary, translated *string, lang string) *string {
	if primary == nil {
		return nil
	}
	value := handlers.LocalizedString(*primary, translated, lang)
	return &value
}

type SearchProductsRequest struct {
	// Optional free-text search, up to 200 characters.
	Query string `json:"query,omitempty" maxLength:"200"`
	// Optional positive location ID.
	LocationID *int `json:"location_id,omitempty" minimum:"1"`
	// Optional product category.
	ProductType string `json:"product_type,omitempty" enums:"tour,goods,service"`
	// Optional independent price and rating directions. Price is primary when both are provided.
	Sort domain.SearchSortCriteria `json:"sort,omitempty"`
	// Optional uppercase three-letter currency for displayed prices; defaults to RUB.
	Currency string `json:"currency,omitempty" minLength:"3" maxLength:"3" pattern:"^[A-Z]{3}$"`
	// Optional page size; defaults to the server default and is capped by its configured maximum.
	Limit int `json:"limit,omitempty"`
	// Optional number of results to skip; negative values are treated as zero.
	Offset int `json:"offset,omitempty"`
}

// SearchProducts godoc
// @Summary      Search published products
// @Description  Search active products by free text, optional location and type. Price and rating sorting can be combined; price is primary when both are supplied. Products are newest first when no sort is provided.
// @Tags Client: Products
// @Accept       json
// @Produce      json
// @Param        lang query string false "Language (default en)" Enums(en,ru)
// @Param        input body SearchProductsRequest true "Search parameters"
// @Success      200 {object} handler.Response{data=[]ProductResponse,meta=handler.Meta}
// @Failure      400 {object} handler.Response{error=handler.ErrorInfo}
// @Failure      500 {object} handler.Response{error=handler.ErrorInfo}
// @Router       /products/search [post]
// SearchProducts searches the active catalog without requiring a destination.
func (h *ProductHandler) SearchProducts(w http.ResponseWriter, r *http.Request) {
	lang, ok := handlers.RequestLanguage(r)
	if !ok {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
		return
	}
	var req SearchProductsRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}
	req.Query = strings.TrimSpace(req.Query)
	if len([]rune(req.Query)) > 200 {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "query is too long")
		return
	}
	if req.LocationID != nil && *req.LocationID <= 0 {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "location_id must be positive")
		return
	}
	if req.ProductType != "" && req.ProductType != "tour" && req.ProductType != "goods" && req.ProductType != "service" {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid product_type")
		return
	}
	if req.Sort.Price != "" && req.Sort.Price != "asc" && req.Sort.Price != "desc" {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "sort.price must be asc or desc")
		return
	}
	if req.Sort.Rating != "" && req.Sort.Rating != "asc" && req.Sort.Rating != "desc" {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "sort.rating must be asc or desc")
		return
	}
	sort := domain.Sort{By: "created_at", Order: "desc"}
	if req.Sort.Price != "" {
		sort = domain.Sort{By: "price", Order: req.Sort.Price}
		if req.Sort.Rating != "" {
			sort.ThenBy, sort.ThenOrder = "average_rating", req.Sort.Rating
		}
	} else if req.Sort.Rating != "" {
		sort = domain.Sort{By: "average_rating", Order: req.Sort.Rating}
	}
	if req.Currency == "" {
		req.Currency = "RUB"
	}
	if len(req.Currency) != 3 || strings.ToUpper(req.Currency) != req.Currency {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "currency must be a three-letter uppercase code")
		return
	}
	limit := req.Limit
	if limit <= 0 {
		limit = h.defaultLimit
	}
	if limit > h.maxLimit {
		limit = h.maxLimit
	}
	offset := req.Offset
	if offset < 0 {
		offset = 0
	}
	products, total, err := h.service.ListProducts(r.Context(), limit, offset, domain.ProductFilter{
		LocationID: req.LocationID, ActiveOnly: true, ProductType: req.ProductType,
		Currency: req.Currency, SearchText: req.Query, Sort: sort,
	})
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to search products", err)
		return
	}
	handlers.SuccessWithMeta(w, http.StatusOK, toProductsResponse(products, lang, false), &handlers.Meta{Limit: limit, Offset: offset, Total: total})
}

// ListProducts godoc
// @Summary      List products
// @Description  Get active products. A location_id is required. Clients may explicitly sort only by price; when sort_by is omitted, the default catalog order is preserved. Prices are returned in the requested currency or in the configured base currency when currency is omitted.
// @Tags Client: Products
// @Accept       json
// @Produce      json
// @Param        location_id query int false "Location ID; required for anonymous users and users"
// @Param        lang query string false "Language (default en)" Enums(en,ru)
// @Param        product_type query string false "tour, goods or service"
// @Param        attribute_key query string false "Attribute name"
// @Param        attribute_value query string false "Exact attribute value"
// @Param        currency query string false "Active three-letter currency code for displayed prices; defaults to the base currency; unknown codes return 400"
// @Param        sort query string false "Price sorting: price_asc or price_desc; when omitted, the default catalog order is preserved" Enums(price_asc,price_desc)
// @Param        limit query int false "Maximum results; default and maximum are configured by the server."
// @Param        offset query int false "Number of results to skip; invalid or negative values are treated as zero."
// @Success      200  {object}  handler.Response{data=[]ProductResponse,meta=handler.Meta}
// @Failure      400  {object}  handler.Response{error=handler.ErrorInfo}
// @Failure      500  {object}  handler.Response{error=handler.ErrorInfo}
// @Router       /products [get]
func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	h.listProducts(w, r, false)
}

// ListAdminProducts godoc
// @Summary      List products for staff
// @Description  Get active and inactive products. Prices are returned in the requested currency or in the configured base currency when currency is omitted.
// @Tags Admin: Products
// @Produce      json
// @Param        location_id query int false "Location ID"
// @Param        counterparty_id query string false "Counterparty UUID"
// @Param        product_type query string false "tour, goods or service"
// @Param        attribute_key query string false "Attribute name"
// @Param        attribute_value query string false "Exact attribute value"
// @Param        currency query string false "Active three-letter currency code for displayed prices; defaults to the base currency; unknown codes return 400"
// @Param        sort_by query string false "Sort field: created_at or price (default created_at)" Enums(created_at,price)
// @Param        sort_order query string false "Sort direction: asc or desc (default desc for created_at, asc for price)" Enums(asc,desc)
// @Param        limit query int false "Maximum results; default and maximum are configured by the server."
// @Param        offset query int false "Number of results to skip; invalid or negative values are treated as zero."
// @Success      200 {object} handler.Response{data=[]ProductResponse,meta=handler.Meta}
// @Failure      400 {object} handler.Response{error=handler.ErrorInfo}
// @Security     BearerAuth
// @Router       /admin/products [get]
func (h *ProductHandler) ListAdminProducts(w http.ResponseWriter, r *http.Request) {
	h.listProducts(w, r, true)
}

func (h *ProductHandler) listProducts(w http.ResponseWriter, r *http.Request, admin bool) {
	lang := "en"
	if !admin {
		var ok bool
		lang, ok = handlers.RequestLanguage(r)
		if !ok {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid language")
			return
		}
	}
	limit, offset := handlers.ParsePagination(r, h.defaultLimit, h.maxLimit)
	var sort domain.Sort
	var err error
	if admin {
		sort, err = handlers.ParseSort(r, "created_at", "created_at", "price")
	} else {
		sort, err = parseClientProductSort(r)
	}
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}
	currency := r.URL.Query().Get("currency")
	if currency != "" && (len(currency) != 3 || strings.ToUpper(currency) != currency || strings.ContainsFunc(currency, func(c rune) bool { return c < 'A' || c > 'Z' })) {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "currency must be a three-letter uppercase code")
		return
	}

	locationID, err := parseLocationID(r)
	if err != nil {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "location_id must be a positive integer")
		return
	}
	if locationID == nil && !admin {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "positive location_id is required")
		return
	}
	productType := r.URL.Query().Get("product_type")
	if productType != "" && productType != "tour" && productType != "goods" && productType != "service" {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "invalid product_type")
		return
	}
	key, value := r.URL.Query().Get("attribute_key"), r.URL.Query().Get("attribute_value")
	if (key == "") != (value == "") || len(key) > 100 || len(value) > 500 || strings.TrimSpace(key) != key {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "attribute_key and attribute_value must be provided together")
		return
	}
	var counterpartyID *string
	if admin {
		if raw := r.URL.Query().Get("counterparty_id"); raw != "" {
			id, err := uuid.Parse(raw)
			if err != nil {
				handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "counterparty_id must be a UUID")
				return
			}
			value := id.String()
			counterpartyID = &value
		}
	}
	filter := domain.ProductFilter{
		LocationID:     locationID,
		CounterpartyID: counterpartyID,
		ActiveOnly:     !admin,
		ProductType:    productType,
		AttributeKey:   key,
		AttributeValue: value,
		Currency:       currency,
		Sort:           sort,
	}
	products, total, err := h.service.ListProducts(r.Context(), limit, offset, filter)
	if err != nil {
		handlers.HandleError(w, h.logger, "failed to list products", err)
		return
	}

	productsDTO := toProductsResponse(products, lang, admin)

	handlers.SuccessWithMeta(w, http.StatusOK, productsDTO, &handlers.Meta{
		Limit:  limit,
		Offset: offset,
		Total:  total,
	})
}

func parseClientProductSort(r *http.Request) (domain.Sort, error) {
	if r.URL.Query().Get("sort_by") != "" || r.URL.Query().Get("sort_order") != "" {
		return domain.Sort{}, fmt.Errorf("client product sorting uses sort=price_asc or sort=price_desc")
	}
	switch r.URL.Query().Get("sort") {
	case "":
		return domain.Sort{By: "created_at", Order: "desc"}, nil
	case "price_asc":
		return domain.Sort{By: "price", Order: "asc"}, nil
	case "price_desc":
		return domain.Sort{By: "price", Order: "desc"}, nil
	default:
		return domain.Sort{}, fmt.Errorf("invalid sort; supported values are price_asc and price_desc")
	}
}

func parseLocationID(r *http.Request) (*int, error) {
	raw := r.URL.Query().Get("location_id")
	if raw == "" {
		return nil, nil
	}

	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return nil, domain.ErrInvalidInput
	}
	return &id, nil
}

func toProductsResponse(products []domain.Product, lang string, admin bool) []ProductResponse {
	result := make([]ProductResponse, 0, len(products))

	for i := range products {
		result = append(result, toProductResponse(&products[i], lang, admin))
	}

	return result
}

func isManager(r *http.Request) bool {
	role, ok := middleware.GetUserRole(r.Context())
	return ok && (role == domain.RoleManager || role == domain.RoleAdmin)
}
