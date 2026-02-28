package usecases_impl

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/admin/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func getAdminConn(ctx context.Context) (*pgxpool.Pool, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}
	return conn, nil
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
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM drafts WHERE status IN ('draft', 'pending_review')").Scan(&stats.PendingDrafts); err != nil {
		return nil, fmt.Errorf("failed to count pending drafts: %s", err.Error())
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

	pendingDrafts := make([]models.GlobalOverviewPendingDraft, 0, 6)
	draftRows, err := conn.Query(ctx, `
		SELECT
			d.id::text,
			d.draft_type,
			COALESCE(d.target_entity, d.target_id::text, ''),
			COALESCE(d.requested_by_email, u.email, 'System'),
			d.created_at,
			COALESCE(d.priority, 'medium')
		FROM drafts d
		LEFT JOIN users u ON u.id = d.author_id
		WHERE d.status IN ('draft', 'pending_review')
		ORDER BY d.created_at DESC
		LIMIT 6`)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending drafts: %s", err.Error())
	}
	defer draftRows.Close()

	for draftRows.Next() {
		var (
			id        string
			draftType string
			target    string
			requester string
			createdAt time.Time
			priority  string
		)
		if err := draftRows.Scan(&id, &draftType, &target, &requester, &createdAt, &priority); err != nil {
			return nil, fmt.Errorf("failed to scan pending draft: %s", err.Error())
		}
		pendingDrafts = append(pendingDrafts, models.GlobalOverviewPendingDraft{
			Id:        id,
			Type:      titleFromActionType(draftType),
			Target:    target,
			Requester: requester,
			CreatedAt: createdAt.Format("2006-01-02 15:04"),
			Priority:  priority,
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
		PendingDrafts:  pendingDrafts,
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

func GetGlobalDrafts(ctx context.Context, search, draftType, status string, page, limit int) ([]models.GlobalDraftListItem, int, error) {
	conn, err := getAdminConn(ctx)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := `
		FROM drafts d
		LEFT JOIN users author ON author.id = d.author_id
		LEFT JOIN users reviewer ON reviewer.id = d.reviewed_by
		WHERE COALESCE(d.scope, 'global') = 'global'`

	args := make([]any, 0, 8)
	argPos := 0

	if strings.TrimSpace(search) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND (d.id::text ILIKE $%d OR COALESCE(d.title, '') ILIKE $%d OR COALESCE(d.target_entity, '') ILIKE $%d)", argPos, argPos, argPos)
		args = append(args, "%"+search+"%")
	}
	if draftType != "" && draftType != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND d.draft_type = $%d", argPos)
		args = append(args, draftType)
	}
	if status != "" && status != "all" {
		if status == "pending" {
			baseQuery += " AND d.status IN ('draft', 'pending_review')"
		} else {
			argPos++
			baseQuery += fmt.Sprintf(" AND d.status = $%d", argPos)
			args = append(args, status)
		}
	}

	var total int
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count global drafts: %s", err.Error())
	}

	offset := (page - 1) * limit
	argPos++
	limitPos := argPos
	argPos++
	offsetPos := argPos
	args = append(args, limit, offset)

	rows, err := conn.Query(ctx, fmt.Sprintf(`
		SELECT
			d.id::text,
			d.draft_type,
			d.status,
			COALESCE(d.title, d.draft_type),
			COALESCE(d.content->>'description', ''),
			COALESCE(d.content->>'requester', CONCAT_WS(' ', author.first_name, author.last_name), d.requested_by_email, 'System'),
			COALESCE(d.requested_by_email, author.email, ''),
			COALESCE(d.target_entity, d.content->>'target_entity', d.target_id::text, ''),
			COALESCE(d.content->>'target_id', d.target_id::text, ''),
			d.created_at,
			d.reviewed_at,
			d.executed_at,
			NULLIF(CONCAT_WS(' ', reviewer.first_name, reviewer.last_name), ''),
			COALESCE(d.priority, 'medium'),
			COALESCE(d.content->'changes', '[]'::jsonb),
			CASE
				WHEN jsonb_typeof(d.content->'comments') = 'number' THEN (d.content->>'comments')::int
				ELSE 0
			END
		%s
		ORDER BY d.created_at DESC
		LIMIT $%d OFFSET $%d`, baseQuery, limitPos, offsetPos), args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query global drafts: %s", err.Error())
	}
	defer rows.Close()

	items := make([]models.GlobalDraftListItem, 0, limit)
	for rows.Next() {
		var (
			id             string
			typ            string
			rawStatus      string
			title          string
			description    string
			requester      string
			requesterEmail string
			targetEntity   string
			targetId       string
			createdAt      time.Time
			reviewedAt     *time.Time
			executedAt     *time.Time
			reviewedBy     *string
			priority       string
			changesRaw     []byte
			comments       int
		)

		if err := rows.Scan(
			&id, &typ, &rawStatus, &title, &description, &requester, &requesterEmail,
			&targetEntity, &targetId, &createdAt, &reviewedAt, &executedAt, &reviewedBy,
			&priority, &changesRaw, &comments,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan global draft: %s", err.Error())
		}

		changes := []models.GlobalDraftChange{}
		if len(changesRaw) > 0 {
			_ = json.Unmarshal(changesRaw, &changes)
		}

		var reviewedAtStr *string
		if reviewedAt != nil {
			s := reviewedAt.Format("2006-01-02 15:04")
			reviewedAtStr = &s
		}
		var executedAtStr *string
		if executedAt != nil {
			s := executedAt.Format("2006-01-02 15:04")
			executedAtStr = &s
		}

		items = append(items, models.GlobalDraftListItem{
			Id:             id,
			Type:           typ,
			Status:         normalizeDraftStatus(rawStatus),
			Title:          title,
			Description:    description,
			Requester:      requester,
			RequesterEmail: requesterEmail,
			TargetEntity:   targetEntity,
			TargetId:       targetId,
			CreatedAt:      createdAt.Format("2006-01-02 15:04"),
			ReviewedAt:     reviewedAtStr,
			ExecutedAt:     executedAtStr,
			ReviewedBy:     reviewedBy,
			Priority:       priority,
			Changes:        changes,
			Comments:       comments,
		})
	}

	return items, total, nil
}

func ApproveGlobalDraft(ctx context.Context, draftId string, reviewerId string, notes string) error {
	conn, err := getAdminConn(ctx)
	if err != nil {
		return err
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin tx: %s", err.Error())
	}
	defer tx.Rollback(ctx)

	var (
		draftType    string
		targetEntity *string
		contentRaw   []byte
	)

	err = tx.QueryRow(ctx, `
		SELECT draft_type, target_entity, COALESCE(content, '{}'::jsonb)
		FROM drafts
		WHERE id = $1`, draftId).Scan(&draftType, &targetEntity, &contentRaw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "draft not found")
		}
		return fmt.Errorf("failed to query draft: %s", err.Error())
	}

	result, err := tx.Exec(ctx, `
		UPDATE drafts
		SET status = 'executed',
		    reviewed_by = $1,
		    reviewed_at = NOW(),
		    executed_at = NOW(),
		    review_notes = $2
		WHERE id = $3
		  AND status IN ('draft', 'pending_review', 'approved')`,
		reviewerId, notes, draftId,
	)
	if err != nil {
		return fmt.Errorf("failed to approve draft: %s", err.Error())
	}
	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusConflict, "draft cannot be approved in current state")
	}

	if draftType == "ban-user" {
		var payload struct {
			UserId      string `json:"user_id"`
			Reason      string `json:"reason"`
			Duration    string `json:"duration"`
			DisplayName string `json:"display_name"`
			Email       string `json:"email"`
		}
		_ = json.Unmarshal(contentRaw, &payload)
		if payload.UserId != "" {
			banUntil := parseBanUntil(payload.Duration)
			_, err = tx.Exec(ctx, `
				INSERT INTO user_moderation_states (user_id, display_name, email, status, ban_reason, ban_until, updated_by)
				VALUES ($1, COALESCE(NULLIF($2, ''), $1), NULLIF($3, ''), 'banned', NULLIF($4, ''), $5, $6)
				ON CONFLICT (user_id) DO UPDATE SET
					status = 'banned',
					ban_reason = NULLIF(EXCLUDED.ban_reason, ''),
					ban_until = EXCLUDED.ban_until,
					updated_at = NOW(),
					updated_by = EXCLUDED.updated_by`,
				payload.UserId, payload.DisplayName, payload.Email, payload.Reason, banUntil, reviewerId,
			)
			if err != nil {
				return fmt.Errorf("failed to apply ban moderation state: %s", err.Error())
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit draft approval: %s", err.Error())
	}

	actorId := reviewerId
	targetId := draftId
	WriteAuditLog(ctx, &models.GlobalAuditWrite{
		ActorName:         "Superuser",
		ActorId:           &actorId,
		ActorType:         "superuser",
		ActionType:        "draft-approved",
		ActionDescription: "Draft approved and executed",
		TargetEntity:      derefString(targetEntity, "Draft "+draftId),
		TargetId:          &targetId,
		Outcome:           "success",
		Metadata:          []byte(`{"notes":"approved and executed"}`),
	})

	return nil
}

func RejectGlobalDraft(ctx context.Context, draftId string, reviewerId string, reason string) error {
	conn, err := getAdminConn(ctx)
	if err != nil {
		return err
	}

	result, err := conn.Exec(ctx, `
		UPDATE drafts
		SET status = 'rejected',
		    reviewed_by = $1,
		    reviewed_at = NOW(),
		    rejection_reason = $2,
		    review_notes = $2
		WHERE id = $3
		  AND status IN ('draft', 'pending_review', 'approved')`,
		reviewerId, reason, draftId,
	)
	if err != nil {
		return fmt.Errorf("failed to reject draft: %s", err.Error())
	}
	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "draft not found or cannot be rejected")
	}

	actorId := reviewerId
	targetId := draftId
	WriteAuditLog(ctx, &models.GlobalAuditWrite{
		ActorName:         "Superuser",
		ActorId:           &actorId,
		ActorType:         "superuser",
		ActionType:        "draft-rejected",
		ActionDescription: "Draft rejected",
		TargetEntity:      "Draft " + draftId,
		TargetId:          &targetId,
		Outcome:           "success",
		Metadata:          []byte(`{"reason":"rejected by reviewer"}`),
	})

	return nil
}

func GetGlobalServiceLogs(ctx context.Context, level, microservice, handlerSearch, userID, timeRange string, page, limit int) ([]models.GlobalServiceLogItem, int, error) {
	conn, err := getAdminConn(ctx)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := "FROM service_logs WHERE 1=1"
	args := make([]any, 0, 8)
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
	if dur := parseTimeRange(timeRange); dur > 0 {
		argPos++
		baseQuery += fmt.Sprintf(" AND logged_at >= NOW() - $%d::interval", argPos)
		args = append(args, fmt.Sprintf("%.0f seconds", dur.Seconds()))
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
		SELECT id, logged_at, level, microservice, handler, message, user_id, request_id, metadata
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

func GetGlobalAuditLogs(ctx context.Context, search, action, outcome string, page, limit int) ([]models.GlobalAuditLogItem, int, error) {
	conn, err := getAdminConn(ctx)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := "FROM audit_logs WHERE 1=1"
	args := make([]any, 0, 8)
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
		SELECT id, occurred_at, actor_name, actor_id, actor_type, action_type, action_description, target_entity, target_id, outcome, ip_address::text, metadata
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
		}
		return nil
	})
}

func GetGlobalUsers(ctx context.Context, search, status string, page, limit int) ([]models.GlobalUserListItem, int, error) {
	conn, err := getAdminConn(ctx)
	if err != nil {
		return nil, 0, err
	}

	baseQuery := "FROM user_moderation_states WHERE 1=1"
	args := make([]any, 0, 6)
	argPos := 0

	if strings.TrimSpace(search) != "" {
		argPos++
		baseQuery += fmt.Sprintf(" AND (user_id ILIKE $%d OR display_name ILIKE $%d OR COALESCE(email, '') ILIKE $%d)", argPos, argPos, argPos)
		args = append(args, "%"+search+"%")
	}
	if status != "" && status != "all" {
		argPos++
		baseQuery += fmt.Sprintf(" AND status = $%d", argPos)
		args = append(args, status)
	}

	var total int
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count global users: %s", err.Error())
	}

	offset := (page - 1) * limit
	argPos++
	limitPos := argPos
	argPos++
	offsetPos := argPos
	args = append(args, limit, offset)

	rows, err := conn.Query(ctx, fmt.Sprintf(`
		SELECT user_id, display_name, email, phone, status, updated_at, ban_reason, ban_until, metadata
		%s
		ORDER BY updated_at DESC
		LIMIT $%d OFFSET $%d`, baseQuery, limitPos, offsetPos), args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query global users: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.GlobalUserListItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to scan global users: %s", err.Error())
	}
	return items, total, nil
}

func CreateBanUserDraft(ctx context.Context, authorID, userID, reason, duration string) (string, error) {
	conn, err := getAdminConn(ctx)
	if err != nil {
		return "", err
	}

	if strings.TrimSpace(userID) == "" {
		return "", utils.NewHandlerFuncErr(http.StatusBadRequest, "user_id is required")
	}
	if strings.TrimSpace(reason) == "" {
		return "", utils.NewHandlerFuncErr(http.StatusBadRequest, "reason is required")
	}

	_, err = conn.Exec(ctx, `
		INSERT INTO user_moderation_states (user_id, display_name, status)
		VALUES ($1, $1, 'active')
		ON CONFLICT (user_id) DO NOTHING`, userID)
	if err != nil {
		return "", fmt.Errorf("failed to ensure user moderation state: %s", err.Error())
	}

	content := map[string]any{
		"description":   fmt.Sprintf("Ban request for user %s", userID),
		"reason":        reason,
		"duration":      duration,
		"user_id":       userID,
		"target_id":     userID,
		"target_entity": userID,
		"changes": []map[string]string{
			{"field": "Account Status", "before": "active", "after": "banned"},
			{"field": "Ban Reason", "before": "-", "after": reason},
			{"field": "Ban Duration", "before": "-", "after": duration},
		},
		"comments": 0,
	}
	contentRaw, _ := json.Marshal(content)

	var draftID string
	err = conn.QueryRow(ctx, `
		INSERT INTO drafts (
			author_id,
			draft_type,
			title,
			content,
			target_entity,
			requested_by_email,
			status,
			scope,
			priority
		)
		VALUES (
			$1,
			'ban-user',
			$2,
			$3,
			$4,
			$5,
			'pending_review',
			'global',
			'high'
		)
		RETURNING id::text`,
		authorID,
		fmt.Sprintf("Ban User %s", userID),
		contentRaw,
		userID,
		"",
	).Scan(&draftID)
	if err != nil {
		return "", fmt.Errorf("failed to create ban draft: %s", err.Error())
	}

	return draftID, nil
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
		INSERT INTO service_logs (level, microservice, handler, message, user_id, request_id, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		level, entry.Microservice, entry.Handler, entry.Message, entry.UserId, entry.RequestId, metadata,
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

	metadata := entry.Metadata
	if metadata == nil || !json.Valid(metadata) {
		metadata = []byte("{}")
	}

	_, err = conn.Exec(ctx, `
		INSERT INTO audit_logs (
			actor_name, actor_id, actor_type, action_type, action_description,
			target_entity, target_id, outcome, ip_address, metadata
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		entry.ActorName,
		entry.ActorId,
		entry.ActorType,
		entry.ActionType,
		entry.ActionDescription,
		entry.TargetEntity,
		entry.TargetId,
		entry.Outcome,
		entry.IpAddress,
		metadata,
	)
	if err != nil {
		return fmt.Errorf("failed to insert audit log: %s", err.Error())
	}
	return nil
}

func titleFromActionType(actionType string) string {
	label := strings.ReplaceAll(actionType, "-", " ")
	label = strings.ReplaceAll(label, "_", " ")
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

func parseBanUntil(duration string) *time.Time {
	now := time.Now()
	switch strings.TrimSpace(strings.ToLower(duration)) {
	case "24h":
		t := now.Add(24 * time.Hour)
		return &t
	case "7d":
		t := now.Add(7 * 24 * time.Hour)
		return &t
	case "30d":
		t := now.Add(30 * 24 * time.Hour)
		return &t
	default:
		return nil
	}
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
