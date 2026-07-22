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

func TestGetStaffOverviewBuildsThresholdBasedHealthMetrics(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	expectStaffOverviewCoreQueries(mock, 12, 4, 33, 2, 9, 7, 6, 5, 4, 3, 2, 1)
	mock.ExpectQuery(`(?s)` + regexp.QuoteMeta("FROM audit_logs") + `.*` + regexp.QuoteMeta("LIMIT 6")).
		WillReturnRows(pgxmock.NewRows([]string{"id", "action_type", "action_description", "actor_name", "occurred_at", "outcome"}))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM pg_stat_activity")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(72))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT setting::int FROM pg_settings WHERE name = 'max_connections'")).
		WillReturnRows(pgxmock.NewRows([]string{"setting"}).AddRow(100))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM service_logs WHERE logged_at >= NOW() - INTERVAL '24 hours'")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(200))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM service_logs WHERE level IN ('error', 'fatal') AND logged_at >= NOW() - INTERVAL '24 hours'")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT AVG(duration_ms)::float8 FROM service_logs WHERE logged_at >= NOW() - INTERVAL '24 hours' AND duration_ms IS NOT NULL")).
		WillReturnRows(pgxmock.NewRows([]string{"avg"}).AddRow(450.0))

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	result, err := GetStaffOverview(ctx)
	if err != nil {
		t.Fatalf("GetStaffOverview returned error: %v", err)
	}
	if len(result.SystemHealth) != 4 {
		t.Fatalf("unexpected system health length: got %d want 4", len(result.SystemHealth))
	}
	if result.Stats.TotalStudents != 12 || result.Stats.ApplicationsSubmitted != 7 {
		t.Fatalf("unexpected stats: %+v", result.Stats)
	}
	if len(result.ApplicationFunnel) != 8 {
		t.Fatalf("unexpected funnel length: got %d want 8", len(result.ApplicationFunnel))
	}
	if result.SystemHealth[0].Status != "warn" {
		t.Fatalf("unexpected response-time status: got %s want warn", result.SystemHealth[0].Status)
	}
	if result.SystemHealth[1].Status != "warn" {
		t.Fatalf("unexpected db-connections status: got %s want warn", result.SystemHealth[1].Status)
	}
	if result.SystemHealth[2].Status != "good" {
		t.Fatalf("unexpected error-rate status: got %s want good", result.SystemHealth[2].Status)
	}
	if result.SystemHealth[3].Status != "neutral" {
		t.Fatalf("unexpected observed-requests status: got %s want neutral", result.SystemHealth[3].Status)
	}
}

func TestGetStaffOverviewHandlesNoTrafficAndUnknownMaxConnections(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	expectStaffOverviewCoreQueries(mock, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0)
	mock.ExpectQuery(`(?s)` + regexp.QuoteMeta("FROM audit_logs") + `.*` + regexp.QuoteMeta("LIMIT 6")).
		WillReturnRows(pgxmock.NewRows([]string{"id", "action_type", "action_description", "actor_name", "occurred_at", "outcome"}))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM pg_stat_activity")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(5))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT setting::int FROM pg_settings WHERE name = 'max_connections'")).
		WillReturnError(context.DeadlineExceeded)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM service_logs WHERE logged_at >= NOW() - INTERVAL '24 hours'")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(0))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM service_logs WHERE level IN ('error', 'fatal') AND logged_at >= NOW() - INTERVAL '24 hours'")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(0))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT AVG(duration_ms)::float8 FROM service_logs WHERE logged_at >= NOW() - INTERVAL '24 hours' AND duration_ms IS NOT NULL")).
		WillReturnRows(pgxmock.NewRows([]string{"avg"}).AddRow(nil))

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	result, err := GetStaffOverview(ctx)
	if err != nil {
		t.Fatalf("GetStaffOverview returned error: %v", err)
	}
	if result.SystemHealth[0].Status != "neutral" || result.SystemHealth[0].Value != "No traffic" {
		t.Fatalf("unexpected response metric: %+v", result.SystemHealth[0])
	}
	if result.SystemHealth[1].Status != "neutral" {
		t.Fatalf("unexpected db metric: %+v", result.SystemHealth[1])
	}
	if result.SystemHealth[2].Status != "neutral" || result.SystemHealth[2].Value != "No traffic" {
		t.Fatalf("unexpected error metric: %+v", result.SystemHealth[2])
	}
}

func expectStaffOverviewCoreQueries(
	mock pgxmock.PgxPoolIface,
	students int,
	newStudents int,
	universities int,
	programs int,
	started int,
	submitted int,
	pendingDocs int,
	portalAccounts int,
	totalApplications int,
	profileCompleted int,
	universitySelected int,
	documentsUploaded int,
) {
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM users WHERE role = 'applicant'")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(students))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM users WHERE role = 'applicant' AND created_at >= NOW() - INTERVAL '7 days'")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(newStudents))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM universities")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(universities))
	mock.ExpectQuery(regexp.QuoteMeta("jsonb_path_query_array")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(programs))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM applications")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(started))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM applications WHERE status <> 'draft'")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(submitted))
	mock.ExpectQuery(regexp.QuoteMeta("FROM application_files af")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(pendingDocs))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM users WHERE role IN ('partner', 'staff')")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(portalAccounts))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM applications")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(totalApplications))
	mock.ExpectQuery(regexp.QuoteMeta("first_name IS NOT NULL AND last_name IS NOT NULL")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(profileCompleted))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(DISTINCT user_id) FROM user_compare")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(universitySelected))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(DISTINCT user_id) FROM applications")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(started))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(DISTINCT user_id) FROM application_files")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(documentsUploaded))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(DISTINCT user_id) FROM applications WHERE status <> 'draft'")).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(submitted))
	mock.ExpectQuery(regexp.QuoteMeta("generate_series")).
		WillReturnRows(pgxmock.NewRows([]string{"label", "count"}).AddRow("2026-07-01", newStudents))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT status, COUNT(*)::int AS count")).
		WillReturnRows(pgxmock.NewRows([]string{"status", "count"}).AddRow("submitted", submitted))
	mock.ExpectQuery(regexp.QuoteMeta("JOIN universities u ON u.id = a.university_id")).
		WillReturnRows(pgxmock.NewRows([]string{"label", "count"}).AddRow("Kallisto University", submitted))
	mock.ExpectQuery(regexp.QuoteMeta("Unknown program")).
		WillReturnRows(pgxmock.NewRows([]string{"label", "count"}).AddRow("Business", submitted))
	mock.ExpectQuery(regexp.QuoteMeta("COALESCE(region_code, 'unknown') AS label")).
		WillReturnRows(pgxmock.NewRows([]string{"label", "count"}).AddRow("tashkent_city", students))
}
