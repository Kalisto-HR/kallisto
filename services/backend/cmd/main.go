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
	applicantHandlers "kallisto/services/backend/internal/applicant/handlers"
	authHandlers "kallisto/services/backend/internal/auth/handlers"
	partnerHandlers "kallisto/services/backend/internal/partner/handlers"
	sharedHandlers "kallisto/services/backend/internal/shared/handlers"
	staffHandlers "kallisto/services/backend/internal/staff/handlers"

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

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		zap.L().Fatal("failed to resolve unified database connection URL")
	}

	dbPool, err := pgxpool.New(baseCtx, databaseURL)
	if err != nil {
		zap.L().Fatal("failed to connect to unified database", zap.Error(err))
	}
	defer dbPool.Close()
	if err := env.ValidateDatabaseContract(baseCtx, dbPool); err != nil {
		zap.L().Fatal("database schema contract validation failed", zap.Error(err))
	}

	authHandler := authHandlers.NewAuthHandler(dbPool)
	sessionStore := authsession.NewStore(dbPool)
	serviceLogger := observability.NewAsyncServiceLogger(dbPool, zap.L())
	defer serviceLogger.Close(context.Background())
	auditLogger := observability.NewAuditLogger(dbPool, zap.L())

	router.Use(middlewares.CORS())
	router.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}).Methods(http.MethodGet)

	authRouter := router.PathPrefix("/v1.0/auth").Subrouter()
	authRouter.Use(middlewares.ObserveManagedRequests(zap.L(), serviceLogger, "auth"))
	authRouter.HandleFunc("/sign-in", authHandler.SignIn).Methods(http.MethodPost)
	authRouter.HandleFunc("/sign-up", authHandler.SignUp).Methods(http.MethodPost)
	authRouter.HandleFunc("/password/forgot", applicantHandlers.ForgotPasswordHandler).Methods(http.MethodPost)
	authRouter.HandleFunc("/password/reset", applicantHandlers.ResetPasswordHandler).Methods(http.MethodPost)
	authProtectedRouter := authRouter.NewRoute().Subrouter()
	authProtectedRouter.Use(middlewares.RequireAuth(zap.L(), sessionStore, auditLogger))
	authProtectedRouter.Use(middlewares.RequireCSRF(zap.L(), auditLogger))
	authProtectedRouter.HandleFunc("/session", authHandler.GetSession).Methods(http.MethodGet)
	authProtectedRouter.HandleFunc("/sign-out", authHandler.SignOut).Methods(http.MethodPost)

	applicantRouter := router.PathPrefix("/v1.0/applicant").Subrouter()
	applicantRouter.Use(middlewares.ObserveManagedRequests(zap.L(), serviceLogger, "applicant"))
	applicantRouter.Use(middlewares.PassPgPoolConn(dbPool))
	applicantRouter.Use(middlewares.RequireAuth(zap.L(), sessionStore, nil))
	applicantRouter.Use(middlewares.RequireMaintenanceModeOff(zap.L()))
	applicantRouter.Use(middlewares.RequireCSRF(zap.L(), nil))
	applicantRouter.Use(middlewares.RequirePermissions(zap.L(), nil, authz.PermissionsForRole(authz.RoleApplicant)...))
	registerApplicantRoutes(applicantRouter)

	partnerRouter := router.PathPrefix("/v1.0/partner").Subrouter()
	partnerRouter.Use(middlewares.ObserveManagedRequests(zap.L(), serviceLogger, "partner"))
	partnerRouter.Use(middlewares.PassPgPoolConn(dbPool))
	partnerRouter.Use(middlewares.RequireAuth(zap.L(), sessionStore, auditLogger))
	partnerRouter.Use(middlewares.RequireMaintenanceModeOff(zap.L()))
	partnerRouter.Use(middlewares.RequireCSRF(zap.L(), auditLogger))
	partnerRouter.Use(middlewares.RequirePermissions(zap.L(), auditLogger, authz.PermissionsForRole(authz.RolePartner)...))
	registerPartnerRoutes(partnerRouter)

	staffRouter := router.PathPrefix("/v1.0/staff").Subrouter()
	staffRouter.Use(middlewares.ObserveManagedRequests(zap.L(), serviceLogger, "staff"))
	staffRouter.Use(middlewares.PassPgPoolConn(dbPool))
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

	zap.L().Info("Monolith backend starting on port 8081", zap.String("db_mode", "single"))
	err = srv.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		zap.L().Fatal("backend service failed", zap.Error(err))
	}
}

func registerApplicantRoutes(router *mux.Router) {
	router.HandleFunc("/universities", applicantHandlers.GetUniversitiesHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/search", applicantHandlers.SearchUniversitiesHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/filter-options", applicantHandlers.GetUniversityFilterOptionsHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}", applicantHandlers.GetUniversityHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/favorite", applicantHandlers.IsFavoriteHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/favorite", applicantHandlers.AddFavoriteHandler).Methods(http.MethodPost)
	router.HandleFunc("/universities/{id}/favorite", applicantHandlers.RemoveFavoriteHandler).Methods(http.MethodDelete)

	router.HandleFunc("/favorites", applicantHandlers.GetFavoritesHandler).Methods(http.MethodGet)

	router.HandleFunc("/compare", applicantHandlers.GetCompareHandler).Methods(http.MethodGet)
	router.HandleFunc("/compare", applicantHandlers.ClearCompareHandler).Methods(http.MethodDelete)
	router.HandleFunc("/compare/{id}", applicantHandlers.AddCompareHandler).Methods(http.MethodPost)
	router.HandleFunc("/compare/{id}", applicantHandlers.RemoveCompareHandler).Methods(http.MethodDelete)

	router.HandleFunc("/basket", applicantHandlers.GetBasketHandler).Methods(http.MethodGet)
	router.HandleFunc("/basket", applicantHandlers.ClearBasketHandler).Methods(http.MethodDelete)
	router.HandleFunc("/basket/plans", applicantHandlers.GetBasketPlansHandler).Methods(http.MethodGet)
	router.HandleFunc("/basket/plan", applicantHandlers.UpdateBasketPlanHandler).Methods(http.MethodPut)
	router.HandleFunc("/basket/checkout-preview", applicantHandlers.BasketCheckoutPreviewHandler).Methods(http.MethodPost)
	router.HandleFunc("/basket/{id}", applicantHandlers.AddBasketItemHandler).Methods(http.MethodPost)
	router.HandleFunc("/basket/{id}", applicantHandlers.RemoveBasketItemHandler).Methods(http.MethodDelete)

	router.HandleFunc("/fit-score/calculate", applicantHandlers.CalculateFitScoreHandler).Methods(http.MethodPost)

	router.HandleFunc("/billing/products", applicantHandlers.GetBillingProductsHandler).Methods(http.MethodGet)
	router.HandleFunc("/billing/summary", applicantHandlers.GetBillingSummaryHandler).Methods(http.MethodGet)
	router.HandleFunc("/billing/orders", applicantHandlers.CreateBillingOrderHandler).Methods(http.MethodPost)
	router.HandleFunc("/billing/orders/{id}/dev-complete", applicantHandlers.CompleteDevelopmentPaymentHandler).Methods(http.MethodPost)
	router.HandleFunc("/billing/subscription", applicantHandlers.GetCurrentSubscriptionHandler).Methods(http.MethodGet)

	router.HandleFunc("/applications", applicantHandlers.GetApplicationsHandler).Methods(http.MethodGet)
	router.HandleFunc("/applications", applicantHandlers.CreateApplicationHandler).Methods(http.MethodPost)
	router.HandleFunc("/applications/{universityId}/{cycle}", applicantHandlers.GetApplicationHandler).Methods(http.MethodGet)
	router.HandleFunc("/applications/{universityId}/{cycle}", applicantHandlers.UpdateApplicationHandler).Methods(http.MethodPut)
	router.HandleFunc("/applications/{universityId}/{cycle}/import-test-scores", applicantHandlers.ImportApplicationTestScoresHandler).Methods(http.MethodPost)
	router.HandleFunc("/applications/{universityId}/{cycle}/submit", applicantHandlers.SubmitApplicationHandler).Methods(http.MethodPost)
	router.HandleFunc("/applications/{universityId}/{cycle}/tasks/{taskId}/respond", applicantHandlers.RespondApplicationTaskHandler).Methods(http.MethodPost)
	router.HandleFunc("/applications/{universityId}/{cycle}", applicantHandlers.DeleteApplicationHandler).Methods(http.MethodDelete)

	router.HandleFunc("/application-files/upload", applicantHandlers.UploadApplicationFilesHandler).Methods(http.MethodPost)
	router.HandleFunc("/application-files/{fileId}/download", applicantHandlers.DownloadApplicationFileHandler).Methods(http.MethodGet)

	router.HandleFunc("/profile", applicantHandlers.GetProfileHandler).Methods(http.MethodGet)
	router.HandleFunc("/profile", applicantHandlers.UpdateProfileHandler).Methods(http.MethodPut)
	router.HandleFunc("/profile/password", applicantHandlers.UpdatePasswordHandler).Methods(http.MethodPut)
	router.HandleFunc("/profile/photo", applicantHandlers.UpdateProfilePhotoHandler).Methods(http.MethodPut)
	router.HandleFunc("/profile/photo", applicantHandlers.GetProfilePhotoHandler).Methods(http.MethodGet)
	router.HandleFunc("/profile/test-scores", applicantHandlers.GetProfileTestScoresHandler).Methods(http.MethodGet)
	router.HandleFunc("/profile/test-scores", applicantHandlers.CreateProfileTestScoreHandler).Methods(http.MethodPost)
	router.HandleFunc("/profile/test-scores/{id}", applicantHandlers.UpdateProfileTestScoreHandler).Methods(http.MethodPut)
	router.HandleFunc("/profile/test-scores/{id}", applicantHandlers.DeleteProfileTestScoreHandler).Methods(http.MethodDelete)
	router.HandleFunc("/profile", applicantHandlers.DeleteProfileHandler).Methods(http.MethodDelete)
}

func registerPartnerRoutes(router *mux.Router) {
	router.HandleFunc("/dashboard", withLinkedUniversityID(partnerHandlers.GetPartnerDashboardHandler)).Methods(http.MethodGet)
	router.HandleFunc("/analytics/contacts", withLinkedUniversityID(partnerHandlers.GetPartnerAnalyticsContactsHandler)).Methods(http.MethodGet)
	router.HandleFunc("/university/profile", withLinkedUniversityID(sharedHandlers.GetUniversityHandler)).Methods(http.MethodGet)
	router.HandleFunc("/university/profile", withLinkedUniversityID(sharedHandlers.UpdateUniversityHandler)).Methods(http.MethodPut)
	router.HandleFunc("/university/application-structure", withLinkedUniversityID(sharedHandlers.GetUniversityApplicationStructureHandler)).Methods(http.MethodGet)
	router.HandleFunc("/university/application-structure", withLinkedUniversityID(sharedHandlers.UpdateUniversityApplicationStructureHandler)).Methods(http.MethodPut)
	router.HandleFunc("/university/application-structure/history", withLinkedUniversityID(partnerHandlers.GetApplicationStructureHistoryHandler)).Methods(http.MethodGet)
	router.HandleFunc("/university/application-structure/publish", withLinkedUniversityID(partnerHandlers.PublishApplicationStructureHandler)).Methods(http.MethodPost)
	router.HandleFunc("/applications", withLinkedUniversityQuery(sharedHandlers.GetApplicationsHandler)).Methods(http.MethodGet)
	router.HandleFunc("/applications/{id}", sharedHandlers.GetApplicationHandler).Methods(http.MethodGet)
	router.HandleFunc("/applications/{id}/status", sharedHandlers.UpdateApplicationStatusHandler).Methods(http.MethodPatch)
	router.HandleFunc("/applications/{id}/files", sharedHandlers.ListSubmittedApplicationFilesHandler).Methods(http.MethodGet)
	router.HandleFunc("/applications/{id}/files/{fileId}/download", sharedHandlers.DownloadSubmittedApplicationFileHandler).Methods(http.MethodGet)
}

func registerStaffRoutes(router *mux.Router, authHandler *authHandlers.AuthHandler) {
	router.HandleFunc("/dashboard", staffHandlers.GetGlobalOverviewHandler).Methods(http.MethodGet)
	router.HandleFunc("/accounts", authHandler.CreateRoleAccount).Methods(http.MethodPost)
	router.HandleFunc("/students", staffHandlers.GetGlobalStudentsHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities", staffHandlers.GetGlobalUniversitiesHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities", sharedHandlers.CreateUniversityHandler).Methods(http.MethodPost)
	router.HandleFunc("/universities/import", sharedHandlers.ImportUniversitiesHandler).Methods(http.MethodPost)
	router.HandleFunc("/universities/{id}", sharedHandlers.GetUniversityHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}", sharedHandlers.UpdateUniversityHandler).Methods(http.MethodPut)
	router.HandleFunc("/universities/{id}", sharedHandlers.DeleteUniversityHandler).Methods(http.MethodDelete)
	router.HandleFunc("/universities/{id}/dashboard", partnerHandlers.GetPartnerDashboardHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/application-structure", sharedHandlers.GetUniversityApplicationStructureHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/application-structure", sharedHandlers.UpdateUniversityApplicationStructureHandler).Methods(http.MethodPut)
	router.HandleFunc("/universities/{id}/application-structure/history", partnerHandlers.GetApplicationStructureHistoryHandler).Methods(http.MethodGet)
	router.HandleFunc("/universities/{id}/application-structure/publish", partnerHandlers.PublishApplicationStructureHandler).Methods(http.MethodPost)
	router.HandleFunc("/universities/{id}/applications", withPathIDQuery("university_id", sharedHandlers.GetApplicationsHandler)).Methods(http.MethodGet)
	router.HandleFunc("/applications/{id}/status", sharedHandlers.UpdateApplicationStatusHandler).Methods(http.MethodPatch)
	router.HandleFunc("/service-logs", staffHandlers.GetGlobalServiceLogsHandler).Methods(http.MethodGet)
	router.HandleFunc("/audit-logs", staffHandlers.GetGlobalAuditLogsHandler).Methods(http.MethodGet)
	router.HandleFunc("/settings", staffHandlers.GetGlobalSettingsHandler).Methods(http.MethodGet)
	router.HandleFunc("/settings", staffHandlers.UpdateGlobalSettingsHandler).Methods(http.MethodPut)
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
