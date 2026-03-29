// favorites_usecases_impl.go - Favorites usecases for managing user's saved universities in JSONB.
package usecases_impl

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

func GetUserFavorites(ctx context.Context, userId string) ([]string, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	var favoritesJson []byte
	err := conn.QueryRow(ctx, "SELECT data->'favorites' FROM users WHERE id=$1", userId).Scan(&favoritesJson)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}

	if favoritesJson == nil {
		return []string{}, nil
	}

	var favorites []string
	if err := json.Unmarshal(favoritesJson, &favorites); err != nil {
		return []string{}, nil
	}

	return favorites, nil
}

func AddFavorite(ctx context.Context, userId, universityId string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var exists bool
	err := conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM universities WHERE id=$1)", universityId).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check university existence: %s", err.Error())
	}
	if !exists {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	favorites, err := GetUserFavorites(ctx, userId)
	if err != nil {
		return err
	}
	for _, fav := range favorites {
		if fav == universityId {
			return nil
		}
	}

	_, err = conn.Exec(ctx,
		"UPDATE users SET data = jsonb_set(COALESCE(data, '{}'), '{favorites}', COALESCE(data->'favorites', '[]') || to_jsonb($1::text)) WHERE id=$2",
		universityId, userId)
	if err != nil {
		return fmt.Errorf("failed to add favorite: %s", err.Error())
	}

	return nil
}

func RemoveFavorite(ctx context.Context, userId, universityId string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	_, err := conn.Exec(ctx,
		"UPDATE users SET data = jsonb_set(COALESCE(data, '{}'), '{favorites}', COALESCE((SELECT jsonb_agg(elem) FROM jsonb_array_elements(COALESCE(data->'favorites', '[]')) elem WHERE elem #>> '{}' != $1), '[]')) WHERE id=$2",
		universityId, userId)
	if err != nil {
		return fmt.Errorf("failed to remove favorite: %s", err.Error())
	}

	return nil
}

func IsFavorite(ctx context.Context, userId, universityId string) (bool, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return false, errors.New("could not establish connection with the database")
	}

	var isFavorite bool
	err := conn.QueryRow(ctx,
		"SELECT COALESCE(data->'favorites', '[]') @> to_jsonb($1::text) FROM users WHERE id=$2",
		universityId, userId).Scan(&isFavorite)
	if err != nil {
		return false, fmt.Errorf("failed to check favorite status: %s", err.Error())
	}

	return isFavorite, nil
}
