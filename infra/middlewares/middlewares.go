package middlewares

import (
	"context"
	"errors"
	auth "kallisto/infra/auth/jwt"
	"kallisto/infra/utils"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type CtxKey string

const CtxPostgresKey CtxKey = "postgres"
const CtxClientPostgresKey CtxKey = "client_postgres"
const CtxClaimsKey CtxKey = "claims" // JWT claims injected by RequireAuth middleware
const AccessTokenKey = "access_token"

// GetClaimsFromContext extracts JWT claims from context. Returns error if claims not found.
func GetClaimsFromContext(ctx context.Context) (*auth.Claims, error) {
	claims, ok := ctx.Value(CtxClaimsKey).(*auth.Claims)
	if !ok {
		return nil, errors.New("could not retrieve claims from context")
	}
	return claims, nil
}

func LogRequestEvent(log *zap.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Info("Receiveing a request: ", zap.String("Method:", r.Method), zap.String("URI:", r.RequestURI))
			next.ServeHTTP(w, r)
		})
	}
}

func PassPgPoolConn(pool *pgxpool.Pool) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), CtxPostgresKey, pool)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func PassClientPgPoolConn(pool *pgxpool.Pool) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), CtxClientPostgresKey, pool)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireAuth(log *zap.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			accessToken, err := r.Cookie(AccessTokenKey)

			if err != nil {
				log.Error("failed to acquire access_token cookie; ", zap.String("error_msg", err.Error()))

				utils.WriteJSONResponseWithMsg(w, err.Error(), http.StatusUnauthorized)
				return
			}

			jwt, err := auth.NewJWTFromToken(&accessToken.Value)

			if err != nil {
				log.Warn("failed to authorize the user; ", zap.String("error_msg", err.Error()))

				utils.WriteJSONResponseWithMsg(w, err.Error(), http.StatusUnauthorized)
				return
			}

			log.Info("successfully authorized user; ", zap.String("uid", jwt.TokenClaims.UID), zap.String("first_name", jwt.TokenClaims.FirstName), zap.String("last_name", jwt.TokenClaims.LastName))

			newJWT := auth.CheckExpiryAndExtend(jwt)

			if newJWT != nil {
				http.SetCookie(w, &http.Cookie{
					Name:     "access_token",
					Value:    newJWT.TokenString,
					Path:     "/",
					HttpOnly: true,
					Secure:   true,
					SameSite: http.SameSiteStrictMode,
				})
			}

			ctx := context.WithValue(r.Context(), CtxClaimsKey, &jwt.TokenClaims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
