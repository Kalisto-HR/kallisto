package observability

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

const (
	defaultServiceLogBuffer = 2048
	serviceLogBatchSize     = 25
	serviceLogFlushInterval = time.Second
)

type ServiceLogEntry struct {
	Timestamp    time.Time
	Level        string
	Microservice string
	Handler      string
	Message      string
	UserID       *string
	RequestID    *string
	Method       string
	StatusCode   int
	DurationMS   int64
	Role         *string
	IPAddress    *string
	UserAgent    string
	Metadata     json.RawMessage
}

type ServiceLogSink interface {
	Enqueue(entry ServiceLogEntry)
}

type AsyncServiceLogger struct {
	db      *pgxpool.Pool
	log     *zap.Logger
	entries chan ServiceLogEntry
	done    chan struct{}
}

func NewAsyncServiceLogger(db *pgxpool.Pool, log *zap.Logger) *AsyncServiceLogger {
	if log == nil {
		log = zap.NewNop()
	}

	logger := &AsyncServiceLogger{
		db:      db,
		log:     log,
		entries: make(chan ServiceLogEntry, defaultServiceLogBuffer),
		done:    make(chan struct{}),
	}

	go logger.run()

	return logger
}

func (logger *AsyncServiceLogger) Enqueue(entry ServiceLogEntry) {
	if logger == nil || logger.db == nil {
		return
	}

	select {
	case logger.entries <- entry:
	default:
		logger.log.Warn("service log buffer full; dropping log row",
			zap.String("microservice", entry.Microservice),
			zap.String("handler", entry.Handler),
			zap.String("method", entry.Method))
	}
}

func (logger *AsyncServiceLogger) Close(ctx context.Context) error {
	if logger == nil {
		return nil
	}

	close(logger.entries)

	select {
	case <-logger.done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (logger *AsyncServiceLogger) run() {
	defer close(logger.done)

	ticker := time.NewTicker(serviceLogFlushInterval)
	defer ticker.Stop()

	batch := make([]ServiceLogEntry, 0, serviceLogBatchSize)
	flush := func() {
		if len(batch) == 0 {
			return
		}
		logger.flush(batch)
		batch = batch[:0]
	}

	for {
		select {
		case entry, ok := <-logger.entries:
			if !ok {
				flush()
				return
			}

			batch = append(batch, normalizeServiceLogEntry(entry))
			if len(batch) >= serviceLogBatchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}

func (logger *AsyncServiceLogger) flush(entries []ServiceLogEntry) {
	if logger.db == nil || len(entries) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	batch := &pgx.Batch{}
	for _, entry := range entries {
		batch.Queue(`
			INSERT INTO service_logs (
				logged_at,
				level,
				microservice,
				handler,
				message,
				user_id,
				request_id,
				method,
				status_code,
				duration_ms,
				role,
				ip_address,
				user_agent,
				metadata
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULLIF($12, '')::inet, $13, $14)`,
			entry.Timestamp,
			entry.Level,
			entry.Microservice,
			entry.Handler,
			entry.Message,
			entry.UserID,
			entry.RequestID,
			entry.Method,
			entry.StatusCode,
			entry.DurationMS,
			entry.Role,
			derefTrimmed(entry.IPAddress),
			entry.UserAgent,
			entry.Metadata,
		)
	}

	results := logger.db.SendBatch(ctx, batch)
	if err := results.Close(); err != nil {
		logger.log.Warn("failed to flush service log batch", zap.Error(err), zap.Int("batch_size", len(entries)))
	}
}

func normalizeServiceLogEntry(entry ServiceLogEntry) ServiceLogEntry {
	level := strings.ToLower(strings.TrimSpace(entry.Level))
	switch level {
	case "trace", "debug", "info", "warn", "error", "fatal":
	default:
		level = "info"
	}

	microservice := strings.TrimSpace(entry.Microservice)
	if microservice == "" {
		microservice = "staff"
	}

	handler := strings.TrimSpace(entry.Handler)
	if handler == "" {
		handler = "unknown"
	}

	message := strings.TrimSpace(entry.Message)
	if message == "" {
		message = fmt.Sprintf("%s %s -> %d", strings.TrimSpace(entry.Method), handler, entry.StatusCode)
	}

	timestamp := entry.Timestamp
	if timestamp.IsZero() {
		timestamp = time.Now().UTC()
	}

	userAgent := strings.TrimSpace(entry.UserAgent)
	if len(userAgent) > 512 {
		userAgent = userAgent[:512]
	}

	return ServiceLogEntry{
		Timestamp:    timestamp,
		Level:        level,
		Microservice: microservice,
		Handler:      handler,
		Message:      message,
		UserID:       entry.UserID,
		RequestID:    entry.RequestID,
		Method:       strings.ToUpper(strings.TrimSpace(entry.Method)),
		StatusCode:   entry.StatusCode,
		DurationMS:   entry.DurationMS,
		Role:         normalizeRolePointer(entry.Role),
		IPAddress:    entry.IPAddress,
		UserAgent:    userAgent,
		Metadata:     normalizeJSONMetadata(entry.Metadata),
	}
}

func normalizeRolePointer(value *string) *string {
	if value == nil {
		return nil
	}

	normalized := strings.ToLower(strings.TrimSpace(*value))
	if normalized == "" {
		return nil
	}

	switch normalized {
	case "applicant", "partner", "staff", "system", "anonymous":
		return &normalized
	default:
		return &normalized
	}
}
