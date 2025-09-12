package main

import (
	"kallisto/infra/env"
	"kallisto/infra/logger"
	"kallisto/services/client/internal/handlers"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

func main() {
	router := mux.NewRouter()

	if err := logger.Init(); err != nil {
		log.Fatal(err)
	}

	defer logger.Global.Sync()

	if err := env.LoadEnv("kallisto/.env"); err != nil {
		logger.Global.Fatal("Failed to set env variables")
	}

	// auth
	router.HandleFunc("/v1.0/signin", handlers.SignInHandler).Methods("POST")
	router.HandleFunc("/v1.0/signout", handlers.SignOutHandler).Methods("GET")
	router.HandleFunc("/v1.0/signup", handlers.SignUpHandler).Methods("POST")

	// management
	router.HandleFunc("/v1.0/applications/{application_id}/submit", handlers.NotImplementedHandler).Methods("GET")
	router.HandleFunc("/v1.0/applications/{application_id}/delete", handlers.NotImplementedHandler).Methods("DELETE")
	router.HandleFunc("/v1.0/applications/{application_id}/update", handlers.NotImplementedHandler).Methods("PUT")
	router.HandleFunc("/v1.0/applications/{application_id}", handlers.NotImplementedHandler).Methods("GET")

	// profile
	router.HandleFunc("/v1.0/profile", handlers.NotImplementedHandler).Methods("GET")
	router.HandleFunc("/v1.0/profile/{section}/update", handlers.NotImplementedHandler).Methods("PUT")
	router.HandleFunc("/v1.0/profile/delete", handlers.NotImplementedHandler).Methods("DELETE")

	// universities search
	router.HandleFunc("/v1.0/universities/{university_id}", handlers.NotImplementedHandler).Methods("GET")
	router.HandleFunc("/v1.0/universities/{university_id}/add", handlers.NotImplementedHandler).Methods("POST")
	router.HandleFunc("/v1.0/universities/{university_id}/remove", handlers.NotImplementedHandler).Methods("DELETE")

	srv := &http.Server{
		Handler: router,
		Addr:    "0.0.0.0:8080",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
