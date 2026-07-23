package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	auth "kallisto/infra/auth/jwt"
	authsession "kallisto/infra/auth/session"
	"kallisto/infra/middlewares"

	"github.com/pashagolub/pgxmock/v4"
	"golang.org/x/crypto/bcrypt"
)

type testSessionStore struct {
	revokedSessionID string
	revokedReason    string
	createSession    *authsession.Session
}

func (store *testSessionStore) Create(_ context.Context, _ authsession.CreateParams) (*authsession.Session, error) {
	if store.createSession != nil {
		return store.createSession, nil
	}
	return nil, nil
}

func (store *testSessionStore) Get(_ context.Context, _ string) (*authsession.Session, error) {
	return nil, nil
}

func (store *testSessionStore) Extend(_ context.Context, _ string, _ time.Time) (*authsession.Session, error) {
	return nil, nil
}

func (store *testSessionStore) Revoke(_ context.Context, sessionID string, reason string) error {
	store.revokedSessionID = sessionID
	store.revokedReason = reason
	return nil
}

func (store *testSessionStore) RevokeAllForUser(_ context.Context, _ string, _ string) error {
	return nil
}

type testThrottle struct {
	decision *authsession.ThrottleDecision
}

func (throttle *testThrottle) Evaluate(_ context.Context, _ string, _ *string, _ time.Time) (*authsession.ThrottleDecision, error) {
	if throttle.decision != nil {
		return throttle.decision, nil
	}
	return &authsession.ThrottleDecision{Blocked: false}, nil
}

func (throttle *testThrottle) RecordAttempt(_ context.Context, _ string, _ *string, _ bool, _ bool, _ string) error {
	return nil
}

func mustNewAuthDBMock(t *testing.T) pgxmock.PgxPoolIface {
	t.Helper()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	t.Cleanup(func() {
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unmet db expectations: %v", err)
		}
		mock.Close()
	})
	return mock
}

func expectMaintenanceModeQuery(mock pgxmock.PgxPoolIface, enabled bool) {
	raw := `{"enabled":false}`
	if enabled {
		raw = `{"enabled":true}`
	}

	mock.ExpectQuery(regexp.QuoteMeta("FROM global_settings")).
		WithArgs("maintenance_mode").
		WillReturnRows(pgxmock.NewRows([]string{"setting_value"}).AddRow([]byte(raw)))
}

func expectUserLookupQuery(mock pgxmock.PgxPoolIface, email string, passwordHash string, role string) {
	mock.ExpectQuery(regexp.QuoteMeta("FROM users")).
		WithArgs(email).
		WillReturnRows(pgxmock.NewRows([]string{
			"id",
			"email",
			"password",
			"first_name",
			"last_name",
			"role",
			"university_linked",
			"is_active",
		}).AddRow(
			"user-1",
			email,
			passwordHash,
			"Test",
			"User",
			role,
			nil,
			true,
		))
}

func mustHashPassword(t *testing.T, password string) string {
	t.Helper()

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}
	return string(hash)
}

func TestGetSessionReturnsServerBackedSessionPayload(t *testing.T) {
	t.Parallel()

	mock := mustNewAuthDBMock(t)
	expectMaintenanceModeQuery(mock, false)

	handler := &AuthHandler{db: mock}
	universityLinked := "uni-1"
	req := httptest.NewRequest(http.MethodGet, "/v1.0/auth/session", nil).WithContext(context.WithValue(
		context.Background(),
		middlewares.CtxSessionKey,
		&authsession.Session{
			UserID:           "user-1",
			Email:            "partner@example.com",
			FirstName:        "Partner",
			LastName:         "User",
			Role:             "partner",
			Permissions:      []string{"partner.university.profile"},
			UniversityLinked: &universityLinked,
		},
	))
	rec := httptest.NewRecorder()

	handler.GetSession(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusOK)
	}

	var payload struct {
		User struct {
			ID               string   `json:"id"`
			Email            string   `json:"email"`
			FirstName        string   `json:"first_name"`
			LastName         string   `json:"last_name"`
			Role             string   `json:"role"`
			Permissions      []string `json:"permissions"`
			UniversityLinked *string  `json:"university_linked"`
		} `json:"user"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if payload.User.Role != "partner" {
		t.Fatalf("unexpected role: got %s want partner", payload.User.Role)
	}
	if payload.User.UniversityLinked == nil || *payload.User.UniversityLinked != universityLinked {
		t.Fatalf("unexpected linked university: %+v", payload.User.UniversityLinked)
	}
}

func TestGetSessionReturnsServiceUnavailableDuringMaintenance(t *testing.T) {
	t.Parallel()

	mock := mustNewAuthDBMock(t)
	expectMaintenanceModeQuery(mock, true)

	req := httptest.NewRequest(http.MethodGet, "/v1.0/auth/session", nil).WithContext(context.WithValue(
		context.Background(),
		middlewares.CtxSessionKey,
		&authsession.Session{Role: "partner"},
	))
	rec := httptest.NewRecorder()

	(&AuthHandler{db: mock}).GetSession(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusServiceUnavailable)
	}
	if !strings.Contains(rec.Body.String(), "maintenance mode") {
		t.Fatalf("expected maintenance mode response, got %s", rec.Body.String())
	}
}

func TestSignInBlocksNonStaffDuringMaintenance(t *testing.T) {
	mock := mustNewAuthDBMock(t)
	expectUserLookupQuery(mock, "applicant@example.com", mustHashPassword(t, "password123"), "applicant")
	expectMaintenanceModeQuery(mock, true)

	handler := &AuthHandler{
		db:           mock,
		sessionStore: &testSessionStore{},
		throttle:     &testThrottle{},
	}

	req := httptest.NewRequest(http.MethodPost, "/v1.0/auth/sign-in", strings.NewReader(`{"email":"applicant@example.com","password":"password123"}`))
	rec := httptest.NewRecorder()

	handler.SignIn(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusServiceUnavailable)
	}
	if strings.Contains(strings.Join(rec.Header().Values("Set-Cookie"), "\n"), "access_token=") {
		t.Fatalf("did not expect auth cookies to be issued during maintenance")
	}
}

func TestSignInAllowsStaffDuringMaintenance(t *testing.T) {
	t.Setenv("SECRET_KEY", strings.Repeat("s", 32))

	mock := mustNewAuthDBMock(t)
	expectUserLookupQuery(mock, "staff@example.com", mustHashPassword(t, "password123"), "staff")

	now := time.Now().UTC()
	handler := &AuthHandler{
		db: mock,
		sessionStore: &testSessionStore{
			createSession: &authsession.Session{
				ID:         "session-1",
				UserID:     "staff-1",
				Email:      "staff@example.com",
				FirstName:  "Staff",
				LastName:   "User",
				Role:       "staff",
				CSRFToken:  "csrf-1",
				IssuedAt:   now,
				LastSeenAt: now,
				ExpiresAt:  now.Add(15 * time.Minute),
			},
		},
		throttle: &testThrottle{},
	}

	req := httptest.NewRequest(http.MethodPost, "/v1.0/auth/sign-in", strings.NewReader(`{"email":"staff@example.com","password":"password123"}`))
	rec := httptest.NewRecorder()

	handler.SignIn(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusOK)
	}
	if !strings.Contains(strings.Join(rec.Header().Values("Set-Cookie"), "\n"), "access_token=") {
		t.Fatalf("expected auth cookies to be issued for staff")
	}
}

func TestSignOutRevokesCurrentSession(t *testing.T) {
	t.Parallel()

	store := &testSessionStore{}
	handler := &AuthHandler{sessionStore: store}
	req := httptest.NewRequest(http.MethodPost, "/v1.0/auth/sign-out", nil).WithContext(context.WithValue(
		context.WithValue(context.Background(), middlewares.CtxClaimsKey, &auth.Claims{
			UID:       "staff-1",
			FirstName: "Staff",
			LastName:  "User",
			Role:      "staff",
		}),
		middlewares.CtxSessionKey,
		&authsession.Session{ID: "session-9"},
	))
	rec := httptest.NewRecorder()

	handler.SignOut(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusOK)
	}
	if store.revokedSessionID != "session-9" {
		t.Fatalf("unexpected revoked session id: got %s want session-9", store.revokedSessionID)
	}
	if store.revokedReason != authsession.ReasonSessionRevoked {
		t.Fatalf("unexpected revoked reason: got %s want %s", store.revokedReason, authsession.ReasonSessionRevoked)
	}
	if !strings.Contains(strings.Join(rec.Header().Values("Set-Cookie"), "\n"), "access_token=") {
		t.Fatalf("expected auth cookies to be cleared on sign-out")
	}
}
