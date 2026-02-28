package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/admin/internal/models"
	"kallisto/services/admin/internal/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetUniversityDashboardHandler(w http.ResponseWriter, r *http.Request) {
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

	payload, err := usecases_impl.GetUniversityDashboard(r.Context(), id)
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

func GetUniversityStaffHandler(w http.ResponseWriter, r *http.Request) {
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

	query := r.URL.Query()
	page, _ := strconv.Atoi(query.Get("page"))
	limit, _ := strconv.Atoi(query.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var search *string
	var role *string
	var statusFilter *string
	if v := query.Get("search"); v != "" {
		search = &v
	}
	if v := query.Get("role"); v != "" {
		role = &v
	}
	if v := query.Get("status"); v != "" {
		statusFilter = &v
	}

	items, total, err := usecases_impl.GetUniversityStaff(r.Context(), id, search, role, statusFilter, page, limit)
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
	invitations, err := usecases_impl.GetUniversityStaffInvitations(r.Context(), id)
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
	roles, err := usecases_impl.GetUniversityStaffRoles(r.Context(), id)
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

	response := utils.NewPaginatedResponse(items, total, page, limit)
	utils.WriteJSONResponse(w, map[string]any{
		"items":       response.Items,
		"total":       response.Total,
		"page":        response.Page,
		"limit":       response.Limit,
		"total_pages": response.TotalPages,
		"invitations": invitations,
		"roles":       roles,
	}, http.StatusOK)
}

func CreateUniversityStaffHandler(w http.ResponseWriter, r *http.Request) {
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

	var req models.UniversityStaffCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.Email, "email"),
		validation.ValidateEmail(req.Email, "email"),
		validation.ValidateRequired(req.Password, "password"),
		validation.ValidateMinLength(req.Password, "password", 8),
		validation.ValidateRequired(req.FirstName, "first_name"),
		validation.ValidateRequired(req.LastName, "last_name"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	staffId, err := usecases_impl.CreateUniversityStaff(r.Context(), id, claims.UID, &req)
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
		"msg": "staff created",
		"id":  staffId,
	}, http.StatusCreated)
}

func UpdateUniversityStaffHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	vars := mux.Vars(r)
	id := vars["id"]
	staffId := vars["staffId"]
	if id == "" || staffId == "" {
		utils.WriteJSONResponseWithMsg(w, "university id and staff id are required", http.StatusBadRequest)
		return
	}
	errors := validation.Validate(
		validation.ValidateUUID(id, "id"),
		validation.ValidateUUID(staffId, "staff_id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
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

	var req models.UniversityStaffUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.Email != nil {
		errors := validation.Validate(validation.ValidateEmail(*req.Email, "email"))
		if len(errors) > 0 {
			validation.WriteValidationErrors(w, errors)
			return
		}
	}

	if err := usecases_impl.UpdateUniversityStaff(r.Context(), id, staffId, &req); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}
	utils.WriteJSONResponseWithMsg(w, "staff updated", http.StatusOK)
}

func UpdateUniversityStaffStatusHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	vars := mux.Vars(r)
	id := vars["id"]
	staffId := vars["staffId"]
	if id == "" || staffId == "" {
		utils.WriteJSONResponseWithMsg(w, "university id and staff id are required", http.StatusBadRequest)
		return
	}
	errors := validation.Validate(
		validation.ValidateUUID(id, "id"),
		validation.ValidateUUID(staffId, "staff_id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
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

	var req models.UniversityStaffStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors = validation.Validate(
		validation.ValidateRequired(req.Status, "status"),
		validation.ValidateInList(req.Status, "status", []string{"active", "suspended", "pending", "deactivated"}),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.UpdateUniversityStaffStatus(r.Context(), id, staffId, claims.UID, &req); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}
	utils.WriteJSONResponseWithMsg(w, "staff status updated", http.StatusOK)
}

func ResendUniversityStaffInviteHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	vars := mux.Vars(r)
	id := vars["id"]
	staffId := vars["staffId"]
	if id == "" || staffId == "" {
		utils.WriteJSONResponseWithMsg(w, "university id and staff id are required", http.StatusBadRequest)
		return
	}
	errors := validation.Validate(
		validation.ValidateUUID(id, "id"),
		validation.ValidateUUID(staffId, "staff_id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
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

	invitationId, err := usecases_impl.ResendUniversityStaffInvite(r.Context(), id, staffId, claims.UID)
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
		"msg":           "invitation sent",
		"invitation_id": invitationId,
	}, http.StatusOK)
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
