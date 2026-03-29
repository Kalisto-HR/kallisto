package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/backend/internal/shared/models"
	"kallisto/services/backend/internal/shared/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetPartnerDashboardHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		utils.WriteJSONResponseWithMsg(w, "university id is required", http.StatusBadRequest)
		return
	}
	if err := validation.ValidateUUID(id, "id"); err != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{err})
		return
	}
	if err := enforceUniversityRouteAccess(r.Context(), id); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}

	payload, err := usecases_impl.GetPartnerDashboard(r.Context(), id)
	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}
	utils.WriteJSONResponse(w, payload, http.StatusOK)
}

func GetApplicationStructureHistoryHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		utils.WriteJSONResponseWithMsg(w, "university id is required", http.StatusBadRequest)
		return
	}
	if err := validation.ValidateUUID(id, "id"); err != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{err})
		return
	}
	if err := enforceUniversityRouteAccess(r.Context(), id); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	history, err := usecases_impl.GetApplicationStructureHistory(r.Context(), id, limit)
	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}
	utils.WriteJSONResponse(w, map[string]any{"items": history}, http.StatusOK)
}

func PublishApplicationStructureHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		utils.WriteJSONResponseWithMsg(w, "university id is required", http.StatusBadRequest)
		return
	}
	if err := validation.ValidateUUID(id, "id"); err != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{err})
		return
	}
	if err := enforceUniversityRouteAccess(r.Context(), id); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}
	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.PublishApplicationStructureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	version, err := usecases_impl.PublishApplicationStructure(r.Context(), id, claims.UID, &req)
	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}
	utils.WriteJSONResponse(w, version, http.StatusOK)
}

func getLinkedUniversityForUser(ctx context.Context, _ string) (*string, error) {
	claims, err := middlewares.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, utils.NewHandlerFuncErr(http.StatusUnauthorized, "unauthorized")
	}

	return claims.UniversityLinked, nil
}

func enforcePartnerUniversityAccess(role string, linkedUniversityId *string, applicationUniversityId string) error {
	if role != "staff" && role != "partner" {
		return utils.NewHandlerFuncErr(http.StatusForbidden, "forbidden")
	}
	if role != "partner" {
		return nil
	}
	if linkedUniversityId == nil {
		return utils.NewHandlerFuncErr(http.StatusForbidden, "partner account missing linked university")
	}
	if applicationUniversityId != *linkedUniversityId {
		return utils.NewHandlerFuncErr(http.StatusForbidden, "partners cannot access other universities")
	}
	return nil
}

func enforceUniversityRouteAccess(ctx context.Context, universityId string) error {
	claims, err := middlewares.GetClaimsFromContext(ctx)
	if err != nil {
		return utils.NewHandlerFuncErr(http.StatusUnauthorized, "unauthorized")
	}

	if claims.Role != "partner" {
		if claims.Role != "staff" {
			return utils.NewHandlerFuncErr(http.StatusForbidden, "forbidden")
		}
		return nil
	}

	linkedUniversityId, err := getLinkedUniversityForUser(ctx, claims.UID)
	if err != nil {
		return err
	}

	return enforcePartnerUniversityAccess(claims.Role, linkedUniversityId, universityId)
}
