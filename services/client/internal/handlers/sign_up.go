package handlers

import (
	"encoding/json"
	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"
	"kallisto/services/client/internal/usecases/usecases_impl"
	"net/http"

	"go.uber.org/zap"
)

func SignUpHandler(w http.ResponseWriter, r *http.Request) {
	var (
		signUpRequest models.SignUpRequest
		next                      = r.URL.Query().Get("next")
		log           *zap.Logger = zap.L()
	)

	if next == "" {
		next = "/"
	}

	if err := json.NewDecoder(r.Body).Decode(&signUpRequest); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	defer r.Body.Close()

	accessToken, err := usecases_impl.NewSignUpUseCase(&signUpRequest).SignUp(r.Context())

	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError

		if ok {
			status = handleFuncErr.Status()
		}

		log.Error(err.Error())
		http.Error(w, err.Error(), status)

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
