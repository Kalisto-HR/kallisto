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
		log           *zap.Logger = zap.L()
	)

	w.Header().Set("Content-Type", "application/json")

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
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		w.WriteHeader(status)

		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusOK)
	w.WriteHeader(http.StatusOK)
}
