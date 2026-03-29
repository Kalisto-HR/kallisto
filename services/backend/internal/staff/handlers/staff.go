package handlers

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"strings"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/shared/models"
	"kallisto/services/backend/internal/shared/usecases/usecases_impl"

	"go.uber.org/zap"
)

func GetGlobalOverviewHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	_, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	data, err := usecases_impl.GetStaffOverview(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponse(w, data, http.StatusOK)
}

func GetGlobalUniversitiesHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	_, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	query := r.URL.Query()
	page, limit := parsePagination(query.Get("page"), query.Get("limit"))
	search := query.Get("q")
	status := query.Get("status")
	uniType := query.Get("type")

	items, total, err := usecases_impl.GetGlobalUniversities(r.Context(), search, status, uniType, page, limit)
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponse(w, utils.NewPaginatedResponse(items, total, page, limit), http.StatusOK)
}

func GetGlobalServiceLogsHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	_, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	query := r.URL.Query()
	page, limit := parsePagination(query.Get("page"), query.Get("limit"))
	level := query.Get("level")
	microservice := query.Get("microservice")
	handler := query.Get("handler")
	userID := query.Get("user_id")
	timeRange := query.Get("time_range")
	requestID := query.Get("request_id")
	method := query.Get("method")
	statusCode := query.Get("status_code")
	role := query.Get("role")
	from := query.Get("from")
	to := query.Get("to")

	items, total, err := usecases_impl.GetGlobalServiceLogs(r.Context(), level, microservice, handler, userID, timeRange, requestID, method, statusCode, role, from, to, page, limit)
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponse(w, utils.NewPaginatedResponse(items, total, page, limit), http.StatusOK)
}

func GetGlobalAuditLogsHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	_, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	query := r.URL.Query()
	page, limit := parsePagination(query.Get("page"), query.Get("limit"))
	search := query.Get("q")
	action := query.Get("action")
	outcome := query.Get("outcome")
	requestID := query.Get("request_id")
	actorType := query.Get("actor_type")
	targetEntity := query.Get("target_entity")
	from := query.Get("from")
	to := query.Get("to")

	items, total, err := usecases_impl.GetGlobalAuditLogs(r.Context(), search, action, outcome, requestID, actorType, targetEntity, from, to, page, limit)
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponse(w, utils.NewPaginatedResponse(items, total, page, limit), http.StatusOK)
}

func GetGlobalSettingsHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	_, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	settings, err := usecases_impl.GetGlobalSettings(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	response := map[string]any{
		"settings": settings,
	}
	utils.WriteJSONResponse(w, response, http.StatusOK)
}

func UpdateGlobalSettingsHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	claims, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	var req models.UpsertGlobalSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if err := usecases_impl.UpsertGlobalSettings(r.Context(), claims.UID, req.Settings); err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponseWithMsg(w, "settings updated", http.StatusOK)
}

func ensureStaffAccess(ctx context.Context) (*middlewaresClaimsShim, error) {
	claims, err := middlewares.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, utils.NewHandlerFuncErr(http.StatusUnauthorized, "unauthorized")
	}
	if claims.Role != "staff" {
		return nil, utils.NewHandlerFuncErr(http.StatusForbidden, "staff access required")
	}
	return &middlewaresClaimsShim{
		UID:       claims.UID,
		FirstName: claims.FirstName,
		LastName:  claims.LastName,
	}, nil
}

type middlewaresClaimsShim struct {
	UID       string
	FirstName string
	LastName  string
}

func parsePagination(rawPage, rawLimit string) (int, int) {
	page, _ := strconv.Atoi(rawPage)
	limit, _ := strconv.Atoi(rawLimit)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 20
	}
	return page, limit
}

func writeHandlerErr(w http.ResponseWriter, log *zap.Logger, err error) {
	handleFuncErr, ok := err.(utils.HandlerFuncErr)
	status := http.StatusInternalServerError
	if ok {
		status = handleFuncErr.Status()
	}
	log.Error(err.Error())
	utils.WriteJSONResponseWithMsg(w, err.Error(), status)
}

func requestIP(r *http.Request) *string {
	xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if xff != "" {
		parts := strings.Split(xff, ",")
		v := strings.TrimSpace(parts[0])
		return &v
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil {
		return &host
	}
	if strings.TrimSpace(r.RemoteAddr) != "" {
		v := strings.TrimSpace(r.RemoteAddr)
		return &v
	}
	return nil
}
