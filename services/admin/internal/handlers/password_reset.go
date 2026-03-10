package handlers

import (
	"encoding/json"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/admin/internal/usecases/usecases_impl"
	"net/http"

	"go.uber.org/zap"
)

type adminForgotPasswordRequest struct {
	Email string `json:"email"`
}

type adminResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func AdminForgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	var req adminForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.Email, "email"),
		validation.ValidateEmail(req.Email, "email"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.RequestAdminPasswordReset(r.Context(), req.Email); err != nil {
		log.Error("failed to request admin password reset", zap.Error(err))
	}

	utils.WriteJSONResponseWithMsg(w, "if the account exists, reset instructions have been sent", http.StatusOK)
}

func AdminResetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	var req adminResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.Token, "token"),
		validation.ValidateRequired(req.NewPassword, "new_password"),
		validation.ValidateMinLength(req.NewPassword, "new_password", 8),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.ResetAdminPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}

	utils.WriteJSONResponseWithMsg(w, "password reset successfully", http.StatusOK)
}
