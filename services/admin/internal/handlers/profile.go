package handlers

import (
    "encoding/json"
    "fmt"
    "net/http"
)

func EchoHandler(w http.ResponseWriter, r *http.Request) {
    var data map[string]interface{}

    if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        fmt.Fprintln(w, "Invalid JSON")
        return
    }
    defer r.Body.Close()

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(data)
}
