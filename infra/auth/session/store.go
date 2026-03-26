package session

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	ReasonSessionExpired = "session-expired"
	ReasonSessionRevoked = "session-revoked"
	ReasonPasswordChanged = "password-changed"
	ReasonAccountUpdated = "account-updated"
)

var ErrSessionNotFound = errors.New("session not found")

type Session struct {
	ID               string
	UserID           string
	Email            string
	FirstName        string
	LastName         string
	Role             string
	Permissions      []string
	UniversityLinked *string
	CSRFToken        string
	IssuedAt         time.Time
	LastSeenAt       time.Time
	ExpiresAt        time.Time
	RevokedAt        *time.Time
	RevokedReason    *string
}

type Store interface {
	Create(ctx context.Context, params CreateParams) (*Session, error)
	Get(ctx context.Context, sessionID string) (*Session, error)
	Extend(ctx context.Context, sessionID string, expiresAt time.Time) (*Session, error)
	Revoke(ctx context.Context, sessionID string, reason string) error
	RevokeAllForUser(ctx context.Context, userID string, reason string) error
}

type CreateParams struct {
	UserID           string
	Email            string
	FirstName        string
	LastName         string
	Role             string
	Permissions      []string
	UniversityLinked *string
	CSRFToken        string
	IPAddress        *string
	UserAgent        string
	IssuedAt         time.Time
	ExpiresAt        time.Time
}

type PgxStore struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *PgxStore {
	return &PgxStore{db: db}
}

func (store *PgxStore) Create(ctx context.Context, params CreateParams) (*Session, error) {
	if store == nil || store.db == nil {
		return nil, fmt.Errorf("session store is not configured")
	}

	permissions, err := json.Marshal(params.Permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to encode session permissions: %w", err)
	}

	row := store.db.QueryRow(
		ctx,
		`INSERT INTO auth_sessions (
			user_id,
			email,
			first_name,
			last_name,
			role,
			permissions,
			university_linked,
			csrf_token,
			ip_address,
			user_agent,
			issued_at,
			last_seen_at,
			expires_at,
			updated_at
		)
		VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9, '')::inet,$10,$11,$11,$12,$11
		)
		RETURNING
			id,
			user_id,
			email,
			COALESCE(first_name, ''),
			COALESCE(last_name, ''),
			role,
			permissions,
			university_linked,
			csrf_token,
			issued_at,
			last_seen_at,
			expires_at,
			revoked_at,
			revoked_reason`,
		strings.TrimSpace(params.UserID),
		strings.TrimSpace(params.Email),
		strings.TrimSpace(params.FirstName),
		strings.TrimSpace(params.LastName),
		strings.TrimSpace(params.Role),
		permissions,
		params.UniversityLinked,
		strings.TrimSpace(params.CSRFToken),
		derefTrimmed(params.IPAddress),
		strings.TrimSpace(params.UserAgent),
		params.IssuedAt.UTC(),
		params.ExpiresAt.UTC(),
	)

	session, err := scanSession(row)
	if err != nil {
		return nil, err
	}
	return session, nil
}

func (store *PgxStore) Get(ctx context.Context, sessionID string) (*Session, error) {
	if store == nil || store.db == nil {
		return nil, fmt.Errorf("session store is not configured")
	}

	row := store.db.QueryRow(
		ctx,
		`SELECT
			id,
			user_id,
			email,
			COALESCE(first_name, ''),
			COALESCE(last_name, ''),
			role,
			permissions,
			university_linked,
			csrf_token,
			issued_at,
			last_seen_at,
			expires_at,
			revoked_at,
			revoked_reason
		FROM auth_sessions
		WHERE id = $1`,
		strings.TrimSpace(sessionID),
	)

	session, err := scanSession(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, err
	}
	return session, nil
}

func (store *PgxStore) Extend(ctx context.Context, sessionID string, expiresAt time.Time) (*Session, error) {
	if store == nil || store.db == nil {
		return nil, fmt.Errorf("session store is not configured")
	}

	row := store.db.QueryRow(
		ctx,
		`UPDATE auth_sessions
		SET last_seen_at = NOW(),
		    expires_at = $2,
		    updated_at = NOW()
		WHERE id = $1 AND revoked_at IS NULL
		RETURNING
			id,
			user_id,
			email,
			COALESCE(first_name, ''),
			COALESCE(last_name, ''),
			role,
			permissions,
			university_linked,
			csrf_token,
			issued_at,
			last_seen_at,
			expires_at,
			revoked_at,
			revoked_reason`,
		strings.TrimSpace(sessionID),
		expiresAt.UTC(),
	)

	session, err := scanSession(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, err
	}
	return session, nil
}

func (store *PgxStore) Revoke(ctx context.Context, sessionID string, reason string) error {
	if store == nil || store.db == nil {
		return fmt.Errorf("session store is not configured")
	}

	_, err := store.db.Exec(
		ctx,
		`UPDATE auth_sessions
		SET revoked_at = COALESCE(revoked_at, NOW()),
		    revoked_reason = CASE
		    	WHEN revoked_reason IS NULL OR BTRIM(revoked_reason) = '' THEN $2
		    	ELSE revoked_reason
		    END,
		    updated_at = NOW()
		WHERE id = $1`,
		strings.TrimSpace(sessionID),
		normalizeReason(reason),
	)
	if err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}
	return nil
}

func (store *PgxStore) RevokeAllForUser(ctx context.Context, userID string, reason string) error {
	if store == nil || store.db == nil {
		return fmt.Errorf("session store is not configured")
	}

	_, err := store.db.Exec(
		ctx,
		`UPDATE auth_sessions
		SET revoked_at = COALESCE(revoked_at, NOW()),
		    revoked_reason = $2,
		    updated_at = NOW()
		WHERE user_id = $1 AND revoked_at IS NULL`,
		strings.TrimSpace(userID),
		normalizeReason(reason),
	)
	if err != nil {
		return fmt.Errorf("failed to revoke user sessions: %w", err)
	}
	return nil
}

func scanSession(row pgx.Row) (*Session, error) {
	var (
		session            Session
		permissionsRaw     []byte
		universityLinked   *string
		revokedReason      *string
	)

	err := row.Scan(
		&session.ID,
		&session.UserID,
		&session.Email,
		&session.FirstName,
		&session.LastName,
		&session.Role,
		&permissionsRaw,
		&universityLinked,
		&session.CSRFToken,
		&session.IssuedAt,
		&session.LastSeenAt,
		&session.ExpiresAt,
		&session.RevokedAt,
		&revokedReason,
	)
	if err != nil {
		return nil, err
	}

	if len(permissionsRaw) > 0 {
		if err := json.Unmarshal(permissionsRaw, &session.Permissions); err != nil {
			return nil, fmt.Errorf("failed to decode session permissions: %w", err)
		}
	}

	if universityLinked != nil && strings.TrimSpace(*universityLinked) != "" {
		value := strings.TrimSpace(*universityLinked)
		session.UniversityLinked = &value
	}
	if revokedReason != nil && strings.TrimSpace(*revokedReason) != "" {
		value := normalizeReason(*revokedReason)
		session.RevokedReason = &value
	}

	return &session, nil
}

func normalizeReason(reason string) string {
	switch strings.TrimSpace(reason) {
	case ReasonPasswordChanged:
		return ReasonPasswordChanged
	case ReasonAccountUpdated:
		return ReasonAccountUpdated
	case ReasonSessionExpired:
		return ReasonSessionExpired
	default:
		return ReasonSessionRevoked
	}
}

func derefTrimmed(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}
