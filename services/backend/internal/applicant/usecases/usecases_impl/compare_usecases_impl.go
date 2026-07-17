package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/applicant/models"
	"net/http"

	"github.com/jackc/pgx/v5"
)

const maxCompareItems = 4

func GetUserCompareList(ctx context.Context, userId string) ([]models.UniversityListItem, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	if err := pruneOrphanCompareRows(ctx, conn, userId); err != nil {
		return nil, err
	}

	rows, err := conn.Query(ctx, `
		SELECT 
			u.id, u.name, u.description, u.province, u.city, u.country, u.ranking, u.application_fee,
			u.acceptance_rate, u.tuition_fee, u.application_deadline,
			u.ielts_min, u.toefl_min, u.scholarship_available,
			u.city_type, u.campus_vibe,
			u.university_profile->>'programGroups' AS program_groups
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

func AddToCompare(ctx context.Context, userId, universityId string) (err error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return err
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin compare mutation transaction: %s", err.Error())
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err = lockCompareOwner(ctx, tx, userId); err != nil {
		return err
	}

	if err = pruneOrphanCompareRows(ctx, tx, userId); err != nil {
		return err
	}

	var exists bool
	if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM universities WHERE id=$1)", universityId).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check university existence: %s", err.Error())
	}
	if !exists {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	var alreadyAdded bool
	if err = tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM user_compare uc
			JOIN universities u ON u.id = uc.university_id
			WHERE uc.user_id = $1 AND uc.university_id = $2
		)
	`, userId, universityId).Scan(&alreadyAdded); err != nil {
		return fmt.Errorf("failed to check compare list membership: %s", err.Error())
	}
	if alreadyAdded {
		if err = tx.Commit(ctx); err != nil {
			return fmt.Errorf("failed to commit compare mutation transaction: %s", err.Error())
		}
		return nil
	}

	var currentCount int
	if err = tx.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM user_compare uc
		JOIN universities u ON u.id = uc.university_id
		WHERE uc.user_id = $1
	`, userId).Scan(&currentCount); err != nil {
		return fmt.Errorf("failed to check compare list size: %s", err.Error())
	}
	if currentCount >= maxCompareItems {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "compare list supports up to 4 universities")
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO user_compare (user_id, university_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, university_id) DO NOTHING
	`, userId, universityId)
	if err != nil {
		return fmt.Errorf("failed to add university to compare list: %s", err.Error())
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit compare mutation transaction: %s", err.Error())
	}

	return nil
}

func RemoveFromCompare(ctx context.Context, userId, universityId string) error {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return err
	}

	_, err = conn.Exec(ctx, "DELETE FROM user_compare WHERE user_id=$1 AND university_id=$2", userId, universityId)
	if err != nil {
		return fmt.Errorf("failed to remove university from compare list: %s", err.Error())
	}

	return nil
}

func ClearCompare(ctx context.Context, userId string) error {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return err
	}

	_, err = conn.Exec(ctx, "DELETE FROM user_compare WHERE user_id=$1", userId)
	if err != nil {
		return fmt.Errorf("failed to clear compare list: %s", err.Error())
	}

	return nil
}

func pruneOrphanCompareRows(ctx context.Context, conn middlewares.DB, userId string) error {
	_, err := conn.Exec(ctx, `
		DELETE FROM user_compare uc
		WHERE uc.user_id = $1
		  AND NOT EXISTS (
			  SELECT 1
			  FROM universities u
			  WHERE u.id = uc.university_id
		  )
	`, userId)
	if err != nil {
		return fmt.Errorf("failed to prune orphan compare rows: %s", err.Error())
	}

	return nil
}

func lockCompareOwner(ctx context.Context, conn middlewares.DB, userId string) error {
	var locked int
	if err := conn.QueryRow(ctx, "SELECT 1 FROM users WHERE id = $1 FOR UPDATE", userId).Scan(&locked); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
		}
		return fmt.Errorf("failed to lock compare owner: %s", err.Error())
	}

	return nil
}
