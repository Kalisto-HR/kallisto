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
	            WHEN 'rejected' THEN 80
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

	if err := hydrateSubmittedApplicationDetails(ctx, &application, true); err != nil {
		return nil, err
	}

	return &application, nil
}

func hydrateSubmittedApplicationDetails(ctx context.Context, application *models.SubmittedApplication, includeInternal bool) error {
	history, err := ListApplicationStatusEvents(ctx, application.Id, includeInternal)
	if err != nil {
		return err
	}
	tasks, err := ListApplicationTasks(ctx, application.Id)
	if err != nil {
		return err
	}
	decision, err := GetApplicationDecision(ctx, application.Id, includeInternal)
	if err != nil {
		return err
	}
	application.History = history
	application.Tasks = tasks
	application.Decision = decision
	return nil
}

func ListApplicationStatusEvents(ctx context.Context, applicationId string, includeInternal bool) ([]models.ApplicationStatusEvent, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	internalColumn := "NULL::text AS internal_note"
	if includeInternal {
		internalColumn = "internal_note"
	}

	rows, err := conn.Query(ctx, fmt.Sprintf(`
		SELECT id, application_id, from_status, to_status, public_comment, %s, changed_by, changed_by_role, changed_at, notification_created
		FROM application_status_events
		WHERE application_id = $1
		ORDER BY changed_at ASC`, internalColumn), applicationId)
	if err != nil {
		return nil, fmt.Errorf("failed to query application status history: %s", err.Error())
	}
	defer rows.Close()

	items := make([]models.ApplicationStatusEvent, 0)
	for rows.Next() {
		var item models.ApplicationStatusEvent
		if err := rows.Scan(
			&item.Id,
			&item.ApplicationId,
			&item.FromStatus,
			&item.ToStatus,
			&item.PublicComment,
			&item.InternalNote,
			&item.ChangedBy,
			&item.ChangedByRole,
			&item.ChangedAt,
			&item.NotificationMade,
		); err != nil {
			return nil, fmt.Errorf("failed to scan application status history: %s", err.Error())
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func ListApplicationTasks(ctx context.Context, applicationId string) ([]models.ApplicationTask, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx, `
		SELECT id, application_id, title, description, category, status, assigned_role, required, due_at,
		       completed_at, verified_at, created_by, related_document_id, student_response, university_feedback,
		       sort_order, created_at, updated_at
		FROM application_tasks
		WHERE application_id = $1
		ORDER BY sort_order ASC, created_at ASC`, applicationId)
	if err != nil {
		return nil, fmt.Errorf("failed to query application tasks: %s", err.Error())
	}
	defer rows.Close()

	items := make([]models.ApplicationTask, 0)
	for rows.Next() {
		var item models.ApplicationTask
		if err := rows.Scan(
			&item.Id,
			&item.ApplicationId,
			&item.Title,
			&item.Description,
			&item.Category,
			&item.Status,
			&item.AssignedRole,
			&item.Required,
			&item.DueAt,
			&item.CompletedAt,
			&item.VerifiedAt,
			&item.CreatedBy,
			&item.RelatedDocumentId,
			&item.StudentResponse,
			&item.UniversityFeedback,
			&item.SortOrder,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan application task: %s", err.Error())
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func GetApplicationDecision(ctx context.Context, applicationId string, includeInternal bool) (*models.ApplicationDecision, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	internalColumn := "NULL::text AS internal_reason"
	if includeInternal {
		internalColumn = "internal_reason"
	}

	row := conn.QueryRow(ctx, fmt.Sprintf(`
		SELECT application_id, decision_status, decision_date, public_message, %s,
		       student_visible_reason, response_deadline, waitlist_position, decision_document_id,
		       issued_by, created_at, updated_at
		FROM application_decisions
		WHERE application_id = $1`, internalColumn), applicationId)

	var decision models.ApplicationDecision
	if err := row.Scan(
		&decision.ApplicationId,
		&decision.DecisionStatus,
		&decision.DecisionDate,
		&decision.PublicMessage,
		&decision.InternalReason,
		&decision.StudentVisibleReason,
		&decision.ResponseDeadline,
		&decision.WaitlistPosition,
		&decision.DecisionDocumentId,
		&decision.IssuedBy,
		&decision.CreatedAt,
		&decision.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query application decision: %s", err.Error())
	}
	return &decision, nil
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
	if applicationstatus.IsFinal(targetStatus) && (req.PublicComment == nil || strings.TrimSpace(*req.PublicComment) == "") {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "public decision message is required for final decisions")
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
			application_id, from_status, to_status, public_comment, internal_note, internal_explanation, changed_by, changed_by_role, notification_created
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
		applicationId,
		currentStatus,
		targetStatus,
		trimOptionalString(req.PublicComment),
		trimOptionalString(req.InternalNote),
		trimOptionalString(req.InternalExplanation),
		actorId,
		actorRole,
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
			INSERT INTO application_tasks (application_id, title, description, category, status, assigned_role, required, due_at, created_by)
			VALUES ($1, $2, $3, COALESCE(NULLIF($4, ''), 'university_request'), 'pending', 'student', $5, NULLIF($6, '')::timestamptz, $7)`,
			applicationId,
			title,
			trimOptionalString(task.Description),
			optionalStringValue(task.Category),
			task.Required,
			optionalStringValue(task.DueAt),
			actorId,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create application task: %s", err.Error())
		}
	}

	if applicationstatus.IsFinal(targetStatus) {
		_, err = tx.Exec(ctx, `
			INSERT INTO application_decisions (
				application_id, decision_status, decision_date, public_message, internal_reason, student_visible_reason, issued_by
			) VALUES ($1, $2, NOW(), $3, $4, $5, $6)
			ON CONFLICT (application_id) DO UPDATE SET
				decision_status = EXCLUDED.decision_status,
				decision_date = EXCLUDED.decision_date,
				public_message = EXCLUDED.public_message,
				internal_reason = EXCLUDED.internal_reason,
				student_visible_reason = EXCLUDED.student_visible_reason,
				issued_by = EXCLUDED.issued_by,
				updated_at = NOW()`,
			applicationId,
			targetStatus,
			strings.TrimSpace(*req.PublicComment),
			trimOptionalString(req.InternalNote),
			trimOptionalString(req.PublicComment),
			actorId,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to record application decision: %s", err.Error())
		}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO application_notifications (user_id, application_id, university_id, event_type, title, description, action_url)
		SELECT user_id, id, university_id, $1, $2, $3, '/applicant/applications/' || university_id::text || '/' || application_cycle
		FROM applications
		WHERE id = $4
		ON CONFLICT (application_id, event_type) DO NOTHING`,
		"application_status_"+targetStatus,
		"Application status updated",
		statusNotificationDescription(targetStatus),
		applicationId,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create application notification: %s", err.Error())
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit application status transition: %s", err.Error())
	}

	return GetSubmittedApplicationById(ctx, applicationId)
}

func statusNotificationDescription(status string) string {
	switch status {
	case applicationstatus.StatusUnderReview:
		return "The university has started reviewing your application."
	case applicationstatus.StatusAdditionalInformationRequired:
		return "The university requested additional information for your application."
	case applicationstatus.StatusDecisionPending:
		return "The university is preparing your final decision."
	case applicationstatus.StatusAccepted:
		return "You have received an admission decision: accepted."
	case applicationstatus.StatusWaitlisted:
		return "You have received an admission decision: waitlisted."
	case applicationstatus.StatusRejected:
		return "You have received an admission decision: rejected."
	default:
		return "Your application status has changed."
	}
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
