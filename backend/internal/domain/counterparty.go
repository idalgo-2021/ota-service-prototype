package domain

type Counterparty struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	LocationID int    `json:"location_id"`
}
