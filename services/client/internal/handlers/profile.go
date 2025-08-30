package handlers

import (
	"encoding/json"
	"net/http"
)

func NotImplementedHandler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(map[string]string{"msg": "handler not yet implemented"})
}
