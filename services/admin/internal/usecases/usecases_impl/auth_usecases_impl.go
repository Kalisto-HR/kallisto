// Authentication usecases for admin service
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

// AdminSignIn authenticates an admin user and returns the user if successful
func AdminSignIn(ctx context.Context, req *models.AdminSignInRequest) (*models.AdminUser, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		`SELECT id, email, password, first_name, last_name, last_seen, role, university_linked, created_at
		 FROM users WHERE email=$1`,
		req.Email,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "could not find the user in the database")
	}

	user, err := pgx.RowToStructByName[models.AdminUser](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, utils.NewHandlerFuncErr(http.StatusUnauthorized, "invalid credentials")
	}

	return &user, nil
}

// AdminSignUp creates a new admin user account
func AdminSignUp(ctx context.Context, req *models.AdminSignUpRequest) (string, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return "", errors.New("could not establish connection with the database")
	}

	// Validate role
	if req.Role != "staff" && req.Role != "partner" {
		return "", utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid role: must be 'staff' or 'partner'")
	}

	// Partner accounts must have a linked university
	if req.Role == "partner" && req.UniversityLinked == nil {
		return "", utils.NewHandlerFuncErr(http.StatusBadRequest, "partner accounts must have a linked university")
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %s", err.Error())
	}

	var userId string
	err = conn.QueryRow(ctx,
		`INSERT INTO users (email, password, first_name, last_name, role, university_linked)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id`,
		req.Email,
		string(hashedPassword),
		req.FirstName,
		req.LastName,
		req.Role,
		req.UniversityLinked,
	).Scan(&userId)

	if err != nil {
		return "", fmt.Errorf("failed to create admin user: %s", err.Error())
	}

	return userId, nil
}

// GetAdminUserById retrieves an admin user by ID.
func GetAdminUserById(ctx context.Context, id string) (*models.AdminUser, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		`SELECT id, email, password, first_name, last_name, last_seen, role, university_linked, created_at
		 FROM users WHERE id=$1`,
		id,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
	}

	user, err := pgx.RowToStructByName[models.AdminUser](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return &user, nil
}
