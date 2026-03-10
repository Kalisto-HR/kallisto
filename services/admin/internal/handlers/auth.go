// Authentication handlers for admin service
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	auth "kallisto/infra/auth/jwt"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/admin/internal/models"
	"kallisto/services/admin/internal/usecases/usecases_impl"

	"go.uber.org/zap"
)

func AdminSignInHandler(w http.ResponseWriter, r *http.Request) {
	var (
		req models.AdminSignInRequest
		log = zap.L()
	)

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.Email, "email"),
		validation.ValidateEmail(req.Email, "email"),
		validation.ValidateRequired(req.Password, "password"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	user, err := usecases_impl.AdminSignIn(r.Context(), &req)
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

	claims := auth.Claims{
		UID:       user.Id,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role,
		Iat:       time.Now().Unix(),
	}

	jwtToken, err := auth.NewJWTFromClaims(&claims)
	if err != nil {
		log.Error("failed to create JWT", zap.Error(err))
		utils.WriteJSONResponseWithMsg(w, "failed to create access token", http.StatusInternalServerError)
		return
	}

	if cookieErr := utils.SetAuthCookies(w, jwtToken.TokenString, &claims, user.UniversityLinked, user.Email); cookieErr != nil {
		log.Error(cookieErr.Error())
		utils.WriteJSONResponseWithMsg(w, "failed to issue auth cookie", http.StatusInternalServerError)
		return
	}

	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusOK)
}

func AdminSignOutHandler(w http.ResponseWriter, r *http.Request) {
	utils.ClearAuthCookies(w)
	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusOK)
}

func AdminSignUpHandler(w http.ResponseWriter, r *http.Request) {
	var (
		req models.AdminSignUpRequest
		log = zap.L()
	)

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.Email, "email"),
		validation.ValidateEmail(req.Email, "email"),
		validation.ValidateRequired(req.Password, "password"),
		validation.ValidateMinLength(req.Password, "password", 8),
		validation.ValidateRequired(req.FirstName, "first_name"),
		validation.ValidateRequired(req.LastName, "last_name"),
		validation.ValidateRequired(req.Role, "role"),
		validation.ValidateInList(req.Role, "role", []string{"staff", "partner"}),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	userId, err := usecases_impl.AdminSignUp(r.Context(), &req)
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

	utils.WriteJSONResponse(w, map[string]string{
		"msg": "ok",
		"id":  userId,
	}, http.StatusCreated)
}
