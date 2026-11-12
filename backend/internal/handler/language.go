package handler

import (
	"net/http"
	"strings"
)

// RequestLanguage accepts the same explicit language parameter on catalog endpoints.
func RequestLanguage(r *http.Request) (string, bool) {
	values, present := r.URL.Query()["lang"]
	if !present {
		return "en", true
	}
	if len(values) != 1 {
		return "", false
	}
	lang := strings.ToLower(values[0])
	return lang, lang == "en" || lang == "ru"
}

func LocalizedString(english string, russian *string, lang string) string {
	if lang == "ru" && russian != nil && strings.TrimSpace(*russian) != "" {
		return *russian
	}
	return english
}

func LocalizedOptional(english, russian *string, lang string) *string {
	if lang == "ru" && russian != nil && strings.TrimSpace(*russian) != "" {
		return russian
	}
	return english
}
