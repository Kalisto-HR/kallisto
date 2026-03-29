// Application usecases for reading submitted applications and files
package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/shared/models"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	unifiedSubmittedApplicationsSelectColumns = `id, user_id, university_id, application_cycle, applicant_info,
	        data AS application_data, submitted_at,
	        COALESCE(received_at, submitted_at, created_at) AS received_at, status`
	unifiedSubmittedApplicationsBaseQuery  = "FROM applications WHERE status = 'submitted'"
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
	WHERE a.status = 'submitted' AND a.id = $1 AND af.id = $2`
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
	WHERE a.status = 'submitted' AND a.id = $1
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
		 FROM applications WHERE id = $1 AND status = 'submitted'`, unifiedSubmittedApplicationsSelectColumns),
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
