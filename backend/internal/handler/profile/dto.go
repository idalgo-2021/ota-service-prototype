package profile

import (
	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	"time"
)

// UpdateProfileRequest documents editable fields; omitted fields remain unchanged.
// birth_year, gender, nationality and location_id may be null to clear them.
type UpdateProfileRequest struct {
	FirstName         *string                   `json:"first_name"`
	LastName          *string                   `json:"last_name"`
	BirthYear         *int                      `json:"birth_year"`
	Gender            *string                   `json:"gender" enums:"male,female,other"`
	Nationality       *string                   `json:"nationality" maxLength:"100"`
	About             *string                   `json:"about"`
	Language          *string                   `json:"language"`
	Currency          *string                   `json:"currency"`
	CountryID         *int                      `json:"country_id"`
	LocationID        *int                      `json:"location_id"`
	SearchPreferences *domain.SearchPreferences `json:"search_preferences"`
}

// StaffUpdateProfileRequest omits private search settings and account fields.
type StaffUpdateProfileRequest struct {
	FirstName   *string `json:"first_name"`
	LastName    *string `json:"last_name"`
	BirthYear   *int    `json:"birth_year"`
	Gender      *string `json:"gender" enums:"male,female,other"`
	Nationality *string `json:"nationality" maxLength:"100"`
	About       *string `json:"about"`
	Language    *string `json:"language"`
	Currency    *string `json:"currency"`
	CountryID   *int    `json:"country_id"`
	LocationID  *int    `json:"location_id"`
}

// ClientProfileResponse excludes a client's private search settings from staff lists.
type ClientProfileResponse struct {
	UserID      string    `json:"user_id"`
	Email       string    `json:"email"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	BirthYear   *int      `json:"birth_year"`
	Gender      *string   `json:"gender" enums:"male,female,other"`
	Nationality *string   `json:"nationality" maxLength:"100"`
	About       string    `json:"about"`
	Language    string    `json:"language"`
	Currency    string    `json:"currency"`
	CountryID   int       `json:"country_id"`
	LocationID  *int      `json:"location_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func toClientProfileResponse(p domain.Profile) ClientProfileResponse {
	return ClientProfileResponse{
		UserID: p.UserID, Email: p.Email, FirstName: p.FirstName, LastName: p.LastName,
		BirthYear: p.BirthYear, Gender: p.Gender, Nationality: p.Nationality,
		About: p.About, Language: p.Language, Currency: p.Currency,
		CountryID: p.CountryID, LocationID: p.LocationID, CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
	}
}
