// Authentication handlers for admin service
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	auth "kallisto/infra/auth/jwt"
	"kallisto/infra/middlewares"
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

	// Validate input
	errors := validation.Validate(
		validation.ValidateRequired(req.Email, "email"),
		validation.ValidateEmail(req.Email, "email"),
		validation.ValidateRequired(req.Password, "password"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	// Authenticate user
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

	// Generate JWT
	claims := auth.Claims{
		UID:       user.Id,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role,
		Iat:       time.Now().Unix(),
	}

	jwt, err := auth.NewJWTFromClaims(&claims)
	if err != nil {
		log.Error("failed to create JWT", zap.Error(err))
		utils.WriteJSONResponseWithMsg(w, "failed to create access token", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    jwt.TokenString,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // false for local dev, true in production
		SameSite: http.SameSiteLaxMode,
	})

	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusOK)
}

func AdminSignOutHandler(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})

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

	// Validate input
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

	// Create user
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

func GetAdminMeHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := usecases_impl.GetAdminUserById(r.Context(), claims.UID)
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

	utils.WriteJSONResponse(w, map[string]interface{}{
		"id":                claims.UID,
		"first_name":        claims.FirstName,
		"last_name":         claims.LastName,
		"role":              claims.Role,
		"university_linked": user.UniversityLinked,
	}, http.StatusOK)
}
