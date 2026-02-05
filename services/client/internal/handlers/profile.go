// profile.go implements HTTP handlers for user profile operations.
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/client/internal/models"
	"kallisto/services/client/internal/usecases/usecases_impl"

	"go.uber.org/zap"
)

func NotImplementedHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(map[string]string{"msg": "handler not yet implemented"})
}

func GetProfileHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	profile, err := usecases_impl.GetUserById(r.Context(), claims.UID)
	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, status)
		return
	}

	resp := utils.NewApiResponse(true, profile, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	var req models.ProfileUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "malformed json request body")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var validationErrors []*validation.ValidationError
	if req.FirstName != nil {
		if err := validation.ValidateMinLength(*req.FirstName, "first_name", 1); err != nil {
			validationErrors = append(validationErrors, err)
		}
	}
	if req.LastName != nil {
		if err := validation.ValidateMinLength(*req.LastName, "last_name", 1); err != nil {
			validationErrors = append(validationErrors, err)
		}
	}
	if len(validationErrors) > 0 {
		validation.WriteValidationErrors(w, validationErrors)
		return
	}

	if err := usecases_impl.UpdateUserProfile(r.Context(), claims.UID, &req); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, status)
		return
	}

	resp := utils.NewApiResponse[any](true, nil, "profile updated successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func DeleteProfileHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	if err := usecases_impl.DeleteUser(r.Context(), claims.UID); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, status)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})

	resp := utils.NewApiResponse[any](true, nil, "account deleted successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func GetMeHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	me := models.MeResponse{
		Id:        claims.UID,
		FirstName: claims.FirstName,
		LastName:  claims.LastName,
		Role:      claims.Role,
	}

	resp := utils.NewApiResponse(true, me, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}
