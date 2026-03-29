package middlewares

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	auth "kallisto/infra/auth/jwt"
	authsession "kallisto/infra/auth/session"
	"kallisto/infra/observability"
	"kallisto/infra/utils"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

type captureServiceLogSink struct {
	entries []observability.ServiceLogEntry
}

func (sink *captureServiceLogSink) Enqueue(entry observability.ServiceLogEntry) {
	sink.entries = append(sink.entries, entry)
}

type stubSessionStore struct {
	session       *authsession.Session
	extendSession *authsession.Session
	getErr        error
	extendErr     error
}

func (store *stubSessionStore) Create(_ context.Context, _ authsession.CreateParams) (*authsession.Session, error) {
	return nil, nil
}

func (store *stubSessionStore) Get(_ context.Context, _ string) (*authsession.Session, error) {
	if store.getErr != nil {
		return nil, store.getErr
	}
	return store.session, nil
}

func (store *stubSessionStore) Extend(_ context.Context, _ string, _ time.Time) (*authsession.Session, error) {
	if store.extendErr != nil {
		return nil, store.extendErr
	}
	if store.extendSession != nil {
		return store.extendSession, nil
	}
	return store.session, nil
}

func (store *stubSessionStore) Revoke(_ context.Context, _ string, _ string) error {
	return nil
}

func (store *stubSessionStore) RevokeAllForUser(_ context.Context, _ string, _ string) error {
	return nil
}

func TestRequireRoles(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		role       string
		withClaims bool
		wantStatus int
	}{
		{name: "staff allowed", role: "staff", withClaims: true, wantStatus: http.StatusNoContent},
		{name: "partner allowed", role: "partner", withClaims: true, wantStatus: http.StatusNoContent},
		{name: "applicant rejected", role: "applicant", withClaims: true, wantStatus: http.StatusForbidden},
		{name: "missing claims rejected", wantStatus: http.StatusUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			handler := RequireRoles(zap.NewNop(), nil, "staff", "partner")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusNoContent)
			}))

			req := httptest.NewRequest(http.MethodGet, "/v1.0/applications", nil)
			if tt.withClaims {
				req = req.WithContext(context.WithValue(req.Context(), CtxClaimsKey, &auth.Claims{Role: tt.role}))
			}

			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("unexpected status: got %d want %d", rec.Code, tt.wantStatus)
			}
		})
	}
}

func TestRequireInternalServiceToken(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		header     string
		wantStatus int
	}{
		{name: "missing token", wantStatus: http.StatusUnauthorized},
		{name: "wrong token", header: "wrong-token", wantStatus: http.StatusUnauthorized},
		{name: "valid token", header: "shared-secret", wantStatus: http.StatusNoContent},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			handler := RequireInternalServiceToken(zap.NewNop(), "shared-secret")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusNoContent)
			}))

			req := httptest.NewRequest(http.MethodPost, "/v1.0/applications/receive", nil)
			if tt.header != "" {
				req.Header.Set(utils.InternalServiceTokenHeader, tt.header)
			}

			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("unexpected status: got %d want %d", rec.Code, tt.wantStatus)
			}
		})
	}
}

func TestLimitRequestBodyRejectsOversizedPayload(t *testing.T) {
	t.Parallel()

	handler := LimitRequestBody(8)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := io.ReadAll(r.Body); err != nil {
			w.WriteHeader(http.StatusRequestEntityTooLarge)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1.0/applications/receive", strings.NewReader("payload-too-large"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusRequestEntityTooLarge)
	}
}

func TestObserveManagedRequestsGeneratesRequestIDAndStructuredLog(t *testing.T) {
	t.Parallel()

	sink := &captureServiceLogSink{}
	router := mux.NewRouter()
	router.Use(ObserveManagedRequests(zap.NewNop(), sink, "staff"))
	router.HandleFunc("/v1.0/staff/universities/{id}", func(w http.ResponseWriter, r *http.Request) {
		observability.SetActor(r.Context(), "staff-1", "staff")
		w.WriteHeader(http.StatusForbidden)
	})

	req := httptest.NewRequest(http.MethodGet, "/v1.0/staff/universities/abc", nil)
	req.Header.Set("User-Agent", "middleware-test")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusForbidden)
	}

	requestID := strings.TrimSpace(rec.Header().Get(observability.RequestIDHeader))
	if requestID == "" {
		t.Fatal("expected response to include request id header")
	}

	if len(sink.entries) != 1 {
		t.Fatalf("unexpected log count: got %d want 1", len(sink.entries))
	}

	entry := sink.entries[0]
	if entry.RequestID == nil || *entry.RequestID != requestID {
		t.Fatalf("unexpected request id in log: got %+v want %s", entry.RequestID, requestID)
	}
	if entry.Handler != "/v1.0/staff/universities/{id}" {
		t.Fatalf("unexpected handler: got %s", entry.Handler)
	}
	if entry.StatusCode != http.StatusForbidden {
		t.Fatalf("unexpected status code: got %d want %d", entry.StatusCode, http.StatusForbidden)
	}
	if entry.Level != "warn" {
		t.Fatalf("unexpected level: got %s want warn", entry.Level)
	}
	if entry.UserID == nil || *entry.UserID != "staff-1" {
		t.Fatalf("unexpected user id: got %+v want staff-1", entry.UserID)
	}
	if entry.Role == nil || *entry.Role != "staff" {
		t.Fatalf("unexpected role: got %+v want staff", entry.Role)
	}
}

func TestObserveManagedRequestsPreservesIncomingRequestID(t *testing.T) {
	t.Parallel()

	sink := &captureServiceLogSink{}
	router := mux.NewRouter()
	router.Use(ObserveManagedRequests(zap.NewNop(), sink, "auth"))
	router.HandleFunc("/v1.0/auth/sign-in", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	})

	req := httptest.NewRequest(http.MethodPost, "/v1.0/auth/sign-in", nil)
	req.Header.Set(observability.RequestIDHeader, "req-preserved")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if got := rec.Header().Get(observability.RequestIDHeader); got != "req-preserved" {
		t.Fatalf("unexpected response request id: got %s want req-preserved", got)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("unexpected log count: got %d want 1", len(sink.entries))
	}
	if sink.entries[0].RequestID == nil || *sink.entries[0].RequestID != "req-preserved" {
		t.Fatalf("unexpected log request id: got %+v want req-preserved", sink.entries[0].RequestID)
	}
}

func TestObserveManagedRequestsSupportsApplicantScope(t *testing.T) {
	t.Parallel()

	sink := &captureServiceLogSink{}
	router := mux.NewRouter()
	router.Use(ObserveManagedRequests(zap.NewNop(), sink, "applicant"))
	router.HandleFunc("/v1.0/applicant/profile", func(w http.ResponseWriter, r *http.Request) {
		observability.SetActor(r.Context(), "applicant-7", "applicant")
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/v1.0/applicant/profile", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusOK)
	}
	if strings.TrimSpace(rec.Header().Get(observability.RequestIDHeader)) == "" {
		t.Fatal("expected applicant response to include request id header")
	}
	if len(sink.entries) != 1 {
		t.Fatalf("unexpected log count: got %d want 1", len(sink.entries))
	}
	if sink.entries[0].Microservice != "applicant" {
		t.Fatalf("unexpected microservice: got %s want applicant", sink.entries[0].Microservice)
	}
	if sink.entries[0].Role == nil || *sink.entries[0].Role != "applicant" {
		t.Fatalf("unexpected role: got %+v want applicant", sink.entries[0].Role)
	}
}

func TestRequireAuthUsesServerSessionClaims(t *testing.T) {
	t.Setenv("SECRET_KEY", strings.Repeat("s", 32))
	now := time.Now().UTC()
	jwtToken, err := auth.NewJWTFromClaims(&auth.Claims{
		SID:         "session-1",
		UID:         "user-1",
		FirstName:   "Stale",
		LastName:    "Applicant",
		Role:        "applicant",
		Permissions: []string{"applicant.profile"},
		Iat:         now.Unix(),
		Exp:         now.Add(15 * time.Minute).Unix(),
	})
	if err != nil {
		t.Fatalf("failed to build jwt: %v", err)
	}

	linkedUniversity := "uni-9"
	handler := RequireAuth(zap.NewNop(), &stubSessionStore{
		session: &authsession.Session{
			ID:               "session-1",
			UserID:           "user-1",
			Email:            "staff@example.com",
			FirstName:        "Current",
			LastName:         "Staff",
			Role:             "staff",
			Permissions:      []string{"staff.settings"},
			UniversityLinked: &linkedUniversity,
			CSRFToken:        "csrf-1",
			IssuedAt:         now,
			LastSeenAt:       now,
			ExpiresAt:        now.Add(15 * time.Minute),
		},
	}, nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, claimsErr := GetClaimsFromContext(r.Context())
		if claimsErr != nil {
			t.Fatalf("missing claims in context: %v", claimsErr)
		}
		if claims.Role != "staff" {
			t.Fatalf("unexpected role from session claims: got %s want staff", claims.Role)
		}
		if len(claims.Permissions) != 1 || claims.Permissions[0] != "staff.settings" {
			t.Fatalf("unexpected permissions from session claims: %+v", claims.Permissions)
		}
		if claims.UniversityLinked == nil || *claims.UniversityLinked != linkedUniversity {
			t.Fatalf("unexpected linked university from session claims: %+v", claims.UniversityLinked)
		}

		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1.0/staff/settings", nil)
	req.AddCookie(&http.Cookie{Name: AccessTokenKey, Value: jwtToken.TokenString})
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusNoContent)
	}
}

func TestRequireAuthReturnsRevocationReason(t *testing.T) {
	t.Setenv("SECRET_KEY", strings.Repeat("r", 32))
	now := time.Now().UTC()
	jwtToken, err := auth.NewJWTFromClaims(&auth.Claims{
		SID: "session-2",
		UID: "user-2",
		Iat: now.Unix(),
		Exp: now.Add(15 * time.Minute).Unix(),
	})
	if err != nil {
		t.Fatalf("failed to build jwt: %v", err)
	}

	reason := authsession.ReasonPasswordChanged
	revokedAt := now
	handler := RequireAuth(zap.NewNop(), &stubSessionStore{
		session: &authsession.Session{
			ID:            "session-2",
			UserID:        "user-2",
			CSRFToken:     "csrf-2",
			IssuedAt:      now,
			LastSeenAt:    now,
			ExpiresAt:     now.Add(15 * time.Minute),
			RevokedAt:     &revokedAt,
			RevokedReason: &reason,
		},
	}, nil)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1.0/applicant/profile", nil)
	req.AddCookie(&http.Cookie{Name: AccessTokenKey, Value: jwtToken.TokenString})
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusUnauthorized)
	}
	if !strings.Contains(rec.Body.String(), authsession.ReasonPasswordChanged) {
		t.Fatalf("expected unauthorized reason %q in response body: %s", authsession.ReasonPasswordChanged, rec.Body.String())
	}
}

func TestRequireAuthWithoutCookieReturnsUnauthorized(t *testing.T) {
	t.Parallel()

	handler := RequireAuth(zap.NewNop(), &stubSessionStore{}, nil)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1.0/auth/session", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusUnauthorized)
	}
	if !strings.Contains(rec.Body.String(), "unauthorized") {
		t.Fatalf("expected unauthorized response body, got %s", rec.Body.String())
	}
}

func TestRequireCSRFFailsClosed(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")

	tests := []struct {
		name        string
		cookieToken string
		headerToken string
		origin      string
		wantStatus  int
	}{
		{
			name:        "missing header token",
			cookieToken: "csrf-1",
			origin:      "http://localhost:5173",
			wantStatus:  http.StatusForbidden,
		},
		{
			name:        "mismatched token",
			cookieToken: "csrf-1",
			headerToken: "csrf-2",
			origin:      "http://localhost:5173",
			wantStatus:  http.StatusForbidden,
		},
		{
			name:        "invalid origin",
			cookieToken: "csrf-1",
			headerToken: "csrf-1",
			origin:      "https://evil.example.com",
			wantStatus:  http.StatusForbidden,
		},
		{
			name:        "valid request",
			cookieToken: "csrf-1",
			headerToken: "csrf-1",
			origin:      "http://localhost:5173",
			wantStatus:  http.StatusNoContent,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := RequireCSRF(zap.NewNop(), nil)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusNoContent)
			}))

			req := httptest.NewRequest(http.MethodPost, "/v1.0/partner/university/profile", strings.NewReader(`{}`))
			req.Header.Set("Origin", tt.origin)
			if tt.headerToken != "" {
				req.Header.Set(utils.CSRFTokenHeader, tt.headerToken)
			}
			if tt.cookieToken != "" {
				req.AddCookie(&http.Cookie{Name: utils.CSRFCookieName, Value: tt.cookieToken})
			}
			req = req.WithContext(context.WithValue(req.Context(), CtxSessionKey, &authsession.Session{CSRFToken: "csrf-1"}))

			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("unexpected status: got %d want %d", rec.Code, tt.wantStatus)
			}
		})
	}
}
