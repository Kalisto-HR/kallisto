package main

import (
	"context"
	"errors"
	"kallisto/infra/env"
	"kallisto/infra/logger"
	"kallisto/infra/middlewares"
	"kallisto/services/client/internal/handlers"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

func main() {
	baseCtx := context.Background()
	router := mux.NewRouter()

	logger.Init()
	defer zap.L().Sync()

	if err := env.LoadEnv(".env"); err != nil {
		zap.L().Fatal("Failed to set env variables", zap.String("error", err.Error()))
	}

	pool, err := pgxpool.New(baseCtx, os.Getenv("DB_CONNECTION_URL"))
	if err != nil {
		zap.L().Fatal(err.Error())
	}
	defer pool.Close()

	router.HandleFunc("/v1.0/signin", handlers.SignInHandler).Methods("POST")
	router.HandleFunc("/v1.0/signout", handlers.SignOutHandler).Methods("GET")
	router.HandleFunc("/v1.0/signup", handlers.SignUpHandler).Methods("POST")
	router.HandleFunc("/v1.0/password/forgot", handlers.ForgotPasswordHandler).Methods("POST")
	router.HandleFunc("/v1.0/password/reset", handlers.ResetPasswordHandler).Methods("POST")

	applicationsRouter := router.PathPrefix("/v1.0/applications").Subrouter()
	applicationsRouter.HandleFunc("", handlers.GetApplicationsHandler).Methods("GET")
	applicationsRouter.HandleFunc("", handlers.CreateApplicationHandler).Methods("POST")
	applicationsRouter.HandleFunc("/{universityId}/{cycle}", handlers.GetApplicationHandler).Methods("GET")
	applicationsRouter.HandleFunc("/{universityId}/{cycle}", handlers.UpdateApplicationHandler).Methods("PUT")
	applicationsRouter.HandleFunc("/{universityId}/{cycle}/import-test-scores", handlers.ImportApplicationTestScoresHandler).Methods("POST")
	applicationsRouter.HandleFunc("/{universityId}/{cycle}/submit", handlers.SubmitApplicationHandler).Methods("POST")
	applicationsRouter.HandleFunc("/{universityId}/{cycle}", handlers.DeleteApplicationHandler).Methods("DELETE")

	applicationFilesRouter := router.PathPrefix("/v1.0/application-files").Subrouter()
	applicationFilesRouter.HandleFunc("/upload", handlers.UploadApplicationFilesHandler).Methods("POST")
	applicationFilesRouter.HandleFunc("/{fileId}/download", handlers.DownloadApplicationFileHandler).Methods("GET")

	profileRouter := router.PathPrefix("/v1.0/profile").Subrouter()
	profileRouter.HandleFunc("", handlers.GetProfileHandler).Methods("GET")
	profileRouter.HandleFunc("", handlers.UpdateProfileHandler).Methods("PUT")
	profileRouter.HandleFunc("/password", handlers.UpdatePasswordHandler).Methods("PUT")
	profileRouter.HandleFunc("/photo", handlers.UpdateProfilePhotoHandler).Methods("PUT")
	profileRouter.HandleFunc("/photo", handlers.GetProfilePhotoHandler).Methods("GET")
	profileRouter.HandleFunc("/test-scores", handlers.GetProfileTestScoresHandler).Methods("GET")
	profileRouter.HandleFunc("/test-scores", handlers.CreateProfileTestScoreHandler).Methods("POST")
	profileRouter.HandleFunc("/test-scores/{id}", handlers.UpdateProfileTestScoreHandler).Methods("PUT")
	profileRouter.HandleFunc("/test-scores/{id}", handlers.DeleteProfileTestScoreHandler).Methods("DELETE")
	profileRouter.HandleFunc("", handlers.DeleteProfileHandler).Methods("DELETE")

	router.HandleFunc("/v1.0/universities", handlers.GetUniversitiesHandler).Methods("GET")
	router.HandleFunc("/v1.0/universities/search", handlers.SearchUniversitiesHandler).Methods("GET")
	router.HandleFunc("/v1.0/universities/{id}", handlers.GetUniversityHandler).Methods("GET")

	universitiesRouter := router.PathPrefix("/v1.0/universities").Subrouter()
	universitiesRouter.HandleFunc("/{id}/favorite", handlers.IsFavoriteHandler).Methods("GET")
	universitiesRouter.HandleFunc("/{id}/favorite", handlers.AddFavoriteHandler).Methods("POST")
	universitiesRouter.HandleFunc("/{id}/favorite", handlers.RemoveFavoriteHandler).Methods("DELETE")

	favoritesRouter := router.PathPrefix("/v1.0/favorites").Subrouter()
	favoritesRouter.HandleFunc("", handlers.GetFavoritesHandler).Methods("GET")

	compareRouter := router.PathPrefix("/v1.0/compare").Subrouter()
	compareRouter.HandleFunc("", handlers.GetCompareHandler).Methods("GET")
	compareRouter.HandleFunc("", handlers.ClearCompareHandler).Methods("DELETE")
	compareRouter.HandleFunc("/{id}", handlers.AddCompareHandler).Methods("POST")
	compareRouter.HandleFunc("/{id}", handlers.RemoveCompareHandler).Methods("DELETE")

	basketRouter := router.PathPrefix("/v1.0/basket").Subrouter()
	basketRouter.HandleFunc("", handlers.GetBasketHandler).Methods("GET")
	basketRouter.HandleFunc("", handlers.ClearBasketHandler).Methods("DELETE")
	basketRouter.HandleFunc("/plans", handlers.GetBasketPlansHandler).Methods("GET")
	basketRouter.HandleFunc("/plan", handlers.UpdateBasketPlanHandler).Methods("PUT")
	basketRouter.HandleFunc("/checkout-preview", handlers.BasketCheckoutPreviewHandler).Methods("POST")
	basketRouter.HandleFunc("/{id}", handlers.AddBasketItemHandler).Methods("POST")
	basketRouter.HandleFunc("/{id}", handlers.RemoveBasketItemHandler).Methods("DELETE")

	router.Use(middlewares.CORS())
	router.Use(middlewares.LogRequestEvent(zap.L()))
	router.Use(middlewares.PassPgPoolConn(pool))

	applicationsRouter.Use(middlewares.RequireAuth(zap.L()))
	universitiesRouter.Use(middlewares.RequireAuth(zap.L()))
	favoritesRouter.Use(middlewares.RequireAuth(zap.L()))
	compareRouter.Use(middlewares.RequireAuth(zap.L()))
	basketRouter.Use(middlewares.RequireAuth(zap.L()))
	profileRouter.Use(middlewares.RequireAuth(zap.L()))
	applicationFilesRouter.Use(middlewares.RequireAuth(zap.L()))

	srv := &http.Server{
		Handler:      router,
		Addr:         "0.0.0.0:8081",
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	zap.L().Info("Client service starting on port 8081")

	runCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		<-runCtx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			zap.L().Error("client service graceful shutdown failed", zap.Error(err))
		}
	}()

	err = srv.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		zap.L().Fatal("client service failed", zap.Error(err))
	}
}
