package middlewares

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type CtxKey string

const CtxPostgresKey CtxKey = "postgres"

func CtxMiddleware(pool *pgxpool.Pool, log *zap.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Info("Receiveing a request: ", zap.String("Method:", r.Method), zap.String("URI:", r.RequestURI))
			ctx := context.WithValue(r.Context(), CtxPostgresKey, pool)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
