package middlewares

import (
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/mux"
)

func CORS() mux.MiddlewareFunc {
	allowedOrigins := parseAllowedOrigins(os.Getenv("CORS_ALLOWED_ORIGINS"))
	allowedHeaders := strings.TrimSpace(os.Getenv("CORS_ALLOWED_HEADERS"))
	if allowedHeaders == "" {
		allowedHeaders = "Content-Type, Authorization, X-Requested-With, X-CSRF-Token"
	}
	allowedMethods := strings.TrimSpace(os.Getenv("CORS_ALLOWED_METHODS"))
	if allowedMethods == "" {
		allowedMethods = "GET, POST, PUT, DELETE, OPTIONS"
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := strings.TrimSpace(r.Header.Get("Origin"))
			if origin != "" && originAllowed(origin, allowedOrigins) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)
				w.Header().Set("Access-Control-Allow-Methods", allowedMethods)
				w.Header().Set("Vary", "Origin")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func parseAllowedOrigins(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{"http://localhost:5173", "http://127.0.0.1:5173"}
	}

	parts := strings.Split(raw, ",")
	res := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		res = append(res, trimmed)
	}
	return res
}

func originAllowed(origin string, allowedOrigins []string) bool {
	for _, candidate := range allowedOrigins {
		if candidate == "*" || strings.EqualFold(candidate, origin) {
			return true
		}
	}
	return false
}
