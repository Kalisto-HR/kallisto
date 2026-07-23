// profile.go implements HTTP handlers for user profile operations.
package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	authsession "kallisto/infra/auth/session"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/backend/internal/applicant/models"
	"kallisto/services/backend/internal/applicant/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

const maxProfilePhotoBytes int64 = 2 * 1024 * 1024
const maxPhotoUploadRequestBytes int64 = 10 * 1024 * 1024

var allowedPhotoContentTypes = map[string]struct{}{
	"image/png":  {},
	"image/jpeg": {},
	"image/webp": {},
}

var profileNamePattern = regexp.MustCompile(`^[\p{L}\p{M}'\x{2018}\x{2019}` + "`" + ` -]+$`)
var e164UzbekPhonePattern = regexp.MustCompile(`^\+998\d{9}$`)

func NotImplementedHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(map[string]string{"msg": "handler not yet implemented"})
}

func GetProfileHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	profile, err := usecases_impl.GetUserById(r.Context(), claims.UID)
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

	resp := utils.NewApiResponse(true, profile, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	var req models.ProfileUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "malformed json request body")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var validationErrors []*validation.ValidationError
	if req.FirstName != nil {
		validationErrors = append(validationErrors, validateProfileName(*req.FirstName, "first_name")...)
	}
	if req.LastName != nil {
		validationErrors = append(validationErrors, validateProfileName(*req.LastName, "last_name")...)
	}
	if req.Data != nil {
		var data map[string]any
		if err := json.Unmarshal(req.Data, &data); err != nil || data == nil {
			validationErrors = append(validationErrors, &validation.ValidationError{
				Field:   "data",
				Message: "must be a valid JSON object",
			})
		} else {
			validationErrors = append(validationErrors, validateProfileData(data)...)
		}
	}
	if len(validationErrors) > 0 {
		validation.WriteValidationErrors(w, validationErrors)
		return
	}

	if err := usecases_impl.UpdateUserProfile(r.Context(), claims.UID, &req); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "profile updated successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func UpdatePasswordHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	var req models.ProfilePasswordUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "malformed json request body")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.CurrentPassword, "current_password"),
		validation.ValidateRequired(req.NewPassword, "new_password"),
		validation.ValidateMinLength(req.NewPassword, "new_password", 8),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if req.CurrentPassword == req.NewPassword {
		validation.WriteValidationErrors(w, []*validation.ValidationError{
			{
				Field:   "new_password",
				Message: "must be different from current_password",
			},
		})
		return
	}

	if err := usecases_impl.ChangeUserPassword(r.Context(), claims.UID, req.CurrentPassword, req.NewPassword); err != nil {
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

	utils.ClearAuthCookies(w)
	utils.WriteJSONResponse(w, map[string]any{
		"msg":             "password updated successfully",
		"reauth_required": true,
		"reason":          authsession.ReasonPasswordChanged,
	}, http.StatusOK)
}

func UpdateProfilePhotoHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxPhotoUploadRequestBytes)
	if err := r.ParseMultipartForm(maxPhotoUploadRequestBytes); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "invalid multipart request or file is too large")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("photo")
	if err != nil {
		resp := utils.NewApiResponse[any](false, nil, "photo field is required")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, maxProfilePhotoBytes+1))
	if err != nil {
		resp := utils.NewApiResponse[any](false, nil, "failed to read uploaded photo")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	if len(content) == 0 {
		resp := utils.NewApiResponse[any](false, nil, "photo file is empty")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	if int64(len(content)) > maxProfilePhotoBytes {
		resp := utils.NewApiResponse[any](false, nil, "photo file exceeds 2MB limit")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	contentType := http.DetectContentType(content)
	if _, ok := allowedPhotoContentTypes[contentType]; !ok {
		resp := utils.NewApiResponse[any](false, nil, "unsupported image type; allowed types: png, jpeg, webp")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	if err := usecases_impl.UpdateUserPhoto(r.Context(), claims.UID, content); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "profile photo updated successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func GetProfilePhotoHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	photo, err := usecases_impl.GetUserPhoto(r.Context(), claims.UID)
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

	w.Header().Set("Content-Type", http.DetectContentType(photo))
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(photo); err != nil {
		log.Error(err.Error())
	}
}

func DeleteProfileHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	if err := usecases_impl.DeleteUser(r.Context(), claims.UID); err != nil {
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

	utils.ClearAuthCookies(w)

	resp := utils.NewApiResponse[any](true, nil, "account deleted successfully")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func isSupportedStudentGender(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "male", "female", "prefer_not_to_say":
		return true
	default:
		return false
	}
}

func validateProfileName(value string, field string) []*validation.ValidationError {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return []*validation.ValidationError{{Field: field, Message: "is required"}}
	}
	if !profileNamePattern.MatchString(trimmed) || isNumbersOnly(trimmed) {
		return []*validation.ValidationError{{Field: field, Message: "must contain valid name characters"}}
	}
	return nil
}

func validateProfileData(data map[string]any) []*validation.ValidationError {
	var errors []*validation.ValidationError

	if genderValue, exists := data["gender"]; exists {
		gender, ok := genderValue.(string)
		if !ok || !isSupportedStudentGender(gender) {
			errors = append(errors, &validation.ValidationError{
				Field:   "data.gender",
				Message: "must be one of: male, female, prefer_not_to_say",
			})
		}
	}

	regionCode, hasRegion := dataString(data, "regionCode")
	districtCode, hasDistrict := dataString(data, "districtCode")
	if hasRegion {
		if regionCode == "" || !validation.IsUzbekistanRegionCode(regionCode) {
			errors = append(errors, &validation.ValidationError{Field: "data.regionCode", Message: "must be a valid Uzbekistan region code"})
		}
	}
	if hasDistrict {
		if districtCode == "" || !validation.IsUzbekistanDistrictCode(districtCode) {
			errors = append(errors, &validation.ValidationError{Field: "data.districtCode", Message: "must be a valid Uzbekistan district code"})
		}
	}
	if hasRegion && hasDistrict && regionCode != "" && districtCode != "" && !validation.IsUzbekistanDistrictInRegion(regionCode, districtCode) {
		errors = append(errors, &validation.ValidationError{
			Field:   "data.districtCode",
			Message: "The selected district does not belong to the selected region.",
		})
	}

	if value, exists := dataString(data, "dateOfBirth"); exists && value != "" {
		parsed, err := time.Parse("2006-01-02", value)
		if err != nil {
			errors = append(errors, &validation.ValidationError{Field: "data.dateOfBirth", Message: "must be in YYYY-MM-DD format"})
		} else if parsed.After(time.Now()) {
			errors = append(errors, &validation.ValidationError{Field: "data.dateOfBirth", Message: "must not be in the future"})
		}
	}

	if value, exists := dataString(data, "additionalPhone"); exists && value != "" && !e164UzbekPhonePattern.MatchString(value) {
		errors = append(errors, &validation.ValidationError{Field: "data.additionalPhone", Message: "must be a valid Uzbekistan phone number in E.164 format"})
	}

	return errors
}

func dataString(data map[string]any, key string) (string, bool) {
	value, exists := data[key]
	if !exists || value == nil {
		return "", exists
	}
	text, ok := value.(string)
	if !ok {
		return "", true
	}
	return strings.TrimSpace(text), true
}

func isNumbersOnly(value string) bool {
	hasDigit := false
	for _, r := range value {
		if r >= '0' && r <= '9' {
			hasDigit = true
			continue
		}
		if r != ' ' && r != '-' {
			return false
		}
	}
	return hasDigit
}

func GetProfileTestScoresHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	items, err := usecases_impl.GetProfileTestScores(r.Context(), claims.UID)
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

	resp := utils.NewApiResponse(true, items, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func CreateProfileTestScoreHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	req, validationErrors := decodeAndValidateProfileTestScoreRequest(r)
	if len(validationErrors) > 0 {
		validation.WriteValidationErrors(w, validationErrors)
		return
	}

	item, err := usecases_impl.CreateProfileTestScore(r.Context(), claims.UID, req)
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

	resp := utils.NewApiResponse(true, item, "profile test score created")
	utils.WriteApiResponse(w, resp, http.StatusCreated)
}

func UpdateProfileTestScoreHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	scoreId := mux.Vars(r)["id"]
	if uuidErr := validation.ValidateUUID(scoreId, "id"); uuidErr != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{uuidErr})
		return
	}

	req, validationErrors := decodeAndValidateProfileTestScoreRequest(r)
	if len(validationErrors) > 0 {
		validation.WriteValidationErrors(w, validationErrors)
		return
	}

	item, err := usecases_impl.UpdateProfileTestScore(r.Context(), claims.UID, scoreId, req)
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

	resp := utils.NewApiResponse(true, item, "profile test score updated")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func DeleteProfileTestScoreHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	scoreId := mux.Vars(r)["id"]
	if uuidErr := validation.ValidateUUID(scoreId, "id"); uuidErr != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{uuidErr})
		return
	}

	if err := usecases_impl.DeleteProfileTestScore(r.Context(), claims.UID, scoreId); err != nil {
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

	resp := utils.NewApiResponse[any](true, nil, "profile test score deleted")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func decodeAndValidateProfileTestScoreRequest(r *http.Request) (*models.ProfileTestScoreUpsertRequest, []*validation.ValidationError) {
	var req models.ProfileTestScoreUpsertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, []*validation.ValidationError{{
			Field:   "body",
			Message: "malformed json request body",
		}}
	}
	defer r.Body.Close()

	testType := strings.ToUpper(strings.TrimSpace(string(req.TestType)))
	req.TestType = models.TestScoreType(testType)
	req.OtherTestName = trimOptionalString(req.OtherTestName)
	req.TakenOn = trimOptionalString(req.TakenOn)

	validationErrors := validation.Validate(
		validation.ValidateRequired(testType, "test_type"),
		validation.ValidateInList(testType, "test_type", []string{
			string(models.TestScoreTypeIELTS),
			string(models.TestScoreTypeSAT),
			string(models.TestScoreTypeTOEFL),
			string(models.TestScoreTypeACT),
			string(models.TestScoreTypeHSK),
			string(models.TestScoreTypeCSCA),
			string(models.TestScoreTypeOther),
		}),
	)

	if req.Score < 0 {
		validationErrors = append(validationErrors, &validation.ValidationError{
			Field:   "score",
			Message: "must be greater than or equal to 0",
		})
	}
	if req.OutOf <= 0 {
		validationErrors = append(validationErrors, &validation.ValidationError{
			Field:   "out_of",
			Message: "must be greater than 0",
		})
	}
	if req.Score > req.OutOf {
		validationErrors = append(validationErrors, &validation.ValidationError{
			Field:   "score",
			Message: "must be less than or equal to out_of",
		})
	}
	if req.TestType == models.TestScoreTypeOther && req.OtherTestName == nil {
		validationErrors = append(validationErrors, &validation.ValidationError{
			Field:   "other_test_name",
			Message: "is required when test_type is OTHER",
		})
	}
	if req.TestType != models.TestScoreTypeOther && req.OtherTestName != nil {
		validationErrors = append(validationErrors, &validation.ValidationError{
			Field:   "other_test_name",
			Message: "must be empty unless test_type is OTHER",
		})
	}
	if req.TakenOn != nil {
		if _, err := time.Parse("2006-01-02", *req.TakenOn); err != nil {
			validationErrors = append(validationErrors, &validation.ValidationError{
				Field:   "taken_on",
				Message: "must be in YYYY-MM-DD format",
			})
		}
	}

	return &req, validationErrors
}

func trimOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
