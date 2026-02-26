// universities.go implements HTTP handlers for university operations.
package handlers

import (
	"net/http"
	"strconv"

	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/client/internal/models"
	"kallisto/services/client/internal/usecases/usecases_impl"

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
	if minRanking, err := strconv.Atoi(query.Get("min_ranking")); err == nil {
		params.MinRanking = &minRanking
	}
	if maxRanking, err := strconv.Atoi(query.Get("max_ranking")); err == nil {
		params.MaxRanking = &maxRanking
	}
	if maxFee, err := strconv.ParseFloat(query.Get("max_fee"), 64); err == nil {
		params.MaxFee = &maxFee
	}
	if maxTuition, err := strconv.ParseFloat(query.Get("max_tuition"), 64); err == nil {
		params.MaxTuition = &maxTuition
	}
	if maxLivingCost, err := strconv.ParseFloat(query.Get("max_living_cost"), 64); err == nil {
		params.MaxLivingCost = &maxLivingCost
	}
	if maxTotalCost, err := strconv.ParseFloat(query.Get("max_total_cost"), 64); err == nil {
		params.MaxTotalCost = &maxTotalCost
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
	if competitiveness := query.Get("competitiveness"); competitiveness != "" {
		params.Competitiveness = &competitiveness
	}
	if cityType := query.Get("city_type"); cityType != "" {
		params.CityType = &cityType
	}
	if safetyLevel := query.Get("safety_level"); safetyLevel != "" {
		params.SafetyLevel = &safetyLevel
	}
	if campusVibe := query.Get("campus_vibe"); campusVibe != "" {
		params.CampusVibe = &campusVibe
	}
	if visaRequired, ok := parseBoolQuery(query.Get("visa_required")); ok {
		params.VisaRequired = &visaRequired
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
