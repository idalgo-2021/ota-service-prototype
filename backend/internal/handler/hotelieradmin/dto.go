package hotelieradmin

type SetListingIDsRequest struct {
	ListingIDs []string `json:"listing_ids"`
}

type CreateMessageRequest struct {
	HotelierID        string  `json:"hotelier_id"`
	ListingID         string  `json:"listing_id"`
	MessageType       string  `json:"message_type"`
	SenderType        string  `json:"sender_type"`
	SenderUserID      *string `json:"sender_user_id"`
	SenderName        *string `json:"sender_name"`
	SenderEmail       *string `json:"sender_email"`
	Source            *string `json:"source"`
	ExternalMessageID *string `json:"external_message_id"`
	MessageText       string  `json:"message_text"`
}
