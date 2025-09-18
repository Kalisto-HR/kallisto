package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	auth "kallisto/infra/auth/jwt"
	"kallisto/infra/middlewares"
	"kallisto/services/client/internal/models"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type signUpUsecaseImpl struct {
	request models.SignUpRequest
}

func NewSignUpUseCase(req *models.SignUpRequest) *signUpUsecaseImpl {
	return &signUpUsecaseImpl{
		request: *req,
	}
}

func (uc *signUpUsecaseImpl) SignUp(ctx context.Context) (string, error) {
	var (
		claims = auth.Claims{
			Role: "applicant",
			Iat:  time.Now().Unix(),
		}
	)

	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)

	if !ok {

		return "", errors.New("could not establish connection with the database")
	}

	hashedPswd, _ := bcrypt.GenerateFromPassword([]byte(uc.request.Password), bcrypt.DefaultCost)

	err := pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		var uuid string
		if err := tx.QueryRow(ctx, "INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING id", uc.request.FirstName, uc.request.LastName, uc.request.Email, hashedPswd).Scan(&uuid); err != nil {
			return err
		}

		claims.UID = uuid
		claims.FirstName = uc.request.FirstName
		claims.LastName = uc.request.LastName

		return nil
	})

	if err != nil {

		return "", fmt.Errorf("could not add new user to the database: %s", err.Error())
	}

	jwt, err := auth.NewJWTFromClaims(&claims)

	if err != nil {

		return "", err
	}

	return jwt.TokenString, nil
}
