package handlers

import (
	"kallisto/infra/utils"
	"net/http"
)

const adminPasswordResetUnavailableMsg = "password reset is currently unavailable"

func AdminForgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
	utils.WriteJSONResponseWithMsg(w, adminPasswordResetUnavailableMsg, http.StatusServiceUnavailable)
}

func AdminResetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	utils.WriteJSONResponseWithMsg(w, adminPasswordResetUnavailableMsg, http.StatusServiceUnavailable)
}
