package handlers

import (
	"encoding/json"
	auth "kallisto/infra/auth/jwt"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
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

	errors := validation.Validate(
		validation.ValidateRequired(signUpRequest.Email, "email"),
		validation.ValidateEmail(signUpRequest.Email, "email"),
		validation.ValidateRequired(signUpRequest.Password, "password"),
		validation.ValidateMinLength(signUpRequest.Password, "password", 8),
		validation.ValidateRequired(signUpRequest.FirstName, "first_name"),
		validation.ValidateRequired(signUpRequest.LastName, "last_name"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	accessToken, err := usecases_impl.NewSignUpUseCase(&signUpRequest).SignUp(r.Context())
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

	if cookieErr := utils.SetAuthCookies(w, accessToken, &jwtFromToken.TokenClaims, nil, signUpRequest.Email); cookieErr != nil {
		log.Error(cookieErr.Error())
		utils.WriteJSONResponseWithMsg(w, "failed to issue auth cookie", http.StatusInternalServerError)
		return
	}

	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusOK)
}
