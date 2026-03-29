package middlewares

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	auth "kallisto/infra/auth/jwt"
	authsession "kallisto/infra/auth/session"
	"kallisto/infra/authz"
	"kallisto/infra/observability"
	"kallisto/infra/utils"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type CtxKey string

const CtxPostgresKey CtxKey = "postgres"
const CtxClaimsKey CtxKey = "claims"
const CtxSessionKey CtxKey = "session"
const AccessTokenKey = utils.AccessTokenCookieName

type DB interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Begin(ctx context.Context) (pgx.Tx, error)
}

func GetClaimsFromContext(ctx context.Context) (*auth.Claims, error) {
	claims, ok := ctx.Value(CtxClaimsKey).(*auth.Claims)
	if !ok {
		return nil, errors.New("could not retrieve claims from context")
	}
	return claims, nil
}

func GetSessionFromContext(ctx context.Context) (*authsession.Session, error) {
	session, ok := ctx.Value(CtxSessionKey).(*authsession.Session)
	if !ok {
		return nil, errors.New("could not retrieve session from context")
	}
	return session, nil
}

func GetDBFromContext(ctx context.Context, key CtxKey) (DB, error) {
	conn, ok := ctx.Value(key).(DB)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}
	return conn, nil
}

func LogRequestEvent(log *zap.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Info("Receiveing a request: ", zap.String("Method:", r.Method), zap.String("URI:", r.RequestURI))
			next.ServeHTTP(w, r)
		})
	}
}

func PassPgPoolConn(pool *pgxpool.Pool) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), CtxPostgresKey, pool)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireAuth(log *zap.Logger, sessionStore authsession.Store, auditLogger *observability.AuditLogger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			accessToken, err := r.Cookie(AccessTokenKey)
			if err != nil {
				log.Debug("missing access_token cookie",
					zap.String("path", r.URL.Path),
					zap.String("method", r.Method),
					zap.String("error_msg", err.Error()))
				writeAccessDeniedAudit(r, auditLogger, nil, "security.access-denied", "missing access token")
				utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			jwtToken, err := auth.NewJWTFromToken(&accessToken.Value)
			if err != nil {
				log.Warn("failed to authorize the user; ", zap.String("error_msg", err.Error()))
				writeAccessDeniedAudit(r, auditLogger, nil, "security.access-denied", "invalid access token")
				utils.ClearAuthCookies(w)
				if errors.Is(err, auth.ErrExpiredToken) {
					writeUnauthorizedWithReason(w, authsession.ReasonSessionExpired)
					return
				}
				utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			if sessionStore == nil {
				log.Error("session store is not configured")
				utils.WriteJSONResponseWithMsg(w, "internal server error", http.StatusInternalServerError)
				return
			}

			session, sessionErr := sessionStore.Get(r.Context(), jwtToken.TokenClaims.SID)
			if sessionErr != nil {
				log.Warn("failed to resolve session", zap.Error(sessionErr))
				utils.ClearAuthCookies(w)
				writeUnauthorizedWithReason(w, authsession.ReasonSessionRevoked)
				return
			}

			now := time.Now().UTC()
			if session.RevokedAt != nil {
				log.Warn("attempted access with revoked session", zap.String("session_id", session.ID))
				utils.ClearAuthCookies(w)
				writeUnauthorizedWithReason(w, revokeReason(session))
				return
			}
			if !session.ExpiresAt.After(now) {
				log.Warn("attempted access with expired session", zap.String("session_id", session.ID))
				_ = sessionStore.Revoke(r.Context(), session.ID, authsession.ReasonSessionExpired)
				utils.ClearAuthCookies(w)
				writeUnauthorizedWithReason(w, authsession.ReasonSessionExpired)
				return
			}

			claims := claimsFromSession(session)
			log.Debug("successfully authorized user", zap.String("uid", claims.UID), zap.String("role", claims.Role))
			observability.SetActor(r.Context(), claims.UID, claims.Role)
			utils.SetCSRFCookie(w, session.CSRFToken)

			if shouldRefreshSession(now, session.ExpiresAt) {
				refreshedExpiry := now.Add(time.Duration(auth.EXPIRATION_THRESHOLD) * time.Second)
				refreshedSession, extendErr := sessionStore.Extend(r.Context(), session.ID, refreshedExpiry)
				if extendErr == nil {
					session = refreshedSession
					claims = claimsFromSession(session)
					newJWT, tokenErr := auth.NewJWTFromClaims(claims)
					if tokenErr == nil {
						utils.SetAccessTokenCookie(w, newJWT.TokenString)
						utils.SetCSRFCookie(w, session.CSRFToken)
					}
				}
			}

			ctx := context.WithValue(r.Context(), CtxClaimsKey, claims)
			ctx = context.WithValue(ctx, CtxSessionKey, session)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireCSRF(log *zap.Logger, auditLogger *observability.AuditLogger) mux.MiddlewareFunc {
	allowedOrigins := parseAllowedOrigins(os.Getenv("CORS_ALLOWED_ORIGINS"))

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isSafeMethod(r.Method) {
				next.ServeHTTP(w, r)
				return
			}

			session, err := GetSessionFromContext(r.Context())
			if err != nil {
				log.Warn("failed to retrieve session for csrf validation", zap.Error(err))
				utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			claims, _ := GetClaimsFromContext(r.Context())

			if !isTrustedRequestOrigin(r, allowedOrigins) {
				log.Warn("csrf origin validation failed", zap.String("path", r.URL.Path))
				writeAccessDeniedAudit(r, auditLogger, claims, "security.access-denied", "csrf origin validation failed")
				utils.WriteJSONResponseWithMsg(w, "forbidden", http.StatusForbidden)
				return
			}

			cookie, cookieErr := r.Cookie(utils.CSRFCookieName)
			headerToken := strings.TrimSpace(r.Header.Get(utils.CSRFTokenHeader))
			if cookieErr != nil || strings.TrimSpace(cookie.Value) == "" || headerToken == "" {
				log.Warn("missing csrf token", zap.String("path", r.URL.Path))
				writeAccessDeniedAudit(r, auditLogger, claims, "security.access-denied", "missing csrf token")
				utils.WriteJSONResponseWithMsg(w, "forbidden", http.StatusForbidden)
				return
			}

			expected := strings.TrimSpace(session.CSRFToken)
			if expected == "" || cookie.Value != headerToken || headerToken != expected {
				log.Warn("csrf token mismatch", zap.String("path", r.URL.Path))
				writeAccessDeniedAudit(r, auditLogger, claims, "security.access-denied", "csrf token mismatch")
				utils.WriteJSONResponseWithMsg(w, "forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RequireRoles(log *zap.Logger, auditLogger *observability.AuditLogger, allowedRoles ...string) mux.MiddlewareFunc {
	allowed := make(map[string]struct{}, len(allowedRoles))
	for _, role := range allowedRoles {
		trimmed := strings.TrimSpace(role)
		if trimmed == "" {
			continue
		}
		allowed[trimmed] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := GetClaimsFromContext(r.Context())
			if err != nil {
				log.Warn("failed to retrieve claims for role authorization", zap.Error(err))
				utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			if _, ok := allowed[claims.Role]; !ok {
				log.Warn("forbidden role access", zap.String("role", claims.Role), zap.String("path", r.URL.Path))
				writeAccessDeniedAudit(r, auditLogger, claims, "security.access-denied", "role access denied")
				utils.WriteJSONResponseWithMsg(w, "forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RequirePermissions(log *zap.Logger, auditLogger *observability.AuditLogger, requiredPermissions ...string) mux.MiddlewareFunc {
	required := make([]string, 0, len(requiredPermissions))
	for _, permission := range requiredPermissions {
		trimmed := strings.TrimSpace(permission)
		if trimmed == "" {
			continue
		}
		required = append(required, trimmed)
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := GetClaimsFromContext(r.Context())
			if err != nil {
				log.Warn("failed to retrieve claims for permission authorization", zap.Error(err))
				utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			if !authz.HasAnyPermission(claims.Role, claims.Permissions, required...) {
				log.Warn("forbidden permission access",
					zap.String("role", claims.Role),
					zap.Strings("required_permissions", required),
					zap.String("path", r.URL.Path))
				writeAccessDeniedAudit(r, auditLogger, claims, "security.access-denied", "permission access denied")
				utils.WriteJSONResponseWithMsg(w, "forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RequireInternalServiceToken(log *zap.Logger, expectedToken string) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			providedToken := strings.TrimSpace(r.Header.Get(utils.InternalServiceTokenHeader))
			if providedToken == "" || providedToken != expectedToken {
				log.Warn("invalid internal service token", zap.String("path", r.URL.Path))
				utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func LimitRequestBody(limit int64) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, limit)
			next.ServeHTTP(w, r)
		})
	}
}

func isSafeMethod(method string) bool {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodOptions, http.MethodTrace:
		return true
	default:
		return false
	}
}

func isTrustedRequestOrigin(r *http.Request, allowedOrigins []string) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin != "" {
		return requestOriginAllowed(origin, r, allowedOrigins)
	}

	referer := strings.TrimSpace(r.Header.Get("Referer"))
	if referer == "" {
		return false
	}

	parsed, err := url.Parse(referer)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return false
	}

	return requestOriginAllowed(parsed.Scheme+"://"+parsed.Host, r, allowedOrigins)
}

func requestOriginAllowed(origin string, r *http.Request, allowedOrigins []string) bool {
	if originAllowed(origin, allowedOrigins) {
		return true
	}

	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}

	requestScheme := "http"
	if r.TLS != nil || strings.EqualFold(strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")), "https") {
		requestScheme = "https"
	}

	return strings.EqualFold(parsed.Scheme, requestScheme) && strings.EqualFold(parsed.Host, strings.TrimSpace(r.Host))
}

func claimsFromSession(session *authsession.Session) *auth.Claims {
	if session == nil {
		return &auth.Claims{}
	}

	return &auth.Claims{
		SID:              session.ID,
		UID:              session.UserID,
		FirstName:        session.FirstName,
		LastName:         session.LastName,
		Role:             session.Role,
		Permissions:      append([]string(nil), session.Permissions...),
		UniversityLinked: session.UniversityLinked,
		Iat:              time.Now().Unix(),
		Exp:              session.ExpiresAt.Unix(),
	}
}

func shouldRefreshSession(now, expiresAt time.Time) bool {
	return expiresAt.Sub(now) <= (time.Duration(auth.EXPIRATION_THRESHOLD) * time.Second / 4)
}

func revokeReason(session *authsession.Session) string {
	if session == nil || session.RevokedReason == nil {
		return authsession.ReasonSessionRevoked
	}
	return strings.TrimSpace(*session.RevokedReason)
}

func writeUnauthorizedWithReason(w http.ResponseWriter, reason string) {
	utils.WriteJSONResponse(w, map[string]string{
		"msg":    "unauthorized",
		"reason": strings.TrimSpace(reason),
	}, http.StatusUnauthorized)
}

func ObserveManagedRequests(log *zap.Logger, sink observability.ServiceLogSink, scope string) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := observability.EnsureRequestID(r.Header.Get(observability.RequestIDHeader))
			state := &observability.RequestState{
				RequestID: requestID,
				Scope:     strings.TrimSpace(scope),
				IPAddress: observability.RequestIP(r),
				UserAgent: strings.TrimSpace(r.UserAgent()),
			}

			ctx := observability.WithRequestState(r.Context(), state)
			r = r.WithContext(ctx)
			w.Header().Set(observability.RequestIDHeader, requestID)

			recorder := &responseRecorder{ResponseWriter: w, status: http.StatusOK}
			start := time.Now()
			next.ServeHTTP(recorder, r)

			routeTemplate := routeTemplateForRequest(r)
			state.Route = routeTemplate

			if sink == nil {
				return
			}

			var userID *string
			if trimmed := strings.TrimSpace(state.UserID); trimmed != "" {
				userID = &trimmed
			}

			roleValue := "anonymous"
			if trimmed := strings.TrimSpace(state.Role); trimmed != "" {
				roleValue = trimmed
			}

			sink.Enqueue(observability.ServiceLogEntry{
				Timestamp:    time.Now().UTC(),
				Level:        serviceLogLevelForStatus(recorder.status),
				Microservice: strings.TrimSpace(scope),
				Handler:      routeTemplate,
				Message:      fmt.Sprintf("%s %s -> %d", r.Method, routeTemplate, recorder.status),
				UserID:       userID,
				RequestID:    &requestID,
				Method:       r.Method,
				StatusCode:   recorder.status,
				DurationMS:   time.Since(start).Milliseconds(),
				Role:         &roleValue,
				IPAddress:    state.IPAddress,
				UserAgent:    state.UserAgent,
				Metadata:     json.RawMessage(`{}`),
			})
		})
	}
}

type responseRecorder struct {
	http.ResponseWriter
	status int
}

func (recorder *responseRecorder) WriteHeader(status int) {
	recorder.status = status
	recorder.ResponseWriter.WriteHeader(status)
}

func (recorder *responseRecorder) Write(body []byte) (int, error) {
	if recorder.status == 0 {
		recorder.status = http.StatusOK
	}
	return recorder.ResponseWriter.Write(body)
}

func routeTemplateForRequest(r *http.Request) string {
	route := mux.CurrentRoute(r)
	if route == nil {
		return r.URL.Path
	}

	template, err := route.GetPathTemplate()
	if err != nil || strings.TrimSpace(template) == "" {
		return r.URL.Path
	}

	return template
}

func serviceLogLevelForStatus(status int) string {
	switch {
	case status >= http.StatusInternalServerError:
		return "error"
	case status >= http.StatusBadRequest:
		return "warn"
	default:
		return "info"
	}
}

func writeAccessDeniedAudit(r *http.Request, auditLogger *observability.AuditLogger, claims *auth.Claims, actionType string, description string) {
	if auditLogger == nil || r == nil {
		return
	}

	state, ok := observability.GetRequestState(r.Context())
	if !ok {
		return
	}
	if state.Scope != "partner" && state.Scope != "staff" {
		return
	}

	actorName := "Anonymous"
	actorType := "anonymous"
	var actorID *string
	if claims != nil {
		fullName := strings.TrimSpace(strings.TrimSpace(claims.FirstName) + " " + strings.TrimSpace(claims.LastName))
		if fullName != "" {
			actorName = fullName
		}
		actorType = observability.NormalizeActorType(claims.Role)
		if strings.TrimSpace(claims.UID) != "" {
			value := strings.TrimSpace(claims.UID)
			actorID = &value
		}
	}

	metadata, _ := json.Marshal(map[string]string{
		"scope":  state.Scope,
		"method": r.Method,
	})

	auditLogger.Log(r.Context(), observability.AuditEntry{
		ActorName:         actorName,
		ActorID:           actorID,
		ActorType:         actorType,
		ActionType:        actionType,
		ActionDescription: description,
		TargetEntity:      routeTemplateForRequest(r),
		Outcome:           "failed",
		IPAddress:         observability.IPAddressFromContext(r.Context()),
		RequestID:         observability.RequestIDFromContext(r.Context()),
		Metadata:          metadata,
	})
}
