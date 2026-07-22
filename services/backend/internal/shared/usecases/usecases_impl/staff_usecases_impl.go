package usecases_impl

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"kallisto/infra/middlewares"
	"kallisto/infra/observability"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/shared/models"

	"github.com/jackc/pgx/v5"
)

func getDBConn(ctx context.Context) (middlewares.DB, error) {
	return middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
}

func GetStaffOverview(ctx context.Context) (*models.GlobalOverviewResponse, error) {
	conn, err := getDBConn(ctx)
	if err != nil {
		return nil, err
	}

	var stats models.GlobalOverviewStats
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = 'applicant'").Scan(&stats.TotalStudents); err != nil {
		return nil, fmt.Errorf("failed to count students: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = 'applicant' AND created_at >= NOW() - INTERVAL '7 days'").Scan(&stats.NewStudentsLast7Days); err != nil {
		return nil, fmt.Errorf("failed to count new students: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM universities").Scan(&stats.TotalUniversities); err != nil {
		return nil, fmt.Errorf("failed to count universities: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COALESCE(SUM(jsonb_array_length(jsonb_path_query_array(COALESCE(university_profile, '{}'::jsonb), '$.programGroups[*].programs[*]'))), 0)::int FROM universities WHERE COALESCE(management_status, 'active') = 'active'").Scan(&stats.ActivePrograms); err != nil {
		return nil, fmt.Errorf("failed to count active programs: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM applications").Scan(&stats.ApplicationsStarted); err != nil {
		return nil, fmt.Errorf("failed to count started applications: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM applications WHERE status <> 'draft'").Scan(&stats.ApplicationsSubmitted); err != nil {
		return nil, fmt.Errorf("failed to count submitted applications: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM application_files af JOIN applications a ON a.user_id = af.user_id AND a.university_id = af.university_id AND a.application_cycle = af.application_cycle WHERE a.status <> 'draft'").Scan(&stats.PendingDocumentReviews); err != nil {
		return nil, fmt.Errorf("failed to count pending document reviews: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role IN ('partner', 'staff')").Scan(&stats.PortalAccounts); err != nil {
		return nil, fmt.Errorf("failed to count role accounts: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM applications").Scan(&stats.TotalApplications); err != nil {
		return nil, fmt.Errorf("failed to count applications: %s", err.Error())
	}

	funnel := []models.GlobalOverviewFunnelStep{
		{Stage: "registered", Count: stats.TotalStudents},
		{Stage: "profile_completed", Count: countOrZero(ctx, conn, "SELECT COUNT(*) FROM users WHERE role = 'applicant' AND first_name IS NOT NULL AND last_name IS NOT NULL AND region_code IS NOT NULL")},
		{Stage: "university_selected", Count: countOrZero(ctx, conn, "SELECT COUNT(DISTINCT user_id) FROM user_compare")},
		{Stage: "application_started", Count: countOrZero(ctx, conn, "SELECT COUNT(DISTINCT user_id) FROM applications")},
		{Stage: "documents_uploaded", Count: countOrZero(ctx, conn, "SELECT COUNT(DISTINCT user_id) FROM application_files")},
		{Stage: "application_submitted", Count: countOrZero(ctx, conn, "SELECT COUNT(DISTINCT user_id) FROM applications WHERE status <> 'draft'")},
		{Stage: "sent_to_university", Count: 0},
		{Stage: "accepted", Count: 0},
	}

	registrationsByDate, err := querySeries(ctx, conn, `
		SELECT TO_CHAR(day, 'YYYY-MM-DD') AS label, COUNT(u.id)::int AS count
		FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') day
		LEFT JOIN users u ON u.role = 'applicant' AND u.created_at::date = day::date
		GROUP BY day
		ORDER BY day ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query registrations by date: %s", err.Error())
	}
	applicationsByStatus, err := queryStatusPoints(ctx, conn, `
		SELECT status, COUNT(*)::int AS count
		FROM applications
		GROUP BY status
		ORDER BY status ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query applications by status: %s", err.Error())
	}
	popularUniversities, err := querySeries(ctx, conn, `
		SELECT u.name AS label, COUNT(a.id)::int AS count
		FROM applications a
		JOIN universities u ON u.id = a.university_id
		GROUP BY u.id, u.name
		ORDER BY count DESC, u.name ASC
		LIMIT 8`)
	if err != nil {
		return nil, fmt.Errorf("failed to query popular universities: %s", err.Error())
	}
	popularPrograms, err := querySeries(ctx, conn, `
		SELECT COALESCE(NULLIF(a.data->>'program', ''), NULLIF(a.data->>'programName', ''), NULLIF(a.data->>'intendedMajor', ''), 'Unknown program') AS label,
		       COUNT(*)::int AS count
		FROM applications a
		GROUP BY label
		ORDER BY count DESC, label ASC
		LIMIT 8`)
	if err != nil {
		return nil, fmt.Errorf("failed to query popular programs: %s", err.Error())
	}
	studentsByRegion, err := querySeries(ctx, conn, `
		SELECT COALESCE(region_code, 'unknown') AS label, COUNT(*)::int AS count
		FROM users
		WHERE role = 'applicant'
		GROUP BY COALESCE(region_code, 'unknown')
		ORDER BY count DESC, label ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query students by region: %s", err.Error())
	}
	conversion := []models.GlobalOverviewSeriesPoint{
		{Label: "started", Count: stats.ApplicationsStarted},
		{Label: "submitted", Count: stats.ApplicationsSubmitted},
	}

	recentActivity := make([]models.GlobalOverviewActivity, 0, 6)
	activityRows, err := conn.Query(ctx, `
		SELECT id::text, action_type, action_description, actor_name, occurred_at, outcome
		FROM audit_logs
		ORDER BY occurred_at DESC
		LIMIT 6`)
	if err != nil {
		return nil, fmt.Errorf("failed to query recent activity: %s", err.Error())
	}
	defer activityRows.Close()

	for activityRows.Next() {
		var (
			id          string
			actionType  string
			description string
			actor       string
			occurredAt  time.Time
			outcome     string
		)
		if err := activityRows.Scan(&id, &actionType, &description, &actor, &occurredAt, &outcome); err != nil {
			return nil, fmt.Errorf("failed to scan recent activity: %s", err.Error())
		}
		recentActivity = append(recentActivity, models.GlobalOverviewActivity{
			Id:          id,
			Type:        titleFromActionType(actionType),
			Description: description,
			User:        actor,
			Timestamp:   relativeTimeFrom(occurredAt),
			Status:      outcome,
		})
	}

	var (
		dbConnections  int
		maxConnections sql.NullInt64
		recentErrors   int
		recentLogs     int
		avgDurationMs  sql.NullFloat64
	)
	_ = conn.QueryRow(ctx, "SELECT COUNT(*) FROM pg_stat_activity").Scan(&dbConnections)
	_ = conn.QueryRow(ctx, "SELECT setting::int FROM pg_settings WHERE name = 'max_connections'").Scan(&maxConnections)
	_ = conn.QueryRow(ctx, "SELECT COUNT(*) FROM service_logs WHERE logged_at >= NOW() - INTERVAL '24 hours'").Scan(&recentLogs)
	_ = conn.QueryRow(ctx, "SELECT COUNT(*) FROM service_logs WHERE level IN ('error', 'fatal') AND logged_at >= NOW() - INTERVAL '24 hours'").Scan(&recentErrors)
	_ = conn.QueryRow(ctx, "SELECT AVG(duration_ms)::float8 FROM service_logs WHERE logged_at >= NOW() - INTERVAL '24 hours' AND duration_ms IS NOT NULL").Scan(&avgDurationMs)

	responseValue, responseStatus := buildObservedResponseTimeMetric(avgDurationMs, recentLogs)
	dbConnectionsValue, dbConnectionsStatus := buildDatabaseConnectionsMetric(dbConnections, maxConnections)
	errorRateValue, errorRateStatus := buildErrorRateMetric(recentErrors, recentLogs)

	systemHealth := []models.GlobalOverviewHealthMetric{
		{Label: "Observed Response Time (24h)", Value: responseValue, Status: responseStatus},
		{Label: "Database Connections", Value: dbConnectionsValue, Status: dbConnectionsStatus},
		{Label: "Error Rate (24h)", Value: errorRateValue, Status: errorRateStatus},
		{Label: "Observed Requests (24h)", Value: fmt.Sprintf("%d", recentLogs), Status: "neutral"},
	}

	return &models.GlobalOverviewResponse{
		Stats:                 stats,
		ApplicationFunnel:     funnel,
		RegistrationsByDate:   registrationsByDate,
		ApplicationsByStatus:  applicationsByStatus,
		PopularUniversities:   popularUniversities,
		PopularPrograms:       popularPrograms,
		StudentsByRegion:      studentsByRegion,
		ApplicationConversion: conversion,
		RecentActivity:        recentActivity,
		SystemHealth:          systemHealth,
	}, nil
}

func GetGlobalStudents(ctx context.Context, search, region, status, completion, paymentStatus, registeredFrom, registeredTo string, page, limit int) ([]models.GlobalStudentListItem, int, error) {
	conn, err := getDBConn(ctx)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := `
		FROM users u
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS applications_count,
			       COUNT(*) FILTER (WHERE status <> 'draft')::int AS submitted_applications_count
			FROM applications a
			WHERE a.user_id = u.id
		) app ON true
		WHERE u.role = 'applicant'`

	args := make([]any, 0, 8)
	argPos := 0

	if strings.TrimSpace(search) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND (u.id::text ILIKE $%d OR u.email ILIKE $%d OR CONCAT_WS(' ', u.first_name, u.last_name) ILIKE $%d OR COALESCE(u.data->>'phone', '') ILIKE $%d)", argPos, argPos, argPos, argPos)
		args = append(args, "%"+strings.TrimSpace(search)+"%")
	}
	if strings.TrimSpace(region) != "" && region != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND u.region_code = $%d", argPos)
		args = append(args, strings.TrimSpace(region))
	}
	if strings.TrimSpace(status) != "" && status != "all" {
		argPos++
		if status == "active" {
			baseQuery += fmt.Sprintf(" AND COALESCE(u.data->>'accountStatus', 'active') = $%d", argPos)
		} else {
			baseQuery += fmt.Sprintf(" AND COALESCE(u.data->>'accountStatus', 'active') = $%d", argPos)
		}
		args = append(args, strings.TrimSpace(status))
	}
	if strings.TrimSpace(paymentStatus) != "" && paymentStatus != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND COALESCE(u.data->>'paymentStatus', 'unpaid') = $%d", argPos)
		args = append(args, strings.TrimSpace(paymentStatus))
	}
	if parsedFrom := parseDateFilter(registeredFrom); parsedFrom != nil {
		argPos++
		baseQuery += fmt.Sprintf(" AND u.created_at >= $%d", argPos)
		args = append(args, *parsedFrom)
	}
	if parsedTo := parseDateFilter(registeredTo); parsedTo != nil {
		argPos++
		baseQuery += fmt.Sprintf(" AND u.created_at < $%d", argPos)
		args = append(args, parsedTo.Add(24*time.Hour))
	}

	profileCompletionExpr := `
		(
			(CASE WHEN COALESCE(u.first_name, '') <> '' THEN 1 ELSE 0 END) +
			(CASE WHEN COALESCE(u.last_name, '') <> '' THEN 1 ELSE 0 END) +
			(CASE WHEN COALESCE(u.email, '') <> '' THEN 1 ELSE 0 END) +
			(CASE WHEN COALESCE(u.data->>'phone', '') <> '' THEN 1 ELSE 0 END) +
			(CASE WHEN COALESCE(u.region_code, '') <> '' THEN 1 ELSE 0 END) +
			(CASE WHEN COALESCE(u.data->>'intendedMajor', u.data->>'intended_major', '') <> '' THEN 1 ELSE 0 END) +
			(CASE WHEN COALESCE(u.data->>'preferredLanguage', u.data->>'preferred_language', '') <> '' THEN 1 ELSE 0 END) +
			(CASE WHEN COALESCE(u.data->>'budgetPerYear', u.data->>'budget_per_year', '') <> '' THEN 1 ELSE 0 END)
		) * 100 / 8`

	if strings.TrimSpace(completion) != "" && completion != "all" {
		switch completion {
		case "complete":
			baseQuery += " AND " + profileCompletionExpr + " >= 80"
		case "partial":
			baseQuery += " AND " + profileCompletionExpr + " BETWEEN 40 AND 79"
		case "low":
			baseQuery += " AND " + profileCompletionExpr + " < 40"
		}
	}

	var total int
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count students: %s", err.Error())
	}

	offset := (page - 1) * limit
	argPos++
	limitPos := argPos
	argPos++
	offsetPos := argPos
	args = append(args, limit, offset)

	rows, err := conn.Query(ctx, fmt.Sprintf(`
		SELECT
			u.id::text AS student_id,
			COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Unnamed student') AS full_name,
			u.email AS email,
			NULLIF(u.data->>'phone', '') AS phone_number,
			u.region_code AS region_code,
			COALESCE(NULLIF(u.data->>'interfaceLanguage', ''), NULLIF(u.data->>'language', ''), 'en') AS interface_language,
			%s::int AS profile_completion_percent,
			COALESCE(app.applications_count, 0)::int AS applications_count,
			COALESCE(app.submitted_applications_count, 0)::int AS submitted_applications_count,
			COALESCE(NULLIF(u.data->>'paymentStatus', ''), 'unpaid') AS payment_status,
			COALESCE(NULLIF(u.data->>'accountStatus', ''), 'active') AS account_status,
			u.created_at AS registration_date,
			u.last_seen AS last_activity
		%s
		ORDER BY u.created_at DESC
		LIMIT $%d OFFSET $%d`, profileCompletionExpr, baseQuery, limitPos, offsetPos), args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query students: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.GlobalStudentListItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to scan students: %s", err.Error())
	}
	return items, total, nil
}

func GetGlobalUniversities(ctx context.Context, search, status, uniType string, page, limit int) ([]models.GlobalUniversityListItem, int, error) {
	conn, err := getDBConn(ctx)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := `
		FROM universities u
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS applications_count
			FROM applications sa
			WHERE sa.university_id = u.id
			  AND sa.status <> 'draft'
		) app ON true
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS admins_count
			FROM users us
			WHERE us.university_linked = u.id
		) adm ON true
		WHERE 1=1`

	args := make([]any, 0, 6)
	argPos := 0

	if strings.TrimSpace(search) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND (u.name ILIKE $%d OR COALESCE(u.metadata->>'name_en', '') ILIKE $%d OR COALESCE(u.city, '') ILIKE $%d OR COALESCE(u.country, '') ILIKE $%d)", argPos, argPos, argPos, argPos)
		args = append(args, "%"+search+"%")
	}
	if status != "" && status != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND COALESCE(u.management_status, 'active') = $%d", argPos)
		args = append(args, status)
	}
	if uniType != "" && uniType != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND COALESCE(u.university_type, 'public') = $%d", argPos)
		args = append(args, uniType)
	}

	var total int
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count global universities: %s", err.Error())
	}

	offset := (page - 1) * limit
	argPos++
	limitPos := argPos
	argPos++
	offsetPos := argPos

	selectQuery := fmt.Sprintf(`
		SELECT
			u.id::text AS id,
			u.name AS name,
			COALESCE(u.metadata->>'name_en', u.name) AS name_en,
			COALESCE(u.university_type, 'public') AS type,
			COALESCE(NULLIF(TRIM(CONCAT_WS(', ', u.city, u.country, u.province)), ''), 'N/A') AS location,
			COALESCE(u.management_status, 'active') AS status,
			COALESCE(u.management_accounts_count, adm.admins_count, 0)::int AS admins,
			COALESCE(app.applications_count, 0)::int AS applications,
			COALESCE(TO_CHAR(u.acceptance_rate, 'FM990D0') || '%%', 'N/A') AS acceptance_rate,
			TO_CHAR(u.created_at, 'YYYY-MM-DD') AS joined_date,
			COALESCE(TO_CHAR(u.last_active_at, 'YYYY-MM-DD HH24:MI'), 'Never') AS last_active
		%s
		ORDER BY u.created_at DESC
		LIMIT $%d OFFSET $%d`, baseQuery, limitPos, offsetPos)

	args = append(args, limit, offset)
	rows, err := conn.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query global universities: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.GlobalUniversityListItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to scan global universities: %s", err.Error())
	}

	return items, total, nil
}

func GetGlobalServiceLogs(
	ctx context.Context,
	level string,
	microservice string,
	handlerSearch string,
	userID string,
	timeRange string,
	requestID string,
	method string,
	statusCode string,
	role string,
	from string,
	to string,
	page int,
	limit int,
) ([]models.GlobalServiceLogItem, int, error) {
	conn, err := getDBConn(ctx)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := "FROM service_logs WHERE 1=1"
	args := make([]any, 0, 12)
	argPos := 0

	if level != "" && level != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND level = $%d", argPos)
		args = append(args, level)
	}
	if microservice != "" && microservice != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND microservice = $%d", argPos)
		args = append(args, microservice)
	}
	if strings.TrimSpace(handlerSearch) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND handler ILIKE $%d", argPos)
		args = append(args, "%"+handlerSearch+"%")
	}
	if strings.TrimSpace(userID) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND user_id = $%d", argPos)
		args = append(args, userID)
	}
	if strings.TrimSpace(requestID) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND request_id = $%d", argPos)
		args = append(args, requestID)
	}
	if strings.TrimSpace(method) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND method = $%d", argPos)
		args = append(args, strings.ToUpper(strings.TrimSpace(method)))
	}
	if parsedStatus, ok := parseIntFilter(statusCode); ok {
		argPos++
		baseQuery += fmt.Sprintf(" AND status_code = $%d", argPos)
		args = append(args, parsedStatus)
	}
	if strings.TrimSpace(role) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND role = $%d", argPos)
		args = append(args, strings.ToLower(strings.TrimSpace(role)))
	}
	if dur := parseTimeRange(timeRange); dur > 0 {
		argPos++
		baseQuery += fmt.Sprintf(" AND logged_at >= NOW() - $%d::interval", argPos)
		args = append(args, fmt.Sprintf("%.0f seconds", dur.Seconds()))
	}
	if parsedFrom := parseTimestampFilter(from); parsedFrom != nil {
		argPos++
		baseQuery += fmt.Sprintf(" AND logged_at >= $%d", argPos)
		args = append(args, *parsedFrom)
	}
	if parsedTo := parseTimestampFilter(to); parsedTo != nil {
		argPos++
		baseQuery += fmt.Sprintf(" AND logged_at <= $%d", argPos)
		args = append(args, *parsedTo)
	}

	var total int
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count service logs: %s", err.Error())
	}

	offset := (page - 1) * limit
	argPos++
	limitPos := argPos
	argPos++
	offsetPos := argPos
	args = append(args, limit, offset)

	rows, err := conn.Query(ctx, fmt.Sprintf(`
		SELECT
			id,
			logged_at,
			level,
			microservice,
			handler,
			message,
			user_id,
			request_id,
			COALESCE(method, 'UNKNOWN') AS method,
			COALESCE(status_code, 0) AS status_code,
			COALESCE(duration_ms, 0) AS duration_ms,
			role,
			ip_address::text,
			user_agent,
			metadata
		%s
		ORDER BY logged_at DESC
		LIMIT $%d OFFSET $%d`, baseQuery, limitPos, offsetPos), args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query service logs: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.GlobalServiceLogItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to scan service logs: %s", err.Error())
	}
	return items, total, nil
}

func GetGlobalAuditLogs(
	ctx context.Context,
	search string,
	action string,
	outcome string,
	requestID string,
	actorType string,
	targetEntity string,
	from string,
	to string,
	page int,
	limit int,
) ([]models.GlobalAuditLogItem, int, error) {
	conn, err := getDBConn(ctx)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := "FROM audit_logs WHERE 1=1"
	args := make([]any, 0, 12)
	argPos := 0

	if strings.TrimSpace(search) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND (id::text ILIKE $%d OR actor_name ILIKE $%d OR action_description ILIKE $%d OR target_entity ILIKE $%d)", argPos, argPos, argPos, argPos)
		args = append(args, "%"+search+"%")
	}
	if action != "" && action != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND action_type = $%d", argPos)
		args = append(args, action)
	}
	if outcome != "" && outcome != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND outcome = $%d", argPos)
		args = append(args, outcome)
	}
	if strings.TrimSpace(requestID) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND request_id = $%d", argPos)
		args = append(args, requestID)
	}
	if strings.TrimSpace(actorType) != "" && actorType != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND actor_type = $%d", argPos)
		args = append(args, observability.NormalizeActorType(actorType))
	}
	if strings.TrimSpace(targetEntity) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND target_entity ILIKE $%d", argPos)
		args = append(args, "%"+strings.TrimSpace(targetEntity)+"%")
	}
	if parsedFrom := parseTimestampFilter(from); parsedFrom != nil {
		argPos++
		baseQuery += fmt.Sprintf(" AND occurred_at >= $%d", argPos)
		args = append(args, *parsedFrom)
	}
	if parsedTo := parseTimestampFilter(to); parsedTo != nil {
		argPos++
		baseQuery += fmt.Sprintf(" AND occurred_at <= $%d", argPos)
		args = append(args, *parsedTo)
	}

	var total int
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count audit logs: %s", err.Error())
	}

	offset := (page - 1) * limit
	argPos++
	limitPos := argPos
	argPos++
	offsetPos := argPos
	args = append(args, limit, offset)

	rows, err := conn.Query(ctx, fmt.Sprintf(`
		SELECT id, occurred_at, actor_name, actor_id, actor_type, action_type, action_description, target_entity, target_id, outcome, ip_address::text, request_id, metadata
		%s
		ORDER BY occurred_at DESC
		LIMIT $%d OFFSET $%d`, baseQuery, limitPos, offsetPos), args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query audit logs: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.GlobalAuditLogItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to scan audit logs: %s", err.Error())
	}
	return items, total, nil
}

func GetGlobalSettings(ctx context.Context) ([]models.GlobalSettingsItem, error) {
	conn, err := getDBConn(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(ctx, `
		SELECT setting_key, setting_value, updated_at, updated_by
		FROM global_settings
		ORDER BY setting_key ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query global settings: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.GlobalSettingsItem])
	if err != nil {
		return nil, fmt.Errorf("failed to scan global settings: %s", err.Error())
	}
	return items, nil
}

func UpsertGlobalSettings(ctx context.Context, updatedBy string, settings map[string]json.RawMessage) error {
	conn, err := getDBConn(ctx)
	if err != nil {
		return err
	}

	if len(settings) == 0 {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "settings payload is empty")
	}

	return pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		changedKeys := make([]string, 0, len(settings))
		for key, value := range settings {
			if strings.TrimSpace(key) == "" {
				return utils.NewHandlerFuncErr(http.StatusBadRequest, "setting key cannot be empty")
			}
			if value == nil || !json.Valid(value) {
				return utils.NewHandlerFuncErr(http.StatusBadRequest, "setting values must be valid json")
			}

			_, err := tx.Exec(ctx, `
				INSERT INTO global_settings (setting_key, setting_value, updated_by)
				VALUES ($1, $2, $3)
				ON CONFLICT (setting_key) DO UPDATE SET
					setting_value = EXCLUDED.setting_value,
					updated_at = NOW(),
					updated_by = EXCLUDED.updated_by`,
				key, value, updatedBy,
			)
			if err != nil {
				return fmt.Errorf("failed to upsert setting %s: %s", key, err.Error())
			}
			changedKeys = append(changedKeys, key)
		}

		metadata, _ := json.Marshal(map[string]any{
			"changed_keys": changedKeys,
			"count":        len(changedKeys),
		})
		if err := insertAuditLog(ctx, tx, observability.AuditEntry{
			ActionType:        "settings.update",
			ActionDescription: "Updated global settings",
			TargetEntity:      "global_settings",
			Outcome:           "success",
			Metadata:          metadata,
		}); err != nil {
			return err
		}
		return nil
	})
}

func WriteServiceLog(ctx context.Context, entry *models.GlobalLogWrite) error {
	conn, err := getDBConn(ctx)
	if err != nil {
		return err
	}

	level := strings.ToLower(strings.TrimSpace(entry.Level))
	if level == "" {
		level = "info"
	}
	metadata := entry.Metadata
	if metadata == nil || !json.Valid(metadata) {
		metadata = []byte("{}")
	}

	_, err = conn.Exec(ctx, `
		INSERT INTO service_logs (
			level, microservice, handler, message, user_id, request_id, method, status_code, duration_ms, role, ip_address, user_agent, metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULLIF($11, '')::inet, $12, $13)`,
		level,
		entry.Microservice,
		entry.Handler,
		entry.Message,
		entry.UserId,
		entry.RequestId,
		entry.Method,
		entry.StatusCode,
		entry.DurationMs,
		entry.Role,
		derefString(entry.IpAddress, ""),
		entry.UserAgent,
		metadata,
	)
	if err != nil {
		return fmt.Errorf("failed to insert service log: %s", err.Error())
	}
	return nil
}

func WriteAuditLog(ctx context.Context, entry *models.GlobalAuditWrite) error {
	conn, err := getDBConn(ctx)
	if err != nil {
		return err
	}

	return insertAuditLog(ctx, conn, observability.AuditEntry{
		ActorName:         entry.ActorName,
		ActorID:           entry.ActorId,
		ActorType:         entry.ActorType,
		ActionType:        entry.ActionType,
		ActionDescription: entry.ActionDescription,
		TargetEntity:      entry.TargetEntity,
		TargetID:          entry.TargetId,
		Outcome:           entry.Outcome,
		IPAddress:         entry.IpAddress,
		RequestID:         entry.RequestId,
		Metadata:          entry.Metadata,
	})
}

func titleFromActionType(actionType string) string {
	label := strings.ReplaceAll(actionType, "-", " ")
	label = strings.ReplaceAll(label, "_", " ")
	label = strings.ReplaceAll(label, ".", " ")
	parts := strings.Fields(label)
	for i := range parts {
		if len(parts[i]) == 0 {
			continue
		}
		parts[i] = strings.ToUpper(parts[i][0:1]) + strings.ToLower(parts[i][1:])
	}
	if len(parts) == 0 {
		return actionType
	}
	return strings.Join(parts, " ")
}

func relativeTimeFrom(t time.Time) string {
	delta := time.Since(t)
	if delta < time.Minute {
		return "just now"
	}
	if delta < time.Hour {
		return fmt.Sprintf("%d minutes ago", int(delta.Minutes()))
	}
	if delta < 24*time.Hour {
		return fmt.Sprintf("%d hours ago", int(delta.Hours()))
	}
	return fmt.Sprintf("%d days ago", int(delta.Hours()/24))
}

func parseTimeRange(value string) time.Duration {
	switch strings.TrimSpace(value) {
	case "15m":
		return 15 * time.Minute
	case "1h":
		return time.Hour
	case "24h":
		return 24 * time.Hour
	case "7d":
		return 7 * 24 * time.Hour
	default:
		return 0
	}
}

func parseTimestampFilter(value string) *time.Time {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}

	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil
	}

	return &parsed
}

func parseDateFilter(value string) *time.Time {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}

	parsed, err := time.Parse("2006-01-02", trimmed)
	if err != nil {
		return nil
	}
	return &parsed
}

func countOrZero(ctx context.Context, conn middlewares.DB, query string, args ...any) int {
	var count int
	if err := conn.QueryRow(ctx, query, args...).Scan(&count); err != nil {
		return 0
	}
	return count
}

func querySeries(ctx context.Context, conn middlewares.DB, query string, args ...any) ([]models.GlobalOverviewSeriesPoint, error) {
	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.GlobalOverviewSeriesPoint])
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []models.GlobalOverviewSeriesPoint{}
	}
	return items, nil
}

func queryStatusPoints(ctx context.Context, conn middlewares.DB, query string, args ...any) ([]models.GlobalOverviewStatusPoint, error) {
	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.GlobalOverviewStatusPoint])
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []models.GlobalOverviewStatusPoint{}
	}
	return items, nil
}

func parseIntFilter(value string) (int, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return 0, false
	}

	parsed, err := strconv.Atoi(trimmed)
	if err != nil {
		return 0, false
	}

	return parsed, true
}

func derefString(v *string, fallback string) string {
	if v == nil {
		return fallback
	}
	if strings.TrimSpace(*v) == "" {
		return fallback
	}
	return *v
}

func buildObservedResponseTimeMetric(avgDuration sql.NullFloat64, observedRequests int) (string, string) {
	if observedRequests == 0 || !avgDuration.Valid {
		return "No traffic", "neutral"
	}

	value := avgDuration.Float64
	switch {
	case value > 1000:
		return fmt.Sprintf("%.0f ms", value), "critical"
	case value >= 300:
		return fmt.Sprintf("%.0f ms", value), "warn"
	default:
		return fmt.Sprintf("%.0f ms", value), "good"
	}
}

func buildDatabaseConnectionsMetric(current int, max sql.NullInt64) (string, string) {
	if !max.Valid || max.Int64 <= 0 {
		return fmt.Sprintf("%d connections", current), "neutral"
	}

	utilization := (float64(current) / float64(max.Int64)) * 100
	switch {
	case utilization > 85:
		return fmt.Sprintf("%d / %d (%.0f%%)", current, max.Int64, utilization), "critical"
	case utilization >= 60:
		return fmt.Sprintf("%d / %d (%.0f%%)", current, max.Int64, utilization), "warn"
	default:
		return fmt.Sprintf("%d / %d (%.0f%%)", current, max.Int64, utilization), "good"
	}
}

func buildErrorRateMetric(recentErrors, recentLogs int) (string, string) {
	if recentLogs == 0 {
		return "No traffic", "neutral"
	}

	rate := (float64(recentErrors) / float64(recentLogs)) * 100
	switch {
	case rate > 5:
		return fmt.Sprintf("%.2f%%", rate), "critical"
	case rate >= 1:
		return fmt.Sprintf("%.2f%%", rate), "warn"
	default:
		return fmt.Sprintf("%.2f%%", rate), "good"
	}
}
