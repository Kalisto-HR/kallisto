package observability

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net"
	"net/http"
	"strings"
)

const RequestIDHeader = "X-Request-Id"

type ctxKey string

const requestStateKey ctxKey = "observability_request_state"

type RequestState struct {
	RequestID string
	Scope     string
	Route     string
	UserID    string
	Role      string
	IPAddress *string
	UserAgent string
}

func WithRequestState(ctx context.Context, state *RequestState) context.Context {
	return context.WithValue(ctx, requestStateKey, state)
}

func GetRequestState(ctx context.Context) (*RequestState, bool) {
	state, ok := ctx.Value(requestStateKey).(*RequestState)
	return state, ok
}

func EnsureRequestID(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed != "" {
		return trimmed
	}

	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return "req-fallback"
	}

	return hex.EncodeToString(buffer)
}

func RequestIDFromContext(ctx context.Context) *string {
	state, ok := GetRequestState(ctx)
	if !ok {
		return nil
	}
	if strings.TrimSpace(state.RequestID) == "" {
		return nil
	}

	value := state.RequestID
	return &value
}

func IPAddressFromContext(ctx context.Context) *string {
	state, ok := GetRequestState(ctx)
	if !ok {
		return nil
	}
	if state.IPAddress == nil || strings.TrimSpace(*state.IPAddress) == "" {
		return nil
	}

	value := strings.TrimSpace(*state.IPAddress)
	return &value
}

func SetActor(ctx context.Context, userID, role string) {
	state, ok := GetRequestState(ctx)
	if !ok {
		return
	}

	state.UserID = strings.TrimSpace(userID)
	state.Role = strings.TrimSpace(role)
}

func RequestIP(r *http.Request) *string {
	if r == nil {
		return nil
	}

	xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if xff != "" {
		parts := strings.Split(xff, ",")
		value := strings.TrimSpace(parts[0])
		if value != "" {
			return &value
		}
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && strings.TrimSpace(host) != "" {
		value := strings.TrimSpace(host)
		return &value
	}

	if strings.TrimSpace(r.RemoteAddr) == "" {
		return nil
	}

	value := strings.TrimSpace(r.RemoteAddr)
	return &value
}
