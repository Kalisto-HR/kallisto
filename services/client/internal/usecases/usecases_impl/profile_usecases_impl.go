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
	"golang.org/x/crypto/bcrypt"
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
		setClauses = append(setClauses, fmt.Sprintf("data=COALESCE(data, '{}'::jsonb) || $%d::jsonb", argIndex))
		args = append(args, string(req.Data))
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

func ChangeUserPassword(ctx context.Context, userId, currentPassword, newPassword string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var currentHash string
	if err := conn.QueryRow(ctx, "SELECT password FROM users WHERE id=$1", userId).Scan(&currentHash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
		}
		return fmt.Errorf("failed to fetch current password hash: %s", err.Error())
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(currentPassword)); err != nil {
		return utils.NewHandlerFuncErr(http.StatusUnauthorized, "current password is incorrect")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %s", err.Error())
	}

	result, err := conn.Exec(ctx, "UPDATE users SET password=$1 WHERE id=$2", string(newHash), userId)
	if err != nil {
		return fmt.Errorf("failed to update password: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
	}

	return nil
}

func UpdateUserPhoto(ctx context.Context, userId string, photo []byte) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	result, err := conn.Exec(ctx, "UPDATE users SET photo=$1 WHERE id=$2", photo, userId)
	if err != nil {
		return fmt.Errorf("failed to update profile photo: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
	}

	return nil
}

func GetUserPhoto(ctx context.Context, userId string) ([]byte, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	var photo []byte
	if err := conn.QueryRow(ctx, "SELECT photo FROM users WHERE id=$1", userId).Scan(&photo); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
		}
		return nil, fmt.Errorf("failed to fetch profile photo: %s", err.Error())
	}

	if len(photo) == 0 {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "profile photo not found")
	}

	return photo, nil
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
