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
	"kallisto/services/admin/internal/models"
	"kallisto/services/admin/internal/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetGlobalOverviewHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	_, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	data, err := usecases_impl.GetGlobalOverview(r.Context())
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

func GetGlobalDraftsHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	_, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	query := r.URL.Query()
	page, limit := parsePagination(query.Get("page"), query.Get("limit"))
	search := query.Get("q")
	draftType := query.Get("type")
	status := query.Get("status")

	items, total, err := usecases_impl.GetGlobalDrafts(r.Context(), search, draftType, status, page, limit)
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponse(w, utils.NewPaginatedResponse(items, total, page, limit), http.StatusOK)
}

func ApproveGlobalDraftHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	claims, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	draftID := mux.Vars(r)["id"]
	if strings.TrimSpace(draftID) == "" {
		utils.WriteJSONResponseWithMsg(w, "draft id is required", http.StatusBadRequest)
		return
	}

	var req models.DraftDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err.Error() != "EOF" {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if err := usecases_impl.ApproveGlobalDraft(r.Context(), draftID, claims.UID, req.Notes); err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponseWithMsg(w, "draft approved and executed", http.StatusOK)
}

func RejectGlobalDraftHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	claims, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	draftID := mux.Vars(r)["id"]
	if strings.TrimSpace(draftID) == "" {
		utils.WriteJSONResponseWithMsg(w, "draft id is required", http.StatusBadRequest)
		return
	}

	var req models.DraftDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = strings.TrimSpace(req.Notes)
	}
	if reason == "" {
		utils.WriteJSONResponseWithMsg(w, "rejection reason is required", http.StatusBadRequest)
		return
	}

	if err := usecases_impl.RejectGlobalDraft(r.Context(), draftID, claims.UID, reason); err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponseWithMsg(w, "draft rejected", http.StatusOK)
}

func GetGlobalApplicationsHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	_, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	query := r.URL.Query()
	page, limit := parsePagination(query.Get("page"), query.Get("limit"))

	var (
		universityID *string
		status       *string
		search       *string
	)
	if v := strings.TrimSpace(query.Get("university_id")); v != "" {
		universityID = &v
	}
	if v := strings.TrimSpace(query.Get("status")); v != "" {
		status = &v
	}
	if v := strings.TrimSpace(query.Get("search")); v != "" {
		search = &v
	}

	items, total, err := usecases_impl.GetSubmittedApplications(r.Context(), models.SubmittedApplicationsQuery{
		UniversityId: universityID,
		Status:       status,
		Search:       search,
		SortBy:       strings.TrimSpace(query.Get("sort_by")),
		SortOrder:    strings.TrimSpace(query.Get("sort_order")),
		Page:         page,
		Limit:        limit,
	})
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponse(w, utils.NewPaginatedResponse(items, total, page, limit), http.StatusOK)
}

func GetGlobalUsersHandler(w http.ResponseWriter, r *http.Request) {
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

	items, total, err := usecases_impl.GetGlobalUsers(r.Context(), search, status, page, limit)
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	utils.WriteJSONResponse(w, utils.NewPaginatedResponse(items, total, page, limit), http.StatusOK)
}

func CreateBanUserDraftHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()
	claims, err := ensureStaffAccess(r.Context())
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	userID := mux.Vars(r)["id"]
	if strings.TrimSpace(userID) == "" {
		utils.WriteJSONResponseWithMsg(w, "user id is required", http.StatusBadRequest)
		return
	}

	var req models.CreateUserBanDraftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	draftID, err := usecases_impl.CreateBanUserDraft(r.Context(), claims.UID, userID, req.Reason, req.Duration)
	if err != nil {
		writeHandlerErr(w, log, err)
		return
	}

	actorID := claims.UID
	targetID := draftID
	_ = usecases_impl.WriteAuditLog(r.Context(), &models.GlobalAuditWrite{
		ActorName:         claims.FirstName + " " + claims.LastName,
		ActorId:           &actorID,
		ActorType:         "superuser",
		ActionType:        "draft-created",
		ActionDescription: "Created ban-user draft",
		TargetEntity:      userID,
		TargetId:          &targetID,
		Outcome:           "pending",
		IpAddress:         requestIP(r),
		Metadata:          []byte(`{"draft_type":"ban-user"}`),
	})

	utils.WriteJSONResponse(w, map[string]string{
		"msg": "ban draft created",
		"id":  draftID,
	}, http.StatusCreated)
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

	items, total, err := usecases_impl.GetGlobalServiceLogs(r.Context(), level, microservice, handler, userID, timeRange, page, limit)
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

	items, total, err := usecases_impl.GetGlobalAuditLogs(r.Context(), search, action, outcome, page, limit)
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

	actorID := claims.UID
	_ = usecases_impl.WriteAuditLog(r.Context(), &models.GlobalAuditWrite{
		ActorName:         claims.FirstName + " " + claims.LastName,
		ActorId:           &actorID,
		ActorType:         "superuser",
		ActionType:        "settings-updated",
		ActionDescription: "Updated global settings",
		TargetEntity:      "global_settings",
		Outcome:           "success",
		IpAddress:         requestIP(r),
		Metadata:          []byte(`{"source":"global/settings"}`),
	})

	utils.WriteJSONResponseWithMsg(w, "settings updated", http.StatusOK)
}

func ensureStaffAccess(ctx context.Context) (*middlewaresClaimsShim, error) {
	claims, err := middlewares.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, utils.NewHandlerFuncErr(http.StatusUnauthorized, "unauthorized")
	}
	if claims.Role != "staff" {
		return nil, utils.NewHandlerFuncErr(http.StatusForbidden, "superuser access required")
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
