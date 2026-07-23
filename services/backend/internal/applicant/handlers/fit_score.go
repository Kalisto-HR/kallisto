package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/backend/internal/applicant/models"
	usecases_impl "kallisto/services/backend/internal/applicant/usecases/usecases_impl"
)

func CalculateFitScoreHandler(w http.ResponseWriter, r *http.Request) {
	claims, claimsErr := middlewares.GetClaimsFromContext(r.Context())
	if claimsErr == nil {
		if err := usecases_impl.RequirePremium(r.Context(), claims.UID); err != nil {
			status := http.StatusInternalServerError
			if handleFuncErr, ok := err.(utils.HandlerFuncErr); ok {
				status = handleFuncErr.Status()
			}
			utils.WriteApiResponse(w, utils.NewApiResponse(false, map[string]any{
				"matchScore":       nil,
				"matchScoreLocked": true,
			}, err.Error()), status)
			return
		}
	}

	var req models.FitScoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.StudentProfile == nil || req.Program == nil {
		if strings.TrimSpace(req.StudentID) != "" || strings.TrimSpace(req.ProgramID) != "" {
			utils.WriteJSONResponseWithMsg(w, "studentId/programId lookup is not available yet; send studentProfile and program objects", http.StatusNotImplemented)
			return
		}
		utils.WriteJSONResponseWithMsg(w, "studentProfile and program are required", http.StatusBadRequest)
		return
	}

	if validationErrors := validateFitScoreRequest(req); len(validationErrors) > 0 {
		validation.WriteValidationErrors(w, validationErrors)
		return
	}

	result := usecases_impl.CalculateFitScore(*req.StudentProfile, *req.Program, time.Now().UTC())
	utils.WriteApiResponse(w, utils.NewApiResponse(true, result, "fit score calculated"), http.StatusOK)
}

func validateFitScoreRequest(req models.FitScoreRequest) []*validation.ValidationError {
	errors := make([]*validation.ValidationError, 0)
	if req.StudentProfile == nil || req.Program == nil {
		return errors
	}

	student := req.StudentProfile
	program := req.Program

	errors = appendNumberRange(errors, "studentProfile.gpa", student.GPA, 0, 100)
	errors = appendNumberRange(errors, "studentProfile.gpaScale", student.GPAScale, 1, 100)
	errors = appendNumberRange(errors, "studentProfile.ielts", student.IELTS, 0, 9)
	errors = appendNumberRange(errors, "studentProfile.toefl", student.TOEFL, 0, 120)
	errors = appendNumberRange(errors, "studentProfile.hsk", student.HSK, 0, 6)
	errors = appendNumberRange(errors, "studentProfile.sat", student.SAT, 0, 1600)
	errors = appendNumberRange(errors, "studentProfile.budgetPerYear", student.BudgetPerYear, 0, 1000000000)

	errors = appendNumberRange(errors, "program.minGpa", program.MinGPA, 0, 100)
	errors = appendNumberRange(errors, "program.minIelts", program.MinIELTS, 0, 9)
	errors = appendNumberRange(errors, "program.minToefl", program.MinTOEFL, 0, 120)
	errors = appendNumberRange(errors, "program.minHsk", program.MinHSK, 0, 6)
	errors = appendNumberRange(errors, "program.tuition", program.Tuition, 0, 1000000000)

	if student.GPA != nil && student.GPAScale != nil && *student.GPAScale < *student.GPA {
		errors = append(errors, &validation.ValidationError{
			Field:   "studentProfile.gpaScale",
			Message: "must be greater than or equal to GPA when both are provided",
		})
	}

	errors = appendStringLength(errors, "studentProfile.intendedMajor", student.IntendedMajor, 120)
	errors = appendStringLength(errors, "studentProfile.preferredCity", student.PreferredCity, 120)
	errors = appendStringLength(errors, "studentProfile.preferredLanguage", student.PreferredLanguage, 80)
	errors = appendStringLength(errors, "program.majorName", program.MajorName, 160)
	errors = appendStringLength(errors, "program.language", program.Language, 80)
	errors = appendStringLength(errors, "program.deadline", program.Deadline, 64)
	errors = appendStringSliceLength(errors, "studentProfile.documentsReady", student.DocumentsReady, 50, 120)
	errors = appendStringSliceLength(errors, "studentProfile.achievements", student.Achievements, 50, 240)
	errors = appendStringSliceLength(errors, "program.requiredDocuments", program.RequiredDocuments, 50, 120)

	return errors
}

func appendNumberRange(errors []*validation.ValidationError, field string, value *float64, min float64, max float64) []*validation.ValidationError {
	if value == nil {
		return errors
	}
	if !isFinite(*value) || *value < min || *value > max {
		return append(errors, &validation.ValidationError{
			Field:   field,
			Message: "must be a finite number within the supported range",
		})
	}
	return errors
}

func appendStringLength(errors []*validation.ValidationError, field string, value string, max int) []*validation.ValidationError {
	if len(strings.TrimSpace(value)) > max {
		return append(errors, &validation.ValidationError{
			Field:   field,
			Message: "is too long",
		})
	}
	return errors
}

func appendStringSliceLength(errors []*validation.ValidationError, field string, values []string, maxItems int, maxLength int) []*validation.ValidationError {
	if len(values) > maxItems {
		errors = append(errors, &validation.ValidationError{
			Field:   field,
			Message: "has too many items",
		})
	}
	for index, value := range values {
		if len(strings.TrimSpace(value)) > maxLength {
			errors = append(errors, &validation.ValidationError{
				Field:   field,
				Message: "item " + strconv.Itoa(index) + " is too long",
			})
			break
		}
	}
	return errors
}

func isFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
