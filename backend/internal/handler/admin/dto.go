package admin

import "github.com/idalgo-2021/product-catalog-backend/internal/domain"

// CreateStaffRequest represents the payload for creating a staff account.
type CreateStaffRequest struct {
	Email    string      `json:"email"`
	Password string      `json:"password"`
	Role     domain.Role `json:"role"`
}

// UpdateRoleRequest represents the payload for changing an account role.
type UpdateRoleRequest struct {
	Role domain.Role `json:"role"`
}

// ImageRequest represents optional payload for modifying or creating an image.
type ImageRequest struct {
	URL       *string `json:"url,omitempty"`
	SortOrder *int    `json:"sort_order,omitempty"`
}

type unitListingRef struct {
	ListingID string `json:"listing_id"`
}
