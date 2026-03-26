package observability

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type auditExec interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type AuditEntry struct {
	ActorName         string
	ActorID           *string
	ActorType         string
	ActionType        string
	ActionDescription string
	TargetEntity      string
	TargetID          *string
	Outcome           string
	IPAddress         *string
	RequestID         *string
	Metadata          json.RawMessage
}

type AuditLogger struct {
	db  *pgxpool.Pool
	log *zap.Logger
}

func NewAuditLogger(db *pgxpool.Pool, log *zap.Logger) *AuditLogger {
	if log == nil {
		log = zap.NewNop()
	}

	return &AuditLogger{
		db:  db,
		log: log,
	}
}

func (logger *AuditLogger) Log(ctx context.Context, entry AuditEntry) {
	if logger == nil || logger.db == nil {
		return
	}

	if err := InsertAuditLog(ctx, logger.db, entry); err != nil {
		logger.log.Warn("failed to write audit log",
			zap.Error(err),
			zap.String("action_type", entry.ActionType))
	}
}

func InsertAuditLog(ctx context.Context, db auditExec, entry AuditEntry) error {
	if db == nil {
		return fmt.Errorf("audit database is not configured")
	}

	actorName := strings.TrimSpace(entry.ActorName)
	if actorName == "" {
		actorName = "System"
	}

	actionType := strings.TrimSpace(entry.ActionType)
	if actionType == "" {
		return fmt.Errorf("audit action_type is required")
	}

	actionDescription := strings.TrimSpace(entry.ActionDescription)
	if actionDescription == "" {
		actionDescription = actionType
	}

	targetEntity := strings.TrimSpace(entry.TargetEntity)
	if targetEntity == "" {
		targetEntity = "unknown"
	}

	outcome := strings.TrimSpace(strings.ToLower(entry.Outcome))
	if outcome == "" {
		outcome = "success"
	}

	metadata := normalizeJSONMetadata(entry.Metadata)
	actorType := NormalizeActorType(entry.ActorType)

	_, err := db.Exec(ctx, `
		INSERT INTO audit_logs (
			actor_name,
			actor_id,
			actor_type,
			action_type,
			action_description,
			target_entity,
			target_id,
			outcome,
			ip_address,
			request_id,
			metadata
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, '')::inet, $10, $11)`,
		actorName,
		entry.ActorID,
		actorType,
		actionType,
		actionDescription,
		targetEntity,
		entry.TargetID,
		outcome,
		derefTrimmed(entry.IPAddress),
		entry.RequestID,
		metadata,
	)
	if err != nil {
		return fmt.Errorf("failed to insert audit log: %w", err)
	}

	return nil
}

func NormalizeActorType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "applicant", "user":
		return "applicant"
	case "partner", "admin":
		return "partner"
	case "staff", "superuser":
		return "staff"
	case "anonymous":
		return "anonymous"
	default:
		return "system"
	}
}

func MaskEmail(email string) string {
	trimmed := strings.TrimSpace(email)
	if trimmed == "" {
		return ""
	}

	parts := strings.SplitN(trimmed, "@", 2)
	if len(parts) != 2 {
		if len(trimmed) <= 2 {
			return strings.Repeat("*", len(trimmed))
		}
		return trimmed[:1] + strings.Repeat("*", len(trimmed)-2) + trimmed[len(trimmed)-1:]
	}

	localPart := parts[0]
	domain := parts[1]
	if len(localPart) <= 1 {
		return "*" + "@" + domain
	}

	return localPart[:1] + strings.Repeat("*", len(localPart)-1) + "@" + domain
}

func normalizeJSONMetadata(value json.RawMessage) json.RawMessage {
	if len(value) > 0 && json.Valid(value) {
		return value
	}

	return json.RawMessage(`{}`)
}

func derefTrimmed(value *string) string {
	if value == nil {
		return ""
	}

	return strings.TrimSpace(*value)
}
