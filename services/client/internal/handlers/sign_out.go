package handlers

import (
	"kallisto/infra/utils"
	"net/http"
)

func SignOutHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	utils.ClearAuthCookies(w)
	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusOK)
}
