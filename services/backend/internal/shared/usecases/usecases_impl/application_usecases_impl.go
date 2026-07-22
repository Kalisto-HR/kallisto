// Application usecases for reading submitted applications and files
package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/shared/applicationstatus"
	"kallisto/services/backend/internal/shared/models"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	unifiedSubmittedApplicationsSelectColumns = `id, user_id, university_id, application_cycle, applicant_info,
	        data AS application_data, submitted_at,
	        COALESCE(received_at, submitted_at, created_at) AS received_at, status,
	        CASE status
	            WHEN 'draft' THEN 15
	            WHEN 'submitted' THEN 35
	            WHEN 'under_review' THEN 55
	            WHEN 'additional_information_required' THEN 55
	            WHEN 'decision_pending' THEN 80
	            WHEN 'waitlisted' THEN 90
	            WHEN 'accepted' THEN 100
	            WHEN 'rejected' THEN 100
	            ELSE 0
	        END AS status_progress,
	        CASE status
	            WHEN 'draft' THEN 'application_preparation'
	            WHEN 'submitted' THEN 'application_received'
	            WHEN 'under_review' THEN 'review_in_progress'
	            WHEN 'additional_information_required' THEN 'review_in_progress'
	            WHEN 'decision_pending' THEN 'decision_pending'
	            WHEN 'accepted' THEN 'final_decision'
	            WHEN 'waitlisted' THEN 'final_decision'
	            WHEN 'rejected' THEN 'final_decision'
	            ELSE 'unknown'
	        END AS status_stage,
	        (status IN ('accepted', 'waitlisted', 'rejected')) AS is_final,
	        (status = 'accepted') AS is_successful_outcome`
	unifiedSubmittedApplicationsBaseQuery  = "FROM applications WHERE status IN ('submitted', 'under_review', 'additional_information_required', 'decision_pending', 'accepted', 'waitlisted', 'rejected')"
	unifiedSubmittedApplicantNameExpr      = `COALESCE(NULLIF(applicant_info->>'name', ''), NULLIF(BTRIM(COALESCE(applicant_info->>'first_name', '') || ' ' || COALESCE(applicant_info->>'last_name', '')), ''), '')`
	unifiedSubmittedApplicantCitizenExpr   = `COALESCE(NULLIF(applicant_info->>'citizenship', ''), NULLIF(data->>'citizenship', ''), '')`
	unifiedSubmittedProgramExpr            = "COALESCE(data->>'program', '')"
	unifiedSubmittedReceivedAtExpr         = "COALESCE(received_at, submitted_at, created_at)"
	unifiedSubmittedApplicationFileByIDSQL = `SELECT
		af.id,
		a.id AS application_id,
		af.user_id,
		af.university_id,
		af.application_cycle,
		af.field_key,
		af.file_name,
		af.content_type,
		af.file_size,
		af.file_data,
		af.created_at
	FROM application_files af
	JOIN applications a
		ON a.user_id = af.user_id
		AND a.university_id = af.university_id
		AND a.application_cycle = af.application_cycle
	WHERE a.status IN ('submitted', 'under_review', 'additional_information_required', 'decision_pending', 'accepted', 'waitlisted', 'rejected') AND a.id = $1 AND af.id = $2`
	unifiedSubmittedApplicationFilesListSQL = `SELECT
		af.id,
		a.id AS application_id,
		af.field_key,
		af.file_name,
		af.content_type,
		af.file_size,
		af.created_at
	FROM application_files af
	JOIN applications a
		ON a.user_id = af.user_id
		AND a.university_id = af.university_id
		AND a.application_cycle = af.application_cycle
	WHERE a.status IN ('submitted', 'under_review', 'additional_information_required', 'decision_pending', 'accepted', 'waitlisted', 'rejected') AND a.id = $1
	ORDER BY af.created_at DESC`
)

// GetSubmittedApplications retrieves a paginated list of submitted applications with optional filters
func GetSubmittedApplications(ctx context.Context, query models.SubmittedApplicationsQuery) ([]models.SubmittedApplication, int, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, 0, err
	}

	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	baseQuery := unifiedSubmittedApplicationsBaseQuery
	args := []interface{}{}
	argCount := 0

	if query.UniversityId != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND university_id = $%d", argCount)
		args = append(args, *query.UniversityId)
	}

	if query.Status != nil {
		if !applicationstatus.IsReviewable(*query.Status) {
			return nil, 0, utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid application status filter")
		}
		argCount++
		baseQuery += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, *query.Status)
	}

	if query.Search != nil && *query.Search != "" {
		argCount++
		baseQuery += fmt.Sprintf(` AND (
			LOWER(%s) LIKE LOWER($%d)
			OR LOWER(%s) LIKE LOWER($%d)
			OR LOWER(%s) LIKE LOWER($%d)
		)`, unifiedSubmittedApplicantNameExpr, argCount, unifiedSubmittedProgramExpr, argCount, unifiedSubmittedApplicantCitizenExpr, argCount)
		args = append(args, "%"+*query.Search+"%")
	}

	if query.Program != nil && *query.Program != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND LOWER(%s) = LOWER($%d)", unifiedSubmittedProgramExpr, argCount)
		args = append(args, *query.Program)
	}

	if query.Citizenship != nil && *query.Citizenship != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND LOWER(%s) = LOWER($%d)", unifiedSubmittedApplicantCitizenExpr, argCount)
		args = append(args, *query.Citizenship)
	}

	if query.Intake != nil && *query.Intake != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND LOWER(COALESCE(application_cycle, '')) LIKE LOWER($%d)", argCount)
		args = append(args, "%"+*query.Intake+"%")
	}

	// Get total count
	var total int
	countQuery := "SELECT COUNT(*) " + baseQuery
	err = conn.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get application count: %s", err.Error())
	}

	// Get paginated results
	offset := (query.Page - 1) * query.Limit
	argCount++
	limitArg := argCount
	argCount++
	offsetArg := argCount

	sortBy := "received_at"
	switch query.SortBy {
	case "received_at", "submitted_at", "status":
		sortBy = query.SortBy
	case "gpa":
		sortBy = "CASE WHEN COALESCE(data->>'gpa','') ~ '^[0-9]+(\\.[0-9]+)?$' THEN (data->>'gpa')::numeric ELSE NULL END"
	}
	sortOrder := "DESC"
	if query.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	selectQuery := fmt.Sprintf(
		`SELECT %s
		 %s ORDER BY %s %s NULLS LAST LIMIT $%d OFFSET $%d`,
		unifiedSubmittedApplicationsSelectColumns, baseQuery, sortBy, sortOrder, limitArg, offsetArg,
	)
	args = append(args, query.Limit, offset)

	rows, err := conn.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query applications: %s", err.Error())
	}
	defer rows.Close()

	applications, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.SubmittedApplication])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to scan applications: %s", err.Error())
	}

	return applications, total, nil
}

// GetSubmittedApplicationById retrieves a single submitted application by ID
func GetSubmittedApplicationById(ctx context.Context, id string) (*models.SubmittedApplication, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		fmt.Sprintf(`SELECT %s
		 FROM applications WHERE id = $1 AND status IN ('submitted', 'under_review', 'additional_information_required', 'decision_pending', 'accepted', 'waitlisted', 'rejected')`, unifiedSubmittedApplicationsSelectColumns),
		id,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query application: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
	}

	application, err := pgx.RowToStructByName[models.SubmittedApplication](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan application: %s", err.Error())
	}

	return &application, nil
}

func GetSubmittedApplicationFileById(ctx context.Context, applicationId, fileId string) (*models.SubmittedApplicationFile, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	row := conn.QueryRow(
		ctx,
		unifiedSubmittedApplicationFileByIDSQL,
		applicationId,
		fileId,
	)

	var file models.SubmittedApplicationFile
	if err := row.Scan(
		&file.Id,
		&file.ApplicationId,
		&file.UserId,
		&file.UniversityId,
		&file.ApplicationCycle,
		&file.FieldKey,
		&file.FileName,
		&file.ContentType,
		&file.FileSize,
		&file.FileData,
		&file.CreatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "file not found")
		}
		return nil, fmt.Errorf("failed to fetch submitted application file: %s", err.Error())
	}

	return &file, nil
}

func ListSubmittedApplicationFiles(ctx context.Context, applicationId string) ([]models.SubmittedApplicationFileMeta, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(
		ctx,
		unifiedSubmittedApplicationFilesListSQL,
		applicationId,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query submitted application files: %s", err.Error())
	}
	defer rows.Close()

	items := make([]models.SubmittedApplicationFileMeta, 0)
	for rows.Next() {
		var item models.SubmittedApplicationFileMeta
		if err := rows.Scan(
			&item.Id,
			&item.ApplicationId,
			&item.FieldKey,
			&item.FileName,
			&item.ContentType,
			&item.FileSize,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan submitted application file metadata: %s", err.Error())
		}
		item.DownloadURL = fmt.Sprintf("/api/v1.0/partner/applications/%s/files/%s/download", applicationId, item.Id)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read submitted application files: %s", err.Error())
	}

	return items, nil
}

func TransitionApplicationStatus(ctx context.Context, applicationId, actorId, actorRole string, req models.ApplicationStatusTransitionRequest) (*models.SubmittedApplication, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	targetStatus := strings.TrimSpace(req.Status)
	if !applicationstatus.IsReviewable(targetStatus) {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid application status")
	}
	if targetStatus == applicationstatus.StatusAdditionalInformationRequired {
		if req.PublicComment == nil || strings.TrimSpace(*req.PublicComment) == "" {
			return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "public comment is required when additional information is requested")
		}
		hasRequiredTask := false
		for _, task := range req.Tasks {
			if task.Required && strings.TrimSpace(task.Title) != "" {
				hasRequiredTask = true
				break
			}
		}
		if !hasRequiredTask {
			return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "at least one required task is needed when additional information is requested")
		}
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start status transition: %s", err.Error())
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var currentStatus string
	err = tx.QueryRow(ctx, "SELECT status FROM applications WHERE id = $1 FOR UPDATE", applicationId).Scan(&currentStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
		}
		return nil, fmt.Errorf("failed to load application status: %s", err.Error())
	}
	if !applicationstatus.IsReviewable(currentStatus) {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "draft applications cannot be reviewed")
	}
	if currentStatus == targetStatus {
		if err = tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("failed to commit unchanged application status: %s", err.Error())
		}
		return GetSubmittedApplicationById(ctx, applicationId)
	}

	isFinalCorrection := applicationstatus.IsFinal(currentStatus) && actorRole == "staff" && req.ConfirmFinalCorrection
	if isFinalCorrection && (req.InternalExplanation == nil || strings.TrimSpace(*req.InternalExplanation) == "") {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "internal explanation is required to correct a final decision")
	}
	if !isFinalCorrection && !applicationstatus.CanTransition(currentStatus, targetStatus) {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid application status transition")
	}

	_, err = tx.Exec(ctx, "UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2", targetStatus, applicationId)
	if err != nil {
		return nil, fmt.Errorf("failed to update application status: %s", err.Error())
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO application_status_events (
			application_id, from_status, to_status, public_comment, internal_note, internal_explanation, changed_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		applicationId,
		currentStatus,
		targetStatus,
		trimOptionalString(req.PublicComment),
		trimOptionalString(req.InternalNote),
		trimOptionalString(req.InternalExplanation),
		actorId,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to record application status event: %s", err.Error())
	}

	for _, task := range req.Tasks {
		title := strings.TrimSpace(task.Title)
		if title == "" {
			continue
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO application_tasks (application_id, title, description, required, due_at, created_by)
			VALUES ($1, $2, $3, $4, NULLIF($5, '')::timestamptz, $6)`,
			applicationId,
			title,
			trimOptionalString(task.Description),
			task.Required,
			optionalStringValue(task.DueAt),
			actorId,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create application task: %s", err.Error())
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit application status transition: %s", err.Error())
	}

	return GetSubmittedApplicationById(ctx, applicationId)
}

func trimOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func optionalStringValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}
