package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	auth "kallisto/infra/auth/jwt"
	authsession "kallisto/infra/auth/session"
	"kallisto/infra/middlewares"
)

type testSessionStore struct {
	revokedSessionID string
	revokedReason    string
}

func (store *testSessionStore) Create(_ context.Context, _ authsession.CreateParams) (*authsession.Session, error) {
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

func TestGetSessionReturnsServerBackedSessionPayload(t *testing.T) {
	t.Parallel()

	handler := &AuthHandler{}
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
