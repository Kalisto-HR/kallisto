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
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetSubmittedApplications retrieves a paginated list of submitted applications with optional filters
func GetSubmittedApplications(ctx context.Context, universityId *string, status *string, page, limit int) ([]models.SubmittedApplication, int, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, 0, errors.New("could not establish connection with the database")
	}

	// Build query with optional filters
	baseQuery := `FROM submitted_applications WHERE 1=1`
	args := []interface{}{}
	argCount := 0

	if universityId != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND university_id = $%d", argCount)
		args = append(args, *universityId)
	}

	if status != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, *status)
	}

	// Get total count
	var total int
	countQuery := "SELECT COUNT(*) " + baseQuery
	err := conn.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get application count: %s", err.Error())
	}

	// Get paginated results
	offset := (page - 1) * limit
	argCount++
	limitArg := argCount
	argCount++
	offsetArg := argCount

	selectQuery := fmt.Sprintf(
		`SELECT id, user_id, university_id, application_cycle, applicant_info, application_data,
		        submitted_at, received_at, status, reviewed_by, reviewed_at, notes
		 %s ORDER BY received_at DESC LIMIT $%d OFFSET $%d`,
		baseQuery, limitArg, offsetArg,
	)
	args = append(args, limit, offset)

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

	_, err = conn.Exec(ctx,
		`INSERT INTO submitted_applications
		 (user_id, university_id, application_cycle, applicant_info, application_data, submitted_at, status)
		 VALUES ($1, $2, $3, $4, $5, $6, 'pending')
		 ON CONFLICT (user_id, university_id, application_cycle)
		 DO UPDATE SET applicant_info = $4, application_data = $5, submitted_at = $6, received_at = NOW()`,
		req.UserId,
		req.UniversityId,
		req.ApplicationCycle,
		req.ApplicantInfo,
		req.ApplicationData,
		submittedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to store application: %s", err.Error())
	}

	return nil
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
