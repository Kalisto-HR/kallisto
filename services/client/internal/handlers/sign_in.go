package handlers

import (
	"encoding/json"
	"net/http"

	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"
	"kallisto/services/client/internal/usecases/usecases_impl"

	"go.uber.org/zap"
)

func SignInHandler(w http.ResponseWriter, r *http.Request) {
	var (
		signInRequest models.SignInRequest
		log           *zap.Logger = zap.L()
	)

	if err := json.NewDecoder(r.Body).Decode(&signInRequest); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	defer r.Body.Close()

	accessToken, err := usecases_impl.NewSignInUseCase(&signInRequest).SignIn(r.Context())

	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError

		if ok {
			status = handleFuncErr.Status()
		}

		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)

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
}
