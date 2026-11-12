package domain

type Country struct {
	ID     int     `json:"id"`
	Name   string  `json:"name"`
	NameRU *string `json:"name_ru,omitempty"`
	Code   string  `json:"code"`
}

type Currency struct {
	Code   string  `json:"code"`
	Name   string  `json:"name"`
	NameRU *string `json:"name_ru,omitempty"`
}

type Dictionaries struct {
	Countries    []Country     `json:"countries"`
	Locations    []Location    `json:"locations"`
	ListingTypes []ListingType `json:"listing_types"`
	Currencies   []Currency    `json:"currencies"`
	Features     []FeatureTag  `json:"features"`
}
