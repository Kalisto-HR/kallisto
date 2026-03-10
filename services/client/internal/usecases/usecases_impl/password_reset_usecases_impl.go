package usecases_impl

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const passwordResetTokenTTL = 30 * time.Minute

func RequestClientPasswordReset(ctx context.Context, email string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	email = strings.TrimSpace(email)
	if email == "" {
		return nil
	}

	var userID string
	if err := conn.QueryRow(ctx, "SELECT id FROM users WHERE email = $1", email).Scan(&userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return fmt.Errorf("failed to query user: %s", err.Error())
	}

	token, err := generateResetToken()
	if err != nil {
		return err
	}
	tokenHash := hashResetToken(token)
	expiresAt := time.Now().Add(passwordResetTokenTTL)

	err = pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		if _, execErr := tx.Exec(ctx, "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL", userID); execErr != nil {
			return execErr
		}

		if _, execErr := tx.Exec(ctx,
			`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
			 VALUES ($1, $2, $3)`,
			userID,
			tokenHash,
			expiresAt,
		); execErr != nil {
			return execErr
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to persist password reset request: %s", err.Error())
	}

	return nil
}

func ResetClientPassword(ctx context.Context, token string, newPassword string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	token = strings.TrimSpace(token)
	if token == "" {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "token is required")
	}

	hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if hashErr != nil {
		return fmt.Errorf("failed to hash password: %s", hashErr.Error())
	}

	tokenHash := hashResetToken(token)
	return pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		var userID string
		if err := tx.QueryRow(ctx,
			`SELECT user_id
			 FROM password_reset_tokens
			 WHERE token_hash = $1
			   AND used_at IS NULL
			   AND expires_at > NOW()`,
			tokenHash,
		).Scan(&userID); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid or expired reset token")
			}
			return err
		}

		if _, err := tx.Exec(ctx, "UPDATE users SET password = $1 WHERE id = $2", string(hashedPassword), userID); err != nil {
			return err
		}

		if _, err := tx.Exec(ctx, "UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1", tokenHash); err != nil {
			return err
		}

		return nil
	})
}

func generateResetToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("failed to generate secure token: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

func hashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
