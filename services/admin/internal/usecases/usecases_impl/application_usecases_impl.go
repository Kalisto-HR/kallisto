// Application usecases for reviewing submitted applications
package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/admin/internal/models"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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

	// Build query with optional filters
	baseQuery := `FROM submitted_applications WHERE 1=1`
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
			OR LOWER(COALESCE(application_data->>'program', '')) LIKE LOWER($%d)
			OR LOWER(%s) LIKE LOWER($%d)
		)`, submittedApplicantNameExpr(), argCount, argCount, submittedApplicantCitizenshipExpr(), argCount)
		args = append(args, "%"+*query.Search+"%")
	}

	if query.Program != nil && *query.Program != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND LOWER(COALESCE(application_data->>'program', '')) = LOWER($%d)", argCount)
		args = append(args, *query.Program)
	}

	if query.Citizenship != nil && *query.Citizenship != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND LOWER(%s) = LOWER($%d)", submittedApplicantCitizenshipExpr(), argCount)
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
		sortBy = "CASE WHEN COALESCE(application_data->>'gpa','') ~ '^[0-9]+(\\.[0-9]+)?$' THEN (application_data->>'gpa')::numeric ELSE NULL END"
	}
	sortOrder := "DESC"
	if query.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	selectQuery := fmt.Sprintf(
		`SELECT id, user_id, university_id, application_cycle, applicant_info, application_data,
		        submitted_at, received_at, 'submitted' AS status
		 %s ORDER BY %s %s NULLS LAST LIMIT $%d OFFSET $%d`,
		baseQuery, sortBy, sortOrder, limitArg, offsetArg,
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

func submittedApplicantNameExpr() string {
	return `COALESCE(NULLIF(applicant_info->>'name', ''), NULLIF(BTRIM(COALESCE(applicant_info->>'first_name', '') || ' ' || COALESCE(applicant_info->>'last_name', '')), ''), '')`
}

func submittedApplicantCitizenshipExpr() string {
	return `COALESCE(NULLIF(applicant_info->>'citizenship', ''), NULLIF(application_data->>'citizenship', ''), '')`
}

// GetSubmittedApplicationById retrieves a single submitted application by ID
func GetSubmittedApplicationById(ctx context.Context, id string) (*models.SubmittedApplication, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		`SELECT id, user_id, university_id, application_cycle, applicant_info, application_data,
		        submitted_at, received_at, 'submitted' AS status
		 FROM submitted_applications WHERE id = $1`,
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
		`SELECT id, application_id, user_id, university_id, application_cycle, field_key, file_name, content_type, file_size, file_data, created_at
		 FROM submitted_application_files
		 WHERE application_id = $1 AND id = $2`,
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
		`SELECT id, application_id, field_key, file_name, content_type, file_size, created_at
		 FROM submitted_application_files
		 WHERE application_id = $1
		 ORDER BY created_at DESC`,
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
