package utils

import (
	"net/http"
	"os"
	"strings"

	auth "kallisto/infra/auth/jwt"
)

const (
	AccessTokenCookieName = "access_token"
	SessionMetaCookieName = "session_meta"
	CSRFCookieName        = "csrf_token"
)

func SetAuthCookies(w http.ResponseWriter, accessToken string, csrfToken string) {
	SetAccessTokenCookie(w, accessToken)
	SetCSRFCookie(w, csrfToken)
}

func SetAccessTokenCookie(w http.ResponseWriter, accessToken string) {
	sameSite := resolveCookieSameSite()
	secure := resolveCookieSecure()
	domain := strings.TrimSpace(os.Getenv("COOKIE_DOMAIN"))
	maxAge := int(auth.EXPIRATION_THRESHOLD)

	http.SetCookie(w, &http.Cookie{
		Name:     AccessTokenCookieName,
		Value:    accessToken,
		Path:     "/",
		Domain:   domain,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		MaxAge:   maxAge,
	})
}

func SetCSRFCookie(w http.ResponseWriter, csrfToken string) {
	sameSite := resolveCookieSameSite()
	secure := resolveCookieSecure()
	domain := strings.TrimSpace(os.Getenv("COOKIE_DOMAIN"))
	maxAge := int(auth.EXPIRATION_THRESHOLD)

	http.SetCookie(w, &http.Cookie{
		Name:     CSRFCookieName,
		Value:    csrfToken,
		Path:     "/",
		Domain:   domain,
		HttpOnly: false,
		Secure:   secure,
		SameSite: sameSite,
		MaxAge:   maxAge,
	})
}

func ClearAuthCookies(w http.ResponseWriter) {
	sameSite := resolveCookieSameSite()
	secure := resolveCookieSecure()
	domain := strings.TrimSpace(os.Getenv("COOKIE_DOMAIN"))

	http.SetCookie(w, &http.Cookie{
		Name:     AccessTokenCookieName,
		Value:    "",
		Path:     "/",
		Domain:   domain,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		MaxAge:   -1,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     SessionMetaCookieName,
		Value:    "",
		Path:     "/",
		Domain:   domain,
		HttpOnly: false,
		Secure:   secure,
		SameSite: sameSite,
		MaxAge:   -1,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     CSRFCookieName,
		Value:    "",
		Path:     "/",
		Domain:   domain,
		HttpOnly: false,
		Secure:   secure,
		SameSite: sameSite,
		MaxAge:   -1,
	})
}

func resolveCookieSecure() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("COOKIE_SECURE")), "true")
}

func resolveCookieSameSite() http.SameSite {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("COOKIE_SAMESITE"))) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}
