package main

import (
    "fmt"
    "net/http"
    "kallisto/services/admin/internal/handlers"
)


func main() {
    // auth
    http.HandleFunc("/v1.0/login", handlers.EchoHandler)
    http.HandleFunc("/v1.0/logout", handlers.EchoHandler)
    
    // management
    http.HandleFunc("/v1.0/generate-account", handlers.EchoHandler)
    http.HandleFunc("/v1.0/blacklist", handlers.EchoHandler)
    http.HandleFunc("/v1.0/applicants", handlers.EchoHandler)

    
    // profile
    http.HandleFunc("/v1.0/profile", handlers.EchoHandler)
    http.HandleFunc("/v1.0/profile/update", handlers.EchoHandler)
    http.HandleFunc("/v1.0/profile/delete", handlers.EchoHandler)
    
    // drafts
    http.HandleFunc("/v1.0/drafts", handlers.EchoHandler)
    http.HandleFunc("/v1.0/drafts/approve", handlers.EchoHandler)
    http.HandleFunc("/v1.0/drafts/disapprove", handlers.EchoHandler)
    http.HandleFunc("/v1.0/drafts/delete", handlers.EchoHandler)


    fmt.Println("Server listening on 0.0.0.0:8080")
    if err := http.ListenAndServe("0.0.0.0:8080", nil); err != nil {
        panic(err)
    }
}
