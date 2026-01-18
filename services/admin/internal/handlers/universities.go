// University handlers for managing universities (source of truth)
package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/admin/internal/models"
	"kallisto/services/admin/internal/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetUniversitiesHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	// Parse query params
	query := r.URL.Query()
	page, _ := strconv.Atoi(query.Get("page"))
	limit, _ := strconv.Atoi(query.Get("limit"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	universities, total, err := usecases_impl.GetAllUniversities(r.Context(), page, limit)
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

	response := utils.NewPaginatedResponse(universities, total, page, limit)
	utils.WriteJSONResponse(w, response, http.StatusOK)
}

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

func AssignManagerHandler(w http.ResponseWriter, r *http.Request) {
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

	var req struct {
		ManagerId string `json:"manager_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate manager ID
	errors := validation.Validate(
		validation.ValidateRequired(req.ManagerId, "manager_id"),
		validation.ValidateUUID(req.ManagerId, "manager_id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	err := usecases_impl.AssignManager(r.Context(), id, req.ManagerId)
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

	utils.WriteJSONResponseWithMsg(w, "manager assigned", http.StatusOK)
}
