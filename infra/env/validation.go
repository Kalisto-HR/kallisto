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

	secretKey := strings.TrimSpace(os.Getenv("SECRET_KEY"))
	if secretKey == "" {
		return errors.New("SECRET_KEY is required")
	}
	if len(secretKey) < 32 {
		return errors.New("SECRET_KEY must be at least 32 characters")
	}

	if strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "production") {
		if !strings.EqualFold(strings.TrimSpace(os.Getenv("COOKIE_SECURE")), "true") {
			return errors.New("COOKIE_SECURE=true is required in production")
		}
		for _, origin := range strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",") {
			if strings.TrimSpace(origin) == "*" {
				return errors.New("wildcard CORS origin is not allowed in production")
			}
		}
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
