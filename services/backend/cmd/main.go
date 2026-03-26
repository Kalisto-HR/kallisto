package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	authsession "kallisto/infra/auth/session"
	"kallisto/infra/authz"
	"kallisto/infra/env"
	"kallisto/infra/logger"
	"kallisto/infra/middlewares"
	"kallisto/infra/observability"
	"kallisto/infra/utils"
	adminHandlers "kallisto/services/admin/api"
	backendHandlers "kallisto/services/backend/internal/handlers"
	clientHandlers "kallisto/services/client/api"

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
	if err := env.ValidateRuntimeConfig(); err != nil {
		zap.L().Fatal("invalid runtime configuration", zap.Error(err))
	}

	applicantDBURL := strings.TrimSpace(os.Getenv("DB_CONNECTION_URL"))
	if applicantDBURL == "" {
		zap.L().Fatal("failed to resolve applicant database connection URL")
	}

	adminDBURL := strings.TrimSpace(os.Getenv("ADMIN_DB_CONNECTION_URL"))
	if adminDBURL == "" {
		zap.L().Fatal("failed to resolve admin database connection URL")
	}

	applicantPool, err := pgxpool.New(baseCtx, applicantDBURL)
	if err != nil {
		zap.L().Fatal("failed to connect to applicant database", zap.Error(err))
	}
	defer applicantPool.Close()

	adminPool, err := pgxpool.New(baseCtx, adminDBURL)
	if err != nil {
		zap.L().Fatal("failed to connect to admin database", zap.Error(err))
	}
	defer adminPool.Close()

	authHandler := backendHandlers.NewAuthHandler(applicantPool, adminPool)
	sessionStore := authsession.NewStore(adminPool)
	serviceLogger := observability.NewAsyncServiceLogger(adminPool, zap.L())
	defer serviceLogger.Close(context.Background())
	auditLogger := observability.NewAuditLogger(adminPool, zap.L())

	router.Use(middlewares.CORS())

	authRouter := router.PathPrefix("/v1.0/auth").Subrouter()
	authRouter.Use(middlewares.ObserveManagedRequests(zap.L(), serviceLogger, "auth"))
	authRouter.HandleFunc("/sign-in", authHandler.SignIn).Methods(http.MethodPost)
	authRouter.HandleFunc("/sign-up", authHandler.SignUp).Methods(http.MethodPost)
	authRouter.HandleFunc("/password/forgot", clientHandlers.ForgotPasswordHandler).Methods(http.MethodPost)
	authRouter.HandleFunc("/password/reset", clientHandlers.ResetPasswordHandler).Methods(http.MethodPost)
	authProtectedRouter := authRouter.NewRoute().Subrouter()
	authProtectedRouter.Use(middlewares.RequireAuth(zap.L(), sessionStore, auditLogger))
	authProtectedRouter.Use(middlewares.RequireCSRF(zap.L(), auditLogger))
	authProtectedRouter.HandleFunc("/session", authHandler.GetSession).Methods(http.MethodGet)
	authProtectedRouter.HandleFunc("/sign-out", authHandler.SignOut).Methods(http.MethodPost)

	applicantRouter := router.PathPrefix("/v1.0/applicant").Subrouter()
	applicantRouter.Use(middlewares.PassPgPoolConn(applicantPool))
	applicantRouter.Use(middlewares.PassClientPgPoolConn(adminPool))
	applicantRouter.Use(middlewares.RequireAuth(zap.L(), sessionStore, nil))
	applicantRouter.Use(middlewares.RequireCSRF(zap.L(), nil))
	applicantRouter.Use(middlewares.RequirePermissions(zap.L(), nil, authz.PermissionsForRole(authz.RoleApplicant)...))
	registerApplicantRoutes(applicantRouter)

	partnerRouter := router.PathPrefix("/v1.0/partner").Subrouter()
	partnerRouter.Use(middlewares.ObserveManagedRequests(zap.L(), serviceLogger, "partner"))
	partnerRouter.Use(middlewares.PassPgPoolConn(adminPool))
	partnerRouter.Use(middlewares.PassClientPgPoolConn(applicantPool))
	partnerRouter.Use(middlewares.RequireAuth(zap.L(), sessionStore, auditLogger))
	partnerRouter.Use(middlewares.RequireCSRF(zap.L(), auditLogger))
	partnerRouter.Use(middlewares.RequirePermissions(zap.L(), auditLogger, authz.PermissionsForRole(authz.RolePartner)...))
	registerPartnerRoutes(partnerRouter)

	staffRouter := router.PathPrefix("/v1.0/staff").Subrouter()
	staffRouter.Use(middlewares.ObserveManagedRequests(zap.L(), serviceLogger, "staff"))
	staffRouter.Use(middlewares.PassPgPoolConn(adminPool))
	staffRouter.Use(middlewares.PassClientPgPoolConn(applicantPool))
	staffRouter.Use(middlewares.RequireAuth(zap.L(), sessionStore, auditLogger))
	staffRouter.Use(middlewares.RequireCSRF(zap.L(), auditLogger))
	staffRouter.Use(middlewares.RequirePermissions(zap.L(), auditLogger, authz.PermissionsForRole(authz.RoleStaff)...))
	registerStaffRoutes(staffRouter, authHandler)

	srv := &http.Server{
		Handler:      router,
		Addr:         "0.0.0.0:8081",
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
			zap.L().Error("backend graceful shutdown failed", zap.Error(err))
		}
	}()

	zap.L().Info("Monolith backend starting on port 8081")
	err = srv.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		zap.L().Fatal("backend service failed", zap.Error(err))
	}
}

func registerApplicantRoutes(router *mux.Router) {
	router.HandleFunc("/universities", clientHandlers.GetUniversitiesHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/search", clientHandlers.SearchUniversitiesHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}", clientHandlers.GetUniversityHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/favorite", clientHandlers.IsFavoriteHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/favorite", clientHandlers.AddFavoriteHandler).Methods(http.MethodPost)
	router.HandleFunc("/universities/{id}/favorite", clientHandlers.RemoveFavoriteHandler).Methods(http.MethodDelete)

	router.HandleFunc("/favorites", clientHandlers.GetFavoritesHandler).Methods(http.MethodGet)

	router.HandleFunc("/compare", clientHandlers.GetCompareHandler).Methods(http.MethodGet)
	router.HandleFunc("/compare", clientHandlers.ClearCompareHandler).Methods(http.MethodDelete)
	router.HandleFunc("/compare/{id}", clientHandlers.AddCompareHandler).Methods(http.MethodPost)
	router.HandleFunc("/compare/{id}", clientHandlers.RemoveCompareHandler).Methods(http.MethodDelete)

	router.HandleFunc("/basket", clientHandlers.GetBasketHandler).Methods(http.MethodGet)
	router.HandleFunc("/basket", clientHandlers.ClearBasketHandler).Methods(http.MethodDelete)
	router.HandleFunc("/basket/plans", clientHandlers.GetBasketPlansHandler).Methods(http.MethodGet)
	router.HandleFunc("/basket/plan", clientHandlers.UpdateBasketPlanHandler).Methods(http.MethodPut)
	router.HandleFunc("/basket/checkout-preview", clientHandlers.BasketCheckoutPreviewHandler).Methods(http.MethodPost)
	router.HandleFunc("/basket/{id}", clientHandlers.AddBasketItemHandler).Methods(http.MethodPost)
	router.HandleFunc("/basket/{id}", clientHandlers.RemoveBasketItemHandler).Methods(http.MethodDelete)

	router.HandleFunc("/applications", clientHandlers.GetApplicationsHandler).Methods(http.MethodGet)
	router.HandleFunc("/applications", clientHandlers.CreateApplicationHandler).Methods(http.MethodPost)
	router.HandleFunc("/applications/{universityId}/{cycle}", clientHandlers.GetApplicationHandler).Methods(http.MethodGet)
	router.HandleFunc("/applications/{universityId}/{cycle}", clientHandlers.UpdateApplicationHandler).Methods(http.MethodPut)
	router.HandleFunc("/applications/{universityId}/{cycle}/import-test-scores", clientHandlers.ImportApplicationTestScoresHandler).Methods(http.MethodPost)
	router.HandleFunc("/applications/{universityId}/{cycle}/submit", clientHandlers.SubmitApplicationHandler).Methods(http.MethodPost)
	router.HandleFunc("/applications/{universityId}/{cycle}", clientHandlers.DeleteApplicationHandler).Methods(http.MethodDelete)

	router.HandleFunc("/application-files/upload", clientHandlers.UploadApplicationFilesHandler).Methods(http.MethodPost)
	router.HandleFunc("/application-files/{fileId}/download", clientHandlers.DownloadApplicationFileHandler).Methods(http.MethodGet)

	router.HandleFunc("/profile", clientHandlers.GetProfileHandler).Methods(http.MethodGet)
	router.HandleFunc("/profile", clientHandlers.UpdateProfileHandler).Methods(http.MethodPut)
	router.HandleFunc("/profile/password", clientHandlers.UpdatePasswordHandler).Methods(http.MethodPut)
	router.HandleFunc("/profile/photo", clientHandlers.UpdateProfilePhotoHandler).Methods(http.MethodPut)
	router.HandleFunc("/profile/photo", clientHandlers.GetProfilePhotoHandler).Methods(http.MethodGet)
	router.HandleFunc("/profile/test-scores", clientHandlers.GetProfileTestScoresHandler).Methods(http.MethodGet)
	router.HandleFunc("/profile/test-scores", clientHandlers.CreateProfileTestScoreHandler).Methods(http.MethodPost)
	router.HandleFunc("/profile/test-scores/{id}", clientHandlers.UpdateProfileTestScoreHandler).Methods(http.MethodPut)
	router.HandleFunc("/profile/test-scores/{id}", clientHandlers.DeleteProfileTestScoreHandler).Methods(http.MethodDelete)
	router.HandleFunc("/profile", clientHandlers.DeleteProfileHandler).Methods(http.MethodDelete)
}

func registerPartnerRoutes(router *mux.Router) {
	router.HandleFunc("/dashboard", withLinkedUniversityID(adminHandlers.GetUniversityDashboardHandler)).Methods(http.MethodGet)
	router.HandleFunc("/university/profile", withLinkedUniversityID(adminHandlers.GetUniversityHandler)).Methods(http.MethodGet)
	router.HandleFunc("/university/profile", withLinkedUniversityID(adminHandlers.UpdateUniversityHandler)).Methods(http.MethodPut)
	router.HandleFunc("/university/application-structure", withLinkedUniversityID(adminHandlers.GetUniversityApplicationStructureHandler)).Methods(http.MethodGet)
	router.HandleFunc("/university/application-structure", withLinkedUniversityID(adminHandlers.UpdateUniversityApplicationStructureHandler)).Methods(http.MethodPut)
	router.HandleFunc("/university/application-structure/history", withLinkedUniversityID(adminHandlers.GetApplicationStructureHistoryHandler)).Methods(http.MethodGet)
	router.HandleFunc("/university/application-structure/publish", withLinkedUniversityID(adminHandlers.PublishApplicationStructureHandler)).Methods(http.MethodPost)
	router.HandleFunc("/applications", withLinkedUniversityQuery(adminHandlers.GetApplicationsHandler)).Methods(http.MethodGet)
	router.HandleFunc("/applications/{id}", adminHandlers.GetApplicationHandler).Methods(http.MethodGet)
	router.HandleFunc("/applications/{id}/files", adminHandlers.ListSubmittedApplicationFilesHandler).Methods(http.MethodGet)
	router.HandleFunc("/applications/{id}/files/{fileId}/download", adminHandlers.DownloadSubmittedApplicationFileHandler).Methods(http.MethodGet)
}

func registerStaffRoutes(router *mux.Router, authHandler *backendHandlers.AuthHandler) {
	router.HandleFunc("/dashboard", adminHandlers.GetGlobalOverviewHandler).Methods(http.MethodGet)
	router.HandleFunc("/accounts", authHandler.CreateManagementAccount).Methods(http.MethodPost)
	router.HandleFunc("/universities", adminHandlers.GetUniversitiesHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities", adminHandlers.CreateUniversityHandler).Methods(http.MethodPost)
	router.HandleFunc("/universities/import", adminHandlers.ImportUniversitiesHandler).Methods(http.MethodPost)
	router.HandleFunc("/universities/{id}", adminHandlers.GetUniversityHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}", adminHandlers.UpdateUniversityHandler).Methods(http.MethodPut)
	router.HandleFunc("/universities/{id}", adminHandlers.DeleteUniversityHandler).Methods(http.MethodDelete)
	router.HandleFunc("/universities/{id}/dashboard", adminHandlers.GetUniversityDashboardHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/application-structure", adminHandlers.GetUniversityApplicationStructureHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/application-structure", adminHandlers.UpdateUniversityApplicationStructureHandler).Methods(http.MethodPut)
	router.HandleFunc("/universities/{id}/application-structure/history", adminHandlers.GetApplicationStructureHistoryHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/application-structure/publish", adminHandlers.PublishApplicationStructureHandler).Methods(http.MethodPost)
	router.HandleFunc("/universities/{id}/applications", withPathIDQuery("university_id", adminHandlers.GetApplicationsHandler)).Methods(http.MethodGet)
	router.HandleFunc("/service-logs", adminHandlers.GetGlobalServiceLogsHandler).Methods(http.MethodGet)
	router.HandleFunc("/audit-logs", adminHandlers.GetGlobalAuditLogsHandler).Methods(http.MethodGet)
	router.HandleFunc("/settings", adminHandlers.GetGlobalSettingsHandler).Methods(http.MethodGet)
	router.HandleFunc("/settings", adminHandlers.UpdateGlobalSettingsHandler).Methods(http.MethodPut)
}

func withLinkedUniversityID(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := middlewares.GetClaimsFromContext(r.Context())
		if err != nil {
			utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if claims.UniversityLinked == nil || strings.TrimSpace(*claims.UniversityLinked) == "" {
			utils.WriteJSONResponseWithMsg(w, "partner account missing linked university", http.StatusForbidden)
			return
		}

		vars := mux.Vars(r)
		cloned := make(map[string]string, len(vars)+1)
		for key, value := range vars {
			cloned[key] = value
		}
		cloned["id"] = strings.TrimSpace(*claims.UniversityLinked)

		next(w, mux.SetURLVars(r, cloned))
	}
}

func withLinkedUniversityQuery(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := middlewares.GetClaimsFromContext(r.Context())
		if err != nil {
			utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if claims.UniversityLinked == nil || strings.TrimSpace(*claims.UniversityLinked) == "" {
			utils.WriteJSONResponseWithMsg(w, "partner account missing linked university", http.StatusForbidden)
			return
		}

		query := r.URL.Query()
		query.Set("university_id", strings.TrimSpace(*claims.UniversityLinked))

		clonedURL := *r.URL
		clonedURL.RawQuery = query.Encode()

		r2 := r.Clone(r.Context())
		r2.URL = &clonedURL
		next(w, r2)
	}
}

func withPathIDQuery(queryKey string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		pathID := strings.TrimSpace(mux.Vars(r)["id"])
		if pathID == "" {
			utils.WriteJSONResponseWithMsg(w, "university id is required", http.StatusBadRequest)
			return
		}

		query := r.URL.Query()
		query.Set(queryKey, pathID)

		clonedURL := *r.URL
		clonedURL.RawQuery = query.Encode()

		r2 := r.Clone(r.Context())
		r2.URL = &clonedURL
		next(w, r2)
	}
}
