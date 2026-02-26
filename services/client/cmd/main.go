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

	// applications
	applicationsRouter := router.PathPrefix("/v1.0/applications").Subrouter()
	applicationsRouter.HandleFunc("", handlers.GetApplicationsHandler).Methods("GET")
	applicationsRouter.HandleFunc("", handlers.CreateApplicationHandler).Methods("POST")
	applicationsRouter.HandleFunc("/{universityId}/{cycle}", handlers.GetApplicationHandler).Methods("GET")
	applicationsRouter.HandleFunc("/{universityId}/{cycle}", handlers.UpdateApplicationHandler).Methods("PUT")
	applicationsRouter.HandleFunc("/{universityId}/{cycle}/submit", handlers.SubmitApplicationHandler).Methods("POST")
	applicationsRouter.HandleFunc("/{universityId}/{cycle}", handlers.DeleteApplicationHandler).Methods("DELETE")

	// me (lightweight auth check)
	meRouter := router.PathPrefix("/v1.0/me").Subrouter()
	meRouter.HandleFunc("", handlers.GetMeHandler).Methods("GET")

	// profile
	profileRouter := router.PathPrefix("/v1.0/profile").Subrouter()
	profileRouter.HandleFunc("", handlers.GetProfileHandler).Methods("GET")
	profileRouter.HandleFunc("", handlers.UpdateProfileHandler).Methods("PUT")
	profileRouter.HandleFunc("/password", handlers.UpdatePasswordHandler).Methods("PUT")
	profileRouter.HandleFunc("/photo", handlers.UpdateProfilePhotoHandler).Methods("PUT")
	profileRouter.HandleFunc("/photo", handlers.GetProfilePhotoHandler).Methods("GET")
	profileRouter.HandleFunc("", handlers.DeleteProfileHandler).Methods("DELETE")

	// universities (public)
	router.HandleFunc("/v1.0/universities", handlers.GetUniversitiesHandler).Methods("GET")
	router.HandleFunc("/v1.0/universities/search", handlers.SearchUniversitiesHandler).Methods("GET")
	router.HandleFunc("/v1.0/universities/{id}", handlers.GetUniversityHandler).Methods("GET")

	// universities (protected)
	universitiesRouter := router.PathPrefix("/v1.0/universities").Subrouter()
	universitiesRouter.HandleFunc("/{id}/favorite", handlers.IsFavoriteHandler).Methods("GET")
	universitiesRouter.HandleFunc("/{id}/favorite", handlers.AddFavoriteHandler).Methods("POST")
	universitiesRouter.HandleFunc("/{id}/favorite", handlers.RemoveFavoriteHandler).Methods("DELETE")

	// favorites
	favoritesRouter := router.PathPrefix("/v1.0/favorites").Subrouter()
	favoritesRouter.HandleFunc("", handlers.GetFavoritesHandler).Methods("GET")

	// compare
	compareRouter := router.PathPrefix("/v1.0/compare").Subrouter()
	compareRouter.HandleFunc("", handlers.GetCompareHandler).Methods("GET")
	compareRouter.HandleFunc("", handlers.ClearCompareHandler).Methods("DELETE")
	compareRouter.HandleFunc("/{id}", handlers.AddCompareHandler).Methods("POST")
	compareRouter.HandleFunc("/{id}", handlers.RemoveCompareHandler).Methods("DELETE")

	// registering middlewares
	router.Use(middlewares.LogRequestEvent(zap.L()))
	router.Use(middlewares.PassPgPoolConn(pool))

	applicationsRouter.Use(middlewares.RequireAuth(zap.L()))
	universitiesRouter.Use(middlewares.RequireAuth(zap.L()))
	favoritesRouter.Use(middlewares.RequireAuth(zap.L()))
	compareRouter.Use(middlewares.RequireAuth(zap.L()))
	meRouter.Use(middlewares.RequireAuth(zap.L()))
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
