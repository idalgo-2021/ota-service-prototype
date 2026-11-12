package handler

import (
	"fmt"
	"net/http"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
)

// ParseSort validates the public sort contract before a field reaches SQL.
func ParseSort(r *http.Request, defaultBy string, allowed ...string) (domain.Sort, error) {
	by := r.URL.Query().Get("sort_by")
	if by == "" {
		by = defaultBy
	}
	valid := false
	for _, field := range allowed {
		if by == field {
			valid = true
			break
		}
	}
	if !valid {
		return domain.Sort{}, fmt.Errorf("invalid sort_by")
	}
	order := r.URL.Query().Get("sort_order")
	if order == "" {
		order = "desc"
		if by == "price" || by == "price_per_night" || by == "name" || by == "check_in_date" || by == "check_out_date" {
			order = "asc"
		}
	}
	if order != "asc" && order != "desc" {
		return domain.Sort{}, fmt.Errorf("sort_order must be asc or desc")
	}
	return domain.Sort{By: by, Order: order}, nil
}
