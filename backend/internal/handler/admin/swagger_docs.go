package admin

// documentListUsers godoc
// @Summary List user accounts (staff)
// @Description Filter by role (user, manager, admin, hotelier, ai_robot).
// @Tags Admin: Users & Profiles
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Page size"
// @Param offset query int false "Rows to skip"
// @Param role query string false "role" Enums(user,manager,admin,hotelier,ai_robot)
// @Success 200 {object} handler.Response{meta=handler.Meta}
// @Router /admin/users [get]
func documentListUsers() {}

// documentGetListing godoc
// @Summary Get one accommodation listing (staff)
// @Tags Admin: Listings & Units
// @Produce json
// @Security BearerAuth
// @Param id path string true "Listing UUID"
// @Success 200 {object} handler.Response
// @Router /admin/listings/{id} [get]
func documentGetListing() {}

// documentGetCounterparty godoc
// @Summary Get one counterparty (staff)
// @Tags Admin: Counterparties
// @Produce json
// @Security BearerAuth
// @Param id path string true "Counterparty UUID"
// @Success 200 {object} handler.Response
// @Router /admin/counterparties/{id} [get]
func documentGetCounterparty() {}

// documentGetUser godoc
// @Summary Get one user account (staff)
// @Tags Admin: Users & Profiles
// @Produce json
// @Security BearerAuth
// @Param id path string true "User UUID"
// @Success 200 {object} handler.Response
// @Router /admin/users/{id} [get]
func documentGetUser() {}

// documentCreateListing godoc
// @Summary Create an accommodation listing (staff)
// @Description Required fields depend on resource; see ADMIN_API.md.
// @Tags Admin: Listings & Units
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param input body map[string]interface{} true "Listing fields"
// @Success 201 {object} handler.Response
// @Router /admin/listings [post]
func documentCreateListing() {}

// documentCreateProduct godoc
// @Summary Create a product or service (staff)
// @Description Required fields depend on resource; see ADMIN_API.md.
// @Tags Admin: Products
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param input body map[string]interface{} true "Product fields"
// @Success 201 {object} handler.Response
// @Router /admin/products [post]
func documentCreateProduct() {}

// documentCreateCounterparty godoc
// @Summary Create a counterparty (staff)
// @Description Required fields depend on resource; see ADMIN_API.md.
// @Tags Admin: Counterparties
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param input body map[string]interface{} true "Counterparty fields"
// @Success 201 {object} handler.Response
// @Router /admin/counterparties [post]
func documentCreateCounterparty() {}

// documentUpdateListing godoc
// @Summary Partially update an accommodation listing (staff)
// @Description Editable fields depend on resource; see ADMIN_API.md.
// @Tags Admin: Listings & Units
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Listing UUID"
// @Param input body map[string]interface{} true "Fields to update"
// @Success 200 {object} handler.Response
// @Router /admin/listings/{id} [patch]
func documentUpdateListing() {}

// documentUpdateProduct godoc
// @Summary Partially update a product or service (staff)
// @Description Editable fields depend on resource; see ADMIN_API.md.
// @Tags Admin: Products
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Product UUID"
// @Param input body map[string]interface{} true "Fields to update"
// @Success 200 {object} handler.Response
// @Router /admin/products/{id} [patch]
func documentUpdateProduct() {}

// documentUpdateCounterparty godoc
// @Summary Partially update a counterparty (staff)
// @Description Editable fields depend on resource; see ADMIN_API.md.
// @Tags Admin: Counterparties
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Counterparty UUID"
// @Param input body map[string]interface{} true "Fields to update"
// @Success 200 {object} handler.Response
// @Router /admin/counterparties/{id} [patch]
func documentUpdateCounterparty() {}
