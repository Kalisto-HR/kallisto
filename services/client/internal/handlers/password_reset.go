package handlers

import (
	"encoding/json"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/client/internal/usecases/usecases_impl"
	"net/http"

	"go.uber.org/zap"
)

type passwordForgotRequest struct {
	Email string `json:"email"`
}

type passwordResetRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func ForgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	var req passwordForgotRequest
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

	if err := usecases_impl.RequestClientPasswordReset(r.Context(), req.Email); err != nil {
		log.Error("failed to request client password reset", zap.Error(err))
	}

	utils.WriteJSONResponseWithMsg(w, "if the account exists, reset instructions have been sent", http.StatusOK)
}

func ResetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	var req passwordResetRequest
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

	if err := usecases_impl.ResetClientPassword(r.Context(), req.Token, req.NewPassword); err != nil {
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
