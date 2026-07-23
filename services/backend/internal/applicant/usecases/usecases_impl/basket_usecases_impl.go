package usecases_impl

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/applicant/models"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxBasketPlanCapacity = 20

type basketData struct {
	UniversityIds  []string `json:"university_ids"`
	SelectedPlanId *string  `json:"selected_plan_id,omitempty"`
	UpdatedAt      *string  `json:"updated_at,omitempty"`
}

var basketPlanCatalog = []models.BasketPlan{
	{
		Id:           "pkg-5",
		Name:         "Starter 5",
		Capacity:     5,
		Price:        270,
		PerApp:       54,
		Savings:      20,
		Featured:     false,
		Description:  "For focused applications",
		PriceCaption: "one-time package",
	},
	{
		Id:           "pkg-10",
		Name:         "Growth 10",
		Capacity:     10,
		Price:        500,
		PerApp:       50,
		Savings:      80,
		Featured:     true,
		Description:  "Balanced value for most students",
		PriceCaption: "one-time package",
	},
	{
		Id:           "pkg-20",
		Name:         "Scale 20",
		Capacity:     20,
		Price:        920,
		PerApp:       46,
		Savings:      240,
		Featured:     false,
		Description:  "Maximum package capacity",
		PriceCaption: "one-time package",
	},
}

func ListBasketPlans() []models.BasketPlan {
	plans := make([]models.BasketPlan, len(basketPlanCatalog))
	copy(plans, basketPlanCatalog)
	return plans
}

func GetBasketState(ctx context.Context, userId string) (*models.BasketStateResponse, error) {
	conn, err := getBasketConn(ctx)
	if err != nil {
		return nil, err
	}

	state, err := loadBasketData(ctx, conn, userId)
	if err != nil {
		return nil, err
	}

	items, err := getUniversitiesByIds(ctx, conn, state.UniversityIds)
	if err != nil {
		return nil, err
	}

	recommendedPlanId := getRecommendedBasketPlanId(len(items))
	return &models.BasketStateResponse{
		Items:             items,
		SelectedPlanId:    state.SelectedPlanId,
		RecommendedPlanId: recommendedPlanId,
		TotalUniversities: len(items),
		MaxPlanCapacity:   maxBasketPlanCapacity,
	}, nil
}

func AddUniversityToBasket(ctx context.Context, userId, universityId string) error {
	conn, err := getBasketConn(ctx)
	if err != nil {
		return err
	}

	var exists bool
	if err := conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM universities WHERE id=$1 AND is_active = TRUE)", universityId).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check university existence: %s", err.Error())
	}
	if !exists {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	state, err := loadBasketData(ctx, conn, userId)
	if err != nil {
		return err
	}

	for _, existingId := range state.UniversityIds {
		if existingId == universityId {
			return nil
		}
	}

	state.UniversityIds = append(state.UniversityIds, universityId)
	return saveBasketData(ctx, conn, userId, state)
}

func RemoveUniversityFromBasket(ctx context.Context, userId, universityId string) error {
	conn, err := getBasketConn(ctx)
	if err != nil {
		return err
	}

	state, err := loadBasketData(ctx, conn, userId)
	if err != nil {
		return err
	}

	filtered := make([]string, 0, len(state.UniversityIds))
	for _, existingId := range state.UniversityIds {
		if existingId != universityId {
			filtered = append(filtered, existingId)
		}
	}

	state.UniversityIds = filtered
	return saveBasketData(ctx, conn, userId, state)
}

func ClearBasket(ctx context.Context, userId string) error {
	conn, err := getBasketConn(ctx)
	if err != nil {
		return err
	}

	empty := &basketData{
		UniversityIds:  []string{},
		SelectedPlanId: nil,
	}
	return saveBasketData(ctx, conn, userId, empty)
}

func SetBasketSelectedPlan(ctx context.Context, userId string, planId *string) error {
	conn, err := getBasketConn(ctx)
	if err != nil {
		return err
	}

	state, err := loadBasketData(ctx, conn, userId)
	if err != nil {
		return err
	}

	if planId == nil || strings.TrimSpace(*planId) == "" {
		state.SelectedPlanId = nil
		return saveBasketData(ctx, conn, userId, state)
	}

	normalizedPlanId := strings.TrimSpace(*planId)
	if _, found := getBasketPlanById(normalizedPlanId); !found {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "plan_id is invalid")
	}

	state.SelectedPlanId = &normalizedPlanId
	return saveBasketData(ctx, conn, userId, state)
}

func BuildBasketCheckoutPreview(ctx context.Context, userId string, req *models.BasketCheckoutPreviewRequest) (*models.BasketCheckoutPreviewResponse, error) {
	conn, err := getBasketConn(ctx)
	if err != nil {
		return nil, err
	}

	plan, found := getBasketPlanById(strings.TrimSpace(req.PlanId))
	if !found {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "plan_id is invalid")
	}

	state, err := loadBasketData(ctx, conn, userId)
	if err != nil {
		return nil, err
	}

	basketIds := make(map[string]struct{}, len(state.UniversityIds))
	for _, id := range state.UniversityIds {
		basketIds[id] = struct{}{}
	}

	selectedIds := req.UniversityIds
	if len(selectedIds) == 0 {
		selectedIds = state.UniversityIds
	}

	uniqueSelectedIds := make([]string, 0, len(selectedIds))
	seen := make(map[string]struct{}, len(selectedIds))
	for _, id := range selectedIds {
		if _, exists := seen[id]; exists {
			continue
		}
		if _, exists := basketIds[id]; !exists {
			return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "all selected university_ids must exist in basket")
		}
		seen[id] = struct{}{}
		uniqueSelectedIds = append(uniqueSelectedIds, id)
	}

	if len(uniqueSelectedIds) == 0 {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "at least one university_id is required")
	}
	if len(uniqueSelectedIds) > plan.Capacity {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, fmt.Sprintf("selected universities exceed plan capacity (%d)", plan.Capacity))
	}

	selectedUniversities, err := getUniversitiesByIds(ctx, conn, uniqueSelectedIds)
	if err != nil {
		return nil, err
	}

	if len(selectedUniversities) != len(uniqueSelectedIds) {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "one or more selected universities are unavailable")
	}

	warnings := make([]string, 0, 2)
	if len(state.UniversityIds) > len(uniqueSelectedIds) {
		warnings = append(warnings, fmt.Sprintf("Only %d of %d basket universities are included in this checkout.", len(uniqueSelectedIds), len(state.UniversityIds)))
	}
	if len(state.UniversityIds) > maxBasketPlanCapacity {
		warnings = append(warnings, "Basket has more universities than max package capacity. Split into multiple checkouts.")
	}

	return &models.BasketCheckoutPreviewResponse{
		Plan:               plan,
		Universities:       selectedUniversities,
		ApplicationCount:   len(uniqueSelectedIds),
		EstimatedTotal:     plan.Price,
		Status:             "pending_payment_api",
		ReadyForPaymentApi: false,
		Warnings:           warnings,
	}, nil
}

func getBasketConn(ctx context.Context) (*pgxpool.Pool, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}
	return conn, nil
}

func loadBasketData(ctx context.Context, conn *pgxpool.Pool, userId string) (*basketData, error) {
	var rawBasket []byte
	if err := conn.QueryRow(ctx, "SELECT data->'basket' FROM users WHERE id=$1", userId).Scan(&rawBasket); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
		}
		return nil, fmt.Errorf("failed to load basket data: %s", err.Error())
	}

	if rawBasket == nil {
		return &basketData{
			UniversityIds:  []string{},
			SelectedPlanId: nil,
		}, nil
	}

	var state basketData
	if err := json.Unmarshal(rawBasket, &state); err != nil {
		return &basketData{
			UniversityIds:  []string{},
			SelectedPlanId: nil,
		}, nil
	}

	state.UniversityIds = dedupeStrings(state.UniversityIds)
	if state.SelectedPlanId != nil {
		trimmed := strings.TrimSpace(*state.SelectedPlanId)
		if trimmed == "" {
			state.SelectedPlanId = nil
		} else {
			state.SelectedPlanId = &trimmed
		}
	}
	return &state, nil
}

func saveBasketData(ctx context.Context, conn *pgxpool.Pool, userId string, state *basketData) error {
	if state.UniversityIds == nil {
		state.UniversityIds = []string{}
	}
	state.UniversityIds = dedupeStrings(state.UniversityIds)
	now := time.Now().UTC().Format(time.RFC3339)
	state.UpdatedAt = &now

	payload, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to encode basket state: %s", err.Error())
	}

	tag, err := conn.Exec(ctx, `
		UPDATE users
		SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{basket}', $1::jsonb, true)
		WHERE id = $2
	`, payload, userId)
	if err != nil {
		return fmt.Errorf("failed to persist basket state: %s", err.Error())
	}
	if tag.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
	}

	return nil
}

func getUniversitiesByIds(ctx context.Context, conn *pgxpool.Pool, universityIds []string) ([]models.UniversityListItem, error) {
	if len(universityIds) == 0 {
		return []models.UniversityListItem{}, nil
	}

	rows, err := conn.Query(ctx, `
		SELECT
			id, name, description, province, city, country, application_fee,
			acceptance_rate, tuition_fee, application_deadline,
			ielts_min, toefl_min, scholarship_available, city_type, campus_vibe,
			NULL::text AS program_groups
		FROM universities
		WHERE id::text = ANY($1::text[]) AND is_active = TRUE
		ORDER BY array_position($1::text[], id::text)
	`, universityIds)
	if err != nil {
		return nil, fmt.Errorf("failed to query basket universities: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.UniversityListItem])
	if err != nil {
		return nil, fmt.Errorf("failed to scan basket universities: %s", err.Error())
	}
	return items, nil
}

func getBasketPlanById(planId string) (models.BasketPlan, bool) {
	for _, plan := range basketPlanCatalog {
		if plan.Id == planId {
			return plan, true
		}
	}
	return models.BasketPlan{}, false
}

func getRecommendedBasketPlanId(count int) *string {
	if count <= 0 {
		return nil
	}
	for _, plan := range basketPlanCatalog {
		if count <= plan.Capacity {
			planId := plan.Id
			return &planId
		}
	}
	return nil
}

func dedupeStrings(items []string) []string {
	if len(items) == 0 {
		return []string{}
	}
	unique := make([]string, 0, len(items))
	seen := make(map[string]struct{}, len(items))
	for _, item := range items {
		if item == "" {
			continue
		}
		if _, exists := seen[item]; exists {
			continue
		}
		seen[item] = struct{}{}
		unique = append(unique, item)
	}
	return unique
}
