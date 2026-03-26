// profile_usecases_impl.go implements profile-related business logic.
package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	authsession "kallisto/infra/auth/session"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"
	"net/http"
	"strings"
	"time"

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

	if err := revokeAllUserSessions(ctx, userId, authsession.ReasonPasswordChanged); err != nil {
		return err
	}

	return nil
}

func UpdateUserPhoto(ctx context.Context, userId string, photo []byte) error {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return err
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

func GetProfileTestScores(ctx context.Context, userId string) ([]models.ProfileTestScore, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx, `
		SELECT
			id,
			user_id,
			test_type,
			other_test_name,
			score,
			out_of,
			to_char(taken_on, 'YYYY-MM-DD') AS taken_on,
			created_at,
			updated_at
		FROM profile_test_scores
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userId)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch profile test scores: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.ProfileTestScore])
	if err != nil {
		return nil, fmt.Errorf("failed to scan profile test scores: %s", err.Error())
	}
	return items, nil
}

func CreateProfileTestScore(
	ctx context.Context,
	userId string,
	req *models.ProfileTestScoreUpsertRequest,
) (*models.ProfileTestScore, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	takenOn, err := parseOptionalDateString(req.TakenOn)
	if err != nil {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "taken_on must be in YYYY-MM-DD format")
	}

	var id string
	err = conn.QueryRow(ctx, `
		INSERT INTO profile_test_scores (
			user_id,
			test_type,
			other_test_name,
			score,
			out_of,
			taken_on,
			created_at,
			updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
		RETURNING id
	`,
		userId,
		req.TestType,
		normalizeOptionalString(req.OtherTestName),
		req.Score,
		req.OutOf,
		takenOn,
	).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create profile test score: %s", err.Error())
	}

	return getProfileTestScoreByID(ctx, conn, userId, id)
}

func UpdateProfileTestScore(
	ctx context.Context,
	userId, scoreId string,
	req *models.ProfileTestScoreUpsertRequest,
) (*models.ProfileTestScore, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	takenOn, err := parseOptionalDateString(req.TakenOn)
	if err != nil {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "taken_on must be in YYYY-MM-DD format")
	}

	result, err := conn.Exec(ctx, `
		UPDATE profile_test_scores
		SET
			test_type = $1,
			other_test_name = $2,
			score = $3,
			out_of = $4,
			taken_on = $5,
			updated_at = NOW()
		WHERE id = $6 AND user_id = $7
	`,
		req.TestType,
		normalizeOptionalString(req.OtherTestName),
		req.Score,
		req.OutOf,
		takenOn,
		scoreId,
		userId,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update profile test score: %s", err.Error())
	}
	if result.RowsAffected() == 0 {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "profile test score not found")
	}

	return getProfileTestScoreByID(ctx, conn, userId, scoreId)
}

func DeleteProfileTestScore(ctx context.Context, userId, scoreId string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	result, err := conn.Exec(ctx, `DELETE FROM profile_test_scores WHERE id = $1 AND user_id = $2`, scoreId, userId)
	if err != nil {
		return fmt.Errorf("failed to delete profile test score: %s", err.Error())
	}
	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "profile test score not found")
	}
	return nil
}

func getProfileTestScoreByID(
	ctx context.Context,
	conn *pgxpool.Pool,
	userId, scoreId string,
) (*models.ProfileTestScore, error) {
	rows, err := conn.Query(ctx, `
		SELECT
			id,
			user_id,
			test_type,
			other_test_name,
			score,
			out_of,
			to_char(taken_on, 'YYYY-MM-DD') AS taken_on,
			created_at,
			updated_at
		FROM profile_test_scores
		WHERE id = $1 AND user_id = $2
	`, scoreId, userId)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch profile test score: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "profile test score not found")
	}

	item, err := pgx.RowToStructByName[models.ProfileTestScore](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan profile test score: %s", err.Error())
	}
	return &item, nil
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func parseOptionalDateString(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", trimmed)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func revokeAllUserSessions(ctx context.Context, userId string, reason string) error {
	adminConn, ok := ctx.Value(middlewares.CtxClientPostgresKey).(*pgxpool.Pool)
	if !ok || adminConn == nil {
		return errors.New("could not establish connection with the session database")
	}

	store := authsession.NewStore(adminConn)
	if err := store.RevokeAllForUser(ctx, userId, reason); err != nil {
		return fmt.Errorf("failed to revoke user sessions: %s", err.Error())
	}
	return nil
}
