package dictionary

type CountryResponse struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}

type LocationResponse struct {
	ID              int      `json:"id"`
	CountryID       int      `json:"country_id"`
	Name            string   `json:"name"`
	NameRU          *string  `json:"name_ru"`
	CenterLatitude  *float64 `json:"center_latitude"`
	CenterLongitude *float64 `json:"center_longitude"`
}

type ListingTypeResponse struct {
	ID   int    `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type CurrencyResponse struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type FeatureTagResponse struct {
	ID     int64  `json:"id"`
	Slug   string `json:"slug"`
	Name   string `json:"name"`
	NameRU string `json:"name_ru"`
}

type DictionariesResponse struct {
	Countries    []CountryResponse     `json:"countries"`
	Locations    []LocationResponse    `json:"locations"`
	ListingTypes []ListingTypeResponse `json:"listing_types"`
	Currencies   []CurrencyResponse    `json:"currencies"`
	Features     []FeatureTagResponse  `json:"features"`
}
