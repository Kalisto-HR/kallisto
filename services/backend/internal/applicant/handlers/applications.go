// applications.go implements HTTP handlers for application operations.
package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/backend/internal/applicant/models"
	"kallisto/services/backend/internal/applicant/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetApplicationsHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	applications, err := usecases_impl.GetApplicationsByUser(r.Context(), claims.UID)
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	resp := utils.NewApiResponse(true, applications, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func GetApplicationHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	universityId := vars["universityId"]
	cycle := vars["cycle"]

	errors := validation.Validate(
		validation.ValidateUUID(universityId, "universityId"),
		validation.ValidateRequired(cycle, "cycle"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	application, err := usecases_impl.GetApplicationById(r.Context(), claims.UID, universityId, cycle)
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

	resp := utils.NewApiResponse(true, application, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func CreateApplicationHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	var req models.ApplicationCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "malformed json request body")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.UniversityId, "university_id"),
		validation.ValidateUUID(req.UniversityId, "university_id"),
		validation.ValidateRequired(req.ApplicationCycle, "application_cycle"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.CreateApplication(r.Context(), claims.UID, &req); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "application created successfully")
	utils.WriteApiResponse(w, resp, http.StatusCreated)
}

func UpdateApplicationHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	universityId := vars["universityId"]
	cycle := vars["cycle"]

	errors := validation.Validate(
		validation.ValidateUUID(universityId, "universityId"),
		validation.ValidateRequired(cycle, "cycle"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	var req models.ApplicationUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "malformed json request body")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if err := usecases_impl.UpdateApplication(r.Context(), claims.UID, universityId, cycle, &req); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "application updated successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func SubmitApplicationHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	universityId := vars["universityId"]
	cycle := vars["cycle"]

	errors := validation.Validate(
		validation.ValidateUUID(universityId, "universityId"),
		validation.ValidateRequired(cycle, "cycle"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.SubmitApplication(r.Context(), claims.UID, universityId, cycle); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "application submitted successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func DeleteApplicationHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	universityId := vars["universityId"]
	cycle := vars["cycle"]

	errors := validation.Validate(
		validation.ValidateUUID(universityId, "universityId"),
		validation.ValidateRequired(cycle, "cycle"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if err := usecases_impl.DeleteApplication(r.Context(), claims.UID, universityId, cycle); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "application deleted successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func ImportApplicationTestScoresHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	universityId := vars["universityId"]
	cycle := vars["cycle"]
	validationErrors := validation.Validate(
		validation.ValidateUUID(universityId, "universityId"),
		validation.ValidateRequired(cycle, "cycle"),
	)

	var req models.ApplicationImportTestScoresRequest
	if r.Body != nil {
		raw, readErr := io.ReadAll(r.Body)
		if readErr != nil {
			resp := utils.NewApiResponse[any](false, nil, "failed to read request body")
			utils.WriteApiResponse(w, resp, http.StatusBadRequest)
			return
		}
		if len(raw) > 0 {
			if unmarshalErr := json.Unmarshal(raw, &req); unmarshalErr != nil {
				resp := utils.NewApiResponse[any](false, nil, "malformed json request body")
				utils.WriteApiResponse(w, resp, http.StatusBadRequest)
				return
			}
		}
	}

	for _, scoreId := range req.TestScoreIDs {
		if uuidErr := validation.ValidateUUID(scoreId, "test_score_ids"); uuidErr != nil {
			validationErrors = append(validationErrors, uuidErr)
			break
		}
	}
	if len(validationErrors) > 0 {
		validation.WriteValidationErrors(w, validationErrors)
		return
	}

	result, err := usecases_impl.ImportProfileTestScoresToApplication(
		r.Context(),
		claims.UID,
		universityId,
		cycle,
		req.TestScoreIDs,
	)
	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		if !ok && errors.Is(err, io.EOF) {
			status = http.StatusBadRequest
		}
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, status)
		return
	}

	resp := utils.NewApiResponse(true, result, "application test scores imported successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}
