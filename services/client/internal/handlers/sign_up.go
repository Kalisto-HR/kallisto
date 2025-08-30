package handlers

import (
	"encoding/json"
	"kallisto/services/client/internal/models"
	"kallisto/services/client/internal/usecases/usecases_impl"
	"net/http"
)

func SignUpHandler(w http.ResponseWriter, r *http.Request) {
	var signUpRequest models.SignUpRequest
	next := r.URL.Query().Get("next")

	if next == "" {
		next = "/"
	}

	if err := json.NewDecoder(r.Body).Decode(&signUpRequest); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	defer r.Body.Close()

	accessToken, err := usecases_impl.NewSignUpUseCase(&signUpRequest).SignUp()

	if err != nil {
		w.WriteHeader(http.StatusForbidden)

		json.NewEncoder(w).Encode(map[string]string{"msg": "failed to signup"})
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
