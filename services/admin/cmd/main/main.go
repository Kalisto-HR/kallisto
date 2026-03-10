package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
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
	baseCtx := context.Background()
	router := mux.NewRouter()

	logger.Init()
	defer zap.L().Sync()

	if err := env.LoadEnv(".env"); err != nil {
		zap.L().Warn("could not load .env file", zap.Error(err))
	}

	pool, err := pgxpool.New(baseCtx, os.Getenv("ADMIN_DB_CONNECTION_URL"))
	if err != nil {
		zap.L().Fatal("failed to connect to database", zap.Error(err))
	}
	defer pool.Close()

	clientDBURL := os.Getenv("CLIENT_DB_CONNECTION_URL")
	if clientDBURL == "" {
		clientDBURL = os.Getenv("DB_CONNECTION_URL")
	}
	if clientDBURL == "" {
		zap.L().Fatal("failed to resolve client database connection URL")
	}

	clientPool, err := pgxpool.New(baseCtx, clientDBURL)
	if err != nil {
		zap.L().Fatal("failed to connect to client database", zap.Error(err))
	}
	defer clientPool.Close()

	router.Use(middlewares.CORS())
	router.Use(middlewares.LogRequestEvent(zap.L()))
	router.Use(middlewares.PassPgPoolConn(pool))
	router.Use(middlewares.PassClientPgPoolConn(clientPool))

	router.HandleFunc("/v1.0/signin", handlers.AdminSignInHandler).Methods("POST")
	router.HandleFunc("/v1.0/signout", handlers.AdminSignOutHandler).Methods("GET")
	router.HandleFunc("/v1.0/password/forgot", handlers.AdminForgotPasswordHandler).Methods("POST")
	router.HandleFunc("/v1.0/password/reset", handlers.AdminResetPasswordHandler).Methods("POST")

	router.HandleFunc("/v1.0/applications/receive", handlers.ReceiveApplicationHandler).Methods("POST")

	protected := router.PathPrefix("/v1.0").Subrouter()
	protected.Use(middlewares.RequireAuth(zap.L()))

	protected.HandleFunc("/signup", handlers.AdminSignUpHandler).Methods("POST")

	protected.HandleFunc("/applications", handlers.GetApplicationsHandler).Methods("GET")
	protected.HandleFunc("/applications/{id}", handlers.GetApplicationHandler).Methods("GET")
	protected.HandleFunc("/applications/{id}/files", handlers.ListSubmittedApplicationFilesHandler).Methods("GET")
	protected.HandleFunc("/applications/{id}/files/{fileId}/download", handlers.DownloadSubmittedApplicationFileHandler).Methods("GET")
	protected.HandleFunc("/applications/{id}/review", handlers.ReviewApplicationHandler).Methods("PUT")

	protected.HandleFunc("/universities", handlers.GetUniversitiesHandler).Methods("GET")
	protected.HandleFunc("/universities", handlers.CreateUniversityHandler).Methods("POST")
	protected.HandleFunc("/universities/import", handlers.ImportUniversitiesHandler).Methods("POST")
	protected.HandleFunc("/universities/{id}", handlers.GetUniversityHandler).Methods("GET")
	protected.HandleFunc("/universities/{id}", handlers.UpdateUniversityHandler).Methods("PUT")
	protected.HandleFunc("/universities/{id}", handlers.DeleteUniversityHandler).Methods("DELETE")
	protected.HandleFunc("/universities/{id}/application-structure", handlers.GetUniversityApplicationStructureHandler).Methods("GET")
	protected.HandleFunc("/universities/{id}/application-structure", handlers.UpdateUniversityApplicationStructureHandler).Methods("PUT")
	protected.HandleFunc("/universities/{id}/application-structure/history", handlers.GetApplicationStructureHistoryHandler).Methods("GET")
	protected.HandleFunc("/universities/{id}/application-structure/publish", handlers.PublishApplicationStructureHandler).Methods("POST")
	protected.HandleFunc("/universities/{id}/users", handlers.GetUniversityUsersHandler).Methods("GET")
	protected.HandleFunc("/universities/{id}/users", handlers.CreateUniversityUserHandler).Methods("POST")
	protected.HandleFunc("/universities/{id}/dashboard", handlers.GetUniversityDashboardHandler).Methods("GET")
	protected.HandleFunc("/universities/{id}/staff", handlers.GetUniversityStaffHandler).Methods("GET")
	protected.HandleFunc("/universities/{id}/staff", handlers.CreateUniversityStaffHandler).Methods("POST")
	protected.HandleFunc("/universities/{id}/staff/{staffId}", handlers.UpdateUniversityStaffHandler).Methods("PUT")
	protected.HandleFunc("/universities/{id}/staff/{staffId}/status", handlers.UpdateUniversityStaffStatusHandler).Methods("PUT")
	protected.HandleFunc("/universities/{id}/staff/{staffId}/resend-invite", handlers.ResendUniversityStaffInviteHandler).Methods("POST")
	protected.HandleFunc("/universities/{id}/manager", handlers.AssignManagerHandler).Methods("PUT")

	protected.HandleFunc("/global/overview", handlers.GetGlobalOverviewHandler).Methods("GET")
	protected.HandleFunc("/global/universities", handlers.GetGlobalUniversitiesHandler).Methods("GET")
	protected.HandleFunc("/global/drafts", handlers.GetGlobalDraftsHandler).Methods("GET")
	protected.HandleFunc("/global/drafts/{id}/approve", handlers.ApproveGlobalDraftHandler).Methods("POST")
	protected.HandleFunc("/global/drafts/{id}/reject", handlers.RejectGlobalDraftHandler).Methods("POST")
	protected.HandleFunc("/global/applications", handlers.GetGlobalApplicationsHandler).Methods("GET")
	protected.HandleFunc("/global/users", handlers.GetGlobalUsersHandler).Methods("GET")
	protected.HandleFunc("/global/users/{id}/ban-draft", handlers.CreateBanUserDraftHandler).Methods("POST")
	protected.HandleFunc("/global/service-logs", handlers.GetGlobalServiceLogsHandler).Methods("GET")
	protected.HandleFunc("/global/audit-logs", handlers.GetGlobalAuditLogsHandler).Methods("GET")
	protected.HandleFunc("/global/settings", handlers.GetGlobalSettingsHandler).Methods("GET")
	protected.HandleFunc("/global/settings", handlers.UpdateGlobalSettingsHandler).Methods("PUT")

	srv := &http.Server{
		Handler:      router,
		Addr:         "0.0.0.0:8082",
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	runCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		<-runCtx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			zap.L().Error("admin service graceful shutdown failed", zap.Error(err))
		}
	}()

	zap.L().Info("Admin service starting on port 8082")
	err = srv.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		zap.L().Fatal("admin service failed", zap.Error(err))
	}
}
