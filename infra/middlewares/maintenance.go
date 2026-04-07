package middlewares

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"kallisto/infra/authz"
	"kallisto/infra/utils"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"go.uber.org/zap"
)

const maintenanceModeSettingKey = "maintenance_mode"
const maintenanceModeUnavailableMessage = "service unavailable: maintenance mode enabled"

type maintenanceModeSetting struct {
	Enabled bool `json:"enabled"`
}

func IsMaintenanceModeEnabled(ctx context.Context, db DB) (bool, error) {
	if db == nil {
		return false, errors.New("database is not configured")
	}

	var raw json.RawMessage
	if err := db.QueryRow(ctx, `
		SELECT setting_value
		FROM global_settings
		WHERE setting_key = $1`, maintenanceModeSettingKey).Scan(&raw); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("failed to query maintenance mode: %s", err.Error())
	}

	if len(raw) == 0 {
		return false, nil
	}

	var setting maintenanceModeSetting
	if err := json.Unmarshal(raw, &setting); err == nil {
		return setting.Enabled, nil
	}

	var enabled bool
	if err := json.Unmarshal(raw, &enabled); err == nil {
		return enabled, nil
	}

	return false, fmt.Errorf("failed to decode maintenance mode setting")
}

func WriteMaintenanceModeUnavailable(w http.ResponseWriter) {
	utils.WriteJSONResponseWithMsg(w, maintenanceModeUnavailableMessage, http.StatusServiceUnavailable)
}

func RequireMaintenanceModeOff(log *zap.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := GetClaimsFromContext(r.Context())
			if err != nil {
				utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			if strings.TrimSpace(claims.Role) == authz.RoleStaff {
				next.ServeHTTP(w, r)
				return
			}

			db, err := GetDBFromContext(r.Context(), CtxPostgresKey)
			if err != nil {
				utils.WriteJSONResponseWithMsg(w, "internal server error", http.StatusInternalServerError)
				return
			}

			enabled, err := IsMaintenanceModeEnabled(r.Context(), db)
			if err != nil {
				if log != nil {
					log.Error("failed to resolve maintenance mode", zap.Error(err), zap.String("path", r.URL.Path))
				}
				utils.WriteJSONResponseWithMsg(w, "internal server error", http.StatusInternalServerError)
				return
			}

			if !enabled {
				next.ServeHTTP(w, r)
				return
			}

			if log != nil {
				log.Info("request blocked by maintenance mode",
					zap.String("path", r.URL.Path),
					zap.String("method", r.Method),
					zap.String("role", claims.Role))
			}
			WriteMaintenanceModeUnavailable(w)
		})
	}
}
