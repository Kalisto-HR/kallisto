package handlers

import (
	"encoding/json"
	"net/http"

	"kallisto/services/admin/internal/models"
	"kallisto/services/admin/internal/usecases/usecases_impl"
)

func SignInHandler(w http.ResponseWriter, r *http.Request) {
	var signInRequest models.SignInRequest
	next := r.URL.Query().Get("next")

	if next == "" {
		next = "/"
	}

	if err := json.NewDecoder(r.Body).Decode(&signInRequest); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	defer r.Body.Close()

	accessToken, err := usecases_impl.NewSignInUseCase(&signInRequest).SignIn()

	if err != nil {
		w.WriteHeader(http.StatusForbidden)

		json.NewEncoder(w).Encode(map[string]string{"msg": "failed to sign in, invalid credentials"})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    accessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	http.Redirect(w, r, next, http.StatusFound)
	w.Header().Set("Content-Type", "application/json")
}
