//go:build integration

package usecases_impl

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"kallisto/infra/middlewares"
	"kallisto/services/client/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func newClientTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("DB_CONNECTION_URL")
	if dsn == "" {
		t.Fatalf("DB_CONNECTION_URL is empty")
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("failed to create pgx pool: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Fatalf("failed to ping client db: %v", err)
	}

	t.Cleanup(func() { pool.Close() })
	return pool
}

func cleanClientDB2(t *testing.T, ctx context.Context, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(ctx, `TRUNCATE TABLE applications, users, universities CASCADE;`)
	if err != nil {
		t.Fatalf("failed to clean client db: %v", err)
	}
}

func insertClientUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id string, email string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO users (id, email, password, first_name, last_name)
		VALUES ($1, $2, $3, $4, $5)
	`, id, email, "hashed", "Test", "User")
	if err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
}

func insertClientUniversity(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id string, name string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO universities (id, name)
		VALUES ($1, $2)
	`, id, name)
	if err != nil {
		t.Fatalf("failed to insert university: %v", err)
	}
}

func TestSubmitApplication_ForwardsToAdminService(t *testing.T) {
	// Channel to capture the forwarded request payload
	gotBodyCh := make(chan []byte, 1)
	var hitCount int32

	// Fake admin server
	adminServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hitCount, 1)

		// Your client usually posts here:
		// /v1.0/applications/receive
		// We’ll be tolerant and just require POST.
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}

		body, _ := io.ReadAll(r.Body)
		_ = r.Body.Close()

		gotBodyCh <- body

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	t.Cleanup(adminServer.Close)

	// IMPORTANT: point client forwarding to our fake admin server
	// (this must match whatever env var your code reads)
	os.Setenv("ADMIN_SERVICE_URL", adminServer.URL)
	t.Cleanup(func() { os.Unsetenv("ADMIN_SERVICE_URL") })

	// Setup real client DB
	pool := newClientTestPool(t)
	ctx := context.Background()
	cleanClientDB2(t, ctx, pool)
	ctx = context.WithValue(ctx, middlewares.CtxPostgresKey, pool)

	userID := uuid.NewString()
	universityID := uuid.NewString()
	cycle := "2026-fall"

	insertClientUser(t, ctx, pool, userID, "forward@test.com")
	insertClientUniversity(t, ctx, pool, universityID, "Forwarding University")

	// Create draft (with some application data)
	err := CreateApplication(ctx, userID, &models.ApplicationCreateRequest{
		UniversityId:     universityID,
		ApplicationCycle: cycle,
		Data:             json.RawMessage(`{"field":"value"}`),
	})
	if err != nil {
		t.Fatalf("CreateApplication failed: %v", err)
	}

	// Submit (this should trigger async forward)
	err = SubmitApplication(ctx, userID, universityID, cycle)
	if err != nil {
		t.Fatalf("SubmitApplication failed: %v", err)
	}

	// Because forwarding happens in a goroutine, we wait for it.
	select {
	case body := <-gotBodyCh:
		// Parse JSON payload
		var m map[string]any
		if err := json.Unmarshal(body, &m); err != nil {
			t.Fatalf("forwarded body is not valid JSON: %v\nbody=%s", err, string(body))
		}

		// Minimal, robust assertions (don’t overfit to formatting)
		if m["user_id"] != userID {
			t.Fatalf("expected user_id=%s got %v", userID, m["user_id"])
		}
		if m["university_id"] != universityID {
			t.Fatalf("expected university_id=%s got %v", universityID, m["university_id"])
		}
		if m["application_cycle"] != cycle {
			t.Fatalf("expected application_cycle=%s got %v", cycle, m["application_cycle"])
		}

		// These should exist for admin receive request:
		if _, ok := m["submitted_at"]; !ok {
			t.Fatalf("expected submitted_at in forwarded payload, got %v", m)
		}
		if _, ok := m["applicant_info"]; !ok {
			t.Fatalf("expected applicant_info in forwarded payload, got %v", m)
		}
		if _, ok := m["application_data"]; !ok {
			t.Fatalf("expected application_data in forwarded payload, got %v", m)
		}

	case <-time.After(2 * time.Second):
		t.Fatalf("timed out waiting for forwarding request to admin")
	}

	// Optional: ensure it hit exactly once (can be flaky if retries exist later)
	if atomic.LoadInt32(&hitCount) != 1 {
		t.Fatalf("expected admin endpoint to be called once, got %d", hitCount)
	}
}
