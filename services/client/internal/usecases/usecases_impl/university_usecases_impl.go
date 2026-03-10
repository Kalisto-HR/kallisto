// university_usecases_impl.go implements university-related business logic.
package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func GetAllUniversities(ctx context.Context, page, limit int) ([]models.UniversityListItem, int, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, 0, errors.New("could not establish connection with the database")
	}

	var total int
	err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM universities").Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %s", err.Error())
	}

	offset := (page - 1) * limit
	rows, err := conn.Query(ctx,
		`SELECT id, name, province, city, country, ranking, application_fee,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available,
		        city_type, campus_vibe
		 FROM universities
		 ORDER BY ranking ASC NULLS LAST, name ASC
		 LIMIT $1 OFFSET $2`,
		limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.UniversityListItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return items, total, nil
}

func GetUniversityById(ctx context.Context, id string) (*models.University, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		`SELECT id, manager_id, name, logo, description, province, city, country,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available,
		        city_type, campus_vibe, application_schema, ranking,
		        created_at, metadata, application_fee
		 FROM universities
		 WHERE id=$1`,
		id)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	university, err := pgx.RowToStructByName[models.University](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return &university, nil
}

func SearchUniversities(ctx context.Context, params *models.UniversitySearchParams) ([]models.UniversityListItem, int, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, 0, errors.New("could not establish connection with the database")
	}

	var whereClauses []string
	var args []any
	argIndex := 1

	if params.Query != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("name ILIKE $%d", argIndex))
		args = append(args, "%"+params.Query+"%")
		argIndex++
	}
	if params.Province != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("province = $%d", argIndex))
		args = append(args, *params.Province)
		argIndex++
	}
	if params.City != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("city = $%d", argIndex))
		args = append(args, *params.City)
		argIndex++
	}
	if params.Country != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("country = $%d", argIndex))
		args = append(args, *params.Country)
		argIndex++
	}
	if params.MinRanking != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("ranking >= $%d", argIndex))
		args = append(args, *params.MinRanking)
		argIndex++
	}
	if params.MaxRanking != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("ranking <= $%d", argIndex))
		args = append(args, *params.MaxRanking)
		argIndex++
	}
	if params.MaxFee != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("application_fee <= $%d", argIndex))
		args = append(args, *params.MaxFee)
		argIndex++
	}
	if params.MaxTuition != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("tuition_fee <= $%d", argIndex))
		args = append(args, *params.MaxTuition)
		argIndex++
	}

	if params.MinAcceptanceRate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("acceptance_rate >= $%d", argIndex))
		args = append(args, *params.MinAcceptanceRate)
		argIndex++
	}
	if params.MaxAcceptanceRate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("acceptance_rate <= $%d", argIndex))
		args = append(args, *params.MaxAcceptanceRate)
		argIndex++
	}
	if params.MinIelts != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("ielts_min <= $%d", argIndex))
		args = append(args, *params.MinIelts)
		argIndex++
	}
	if params.MinToefl != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("toefl_min <= $%d", argIndex))
		args = append(args, *params.MinToefl)
		argIndex++
	}
	if params.ScholarshipAvailable != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("scholarship_available = $%d", argIndex))
		args = append(args, *params.ScholarshipAvailable)
		argIndex++
	}
	if params.CityType != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("city_type = $%d", argIndex))
		args = append(args, *params.CityType)
		argIndex++
	}
	if params.CampusVibe != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("campus_vibe = $%d", argIndex))
		args = append(args, *params.CampusVibe)
		argIndex++
	}
	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM universities %s", whereClause)
	err := conn.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %s", err.Error())
	}

	offset := (params.Page - 1) * params.Limit
	selectQuery := fmt.Sprintf(
		`SELECT id, name, province, city, country, ranking, application_fee,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available,
		        city_type, campus_vibe
		 FROM universities
		 %s
		 ORDER BY ranking ASC NULLS LAST, name ASC LIMIT $%d OFFSET $%d`,
		whereClause, argIndex, argIndex+1)
	args = append(args, params.Limit, offset)

	rows, err := conn.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.UniversityListItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return items, total, nil
}
