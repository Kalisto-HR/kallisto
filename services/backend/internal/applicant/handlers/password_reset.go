package handlers

import (
	"kallisto/infra/utils"
	"net/http"
)

const passwordResetUnavailableMsg = "password reset is currently unavailable"

func ForgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
	utils.WriteJSONResponseWithMsg(w, passwordResetUnavailableMsg, http.StatusServiceUnavailable)
}

func ResetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	utils.WriteJSONResponseWithMsg(w, passwordResetUnavailableMsg, http.StatusServiceUnavailable)
}
