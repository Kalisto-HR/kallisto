package usecases_impl

import (
	"context"
	"encoding/json"
	"strings"

	"kallisto/infra/middlewares"
	"kallisto/infra/observability"

	"github.com/jackc/pgx/v5/pgconn"
	"go.uber.org/zap"
)

type auditExec interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func enrichAuditEntry(ctx context.Context, entry observability.AuditEntry) observability.AuditEntry {
	if strings.TrimSpace(entry.ActorType) == "" || strings.TrimSpace(entry.ActorName) == "" || entry.ActorID == nil {
		claims, err := middlewares.GetClaimsFromContext(ctx)
		if err == nil && claims != nil {
			if entry.ActorID == nil && strings.TrimSpace(claims.UID) != "" {
				value := strings.TrimSpace(claims.UID)
				entry.ActorID = &value
			}
			if strings.TrimSpace(entry.ActorType) == "" {
				entry.ActorType = claims.Role
			}
			if strings.TrimSpace(entry.ActorName) == "" {
				entry.ActorName = strings.TrimSpace(strings.TrimSpace(claims.FirstName) + " " + strings.TrimSpace(claims.LastName))
			}
		}
	}

	if strings.TrimSpace(entry.ActorName) == "" {
		entry.ActorName = "System"
	}
	entry.ActorType = observability.NormalizeActorType(entry.ActorType)

	if entry.RequestID == nil {
		entry.RequestID = observability.RequestIDFromContext(ctx)
	}
	if entry.IPAddress == nil {
		entry.IPAddress = observability.IPAddressFromContext(ctx)
	}
	if len(entry.Metadata) == 0 {
		entry.Metadata = json.RawMessage(`{}`)
	}

	return entry
}

func insertAuditLog(ctx context.Context, db auditExec, entry observability.AuditEntry) error {
	return observability.InsertAuditLog(ctx, db, enrichAuditEntry(ctx, entry))
}

func writeBestEffortAuditLog(ctx context.Context, entry observability.AuditEntry) {
	conn, err := getDBConn(ctx)
	if err != nil {
		return
	}

	if err := insertAuditLog(ctx, conn, entry); err != nil {
		zap.L().Warn("failed to persist audit log",
			zap.Error(err),
			zap.String("action_type", entry.ActionType))
	}
}
