// profile_usecases_impl.go implements profile-related business logic.
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

func GetUserById(ctx context.Context, userId string) (*models.ProfileResponse, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx, "SELECT id, email, first_name, last_name, data, photo, last_seen FROM users WHERE id=$1", userId)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
	}

	profile, err := pgx.RowToStructByName[models.ProfileResponse](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return &profile, nil
}

func UpdateUserProfile(ctx context.Context, userId string, req *models.ProfileUpdateRequest) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var setClauses []string
	var args []any
	argIndex := 1

	if req.FirstName != nil {
		setClauses = append(setClauses, fmt.Sprintf("first_name=$%d", argIndex))
		args = append(args, *req.FirstName)
		argIndex++
	}
	if req.LastName != nil {
		setClauses = append(setClauses, fmt.Sprintf("last_name=$%d", argIndex))
		args = append(args, *req.LastName)
		argIndex++
	}
	if req.Data != nil {
		setClauses = append(setClauses, fmt.Sprintf("data=$%d", argIndex))
		args = append(args, req.Data)
		argIndex++
	}

	if len(setClauses) == 0 {
		return nil // nothing to update
	}

	query := fmt.Sprintf("UPDATE users SET %s WHERE id=$%d", strings.Join(setClauses, ", "), argIndex)
	args = append(args, userId)

	result, err := conn.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update user profile: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
	}

	return nil
}

func DeleteUser(ctx context.Context, userId string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	result, err := conn.Exec(ctx, "DELETE FROM users WHERE id=$1", userId)
	if err != nil {
		return fmt.Errorf("failed to delete user: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
	}

	return nil
}
