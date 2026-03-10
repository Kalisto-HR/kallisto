package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	auth "kallisto/infra/auth/jwt"
	"net/http"
	"os"
	"strings"
)

const (
	AccessTokenCookieName = "access_token"
	SessionMetaCookieName = "session_meta"
)

type SessionMeta struct {
	UID              string  `json:"uid"`
	Email            string  `json:"email,omitempty"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	Role             string  `json:"role"`
	Area             string  `json:"area"`
	UniversityLinked *string `json:"university_linked,omitempty"`
}

func AreaForRole(role string) string {
	switch role {
	case "staff", "partner", "superuser-ui":
		return "management"
	default:
		return "student"
	}
}

func SetAuthCookies(w http.ResponseWriter, accessToken string, claims *auth.Claims, linkedUniversity *string, email string) error {
	meta := SessionMeta{
		UID:              claims.UID,
		Email:            email,
		FirstName:        claims.FirstName,
		LastName:         claims.LastName,
		Role:             claims.Role,
		Area:             AreaForRole(claims.Role),
		UniversityLinked: linkedUniversity,
	}

	encodedMeta, err := encodeSessionMeta(&meta)
	if err != nil {
		return err
	}

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

	http.SetCookie(w, &http.Cookie{
		Name:     SessionMetaCookieName,
		Value:    encodedMeta,
		Path:     "/",
		Domain:   domain,
		HttpOnly: false,
		Secure:   secure,
		SameSite: sameSite,
		MaxAge:   maxAge,
	})

	return nil
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
}

func encodeSessionMeta(meta *SessionMeta) (string, error) {
	payload, err := json.Marshal(meta)
	if err != nil {
		return "", err
	}

	payloadBase64 := base64.RawURLEncoding.EncodeToString(payload)
	signature := signSessionMeta(payloadBase64)
	return payloadBase64 + "." + signature, nil
}

func signSessionMeta(payload string) string {
	h := hmac.New(sha256.New, []byte(os.Getenv("SECRET_KEY")))
	h.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
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
