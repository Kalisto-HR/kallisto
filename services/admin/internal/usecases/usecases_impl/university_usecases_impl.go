// University usecases for managing universities (source of truth)
package usecases_impl

import (
	"context"
	"encoding/json"
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
		`SELECT id, manager_id, name, logo, description, province, city, country,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available, city_type,
		        campus_vibe, application_schema, management_profile,
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
		`SELECT id, manager_id, name, logo, description, province, city, country,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available, city_type,
		        campus_vibe, application_schema, management_profile,
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
		`INSERT INTO universities (
			name, description, province, city, country, acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available, city_type,
		        campus_vibe,
			application_schema, management_profile, ranking, metadata, application_fee
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		)
		 RETURNING id`,
		req.Name,
		req.Description,
		req.Province,
		req.City,
		req.Country,
		req.AcceptanceRate,
		req.TuitionFee,
		req.ApplicationDeadline,
		req.IeltsMin,
		req.ToeflMin,
		req.ScholarshipAvailable,
		req.CityType,
		req.CampusVibe,
		req.ApplicationSchema,
		req.ManagementProfile,
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
	if req.City != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("city = $%d", argCount))
		args = append(args, *req.City)
	}
	if req.Country != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("country = $%d", argCount))
		args = append(args, *req.Country)
	}
	if req.AcceptanceRate != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("acceptance_rate = $%d", argCount))
		args = append(args, *req.AcceptanceRate)
	}
	if req.TuitionFee != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("tuition_fee = $%d", argCount))
		args = append(args, *req.TuitionFee)
	}

	if req.ApplicationDeadline != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("application_deadline = $%d", argCount))
		args = append(args, *req.ApplicationDeadline)
	}
	if req.IeltsMin != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("ielts_min = $%d", argCount))
		args = append(args, *req.IeltsMin)
	}
	if req.ToeflMin != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("toefl_min = $%d", argCount))
		args = append(args, *req.ToeflMin)
	}
	if req.ScholarshipAvailable != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("scholarship_available = $%d", argCount))
		args = append(args, *req.ScholarshipAvailable)
	}
	if req.CityType != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("city_type = $%d", argCount))
		args = append(args, *req.CityType)
	}
	if req.CampusVibe != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("campus_vibe = $%d", argCount))
		args = append(args, *req.CampusVibe)
	}
	if req.ApplicationSchema != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("application_schema = $%d", argCount))
		args = append(args, req.ApplicationSchema)
	}
	if req.ManagementProfile != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("management_profile = $%d", argCount))
		args = append(args, req.ManagementProfile)
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

func ImportUniversities(ctx context.Context, reqs []models.ImportUniversityRequest) (int, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return 0, errors.New("could not establish connection with the database")
	}

	if len(reqs) == 0 {
		return 0, utils.NewHandlerFuncErr(http.StatusBadRequest, "universities payload is empty")
	}

	imported := 0
	err := pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		for _, req := range reqs {
			if req.Name == "" {
				return utils.NewHandlerFuncErr(http.StatusBadRequest, "university name is required")
			}

			if req.Id != nil && *req.Id != "" {
				_, err := tx.Exec(ctx, `
					INSERT INTO universities (
						id, name, description, province, city, country, acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available, city_type,
		        campus_vibe,
						application_schema, management_profile, ranking, metadata, application_fee
					)
					VALUES (
						$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
					)
					ON CONFLICT (id) DO UPDATE SET
						name = EXCLUDED.name,
						description = EXCLUDED.description,
						province = EXCLUDED.province,
						city = EXCLUDED.city,
						country = EXCLUDED.country,
						acceptance_rate = EXCLUDED.acceptance_rate,
						tuition_fee = EXCLUDED.tuition_fee,
						application_deadline = EXCLUDED.application_deadline,
						ielts_min = EXCLUDED.ielts_min,
						toefl_min = EXCLUDED.toefl_min,
						scholarship_available = EXCLUDED.scholarship_available,
						city_type = EXCLUDED.city_type,
						campus_vibe = EXCLUDED.campus_vibe,
						application_schema = EXCLUDED.application_schema,
						management_profile = EXCLUDED.management_profile,
						ranking = EXCLUDED.ranking,
						metadata = EXCLUDED.metadata,
						application_fee = EXCLUDED.application_fee
				`,
					*req.Id,
					req.Name,
					req.Description,
					req.Province,
					req.City,
					req.Country,
					req.AcceptanceRate,
					req.TuitionFee,
					req.ApplicationDeadline,
					req.IeltsMin,
					req.ToeflMin,
					req.ScholarshipAvailable,
					req.CityType,
					req.CampusVibe,
					req.ApplicationSchema,
					req.ManagementProfile,
					req.Ranking,
					req.Metadata,
					req.ApplicationFee,
				)
				if err != nil {
					return fmt.Errorf("failed to upsert university %s: %s", *req.Id, err.Error())
				}
			} else {
				_, err := tx.Exec(ctx, `
					INSERT INTO universities (
						name, description, province, city, country, acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available, city_type,
		        campus_vibe,
						application_schema, management_profile, ranking, metadata, application_fee
					)
					VALUES (
						$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
					)
				`,
					req.Name,
					req.Description,
					req.Province,
					req.City,
					req.Country,
					req.AcceptanceRate,
					req.TuitionFee,
					req.ApplicationDeadline,
					req.IeltsMin,
					req.ToeflMin,
					req.ScholarshipAvailable,
					req.CityType,
					req.CampusVibe,
					req.ApplicationSchema,
					req.ManagementProfile,
					req.Ranking,
					req.Metadata,
					req.ApplicationFee,
				)
				if err != nil {
					return fmt.Errorf("failed to insert university: %s", err.Error())
				}
			}

			imported++
		}

		return nil
	})
	if err != nil {
		return 0, err
	}

	return imported, nil
}

// GetUniversityApplicationStructure returns only the application schema for a university.
func GetUniversityApplicationStructure(ctx context.Context, id string) (json.RawMessage, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	var schema json.RawMessage
	err := conn.QueryRow(ctx, "SELECT application_schema FROM universities WHERE id = $1", id).Scan(&schema)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
		}
		return nil, fmt.Errorf("failed to fetch application structure: %s", err.Error())
	}

	return schema, nil
}

// UpdateUniversityApplicationStructure updates only the application schema for a university.
func UpdateUniversityApplicationStructure(ctx context.Context, id string, schema json.RawMessage) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	result, err := conn.Exec(ctx, "UPDATE universities SET application_schema = $1 WHERE id = $2", schema, id)
	if err != nil {
		return fmt.Errorf("failed to update application structure: %s", err.Error())
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
