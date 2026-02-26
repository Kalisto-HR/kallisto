package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"kallisto/infra/env"
	"kallisto/infra/logger"
	"kallisto/infra/middlewares"
	"kallisto/services/admin/internal/handlers"

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
		zap.L().Warn("could not load .env file", zap.Error(err))
	}

	pool, err := pgxpool.New(ctx, os.Getenv("ADMIN_DB_CONNECTION_URL"))
	if err != nil {
		zap.L().Fatal("failed to connect to database", zap.Error(err))
	}
	defer pool.Close()

	// Apply global middlewares
	router.Use(middlewares.LogRequestEvent(zap.L()))
	router.Use(middlewares.PassPgPoolConn(pool))

	// Auth routes (public)
	router.HandleFunc("/v1.0/signin", handlers.AdminSignInHandler).Methods("POST")
	router.HandleFunc("/v1.0/signout", handlers.AdminSignOutHandler).Methods("GET")

	// Receive application from client service (service-to-service, no auth required)
	router.HandleFunc("/v1.0/applications/receive", handlers.ReceiveApplicationHandler).Methods("POST")

	// Protected routes subrouter
	protected := router.PathPrefix("/v1.0").Subrouter()
	protected.Use(middlewares.RequireAuth(zap.L()))

	// Auth - protected (only existing admins can create new admin accounts)
	protected.HandleFunc("/signup", handlers.AdminSignUpHandler).Methods("POST")
	protected.HandleFunc("/me", handlers.GetAdminMeHandler).Methods("GET")

	// Applications
	protected.HandleFunc("/applications", handlers.GetApplicationsHandler).Methods("GET")
	protected.HandleFunc("/applications/{id}", handlers.GetApplicationHandler).Methods("GET")
	protected.HandleFunc("/applications/{id}/review", handlers.ReviewApplicationHandler).Methods("PUT")

	// Universities
	protected.HandleFunc("/universities", handlers.GetUniversitiesHandler).Methods("GET")
	protected.HandleFunc("/universities", handlers.CreateUniversityHandler).Methods("POST")
	protected.HandleFunc("/universities/import", handlers.ImportUniversitiesHandler).Methods("POST")
	protected.HandleFunc("/universities/{id}", handlers.GetUniversityHandler).Methods("GET")
	protected.HandleFunc("/universities/{id}", handlers.UpdateUniversityHandler).Methods("PUT")
	protected.HandleFunc("/universities/{id}", handlers.DeleteUniversityHandler).Methods("DELETE")
	protected.HandleFunc("/universities/{id}/application-structure", handlers.GetUniversityApplicationStructureHandler).Methods("GET")
	protected.HandleFunc("/universities/{id}/application-structure", handlers.UpdateUniversityApplicationStructureHandler).Methods("PUT")
	protected.HandleFunc("/universities/{id}/users", handlers.GetUniversityUsersHandler).Methods("GET")
	protected.HandleFunc("/universities/{id}/users", handlers.CreateUniversityUserHandler).Methods("POST")
	protected.HandleFunc("/universities/{id}/manager", handlers.AssignManagerHandler).Methods("PUT")

	srv := &http.Server{
		Handler:      router,
		Addr:         "0.0.0.0:8082",
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	zap.L().Info("Admin service starting on port 8082")
	zap.L().Fatal(srv.ListenAndServe().Error())
}
