//go:build integration

package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"kallisto/infra/middlewares"

	"github.com/jackc/pgx/v5/pgxpool"
)

func newAdminTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("ADMIN_DB_CONNECTION_URL")
	if dsn == "" {
		t.Fatalf("ADMIN_DB_CONNECTION_URL is empty. Set it to your admin test Postgres URL.")
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("failed to create pgx pool: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Fatalf("failed to ping admin db: %v", err)
	}

	t.Cleanup(func() { pool.Close() })
	return pool
}

func cleanAdminDB(t *testing.T, ctx context.Context, pool *pgxpool.Pool) {
	t.Helper()

	// These table names match your migrations. If your schema has more FK tables,
	// add them here.
	_, err := pool.Exec(ctx, `TRUNCATE TABLE submitted_applications, users, universities CASCADE;`)
	if err != nil {
		t.Fatalf("failed to clean admin db: %v", err)
	}
}

func TestReceiveApplication_StoresRowInSubmittedApplications(t *testing.T) {
	pool := newAdminTestPool(t)
	ctx := context.Background()
	cleanAdminDB(t, ctx, pool)

	userID := "11111111-1111-1111-1111-111111111111"
	universityID := "22222222-2222-2222-2222-222222222222"

	// 1) Ensure FK target exists
	_, err := pool.Exec(ctx, `
		INSERT INTO universities (id, name)
		VALUES ($1, $2)
	`, universityID, "Test University")
	if err != nil {
		t.Fatalf("failed to insert university: %v", err)
	}

	// 2) Build payload
	payload := map[string]any{
		"user_id":           userID,
		"university_id":     universityID,
		"application_cycle": "2026-fall",
		"submitted_at":      "2026-01-01T12:00:00Z",
		"applicant_info": map[string]any{
			"first_name": "Test",
			"last_name":  "Applicant",
			"email":      "test@applicant.com",
		},
		"application_data": map[string]any{
			"field": "value",
		},
	}

	body, _ := json.Marshal(payload)

	// 3) Create HTTP request with body
	req := httptest.NewRequest(http.MethodPost, "/v1.0/applications/receive", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	// 4) Inject DB pool into request context (middleware emulation)
	req = req.WithContext(context.WithValue(req.Context(), middlewares.CtxPostgresKey, pool))

	rr := httptest.NewRecorder()

	// 5) Call handler
	ReceiveApplicationHandler(rr, req)

	// 6) Check response
	if rr.Code < 200 || rr.Code >= 300 {
		t.Fatalf("expected 2xx, got %d, body=%s", rr.Code, rr.Body.String())
	}

	// 7) Assert row exists
	var storedUser, storedUni, storedCycle string
	err = pool.QueryRow(ctx, `
		SELECT user_id, university_id, application_cycle
		FROM submitted_applications
		LIMIT 1
	`).Scan(&storedUser, &storedUni, &storedCycle)
	if err != nil {
		t.Fatalf("failed to read submitted application: %v", err)
	}

	if storedUser != userID {
		t.Fatalf("expected user_id=%s got %s", userID, storedUser)
	}
	if storedUni != universityID {
		t.Fatalf("expected university_id=%s got %s", universityID, storedUni)
	}
	if storedCycle != "2026-fall" {
		t.Fatalf("expected application_cycle=2026-fall got %s", storedCycle)
	}
}
