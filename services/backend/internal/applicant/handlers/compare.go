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

func GetCompareHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	items, err := usecases_impl.GetUserCompareList(r.Context(), claims.UID)
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	resp := utils.NewApiResponse(true, items, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func AddCompareHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	universityId := mux.Vars(r)["id"]
	errors := validation.Validate(
		validation.ValidateUUID(universityId, "id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.AddToCompare(r.Context(), claims.UID, universityId); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "added to compare list")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func RemoveCompareHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	universityId := mux.Vars(r)["id"]
	errors := validation.Validate(
		validation.ValidateUUID(universityId, "id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.RemoveFromCompare(r.Context(), claims.UID, universityId); err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	resp := utils.NewApiResponse[any](true, nil, "removed from compare list")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func ClearCompareHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	if err := usecases_impl.ClearCompare(r.Context(), claims.UID); err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	resp := utils.NewApiResponse[any](true, nil, "compare list cleared")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}
