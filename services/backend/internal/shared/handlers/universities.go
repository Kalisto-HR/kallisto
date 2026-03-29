// University handlers for managing universities (source of truth)
package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/backend/internal/shared/models"
	"kallisto/services/backend/internal/shared/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetUniversityHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		utils.WriteJSONResponseWithMsg(w, "university id is required", http.StatusBadRequest)
		return
	}

	// Validate UUID format
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

	university, err := usecases_impl.GetUniversityById(r.Context(), id)
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

	utils.WriteJSONResponse(w, university, http.StatusOK)
}

func CreateUniversityHandler(w http.ResponseWriter, r *http.Request) {
	var (
		req models.CreateUniversityRequest
		log = zap.L()
	)

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate input
	errors := validation.Validate(
		validation.ValidateRequired(req.Name, "name"),
		validation.ValidateMinLength(req.Name, "name", 2),
		validation.ValidateMaxLength(req.Name, "name", 255),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	universityId, err := usecases_impl.CreateUniversity(r.Context(), &req)
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

	utils.WriteJSONResponse(w, map[string]string{
		"msg": "university created",
		"id":  universityId,
	}, http.StatusCreated)
}

func UpdateUniversityHandler(w http.ResponseWriter, r *http.Request) {
	var (
		req models.UpdateUniversityRequest
		log = zap.L()
	)

	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		utils.WriteJSONResponseWithMsg(w, "university id is required", http.StatusBadRequest)
		return
	}

	// Validate UUID format
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

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate name if provided
	if req.Name != nil {
		errors := validation.Validate(
			validation.ValidateMinLength(*req.Name, "name", 2),
			validation.ValidateMaxLength(*req.Name, "name", 255),
		)
		if len(errors) > 0 {
			validation.WriteValidationErrors(w, errors)
			return
		}
	}

	err := usecases_impl.UpdateUniversity(r.Context(), id, &req)
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

	utils.WriteJSONResponseWithMsg(w, "university updated", http.StatusOK)
}

func DeleteUniversityHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		utils.WriteJSONResponseWithMsg(w, "university id is required", http.StatusBadRequest)
		return
	}

	// Validate UUID format
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

	err := usecases_impl.DeleteUniversity(r.Context(), id)
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

	utils.WriteJSONResponseWithMsg(w, "university deleted", http.StatusOK)
}

func AssignPartnerHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		utils.WriteJSONResponseWithMsg(w, "university id is required", http.StatusBadRequest)
		return
	}

	// Validate UUID format
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

	var req struct {
		ManagerId string `json:"manager_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate linked partner ID
	errors := validation.Validate(
		validation.ValidateRequired(req.ManagerId, "manager_id"),
		validation.ValidateUUID(req.ManagerId, "manager_id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	err := usecases_impl.AssignPartner(r.Context(), id, req.ManagerId)
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

	utils.WriteJSONResponseWithMsg(w, "partner assigned", http.StatusOK)
}

func ImportUniversitiesHandler(w http.ResponseWriter, r *http.Request) {
	var (
		req []models.ImportUniversityRequest
		log = zap.L()
	)

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	imported, err := usecases_impl.ImportUniversities(r.Context(), req)
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

	utils.WriteJSONResponse(w, map[string]any{
		"msg":      "universities imported",
		"imported": imported,
	}, http.StatusOK)
}

func GetUniversityApplicationStructureHandler(w http.ResponseWriter, r *http.Request) {
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

	schema, err := usecases_impl.GetUniversityApplicationStructure(r.Context(), id)
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

	utils.WriteJSONResponse(w, map[string]any{
		"application_schema": schema,
	}, http.StatusOK)
}

func UpdateUniversityApplicationStructureHandler(w http.ResponseWriter, r *http.Request) {
	var (
		log = zap.L()
		req struct {
			ApplicationSchema json.RawMessage `json:"application_schema"`
		}
	)

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

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.ApplicationSchema != nil && !json.Valid(req.ApplicationSchema) {
		utils.WriteJSONResponseWithMsg(w, "application_schema must be valid json", http.StatusBadRequest)
		return
	}

	if err := usecases_impl.UpdateUniversityApplicationStructure(r.Context(), id, req.ApplicationSchema); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}

	utils.WriteJSONResponseWithMsg(w, "application structure updated", http.StatusOK)
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
