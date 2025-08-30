package main

import (
	"kallisto/infra/env"
	"kallisto/services/admin/internal/handlers"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

func main() {
	router := mux.NewRouter()

	err := env.LoadEnv("kallisto/.env")

	if err != nil {
		//FUTURE LOG
	}

	// auth
	router.HandleFunc("/v1.0/signin", handlers.NotImplementedHandler).Methods("POST")
	router.HandleFunc("/v1.0/signout", handlers.NotImplementedHandler).Methods("GET")

	// management
	router.HandleFunc("/v1.0/generate-account", handlers.NotImplementedHandler).Methods("POST")
	router.HandleFunc("/v1.0/blacklist", handlers.NotImplementedHandler).Methods("POST")
	router.HandleFunc("/v1.0/applicants", handlers.NotImplementedHandler).Methods("GET")

	// profile
	router.HandleFunc("/v1.0/profile", handlers.NotImplementedHandler).Methods("GET")
	router.HandleFunc("/v1.0/profile/update", handlers.NotImplementedHandler).Methods("PUT")
	router.HandleFunc("/v1.0/profile/delete", handlers.NotImplementedHandler).Methods("DELETE")

	// drafts
	router.HandleFunc("/v1.0/drafts", handlers.NotImplementedHandler).Methods("GET")
	router.HandleFunc("/v1.0/drafts/approve", handlers.NotImplementedHandler).Methods("POST")
	router.HandleFunc("/v1.0/drafts/disapprove", handlers.NotImplementedHandler).Methods("POST")
	router.HandleFunc("/v1.0/drafts/delete", handlers.NotImplementedHandler).Methods("DELETE")

	srv := &http.Server{
		Handler: router,
		Addr:    "0.0.0.0:8080",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
