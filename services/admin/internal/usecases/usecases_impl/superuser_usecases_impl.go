package usecases_impl

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"kallisto/infra/middlewares"
	"kallisto/infra/observability"
	"kallisto/infra/utils"
	"kallisto/services/admin/internal/models"

	"github.com/jackc/pgx/v5"
)

func getAdminConn(ctx context.Context) (middlewares.DB, error) {
	return middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
}

func GetGlobalOverview(ctx context.Context) (*models.GlobalOverviewResponse, error) {
	conn, err := getAdminConn(ctx)
	if err != nil {
		return nil, err
	}

	var stats models.GlobalOverviewStats
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM universities").Scan(&stats.TotalUniversities); err != nil {
		return nil, fmt.Errorf("failed to count universities: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&stats.ManagementAccounts); err != nil {
		return nil, fmt.Errorf("failed to count management accounts: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM submitted_applications").Scan(&stats.TotalApplications); err != nil {
		return nil, fmt.Errorf("failed to count applications: %s", err.Error())
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
		dbConnections int
		recentErrors  int
		recentLogs    int
		activeUsers   int
	)
	_ = conn.QueryRow(ctx, "SELECT COUNT(*) FROM pg_stat_activity").Scan(&dbConnections)
	_ = conn.QueryRow(ctx, "SELECT COUNT(*) FROM service_logs WHERE logged_at >= NOW() - INTERVAL '24 hours'").Scan(&recentLogs)
	_ = conn.QueryRow(ctx, "SELECT COUNT(*) FROM service_logs WHERE level IN ('error', 'fatal') AND logged_at >= NOW() - INTERVAL '24 hours'").Scan(&recentErrors)
	_ = conn.QueryRow(ctx, "SELECT COUNT(DISTINCT user_id) FROM service_logs WHERE user_id IS NOT NULL AND logged_at >= NOW() - INTERVAL '24 hours'").Scan(&activeUsers)

	errorRate := "0.00%"
	if recentLogs > 0 {
		errorRate = fmt.Sprintf("%.2f%%", (float64(recentErrors)/float64(recentLogs))*100.0)
	}

	systemHealth := []models.GlobalOverviewHealthMetric{
		{Label: "API Response Time", Value: "N/A", Status: "good"},
		{Label: "Database Connections", Value: fmt.Sprintf("%d", dbConnections), Status: "good"},
		{Label: "Error Rate", Value: errorRate, Status: "good"},
		{Label: "Active Users", Value: fmt.Sprintf("%d", activeUsers), Status: "good"},
	}

	return &models.GlobalOverviewResponse{
		Stats:          stats,
		RecentActivity: recentActivity,
		SystemHealth:   systemHealth,
	}, nil
}

func GetGlobalUniversities(ctx context.Context, search, status, uniType string, page, limit int) ([]models.GlobalUniversityListItem, int, error) {
	conn, err := getAdminConn(ctx)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := `
		FROM universities u
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS applications_count
			FROM submitted_applications sa
			WHERE sa.university_id = u.id
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
	conn, err := getAdminConn(ctx)
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
	conn, err := getAdminConn(ctx)
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
	conn, err := getAdminConn(ctx)
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
	conn, err := getAdminConn(ctx)
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
	conn, err := getAdminConn(ctx)
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
	conn, err := getAdminConn(ctx)
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

func normalizeDraftStatus(status string) string {
	switch status {
	case "draft", "pending_review":
		return "pending"
	default:
		return status
	}
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
