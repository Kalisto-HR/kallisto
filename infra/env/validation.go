package env

import (
	"context"
	"errors"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ValidateRuntimeConfig() error {
	if strings.TrimSpace(os.Getenv("DATABASE_URL")) == "" {
		return errors.New("DATABASE_URL is required")
	}

	if strings.TrimSpace(os.Getenv("SECRET_KEY")) == "" {
		return errors.New("SECRET_KEY is required")
	}

	return nil
}

func ValidateDatabaseContract(ctx context.Context, dbPool *pgxpool.Pool) error {
	if dbPool == nil {
		return errors.New("database pool is nil")
	}

	if err := dbPool.Ping(ctx); err != nil {
		return err
	}

	return nil
}
