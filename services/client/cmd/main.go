package main

import (
	"context"
	"kallisto/infra/env"
	"kallisto/infra/logger"
	"kallisto/infra/middlewares"
	"kallisto/services/client/internal/handlers"
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

	logger.Init()

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
	applicationsRouter := router.PathPrefix("/v1.0/applications").Subrouter()
	applicationsRouter.HandleFunc("/{application_id}/submit", handlers.NotImplementedHandler).Methods("GET")
	applicationsRouter.HandleFunc("/{application_id}/delete", handlers.NotImplementedHandler).Methods("DELETE")
	applicationsRouter.HandleFunc("/{application_id}/update", handlers.NotImplementedHandler).Methods("PUT")
	applicationsRouter.HandleFunc("/{application_id}", handlers.NotImplementedHandler).Methods("GET")

	// profile
	profileRouter := router.PathPrefix("/v1.0/profile").Subrouter()
	profileRouter.HandleFunc("", handlers.NotImplementedHandler).Methods("GET")
	profileRouter.HandleFunc("/{section}/update", handlers.NotImplementedHandler).Methods("PUT")
	profileRouter.HandleFunc("/delete", handlers.NotImplementedHandler).Methods("DELETE")

	// universities search
	universitiesRouter := router.PathPrefix("/v1.0/universities").Subrouter()
	universitiesRouter.HandleFunc("/{university_id}", handlers.NotImplementedHandler).Methods("GET")
	universitiesRouter.HandleFunc("/{university_id}/add", handlers.NotImplementedHandler).Methods("POST")
	universitiesRouter.HandleFunc("/{university_id}/remove", handlers.NotImplementedHandler).Methods("DELETE")

	// registering middlewares
	router.Use(middlewares.LogRequestEvent(zap.L()))
	router.Use(middlewares.PassPgPoolConn(pool))

	applicationsRouter.Use(middlewares.RequireAuth(zap.L()))
	universitiesRouter.Use(middlewares.RequireAuth(zap.L()))
	profileRouter.Use(middlewares.RequireAuth(zap.L()))

	srv := &http.Server{
		Handler: router,
		Addr:    "0.0.0.0:8080",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	zap.L().Fatal(srv.ListenAndServe().Error())
}
