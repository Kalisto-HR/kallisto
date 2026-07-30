// University usecases for managing universities (source of truth)
package usecases_impl

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/observability"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/shared/models"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetAllUniversities retrieves a paginated list of all universities
func GetAllUniversities(ctx context.Context, page, limit int) ([]models.University, int, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, 0, err
	}

	// Get total count
	var total int
	err = conn.QueryRow(ctx, "SELECT COUNT(*) FROM universities").Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get university count: %s", err.Error())
	}

	// Get paginated results
	offset := (page - 1) * limit
	rows, err := conn.Query(ctx,
		`SELECT id, manager_id, name, logo, description, province, city, country,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available, city_type,
		        campus_vibe, application_schema, university_profile,
		        created_at, metadata, application_fee
		 FROM universities
		 ORDER BY name ASC
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

	for index := range universities {
		universities[index].ApplicationSchema = utils.NormalizeApplicationSchema(universities[index].ApplicationSchema)
	}

	return universities, total, nil
}

// GetUniversityById retrieves a single university by ID
func GetUniversityById(ctx context.Context, id string) (*models.University, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(ctx,
		`SELECT id, manager_id, name, logo, description, province, city, country,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available, city_type,
		        campus_vibe, application_schema, university_profile,
		        created_at, metadata, application_fee
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

	university.ApplicationSchema = utils.NormalizeApplicationSchema(university.ApplicationSchema)
	setSharedUniversityLogoUrl(&university)

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
	err := pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx,
			`INSERT INTO universities (
				name, description, province, city, country, acceptance_rate, tuition_fee, application_deadline,
			        ielts_min, toefl_min, scholarship_available, city_type,
			        campus_vibe,
				application_schema, university_profile, metadata, application_fee
			)
			VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
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
			req.UniversityProfile,
			req.Metadata,
			req.ApplicationFee,
		).Scan(&universityId); err != nil {
			return fmt.Errorf("failed to create university: %s", err.Error())
		}

		metadata, _ := json.Marshal(map[string]any{
			"name":    req.Name,
			"country": req.Country,
			"city":    req.City,
		})
		return insertAuditLog(ctx, tx, observability.AuditEntry{
			ActionType:        "university.create",
			ActionDescription: "Created university",
			TargetEntity:      "university",
			TargetID:          &universityId,
			Outcome:           "success",
			Metadata:          metadata,
		})
	})
	if err != nil {
		return "", err
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
	changedFields := make([]string, 0, 12)

	if req.Name != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *req.Name)
		changedFields = append(changedFields, "name")
	}
	if req.Description != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("description = $%d", argCount))
		args = append(args, *req.Description)
		changedFields = append(changedFields, "description")
	}
	if req.Province != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("province = $%d", argCount))
		args = append(args, *req.Province)
		changedFields = append(changedFields, "province")
	}
	if req.City != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("city = $%d", argCount))
		args = append(args, *req.City)
		changedFields = append(changedFields, "city")
	}
	if req.Country != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("country = $%d", argCount))
		args = append(args, *req.Country)
		changedFields = append(changedFields, "country")
	}
	if req.AcceptanceRate != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("acceptance_rate = $%d", argCount))
		args = append(args, *req.AcceptanceRate)
		changedFields = append(changedFields, "acceptance_rate")
	}
	if req.TuitionFee != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("tuition_fee = $%d", argCount))
		args = append(args, *req.TuitionFee)
		changedFields = append(changedFields, "tuition_fee")
	}

	if req.ApplicationDeadline != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("application_deadline = $%d", argCount))
		args = append(args, *req.ApplicationDeadline)
		changedFields = append(changedFields, "application_deadline")
	}
	if req.IeltsMin != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("ielts_min = $%d", argCount))
		args = append(args, *req.IeltsMin)
		changedFields = append(changedFields, "ielts_min")
	}
	if req.ToeflMin != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("toefl_min = $%d", argCount))
		args = append(args, *req.ToeflMin)
		changedFields = append(changedFields, "toefl_min")
	}
	if req.ScholarshipAvailable != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("scholarship_available = $%d", argCount))
		args = append(args, *req.ScholarshipAvailable)
		changedFields = append(changedFields, "scholarship_available")
	}
	if req.CityType != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("city_type = $%d", argCount))
		args = append(args, *req.CityType)
		changedFields = append(changedFields, "city_type")
	}
	if req.CampusVibe != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("campus_vibe = $%d", argCount))
		args = append(args, *req.CampusVibe)
		changedFields = append(changedFields, "campus_vibe")
	}
	if req.ApplicationSchema != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("application_schema = $%d", argCount))
		args = append(args, req.ApplicationSchema)
		changedFields = append(changedFields, "application_schema")
	}
	if req.UniversityProfile != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("university_profile = $%d", argCount))
		args = append(args, req.UniversityProfile)
		changedFields = append(changedFields, "university_profile")
	}
	if req.Metadata != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("metadata = $%d", argCount))
		args = append(args, req.Metadata)
		changedFields = append(changedFields, "metadata")
	}
	if req.ApplicationFee != nil {
		argCount++
		updates = append(updates, fmt.Sprintf("application_fee = $%d", argCount))
		args = append(args, *req.ApplicationFee)
		changedFields = append(changedFields, "application_fee")
	}

	if len(updates) == 0 {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "no fields to update")
	}

	// Add WHERE clause
	argCount++
	query += joinStrings(updates, ", ") + fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, id)

	err := pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		result, err := tx.Exec(ctx, query, args...)
		if err != nil {
			return fmt.Errorf("failed to update university: %s", err.Error())
		}

		if result.RowsAffected() == 0 {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
		}

		metadata, _ := json.Marshal(map[string]any{
			"changed_fields": changedFields,
			"count":          len(changedFields),
		})
		return insertAuditLog(ctx, tx, observability.AuditEntry{
			ActionType:        "university.update",
			ActionDescription: "Updated university profile",
			TargetEntity:      "university",
			TargetID:          &id,
			Outcome:           "success",
			Metadata:          metadata,
		})
	})
	if err != nil {
		return err
	}

	return nil
}

// DeleteUniversity deletes a university by ID
func DeleteUniversity(ctx context.Context, id string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	return pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		result, err := tx.Exec(ctx, "DELETE FROM universities WHERE id = $1", id)
		if err != nil {
			return fmt.Errorf("failed to delete university: %s", err.Error())
		}

		if result.RowsAffected() == 0 {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
		}

		return insertAuditLog(ctx, tx, observability.AuditEntry{
			ActionType:        "university.delete",
			ActionDescription: "Deleted university",
			TargetEntity:      "university",
			TargetID:          &id,
			Outcome:           "success",
		})
	})
}

// AssignPartner links a partner account to a university.
func AssignPartner(ctx context.Context, universityId string, managerId string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	result, err := conn.Exec(ctx,
		"UPDATE universities SET manager_id = $1 WHERE id = $2",
		managerId, universityId,
	)
	if err != nil {
		return fmt.Errorf("failed to assign partner: %s", err.Error())
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
						application_schema, university_profile, metadata, application_fee
					)
					VALUES (
						$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
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
						university_profile = EXCLUDED.university_profile,
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
					req.UniversityProfile,
					req.Metadata,
					req.ApplicationFee,
				)
				if err != nil {
					return fmt.Errorf("failed to upsert university %s: %s", *req.Id, err.Error())
				}
			} else {
				var universityId string
				if err := tx.QueryRow(ctx, `
					INSERT INTO universities (
						name, description, province, city, country, acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available, city_type,
		        campus_vibe,
						application_schema, university_profile, metadata, application_fee
					)
					VALUES (
						$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
					)
					RETURNING id
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
					req.UniversityProfile,
					req.Metadata,
					req.ApplicationFee,
				).Scan(&universityId); err != nil {
					return fmt.Errorf("failed to insert university: %s", err.Error())
				}
			}

			imported++
		}

		metadata, _ := json.Marshal(map[string]any{
			"count": imported,
		})
		if err := insertAuditLog(ctx, tx, observability.AuditEntry{
			ActionType:        "university.create",
			ActionDescription: "Imported universities",
			TargetEntity:      "university_import",
			Outcome:           "success",
			Metadata:          metadata,
		}); err != nil {
			return err
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
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	var schema json.RawMessage
	err = conn.QueryRow(ctx, "SELECT application_schema FROM universities WHERE id = $1", id).Scan(&schema)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
		}
		return nil, fmt.Errorf("failed to fetch application structure: %s", err.Error())
	}

	return utils.NormalizeApplicationSchema(schema), nil
}

// UpdateUniversityApplicationStructure updates only the application schema for a university.
func UpdateUniversityApplicationStructure(ctx context.Context, id string, schema json.RawMessage) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	return pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		result, err := tx.Exec(ctx, "UPDATE universities SET application_schema = $1 WHERE id = $2", schema, id)
		if err != nil {
			return fmt.Errorf("failed to update application structure: %s", err.Error())
		}

		if result.RowsAffected() == 0 {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
		}

		return insertAuditLog(ctx, tx, observability.AuditEntry{
			ActionType:        "application-structure.update",
			ActionDescription: "Updated application structure",
			TargetEntity:      "university_application_structure",
			TargetID:          &id,
			Outcome:           "success",
		})
	})
}

func UpdateUniversityLogo(ctx context.Context, id string, logo []byte) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	return pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		result, err := tx.Exec(ctx, "UPDATE universities SET logo = $1 WHERE id = $2", logo, id)
		if err != nil {
			return fmt.Errorf("failed to update university logo: %s", err.Error())
		}
		if result.RowsAffected() == 0 {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
		}
		return insertAuditLog(ctx, tx, observability.AuditEntry{
			ActionType:        "university.logo.update",
			ActionDescription: "Updated university logo",
			TargetEntity:      "university",
			TargetID:          &id,
			Outcome:           "success",
		})
	})
}

func GetUniversityLogo(ctx context.Context, id string) ([]byte, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	var logo []byte
	if err := conn.QueryRow(ctx, "SELECT logo FROM universities WHERE id=$1", id).Scan(&logo); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "university logo not found")
		}
		return nil, fmt.Errorf("failed to fetch university logo: %s", err.Error())
	}
	if len(logo) == 0 {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "university logo not found")
	}
	return logo, nil
}

func setSharedUniversityLogoUrl(university *models.University) {
	if university == nil || len(university.Logo) == 0 {
		return
	}
	logoUrl := "/api/v1.0/applicant/universities/" + university.Id + "/logo"
	university.LogoUrl = &logoUrl
	university.Logo = nil
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
