// University usecases for managing universities (source of truth)
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

// GetAllUniversities retrieves a paginated list of all universities
func GetAllUniversities(ctx context.Context, page, limit int) ([]models.University, int, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, 0, errors.New("could not establish connection with the database")
	}

	// Get total count
	var total int
	err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM universities").Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get university count: %s", err.Error())
	}

	// Get paginated results
	offset := (page - 1) * limit
	rows, err := conn.Query(ctx,
		`SELECT id, manager_id, name, logo, description, province, application_schema,
		        ranking, created_at, metadata, application_fee
		 FROM universities
		 ORDER BY ranking ASC NULLS LAST, name ASC
		 LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query universities: %s", err.Error())
	}
	defer rows.Close()

	universities, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.University])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to scan universities: %s", err.Error())
	}

	return universities, total, nil
}

// GetUniversityById retrieves a single university by ID
func GetUniversityById(ctx context.Context, id string) (*models.University, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		`SELECT id, manager_id, name, logo, description, province, application_schema,
		        ranking, created_at, metadata, application_fee
		 FROM universities WHERE id = $1`,
		id,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query university: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	university, err := pgx.RowToStructByName[models.University](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan university: %s", err.Error())
	}

	return &university, nil
}

// CreateUniversity creates a new university and returns its ID
func CreateUniversity(ctx context.Context, req *models.CreateUniversityRequest) (string, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return "", errors.New("could not establish connection with the database")
	}

	if req.Name == "" {
		return "", utils.NewHandlerFuncErr(http.StatusBadRequest, "university name is required")
	}

	var universityId string
	err := conn.QueryRow(ctx,
		`INSERT INTO universities (name, description, province, application_schema, ranking, metadata, application_fee)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id`,
		req.Name,
		req.Description,
		req.Province,
		req.ApplicationSchema,
		req.Ranking,
		req.Metadata,
		req.ApplicationFee,
	).Scan(&universityId)

	if err != nil {
		return "", fmt.Errorf("failed to create university: %s", err.Error())
	}

	return universityId, nil
}

// UpdateUniversity updates an existing university
func UpdateUniversity(ctx context.Context, id string, req *models.UpdateUniversityRequest) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	// Build dynamic update query
	query := "UPDATE universities SET "
	args := []interface{}{}
	argCount := 0
	updates := []string{}

	if req.Name != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *req.Name)
	}
	if req.Description != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("description = $%d", argCount))
		args = append(args, *req.Description)
	}
	if req.Province != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("province = $%d", argCount))
		args = append(args, *req.Province)
	}
	if req.ApplicationSchema != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("application_schema = $%d", argCount))
		args = append(args, req.ApplicationSchema)
	}
	if req.Ranking != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("ranking = $%d", argCount))
		args = append(args, *req.Ranking)
	}
	if req.Metadata != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("metadata = $%d", argCount))
		args = append(args, req.Metadata)
	}
	if req.ApplicationFee != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("application_fee = $%d", argCount))
		args = append(args, *req.ApplicationFee)
	}

	if len(updates) == 0 {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "no fields to update")
	}

	// Add WHERE clause
	argCount++
	query += joinStrings(updates, ", ") + fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, id)

	result, err := conn.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update university: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	return nil
}

// DeleteUniversity deletes a university by ID
func DeleteUniversity(ctx context.Context, id string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	result, err := conn.Exec(ctx, "DELETE FROM universities WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete university: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	return nil
}

// AssignManager assigns a manager (partner) to a university
func AssignManager(ctx context.Context, universityId string, managerId string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	result, err := conn.Exec(ctx,
		"UPDATE universities SET manager_id = $1 WHERE id = $2",
		managerId, universityId,
	)
	if err != nil {
		return fmt.Errorf("failed to assign manager: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	return nil
}

// joinStrings joins a slice of strings with a separator
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
