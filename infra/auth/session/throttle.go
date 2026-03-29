package session

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	emailFailureLimit = 5
	ipFailureLimit    = 10
	throttleWindow    = 15 * time.Minute
)

type ThrottleDecision struct {
	Blocked    bool
	RetryAfter time.Duration
}

type Throttle interface {
	Evaluate(ctx context.Context, email string, ipAddress *string, now time.Time) (*ThrottleDecision, error)
	RecordAttempt(ctx context.Context, email string, ipAddress *string, succeeded bool, blocked bool, reason string) error
}

type DBThrottle struct {
	db throttleDB
}

func NewThrottle(db *pgxpool.Pool) *DBThrottle {
	return &DBThrottle{db: db}
}

type throttleDB interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func (throttle *DBThrottle) Evaluate(ctx context.Context, email string, ipAddress *string, now time.Time) (*ThrottleDecision, error) {
	if throttle == nil || throttle.db == nil {
		return &ThrottleDecision{Blocked: false}, nil
	}

	windowStart := now.Add(-throttleWindow)
	normalizedEmail := normalizeEmail(email)
	retryAfter := time.Duration(0)
	blocked := false

	emailCount, emailOldest, err := throttle.failedAttemptsSince(ctx, "normalized_email = $1", normalizedEmail, windowStart)
	if err != nil {
		return nil, err
	}
	if emailCount >= emailFailureLimit {
		blocked = true
		retryAfter = maxDuration(retryAfter, remainingWindow(now, emailOldest))
	}

	if trimmedIP := derefTrimmed(ipAddress); trimmedIP != "" {
		ipCount, ipOldest, ipErr := throttle.failedAttemptsSince(ctx, "ip_address = NULLIF($1, '')::inet", trimmedIP, windowStart)
		if ipErr != nil {
			return nil, ipErr
		}
		if ipCount >= ipFailureLimit {
			blocked = true
			retryAfter = maxDuration(retryAfter, remainingWindow(now, ipOldest))
		}
	}

	return &ThrottleDecision{
		Blocked:    blocked,
		RetryAfter: retryAfter,
	}, nil
}

func (throttle *DBThrottle) RecordAttempt(ctx context.Context, email string, ipAddress *string, succeeded bool, blocked bool, reason string) error {
	if throttle == nil || throttle.db == nil {
		return nil
	}

	_, err := throttle.db.Exec(
		ctx,
		`INSERT INTO auth_login_attempts (
			normalized_email,
			ip_address,
			succeeded,
			blocked,
			failure_reason
		) VALUES ($1, NULLIF($2, '')::inet, $3, $4, NULLIF($5, ''))`,
		normalizeEmail(email),
		derefTrimmed(ipAddress),
		succeeded,
		blocked,
		strings.TrimSpace(reason),
	)
	if err != nil {
		return fmt.Errorf("failed to record login attempt: %w", err)
	}
	return nil
}

func (throttle *DBThrottle) failedAttemptsSince(ctx context.Context, predicate string, value any, since time.Time) (int, *time.Time, error) {
	var (
		count      int
		oldest     *time.Time
		oldestTime sql.NullTime
	)

	query := fmt.Sprintf(
		`SELECT COUNT(*), MIN(attempted_at)
		FROM auth_login_attempts
		WHERE %s
		  AND succeeded = FALSE
		  AND blocked = FALSE
		  AND attempted_at >= $2`,
		predicate,
	)

	if err := throttle.db.QueryRow(ctx, query, value, since.UTC()).Scan(&count, &oldestTime); err != nil {
		return 0, nil, fmt.Errorf("failed to evaluate login attempts: %w", err)
	}
	if oldestTime.Valid {
		value := oldestTime.Time.UTC()
		oldest = &value
	}

	return count, oldest, nil
}

func remainingWindow(now time.Time, oldest *time.Time) time.Duration {
	if oldest == nil {
		return 0
	}
	remaining := throttleWindow - now.Sub(oldest.UTC())
	if remaining < 0 {
		return 0
	}
	return remaining
}

func maxDuration(current time.Duration, candidate time.Duration) time.Duration {
	if candidate > current {
		return candidate
	}
	return current
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
