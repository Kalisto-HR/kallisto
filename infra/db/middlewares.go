package db

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CtxKey string

const PostgresKey CtxKey = "postgres"

func PgxPoolMiddleware(pool *pgxpool.Pool) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), PostgresKey, pool)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
