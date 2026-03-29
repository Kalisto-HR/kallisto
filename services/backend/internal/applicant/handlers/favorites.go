// favorites.go - Favorites handlers for managing user's saved universities.
package handlers

import (
	"net/http"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/backend/internal/applicant/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetFavoritesHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	favorites, err := usecases_impl.GetUserFavorites(r.Context(), claims.UID)
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	resp := utils.NewApiResponse(true, favorites, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func AddFavoriteHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	universityId := vars["id"]

	errors := validation.Validate(
		validation.ValidateUUID(universityId, "id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.AddFavorite(r.Context(), claims.UID, universityId); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, status)
		return
	}

	resp := utils.NewApiResponse[any](true, nil, "favorite added successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func RemoveFavoriteHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	universityId := vars["id"]

	errors := validation.Validate(
		validation.ValidateUUID(universityId, "id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.RemoveFavorite(r.Context(), claims.UID, universityId); err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	resp := utils.NewApiResponse[any](true, nil, "favorite removed successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func IsFavoriteHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	universityId := vars["id"]

	errors := validation.Validate(
		validation.ValidateUUID(universityId, "id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	isFavorite, err := usecases_impl.IsFavorite(r.Context(), claims.UID, universityId)
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	resp := utils.NewApiResponse(true, map[string]bool{"is_favorite": isFavorite}, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}
