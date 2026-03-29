package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/backend/internal/applicant/models"
	"kallisto/services/backend/internal/applicant/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetBasketPlansHandler(w http.ResponseWriter, r *http.Request) {
	resp := utils.NewApiResponse(true, usecases_impl.ListBasketPlans(), "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func GetBasketHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	basket, err := usecases_impl.GetBasketState(r.Context(), claims.UID)
	if err != nil {
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

	resp := utils.NewApiResponse(true, basket, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func AddBasketItemHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	universityId := mux.Vars(r)["id"]
	errors := validation.Validate(validation.ValidateUUID(universityId, "id"))
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.AddUniversityToBasket(r.Context(), claims.UID, universityId); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "added to basket")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func RemoveBasketItemHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	universityId := mux.Vars(r)["id"]
	errors := validation.Validate(validation.ValidateUUID(universityId, "id"))
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.RemoveUniversityFromBasket(r.Context(), claims.UID, universityId); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "removed from basket")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func ClearBasketHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	if err := usecases_impl.ClearBasket(r.Context(), claims.UID); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "basket cleared")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func UpdateBasketPlanHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	var req models.BasketPlanUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "malformed json request body")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.PlanId != nil {
		trimmed := strings.TrimSpace(*req.PlanId)
		req.PlanId = &trimmed
	}

	if err := usecases_impl.SetBasketSelectedPlan(r.Context(), claims.UID, req.PlanId); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "basket plan updated")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func BasketCheckoutPreviewHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	var req models.BasketCheckoutPreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "malformed json request body")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	req.PlanId = strings.TrimSpace(req.PlanId)
	validationErrors := validation.Validate(validation.ValidateRequired(req.PlanId, "plan_id"))
	for idx, id := range req.UniversityIds {
		if err := validation.ValidateUUID(id, fmt.Sprintf("university_ids[%d]", idx)); err != nil {
			validationErrors = append(validationErrors, err)
		}
	}
	if len(validationErrors) > 0 {
		validation.WriteValidationErrors(w, validationErrors)
		return
	}

	preview, err := usecases_impl.BuildBasketCheckoutPreview(r.Context(), claims.UID, &req)
	if err != nil {
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

	resp := utils.NewApiResponse(true, preview, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}
