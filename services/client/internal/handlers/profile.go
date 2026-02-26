// profile.go implements HTTP handlers for user profile operations.
package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/client/internal/models"
	"kallisto/services/client/internal/usecases/usecases_impl"

	"go.uber.org/zap"
)

const maxProfilePhotoBytes int64 = 2 * 1024 * 1024
const maxPhotoUploadRequestBytes int64 = 10 * 1024 * 1024

var allowedPhotoContentTypes = map[string]struct{}{
	"image/png":  {},
	"image/jpeg": {},
	"image/webp": {},
}

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
	if req.Data != nil {
		var data map[string]any
		if err := json.Unmarshal(req.Data, &data); err != nil || data == nil {
			validationErrors = append(validationErrors, &validation.ValidationError{
				Field:   "data",
				Message: "must be a valid JSON object",
			})
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

func UpdatePasswordHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	var req models.ProfilePasswordUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "malformed json request body")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.CurrentPassword, "current_password"),
		validation.ValidateRequired(req.NewPassword, "new_password"),
		validation.ValidateMinLength(req.NewPassword, "new_password", 8),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if req.CurrentPassword == req.NewPassword {
		validation.WriteValidationErrors(w, []*validation.ValidationError{
			{
				Field:   "new_password",
				Message: "must be different from current_password",
			},
		})
		return
	}

	if err := usecases_impl.ChangeUserPassword(r.Context(), claims.UID, req.CurrentPassword, req.NewPassword); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "password updated successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func UpdateProfilePhotoHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxPhotoUploadRequestBytes)
	if err := r.ParseMultipartForm(maxPhotoUploadRequestBytes); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "invalid multipart request or file is too large")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("photo")
	if err != nil {
		resp := utils.NewApiResponse[any](false, nil, "photo field is required")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, maxProfilePhotoBytes+1))
	if err != nil {
		resp := utils.NewApiResponse[any](false, nil, "failed to read uploaded photo")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	if len(content) == 0 {
		resp := utils.NewApiResponse[any](false, nil, "photo file is empty")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	if int64(len(content)) > maxProfilePhotoBytes {
		resp := utils.NewApiResponse[any](false, nil, "photo file exceeds 2MB limit")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	contentType := http.DetectContentType(content)
	if _, ok := allowedPhotoContentTypes[contentType]; !ok {
		resp := utils.NewApiResponse[any](false, nil, "unsupported image type; allowed types: png, jpeg, webp")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	if err := usecases_impl.UpdateUserPhoto(r.Context(), claims.UID, content); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "profile photo updated successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func GetProfilePhotoHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	photo, err := usecases_impl.GetUserPhoto(r.Context(), claims.UID)
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

	w.Header().Set("Content-Type", http.DetectContentType(photo))
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(photo); err != nil {
		log.Error(err.Error())
	}
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
