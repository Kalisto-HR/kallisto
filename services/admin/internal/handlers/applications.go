// Application handlers for reviewing submitted applications
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/admin/internal/models"
	"kallisto/services/admin/internal/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetApplicationsHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	// Get claims for role-based filtering
	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
		return
	}

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

	// Get filters
	var universityId *string
	var status *string
	var search *string
	var program *string
	var citizenship *string
	var intake *string

	if uid := query.Get("university_id"); uid != "" {
		universityId = &uid
	}
	if s := query.Get("status"); s != "" {
		status = &s
	}
	if v := query.Get("search"); v != "" {
		search = &v
	}
	if v := query.Get("program"); v != "" {
		program = &v
	}
	if v := query.Get("citizenship"); v != "" {
		citizenship = &v
	}
	if v := query.Get("intake"); v != "" {
		intake = &v
	}
	sortBy := query.Get("sort_by")
	sortOrder := query.Get("sort_order")

	// If user is a partner, they can only see applications for their linked university
	// This would require looking up the user's linked university from the database
	if claims.Role == "partner" {
		linkedUniversityId, err := getLinkedUniversityForUser(r.Context(), claims.UID)
		if err != nil {
			handleFuncErr, ok := err.(utils.HandlerFuncErr)
			statusCode := http.StatusInternalServerError
			if ok {
				statusCode = handleFuncErr.Status()
			}
			log.Error(err.Error())
			utils.WriteJSONResponseWithMsg(w, err.Error(), statusCode)
			return
		}
		universityId, err = enforcePartnerUniversityFilter(claims.Role, linkedUniversityId, universityId)
		if err != nil {
			handleFuncErr, ok := err.(utils.HandlerFuncErr)
			statusCode := http.StatusInternalServerError
			if ok {
				statusCode = handleFuncErr.Status()
			}
			log.Error(err.Error())
			utils.WriteJSONResponseWithMsg(w, err.Error(), statusCode)
			return
		}
	}

	applications, total, err := usecases_impl.GetSubmittedApplications(r.Context(), models.SubmittedApplicationsQuery{
		UniversityId: universityId,
		Status:       status,
		Search:       search,
		Program:      program,
		Citizenship:  citizenship,
		Intake:       intake,
		SortBy:       sortBy,
		SortOrder:    sortOrder,
		Page:         page,
		Limit:        limit,
	})
	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		statusCode := http.StatusInternalServerError
		if ok {
			statusCode = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), statusCode)
		return
	}

	response := utils.NewPaginatedResponse(applications, total, page, limit)
	utils.WriteJSONResponse(w, response, http.StatusOK)
}

func GetApplicationHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	// Get claims for role-based filtering
	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		utils.WriteJSONResponseWithMsg(w, "application id is required", http.StatusBadRequest)
		return
	}

	// Validate UUID format
	if err := validation.ValidateUUID(id, "id"); err != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{err})
		return
	}

	var linkedUniversityId *string
	if claims.Role == "partner" {
		linkedUniversityId, err = getLinkedUniversityForUser(r.Context(), claims.UID)
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
	}

	application, err := usecases_impl.GetSubmittedApplicationById(r.Context(), id)
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

	if err := enforcePartnerUniversityAccess(claims.Role, linkedUniversityId, application.UniversityId); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}

	utils.WriteJSONResponse(w, application, http.StatusOK)
}

func ReceiveApplicationHandler(w http.ResponseWriter, r *http.Request) {
	var (
		req models.ReceiveApplicationRequest
		log = zap.L()
	)

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate input
	errors := validation.Validate(
		validation.ValidateRequired(req.UserId, "user_id"),
		validation.ValidateUUID(req.UserId, "user_id"),
		validation.ValidateRequired(req.UniversityId, "university_id"),
		validation.ValidateUUID(req.UniversityId, "university_id"),
		validation.ValidateRequired(req.ApplicationCycle, "application_cycle"),
		validation.ValidateRequired(req.SubmittedAt, "submitted_at"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	err := usecases_impl.ReceiveApplication(r.Context(), &req)
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

	utils.WriteJSONResponseWithMsg(w, "application received", http.StatusCreated)
}

func ReviewApplicationHandler(w http.ResponseWriter, r *http.Request) {
	var (
		req models.ApplicationReviewRequest
		log = zap.L()
	)

	// Get reviewer ID from claims
	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		utils.WriteJSONResponseWithMsg(w, "application id is required", http.StatusBadRequest)
		return
	}

	// Validate UUID format
	if err := validation.ValidateUUID(id, "id"); err != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{err})
		return
	}

	if claims.Role == "partner" {
		linkedUniversityId, err := getLinkedUniversityForUser(r.Context(), claims.UID)
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

		application, err := usecases_impl.GetSubmittedApplicationById(r.Context(), id)
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
		if err := enforcePartnerUniversityAccess(claims.Role, linkedUniversityId, application.UniversityId); err != nil {
			handleFuncErr, ok := err.(utils.HandlerFuncErr)
			status := http.StatusInternalServerError
			if ok {
				status = handleFuncErr.Status()
			}
			log.Error(err.Error())
			utils.WriteJSONResponseWithMsg(w, err.Error(), status)
			return
		}
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate status
	errors := validation.Validate(
		validation.ValidateRequired(req.Status, "status"),
		validation.ValidateInList(req.Status, "status", []string{"pending", "reviewing", "accepted", "rejected"}),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	err = usecases_impl.ReviewApplication(r.Context(), id, claims.UID, &req)
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

	utils.WriteJSONResponseWithMsg(w, "application reviewed", http.StatusOK)
}

func DownloadSubmittedApplicationFileHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	applicationId := vars["id"]
	fileId := vars["fileId"]

	errors := validation.Validate(
		validation.ValidateUUID(applicationId, "id"),
		validation.ValidateUUID(fileId, "fileId"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	var linkedUniversityId *string
	if claims.Role == "partner" {
		linkedUniversityId, err = getLinkedUniversityForUser(r.Context(), claims.UID)
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
	}

	application, err := usecases_impl.GetSubmittedApplicationById(r.Context(), applicationId)
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

	if err := enforcePartnerUniversityAccess(claims.Role, linkedUniversityId, application.UniversityId); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}

	file, err := usecases_impl.GetSubmittedApplicationFileById(r.Context(), applicationId, fileId)
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

	contentType := file.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	disposition := "attachment"
	if strings.HasPrefix(contentType, "image/") || contentType == "application/pdf" {
		disposition = "inline"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", strconv.FormatInt(file.FileSize, 10))
	w.Header().Set("Content-Disposition", disposition+`; filename="`+file.FileName+`"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(file.FileData)
}

func ListSubmittedApplicationFilesHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	applicationId := mux.Vars(r)["id"]
	if err := validation.ValidateUUID(applicationId, "id"); err != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{err})
		return
	}

	var linkedUniversityId *string
	if claims.Role == "partner" {
		linkedUniversityId, err = getLinkedUniversityForUser(r.Context(), claims.UID)
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
	}

	application, err := usecases_impl.GetSubmittedApplicationById(r.Context(), applicationId)
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

	if err := enforcePartnerUniversityAccess(claims.Role, linkedUniversityId, application.UniversityId); err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		utils.WriteJSONResponseWithMsg(w, err.Error(), status)
		return
	}

	items, err := usecases_impl.ListSubmittedApplicationFiles(r.Context(), applicationId)
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
		"items": items,
	}, http.StatusOK)
}

func getLinkedUniversityForUser(ctx context.Context, uid string) (*string, error) {
	user, err := usecases_impl.GetAdminUserById(ctx, uid)
	if err != nil {
		return nil, err
	}

	return user.UniversityLinked, nil
}

func enforcePartnerUniversityFilter(role string, linkedUniversityId *string, requestedUniversityId *string) (*string, error) {
	if role != "partner" {
		return requestedUniversityId, nil
	}
	if linkedUniversityId == nil {
		return nil, utils.NewHandlerFuncErr(http.StatusForbidden, "partner account missing linked university")
	}
	if requestedUniversityId != nil && *requestedUniversityId != *linkedUniversityId {
		return nil, utils.NewHandlerFuncErr(http.StatusForbidden, "partners cannot access other universities")
	}
	return linkedUniversityId, nil
}

func enforcePartnerUniversityAccess(role string, linkedUniversityId *string, applicationUniversityId string) error {
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
