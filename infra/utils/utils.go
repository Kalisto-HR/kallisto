package utils

import (
	"encoding/json"
	"net/http"
)

func WriteJSONResponseWithMsg(w http.ResponseWriter, msg string, status int) {
	WriteJSONResponse(w, map[string]string{"msg": msg}, status)
}

func WriteJSONResponse(w http.ResponseWriter, body any, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}
