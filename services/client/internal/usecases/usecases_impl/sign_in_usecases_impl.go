package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	auth "kallisto/infra/auth/jwt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type signInUsecaseImpl struct {
	request models.SignInRequest
}

func NewSignInUseCase(req *models.SignInRequest) *signInUsecaseImpl {
	return &signInUsecaseImpl{
		request: *req,
	}
}

func (uc *signInUsecaseImpl) SignIn(ctx context.Context) (string, error) {
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

	rows, err := conn.Query(ctx, "SELECT id, email, first_name, last_name, password FROM users WHERE email=$1", uc.request.Email)

	if err != nil {
		return "", fmt.Errorf("failed to perform databse query: %s", err.Error())
	}

	if !rows.Next() {
		return "", utils.NewHandlerFuncErr(http.StatusNotFound, "could not find the user in the database")
	}

	defer rows.Close()

	user, err := pgx.RowToStructByName[models.User](rows)

	if err != nil {
		return "", fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(uc.request.Password))

	if err != nil {
		return "", utils.NewHandlerFuncErr(http.StatusUnauthorized, fmt.Sprintf("passwords did not match: %s", err.Error()))
	}

	claims.UID = user.Id
	claims.FirstName = user.FirstName
	claims.LastName = user.LastName

	jwt, err := auth.NewJWTFromClaims(&claims)

	if err != nil {

		return "", err
	}

	return jwt.TokenString, nil
}
