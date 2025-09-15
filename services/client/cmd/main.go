package main

import (
	"context"
	"kallisto/infra/env"
	"kallisto/infra/logger"
	"kallisto/infra/middlewares"
	"kallisto/services/client/internal/handlers"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

func main() {
	ctx := context.Background()
	router := mux.NewRouter()

	if err := logger.Init(); err != nil {
		log.Fatal(err)
	}

	defer zap.L().Sync()

	if err := env.LoadEnv(".env"); err != nil {
		zap.L().Fatal("Failed to set env variables", zap.String("error", err.Error()))
	}

	pool, err := pgxpool.New(ctx, os.Getenv("DB_CONNECTION_URL"))

	if err != nil {
		zap.L().Fatal(err.Error())
	}

	defer pool.Close()

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

	// connecting to the middleware
	router.Use(middlewares.CtxMiddleware(pool, zap.L()))

	srv := &http.Server{
		Handler: router,
		Addr:    "0.0.0.0:8080",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	zap.L().Fatal(srv.ListenAndServe().Error())
}
