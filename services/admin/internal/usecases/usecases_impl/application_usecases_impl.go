// Application usecases for reviewing submitted applications
package usecases_impl

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/admin/internal/models"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetSubmittedApplications retrieves a paginated list of submitted applications with optional filters
func GetSubmittedApplications(ctx context.Context, query models.SubmittedApplicationsQuery) ([]models.SubmittedApplication, int, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, 0, errors.New("could not establish connection with the database")
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
			LOWER(COALESCE(applicant_info->>'name', '')) LIKE LOWER($%d)
			OR LOWER(COALESCE(application_data->>'program', '')) LIKE LOWER($%d)
			OR LOWER(COALESCE(applicant_info->>'citizenship', '')) LIKE LOWER($%d)
		)`, argCount, argCount, argCount)
		args = append(args, "%"+*query.Search+"%")
	}

	if query.Program != nil && *query.Program != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND LOWER(COALESCE(application_data->>'program', '')) = LOWER($%d)", argCount)
		args = append(args, *query.Program)
	}

	if query.Citizenship != nil && *query.Citizenship != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND LOWER(COALESCE(applicant_info->>'citizenship', '')) = LOWER($%d)", argCount)
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
	err := conn.QueryRow(ctx, countQuery, args...).Scan(&total)
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
		        submitted_at, received_at, status, reviewed_by, reviewed_at, notes
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

// GetSubmittedApplicationById retrieves a single submitted application by ID
func GetSubmittedApplicationById(ctx context.Context, id string) (*models.SubmittedApplication, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		`SELECT id, user_id, university_id, application_cycle, applicant_info, application_data,
		        submitted_at, received_at, status, reviewed_by, reviewed_at, notes
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

// ReceiveApplication stores a new application submitted from the client service
func ReceiveApplication(ctx context.Context, req *models.ReceiveApplicationRequest) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	// Parse the submitted_at timestamp
	submittedAt, err := time.Parse(time.RFC3339, req.SubmittedAt)
	if err != nil {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid submitted_at timestamp format")
	}

	var applicationId string
	err = conn.QueryRow(ctx,
		`INSERT INTO submitted_applications
		 (user_id, university_id, application_cycle, applicant_info, application_data, submitted_at, status)
		 VALUES ($1, $2, $3, $4, $5, $6, 'pending')
		 ON CONFLICT (user_id, university_id, application_cycle)
		 DO UPDATE SET applicant_info = $4, application_data = $5, submitted_at = $6, received_at = NOW()
		 RETURNING id`,
		req.UserId,
		req.UniversityId,
		req.ApplicationCycle,
		req.ApplicantInfo,
		req.ApplicationData,
		submittedAt,
	).Scan(&applicationId)
	if err != nil {
		return fmt.Errorf("failed to store application: %s", err.Error())
	}

	if err := syncSubmittedApplicationFiles(ctx, conn, applicationId, req); err != nil {
		return err
	}

	return nil
}

func syncSubmittedApplicationFiles(
	ctx context.Context,
	conn *pgxpool.Pool,
	applicationId string,
	req *models.ReceiveApplicationRequest,
) error {
	if _, err := conn.Exec(
		ctx,
		"DELETE FROM submitted_application_files WHERE application_id = $1",
		applicationId,
	); err != nil {
		return fmt.Errorf("failed to reset submitted file assets: %s", err.Error())
	}

	if len(req.FileAssets) == 0 {
		return nil
	}

	for _, asset := range req.FileAssets {
		fileID := strings.TrimSpace(asset.Id)
		if fileID == "" {
			continue
		}
		fileBytes, err := base64.StdEncoding.DecodeString(asset.ContentB64)
		if err != nil {
			return fmt.Errorf("failed to decode submitted file content: %s", err.Error())
		}

		var fieldKey *string
		if trimmed := strings.TrimSpace(asset.FieldKey); trimmed != "" {
			fieldKey = &trimmed
		}

		_, err = conn.Exec(
			ctx,
			`INSERT INTO submitted_application_files (
				id,
				application_id,
				user_id,
				university_id,
				application_cycle,
				field_key,
				file_name,
				content_type,
				file_size,
				file_data,
				created_at
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
			fileID,
			applicationId,
			req.UserId,
			req.UniversityId,
			req.ApplicationCycle,
			fieldKey,
			asset.FileName,
			asset.ContentType,
			asset.FileSize,
			fileBytes,
		)
		if err != nil {
			return fmt.Errorf("failed to store submitted file asset: %s", err.Error())
		}
	}

	patchedApplicationData, err := patchApplicationDataWithAdminFileURLs(req.ApplicationData, applicationId)
	if err != nil {
		return fmt.Errorf("failed to patch submitted application data file links: %s", err.Error())
	}

	_, err = conn.Exec(
		ctx,
		"UPDATE submitted_applications SET application_data = $1 WHERE id = $2",
		patchedApplicationData,
		applicationId,
	)
	if err != nil {
		return fmt.Errorf("failed to persist patched application data: %s", err.Error())
	}

	return nil
}

func patchApplicationDataWithAdminFileURLs(raw json.RawMessage, applicationId string) (json.RawMessage, error) {
	var payload any
	if err := json.Unmarshal(raw, &payload); err != nil {
		// Keep original payload if shape is not JSON object/array.
		return raw, nil
	}

	var walk func(node any)
	walk = func(node any) {
		switch typed := node.(type) {
		case map[string]any:
			storage := strings.TrimSpace(firstString(typed["storage"]))
			fileID := strings.TrimSpace(firstString(typed["id"], typed["file_id"], typed["fileId"]))
			if storage == "application_file" && fileID != "" {
				adminURL := fmt.Sprintf("/adminapi/v1.0/applications/%s/files/%s/download", applicationId, fileID)
				typed["download_url"] = adminURL
				typed["url"] = adminURL
			}
			for _, value := range typed {
				walk(value)
			}
		case []any:
			for _, value := range typed {
				walk(value)
			}
		}
	}

	walk(payload)
	updated, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(updated), nil
}

func firstString(values ...any) string {
	for _, value := range values {
		switch typed := value.(type) {
		case string:
			if strings.TrimSpace(typed) != "" {
				return typed
			}
		}
	}
	return ""
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
		item.DownloadURL = fmt.Sprintf("/adminapi/v1.0/applications/%s/files/%s/download", applicationId, item.Id)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read submitted application files: %s", err.Error())
	}

	return items, nil
}

// ReviewApplication updates the review status of an application
func ReviewApplication(ctx context.Context, id string, reviewerId string, req *models.ApplicationReviewRequest) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	// Validate status transition
	validStatuses := map[string]bool{
		"pending":   true,
		"reviewing": true,
		"accepted":  true,
		"rejected":  true,
	}
	if !validStatuses[req.Status] {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid status value")
	}

	// Get current application status
	var currentStatus string
	err := conn.QueryRow(ctx, "SELECT status FROM submitted_applications WHERE id = $1", id).Scan(&currentStatus)
	if err != nil {
		if err == pgx.ErrNoRows {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
		}
		return fmt.Errorf("failed to get current status: %s", err.Error())
	}

	// Validate status transition (can't change from accepted/rejected back to pending)
	if (currentStatus == "accepted" || currentStatus == "rejected") && req.Status == "pending" {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "cannot revert a finalized application to pending")
	}

	// Update the application
	reviewedAt := time.Now()
	result, err := conn.Exec(ctx,
		`UPDATE submitted_applications
		 SET status = $1, reviewed_by = $2, reviewed_at = $3, notes = $4
		 WHERE id = $5`,
		req.Status,
		reviewerId,
		reviewedAt,
		req.Notes,
		id,
	)
	if err != nil {
		return fmt.Errorf("failed to update application: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
	}

	return nil
}
