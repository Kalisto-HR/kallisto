// universities.go implements HTTP handlers for university operations.
package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/backend/internal/applicant/models"
	"kallisto/services/backend/internal/applicant/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetUniversitiesHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 10
	}

	items, total, err := usecases_impl.GetAllUniversities(r.Context(), page, limit)
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	paginated := utils.NewPaginatedResponse(items, total, page, limit)
	resp := utils.NewApiResponse(true, paginated, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func GetUniversityHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	vars := mux.Vars(r)
	id := vars["id"]

	errors := validation.Validate(
		validation.ValidateUUID(id, "id"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
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
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, status)
		return
	}

	resp := utils.NewApiResponse(true, university, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func SearchUniversitiesHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	query := r.URL.Query()

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 {
		limit = 10
	}

	params := &models.UniversitySearchParams{
		Query: query.Get("q"),
		Page:  page,
		Limit: limit,
	}

	if province := query.Get("province"); province != "" {
		params.Province = &province
	}
	if city := query.Get("city"); city != "" {
		params.City = &city
	}
	if country := query.Get("country"); country != "" {
		params.Country = &country
	}
	if minPrice, err := strconv.ParseFloat(query.Get("minPrice"), 64); err == nil {
		if minPrice < 0 {
			utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "minPrice must be non-negative"), http.StatusBadRequest)
			return
		}
		params.MinPrice = &minPrice
	}
	if maxPrice, err := strconv.ParseFloat(query.Get("maxPrice"), 64); err == nil {
		if maxPrice < 0 {
			utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "maxPrice must be non-negative"), http.StatusBadRequest)
			return
		}
		params.MaxPrice = &maxPrice
	}
	if params.MinPrice != nil && params.MaxPrice != nil && *params.MinPrice > *params.MaxPrice {
		utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "minPrice cannot be greater than maxPrice"), http.StatusBadRequest)
		return
	}
	if region := strings.TrimSpace(query.Get("region")); region != "" {
		params.Region = &region
	}
	studyFormats, ok := parseAllowedCSVQuery(query.Get("studyFormats"), map[string]bool{
		"full-time": true,
		"part-time": true,
		"evening":   true,
		"distance":  true,
	})
	if !ok {
		utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "invalid studyFormats value"), http.StatusBadRequest)
		return
	}
	languages, ok := parseAllowedCSVQuery(query.Get("languages"), map[string]bool{
		"uzbek":      true,
		"russian":    true,
		"english":    true,
		"karakalpak": true,
	})
	if !ok {
		utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "invalid languages value"), http.StatusBadRequest)
		return
	}
	params.StudyFormats = studyFormats
	params.Languages = languages
	if maxFee, err := strconv.ParseFloat(query.Get("max_fee"), 64); err == nil {
		params.MaxFee = &maxFee
	}
	if maxTuition, err := strconv.ParseFloat(query.Get("max_tuition"), 64); err == nil {
		params.MaxTuition = &maxTuition
	}

	if minAcceptanceRate, err := strconv.ParseFloat(query.Get("min_acceptance_rate"), 64); err == nil {
		params.MinAcceptanceRate = &minAcceptanceRate
	}
	if maxAcceptanceRate, err := strconv.ParseFloat(query.Get("max_acceptance_rate"), 64); err == nil {
		params.MaxAcceptanceRate = &maxAcceptanceRate
	}
	if minIelts, err := strconv.ParseFloat(query.Get("min_ielts"), 64); err == nil {
		params.MinIelts = &minIelts
	}
	if minToefl, err := strconv.Atoi(query.Get("min_toefl")); err == nil {
		params.MinToefl = &minToefl
	}
	if scholarshipAvailable, ok := parseBoolQuery(query.Get("scholarship_available")); ok {
		params.ScholarshipAvailable = &scholarshipAvailable
	}
	if cityType := query.Get("city_type"); cityType != "" {
		params.CityType = &cityType
	}
	if campusVibe := query.Get("campus_vibe"); campusVibe != "" {
		params.CampusVibe = &campusVibe
	}
	items, total, err := usecases_impl.SearchUniversities(r.Context(), params)
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	paginated := utils.NewPaginatedResponse(items, total, page, limit)
	resp := utils.NewApiResponse(true, paginated, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func GetUniversityFilterOptionsHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	options, err := usecases_impl.GetUniversityFilterOptions(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, http.StatusInternalServerError)
		return
	}

	resp := utils.NewApiResponse(true, options, "ok")
	utils.WriteApiResponse(w, resp, http.StatusOK)
}

func parseBoolQuery(value string) (bool, bool) {
	if value == "" {
		return false, false
	}
	v, err := strconv.ParseBool(value)
	if err != nil {
		return false, false
	}
	return v, true
}

func parseAllowedCSVQuery(value string, allowed map[string]bool) ([]string, bool) {
	if strings.TrimSpace(value) == "" {
		return nil, true
	}
	parts := strings.Split(value, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		if !allowed[trimmed] {
			return nil, false
		}
		values = append(values, trimmed)
	}
	return values, true
}
