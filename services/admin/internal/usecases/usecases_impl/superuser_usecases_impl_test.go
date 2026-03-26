package usecases_impl

import (
	"context"
	"regexp"
	"testing"
	"time"

	"kallisto/infra/middlewares"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestGetGlobalServiceLogsSupportsStructuredFilters(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	from := "2026-03-24T10:00:00Z"
	to := "2026-03-24T12:00:00Z"
	fromTime, _ := time.Parse(time.RFC3339, from)
	toTime, _ := time.Parse(time.RFC3339, to)

	queryPattern := `(?s)` + regexp.QuoteMeta("FROM service_logs WHERE 1=1") + `.*` + regexp.QuoteMeta("request_id = $5") + `.*` + regexp.QuoteMeta("method = $6") + `.*` + regexp.QuoteMeta("status_code = $7") + `.*` + regexp.QuoteMeta("role = $8")

	mock.ExpectQuery(queryPattern).
		WithArgs("warn", "staff", "%universities%", "staff-1", "req-123", "GET", 403, "staff", fromTime, toTime).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

	mock.ExpectQuery(queryPattern).
		WithArgs("warn", "staff", "%universities%", "staff-1", "req-123", "GET", 403, "staff", fromTime, toTime, 20, 0).
		WillReturnRows(
			pgxmock.NewRows([]string{
				"id", "logged_at", "level", "microservice", "handler", "message", "user_id", "request_id", "method", "status_code", "duration_ms", "role", "ip_address", "user_agent", "metadata",
			}).AddRow(
				"log-1",
				time.Now().UTC(),
				"warn",
				"staff",
				"/v1.0/staff/universities",
				"GET /v1.0/staff/universities -> 403",
				strPtr("staff-1"),
				strPtr("req-123"),
				"GET",
				403,
				18,
				strPtr("staff"),
				strPtr("127.0.0.1"),
				strPtr("pgxmock"),
				[]byte(`{}`),
			),
		)

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	items, total, err := GetGlobalServiceLogs(ctx, "warn", "staff", "universities", "staff-1", "", "req-123", "GET", "403", "staff", from, to, 1, 20)
	if err != nil {
		t.Fatalf("GetGlobalServiceLogs returned error: %v", err)
	}
	if total != 1 {
		t.Fatalf("unexpected total: got %d want 1", total)
	}
	if len(items) != 1 || items[0].RequestId == nil || *items[0].RequestId != "req-123" {
		t.Fatalf("unexpected items: %+v", items)
	}
}

func TestGetGlobalServiceLogsDefaultsNullStructuredColumns(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	countPattern := `(?s)` + regexp.QuoteMeta("SELECT COUNT(*) FROM service_logs WHERE 1=1")
	queryPattern := `(?s)` + regexp.QuoteMeta("COALESCE(method, 'UNKNOWN') AS method") + `.*` + regexp.QuoteMeta("COALESCE(status_code, 0) AS status_code") + `.*` + regexp.QuoteMeta("COALESCE(duration_ms, 0) AS duration_ms")

	mock.ExpectQuery(countPattern).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

	mock.ExpectQuery(queryPattern).
		WithArgs(20, 0).
		WillReturnRows(
			pgxmock.NewRows([]string{
				"id", "logged_at", "level", "microservice", "handler", "message", "user_id", "request_id", "method", "status_code", "duration_ms", "role", "ip_address", "user_agent", "metadata",
			}).AddRow(
				"log-legacy",
				time.Now().UTC(),
				"info",
				"staff",
				"/v1.0/staff/service-logs",
				"legacy row",
				nil,
				nil,
				"UNKNOWN",
				0,
				0,
				nil,
				nil,
				nil,
				[]byte(`{}`),
			),
		)

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	items, total, err := GetGlobalServiceLogs(ctx, "", "", "", "", "", "", "", "", "", "", "", 1, 20)
	if err != nil {
		t.Fatalf("GetGlobalServiceLogs returned error: %v", err)
	}
	if total != 1 {
		t.Fatalf("unexpected total: got %d want 1", total)
	}
	if len(items) != 1 {
		t.Fatalf("unexpected items length: got %d want 1", len(items))
	}
	if items[0].Method != "UNKNOWN" {
		t.Fatalf("unexpected method: got %s want UNKNOWN", items[0].Method)
	}
	if items[0].StatusCode != 0 {
		t.Fatalf("unexpected status code: got %d want 0", items[0].StatusCode)
	}
	if items[0].DurationMs != 0 {
		t.Fatalf("unexpected duration: got %d want 0", items[0].DurationMs)
	}
}

func TestGetGlobalAuditLogsSupportsRequestIDAndActorFilters(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	from := "2026-03-24T10:00:00Z"
	to := "2026-03-24T12:00:00Z"
	fromTime, _ := time.Parse(time.RFC3339, from)
	toTime, _ := time.Parse(time.RFC3339, to)

	queryPattern := `(?s)` + regexp.QuoteMeta("FROM audit_logs WHERE 1=1") + `.*` + regexp.QuoteMeta("request_id = $4") + `.*` + regexp.QuoteMeta("actor_type = $5") + `.*` + regexp.QuoteMeta("target_entity ILIKE $6")

	mock.ExpectQuery(queryPattern).
		WithArgs("%access%", "security.access-denied", "failed", "req-123", "staff", "%/v1.0/staff%", fromTime, toTime).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

	mock.ExpectQuery(queryPattern).
		WithArgs("%access%", "security.access-denied", "failed", "req-123", "staff", "%/v1.0/staff%", fromTime, toTime, 20, 0).
		WillReturnRows(
			pgxmock.NewRows([]string{
				"id", "occurred_at", "actor_name", "actor_id", "actor_type", "action_type", "action_description", "target_entity", "target_id", "outcome", "ip_address", "request_id", "metadata",
			}).AddRow(
				"audit-1",
				time.Now().UTC(),
				"Platform Staff",
				strPtr("staff-1"),
				"staff",
				"security.access-denied",
				"Permission access denied",
				"/v1.0/staff/universities",
				nil,
				"failed",
				strPtr("127.0.0.1"),
				strPtr("req-123"),
				[]byte(`{}`),
			),
		)

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	items, total, err := GetGlobalAuditLogs(ctx, "access", "security.access-denied", "failed", "req-123", "staff", "/v1.0/staff", from, to, 1, 20)
	if err != nil {
		t.Fatalf("GetGlobalAuditLogs returned error: %v", err)
	}
	if total != 1 {
		t.Fatalf("unexpected total: got %d want 1", total)
	}
	if len(items) != 1 || items[0].RequestId == nil || *items[0].RequestId != "req-123" {
		t.Fatalf("unexpected items: %+v", items)
	}
}

func strPtr(value string) *string {
	return &value
}
