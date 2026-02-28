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
	"golang.org/x/crypto/bcrypt"
)

// GetUniversityUsers retrieves users linked to a university.
func GetUniversityUsers(ctx context.Context, universityId string) ([]models.UniversityUserListItem, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		`SELECT id, email, first_name, last_name, role, university_linked, created_at
		 FROM users
		 WHERE university_linked = $1
		 ORDER BY created_at DESC`,
		universityId,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query university users: %s", err.Error())
	}
	defer rows.Close()

	users, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.UniversityUserListItem])
	if err != nil {
		return nil, fmt.Errorf("failed to scan university users: %s", err.Error())
	}

	return users, nil
}

// CreateUniversityPartnerUser creates a partner account linked to a university.
func CreateUniversityPartnerUser(ctx context.Context, universityId string, req *models.UniversityUserCreateRequest) (string, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return "", errors.New("could not establish connection with the database")
	}

	var universityExists bool
	if err := conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM universities WHERE id=$1)", universityId).Scan(&universityExists); err != nil {
		return "", fmt.Errorf("failed to verify university: %s", err.Error())
	}
	if !universityExists {
		return "", utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %s", err.Error())
	}

	var userId string
	err = pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx,
			`INSERT INTO users (email, password, first_name, last_name, role, university_linked)
			 VALUES ($1, $2, $3, $4, 'partner', $5)
			 RETURNING id`,
			req.Email,
			string(hashedPassword),
			req.FirstName,
			req.LastName,
			universityId,
		).Scan(&userId); err != nil {
			return fmt.Errorf("failed to create university user: %s", err.Error())
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO university_staff_profiles (
				user_id, university_id, staff_role, status, invited_at, created_at, updated_at
			) VALUES ($1, $2, 'Admissions Officer', 'active', NOW(), NOW(), NOW())
			ON CONFLICT (user_id) DO NOTHING
		`, userId, universityId)
		if err != nil {
			return fmt.Errorf("failed to create staff profile: %s", err.Error())
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	return userId, nil
}
