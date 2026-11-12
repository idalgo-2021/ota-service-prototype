package domain

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
)

// Sort describes a validated list order. Handlers only accept known fields and directions.
type Sort struct {
	By        string
	Order     string
	ThenBy    string
	ThenOrder string
}

// SearchSortCriteria provides independent price and rating directions in catalog search.
// When both are provided, price is the primary order and rating breaks ties.
type SearchSortCriteria struct {
	// Price sort direction; asc sorts lower prices first.
	Price string `json:"price,omitempty" enums:"asc,desc"`
	// Rating sort direction; asc sorts lower ratings first.
	Rating string `json:"rating,omitempty" enums:"asc,desc"`
}

// UnmarshalJSON also accepts the former single-value sort strings for older clients.
func (s *SearchSortCriteria) UnmarshalJSON(data []byte) error {
	if len(data) > 0 && data[0] == '"' {
		var legacy string
		if err := json.Unmarshal(data, &legacy); err != nil {
			return err
		}
		parts := strings.Split(legacy, "_")
		if len(parts) != 2 || (parts[1] != "asc" && parts[1] != "desc") {
			return fmt.Errorf("invalid sort")
		}
		switch parts[0] {
		case "price":
			s.Price = parts[1]
		case "rating":
			s.Rating = parts[1]
		default:
			return fmt.Errorf("invalid sort")
		}
		return nil
	}
	type plain SearchSortCriteria
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	var parsed plain
	if err := decoder.Decode(&parsed); err != nil {
		return err
	}
	*s = SearchSortCriteria(parsed)
	return nil
}
