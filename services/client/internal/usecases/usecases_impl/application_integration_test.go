//go:build integration

package usecases_impl

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"kallisto/infra/middlewares"
	"kallisto/services/client/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func newTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("DB_CONNECTION_URL")
	if dsn == "" {
		t.Fatalf("DB_CONNECTION_URL is empty. Set it to your test Postgres URL.")
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("failed to create pgx pool: %v", err)
	}

	// Sanity ping
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Fatalf("failed to ping database: %v", err)
	}

	t.Cleanup(func() { pool.Close() })
	return pool
}

func cleanClientDB(t *testing.T, ctx context.Context, pool *pgxpool.Pool) {
	t.Helper()
	// CASCADE handles FK order (applications depends on users/universities)
	_, err := pool.Exec(ctx, `TRUNCATE TABLE applications, users, universities CASCADE;`)
	if err != nil {
		t.Fatalf("failed to clean db: %v", err)
	}
}

func insertUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id string, email string) {
	t.Helper()
	// Password can be junk here; we’re not testing auth hashing in this test.
	_, err := pool.Exec(ctx, `
		INSERT INTO users (id, email, password, first_name, last_name)
		VALUES ($1, $2, $3, $4, $5)
	`, id, email, "hashed", "Test", "User")
	if err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
}

func insertUniversity(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id string, name string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO universities (id, name)
		VALUES ($1, $2)
	`, id, name)
	if err != nil {
		t.Fatalf("failed to insert university: %v", err)
	}
}

func TestApplicationFlow_CreateUpdateSubmit(t *testing.T) {
	pool := newTestPool(t)
	ctx := context.Background()
	cleanClientDB(t, ctx, pool)

	// Inject pool into context exactly like your middleware does
	ctx = context.WithValue(ctx, middlewares.CtxPostgresKey, pool)

	userID := uuid.NewString()
	universityID := uuid.NewString()
	cycle := "2026-fall"

	insertUser(t, ctx, pool, userID, "test@example.com")
	insertUniversity(t, ctx, pool, universityID, "Test University")

	// 1) Create draft
	createData := json.RawMessage(`{"field":"value"}`)
	err := CreateApplication(ctx, userID, &models.ApplicationCreateRequest{
		UniversityId:     universityID,
		ApplicationCycle: cycle,
		Data:             createData,
	})
	if err != nil {
		t.Fatalf("CreateApplication failed: %v", err)
	}

	// 2) Update draft
	updateData := json.RawMessage(`{"field":"updated"}`)
	err = UpdateApplication(ctx, userID, universityID, cycle, &models.ApplicationUpdateRequest{
		Data: updateData,
	})
	if err != nil {
		t.Fatalf("UpdateApplication failed: %v", err)
	}

	// 3) Submit
	err = SubmitApplication(ctx, userID, universityID, cycle)
	if err != nil {
		t.Fatalf("SubmitApplication failed: %v", err)
	}

	// 4) Assert DB state
	var got any
	var want any
	var status string
	var submittedAt *time.Time
	var storedData json.RawMessage

	if err := pool.QueryRow(ctx, `
    	SELECT status, submitted_at, data
    	FROM applications
    	WHERE user_id = $1 AND university_id = $2 AND application_cycle = $3
	`, userID, universityID, cycle).Scan(&status, &submittedAt, &storedData); err != nil {
		t.Fatalf("failed to query application: %v", err)
	}

	if status != models.StatusSubmitted {
		t.Fatalf("expected status=%q, got %q", models.StatusSubmitted, status)
	}
	if submittedAt == nil {
		t.Fatalf("expected submitted_at to be set, got nil")
	}

	if err := json.Unmarshal(storedData, &got); err != nil {
		t.Fatalf("failed to unmarshal stored data: %v (%s)", err, string(storedData))
	}
	if err := json.Unmarshal(updateData, &want); err != nil {
		t.Fatalf("failed to unmarshal expected data: %v (%s)", err, string(updateData))
	}

	// Re-marshal both to canonical JSON (stable formatting) then compare strings
	gotCanonical, _ := json.Marshal(got)
	wantCanonical, _ := json.Marshal(want)

	if string(gotCanonical) != string(wantCanonical) {
		t.Fatalf("expected json=%s, got %s", string(wantCanonical), string(gotCanonical))
	}

}

func TestSubmitApplication_CannotSubmitTwice(t *testing.T) {
	pool := newTestPool(t)
	ctx := context.Background()
	cleanClientDB(t, ctx, pool)
	ctx = context.WithValue(ctx, middlewares.CtxPostgresKey, pool)

	userID := uuid.NewString()
	universityID := uuid.NewString()
	cycle := "2026-fall"

	insertUser(t, ctx, pool, userID, "twice@example.com")
	insertUniversity(t, ctx, pool, universityID, "Submit Twice University")

	err := CreateApplication(ctx, userID, &models.ApplicationCreateRequest{
		UniversityId:     universityID,
		ApplicationCycle: cycle,
		Data:             json.RawMessage(`{"x":1}`),
	})
	if err != nil {
		t.Fatalf("CreateApplication failed: %v", err)
	}

	err = SubmitApplication(ctx, userID, universityID, cycle)
	if err != nil {
		t.Fatalf("first SubmitApplication failed: %v", err)
	}

	err = SubmitApplication(ctx, userID, universityID, cycle)
	if err == nil {
		t.Fatalf("expected second submit to return error, got nil")
	}
}

func TestSubmitApplication_ReturnsErrorIfAlreadySubmitted(t *testing.T) {
	pool := newTestPool(t)
	ctx := context.Background()
	cleanClientDB(t, ctx, pool)
	ctx = context.WithValue(ctx, middlewares.CtxPostgresKey, pool)

	userID := uuid.NewString()
	universityID := uuid.NewString()
	cycle := "2026-fall"

	insertUser(t, ctx, pool, userID, "twice@example.com")
	insertUniversity(t, ctx, pool, universityID, "Submit Twice University")

	// Create draft
	err := CreateApplication(ctx, userID, &models.ApplicationCreateRequest{
		UniversityId:     universityID,
		ApplicationCycle: cycle,
		Data:             json.RawMessage(`{"x":1}`),
	})
	if err != nil {
		t.Fatalf("CreateApplication failed: %v", err)
	}

	// First submit should succeed
	err = SubmitApplication(ctx, userID, universityID, cycle)
	if err != nil {
		t.Fatalf("first SubmitApplication failed: %v", err)
	}

	// Second submit must return an error
	err = SubmitApplication(ctx, userID, universityID, cycle)
	if err == nil {
		t.Fatalf("expected second submit to return error, got nil")
	}
}
