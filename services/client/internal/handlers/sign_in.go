package handlers

import (
	"encoding/json"
	auth "kallisto/infra/auth/jwt"
	"net/http"

	"kallisto/infra/utils"
	"kallisto/infra/validation"
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

	errors := validation.Validate(
		validation.ValidateRequired(signInRequest.Email, "email"),
		validation.ValidateEmail(signInRequest.Email, "email"),
		validation.ValidateRequired(signInRequest.Password, "password"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

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

	jwtFromToken, jwtErr := auth.NewJWTFromToken(&accessToken)
	if jwtErr != nil {
		log.Error(jwtErr.Error())
		utils.WriteJSONResponseWithMsg(w, "failed to issue auth cookie", http.StatusInternalServerError)
		return
	}

	if cookieErr := utils.SetAuthCookies(w, accessToken, &jwtFromToken.TokenClaims, nil, signInRequest.Email); cookieErr != nil {
		log.Error(cookieErr.Error())
		utils.WriteJSONResponseWithMsg(w, "failed to issue auth cookie", http.StatusInternalServerError)
		return
	}

	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusOK)
}
