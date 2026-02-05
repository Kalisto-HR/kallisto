// application_usecases_impl.go implements application-related business logic.
package usecases_impl

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

func GetApplicationsByUser(ctx context.Context, userId string) ([]models.ApplicationListItem, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		`SELECT a.university_id, u.name as university_name, a.application_cycle, a.status, a.created_at, a.submitted_at
		FROM applications a JOIN universities u ON a.university_id = u.id
		WHERE a.user_id=$1 ORDER BY a.created_at DESC`, userId)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.ApplicationListItem])
	if err != nil {
		return nil, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return items, nil
}

func GetApplicationById(ctx context.Context, userId, universityId, cycle string) (*models.Application, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		"SELECT user_id, university_id, application_cycle, status, data, submitted_at, created_at FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3",
		userId, universityId, cycle)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
	}

	application, err := pgx.RowToStructByName[models.Application](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return &application, nil
}

func CreateApplication(ctx context.Context, userId string, req *models.ApplicationCreateRequest) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var universityExists bool
	err := conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM universities WHERE id=$1)", req.UniversityId).Scan(&universityExists)
	if err != nil {
		return fmt.Errorf("failed to check university existence: %s", err.Error())
	}
	if !universityExists {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	var applicationExists bool
	err = conn.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3)",
		userId, req.UniversityId, req.ApplicationCycle).Scan(&applicationExists)
	if err != nil {
		return fmt.Errorf("failed to check application existence: %s", err.Error())
	}
	if applicationExists {
		return utils.NewHandlerFuncErr(http.StatusConflict, "application already exists for this cycle")
	}

	_, err = conn.Exec(ctx,
		"INSERT INTO applications (user_id, university_id, application_cycle, status, data, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
		userId, req.UniversityId, req.ApplicationCycle, models.StatusDraft, req.Data)
	if err != nil {
		return fmt.Errorf("failed to create application: %s", err.Error())
	}

	return nil
}

func UpdateApplication(ctx context.Context, userId, universityId, cycle string, req *models.ApplicationUpdateRequest) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var status string
	err := conn.QueryRow(ctx,
		"SELECT status FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3",
		userId, universityId, cycle).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
		}
		return fmt.Errorf("failed to check application status: %s", err.Error())
	}
	if status != models.StatusDraft {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "cannot update submitted application")
	}

	result, err := conn.Exec(ctx,
		"UPDATE applications SET data=$1 WHERE user_id=$2 AND university_id=$3 AND application_cycle=$4 AND status=$5",
		req.Data, userId, universityId, cycle, models.StatusDraft)
	if err != nil {
		return fmt.Errorf("failed to update application: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
	}

	return nil
}

func SubmitApplication(ctx context.Context, userId, universityId, cycle string) error {
	log := zap.L()

	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var status string
	err := conn.QueryRow(ctx,
		"SELECT status FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3",
		userId, universityId, cycle).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
		}
		return fmt.Errorf("failed to check application status: %s", err.Error())
	}
	if status != models.StatusDraft {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "application already submitted")
	}

	// Update application status to submitted
	submittedAt := time.Now()
	result, err := conn.Exec(ctx,
		"UPDATE applications SET status=$1, submitted_at=$2 WHERE user_id=$3 AND university_id=$4 AND application_cycle=$5 AND status=$6",
		models.StatusSubmitted, submittedAt, userId, universityId, cycle, models.StatusDraft)
	if err != nil {
		return fmt.Errorf("failed to submit application: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
	}

	// Fetch application data and user info To forward to admin service
	var applicationData json.RawMessage
	err = conn.QueryRow(ctx,
		"SELECT data FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3",
		userId, universityId, cycle).Scan(&applicationData)
	if err != nil {
		log.Error("failed to fetch application data for forwarding", zap.Error(err))
		// Don't fail the submission, just log the error
	}

	var userEmail, userFirstName, userLastName string
	err = conn.QueryRow(ctx,
		"SELECT email, first_name, last_name FROM users WHERE id=$1",
		userId).Scan(&userEmail, &userFirstName, &userLastName)
	if err != nil {
		log.Error("failed to fetch user info for forwarding", zap.Error(err))
		// Don't fail the submission, just log the error
	}

	// Forward application to admin service
	go forwardApplicationToAdmin(userId, universityId, cycle, applicationData, userEmail, userFirstName, userLastName, submittedAt)

	return nil
}

// forwardApplicationToAdmin sends the submitted application to the admin service
func forwardApplicationToAdmin(userId, universityId, cycle string, applicationData json.RawMessage, email, firstName, lastName string, submittedAt time.Time) {
	log := zap.L()

	// Build the request payload
	payload := map[string]interface{}{
		"user_id":           userId,
		"university_id":     universityId,
		"application_cycle": cycle,
		"applicant_info": map[string]string{
			"email":      email,
			"first_name": firstName,
			"last_name":  lastName,
		},
		"application_data": applicationData,
		"submitted_at":     submittedAt.Format(time.RFC3339),
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		log.Error("failed to marshal application payload for admin service", zap.Error(err))
		return
	}

	// Get admin service URL from environment or use default
	adminServiceURL := os.Getenv("ADMIN_SERVICE_URL")
	if adminServiceURL == "" {
		adminServiceURL = "http://localhost:8081"
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", adminServiceURL+"/v1.0/applications/receive", bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Error("failed to create request to admin service", zap.Error(err))
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// Send request with timeout
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Error("failed to forward application to admin service",
			zap.Error(err),
			zap.String("user_id", userId),
			zap.String("university_id", universityId),
			zap.String("cycle", cycle))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusCreated {
		log.Info("successfully forwarded application to admin service",
			zap.String("user_id", userId),
			zap.String("university_id", universityId),
			zap.String("cycle", cycle))
	} else {
		log.Warn("admin service returned non-success status",
			zap.Int("status", resp.StatusCode),
			zap.String("user_id", userId),
			zap.String("university_id", universityId),
			zap.String("cycle", cycle))
	}
}

func DeleteApplication(ctx context.Context, userId, universityId, cycle string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	result, err := conn.Exec(ctx,
		"DELETE FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3 AND status=$4",
		userId, universityId, cycle, models.StatusDraft)
	if err != nil {
		return fmt.Errorf("failed to delete application: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found or already submitted")
	}

	return nil
}
