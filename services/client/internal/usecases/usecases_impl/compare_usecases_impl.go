package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxCompareItems = 4

func GetUserCompareList(ctx context.Context, userId string) ([]models.UniversityListItem, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx, `
		SELECT 
			u.id, u.name, u.province, u.city, u.country, u.ranking, u.application_fee,
			u.acceptance_rate, u.tuition_fee, u.application_deadline,
			u.ielts_min, u.toefl_min, u.scholarship_available,
			u.city_type, u.campus_vibe
		FROM user_compare uc
		JOIN universities u ON u.id = uc.university_id
		WHERE uc.user_id = $1
		ORDER BY uc.created_at ASC
	`, userId)
	if err != nil {
		return nil, fmt.Errorf("failed to query compare universities: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.UniversityListItem])
	if err != nil {
		return nil, fmt.Errorf("failed to scan compare universities: %s", err.Error())
	}

	return items, nil
}

func AddToCompare(ctx context.Context, userId, universityId string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var exists bool
	if err := conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM universities WHERE id=$1)", universityId).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check university existence: %s", err.Error())
	}
	if !exists {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	var alreadyAdded bool
	if err := conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM user_compare WHERE user_id=$1 AND university_id=$2)", userId, universityId).Scan(&alreadyAdded); err != nil {
		return fmt.Errorf("failed to check compare list membership: %s", err.Error())
	}
	if alreadyAdded {
		return nil
	}

	var currentCount int
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM user_compare WHERE user_id=$1", userId).Scan(&currentCount); err != nil {
		return fmt.Errorf("failed to check compare list size: %s", err.Error())
	}
	if currentCount >= maxCompareItems {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "compare list supports up to 4 universities")
	}

	_, err := conn.Exec(ctx, `
		INSERT INTO user_compare (user_id, university_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, university_id) DO NOTHING
	`, userId, universityId)
	if err != nil {
		return fmt.Errorf("failed to add university to compare list: %s", err.Error())
	}

	return nil
}

func RemoveFromCompare(ctx context.Context, userId, universityId string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	_, err := conn.Exec(ctx, "DELETE FROM user_compare WHERE user_id=$1 AND university_id=$2", userId, universityId)
	if err != nil {
		return fmt.Errorf("failed to remove university from compare list: %s", err.Error())
	}

	return nil
}

func ClearCompare(ctx context.Context, userId string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	_, err := conn.Exec(ctx, "DELETE FROM user_compare WHERE user_id=$1", userId)
	if err != nil {
		return fmt.Errorf("failed to clear compare list: %s", err.Error())
	}

	return nil
}
