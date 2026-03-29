package models

type BasketPlan struct {
	Id           string  `json:"id"`
	Name         string  `json:"name"`
	Capacity     int     `json:"capacity"`
	Price        float64 `json:"price"`
	PerApp       float64 `json:"per_app"`
	Savings      float64 `json:"savings"`
	Featured     bool    `json:"featured"`
	Description  string  `json:"description"`
	PriceCaption string  `json:"price_caption"`
}

type BasketStateResponse struct {
	Items             []UniversityListItem `json:"items"`
	SelectedPlanId    *string              `json:"selected_plan_id,omitempty"`
	RecommendedPlanId *string              `json:"recommended_plan_id,omitempty"`
	TotalUniversities int                  `json:"total_universities"`
	MaxPlanCapacity   int                  `json:"max_plan_capacity"`
}

type BasketPlanUpdateRequest struct {
	PlanId *string `json:"plan_id"`
}

type BasketCheckoutPreviewRequest struct {
	PlanId        string   `json:"plan_id"`
	UniversityIds []string `json:"university_ids"`
}

type BasketCheckoutPreviewResponse struct {
	Plan               BasketPlan           `json:"plan"`
	Universities       []UniversityListItem `json:"universities"`
	ApplicationCount   int                  `json:"application_count"`
	EstimatedTotal     float64              `json:"estimated_total"`
	Status             string               `json:"status"`
	ReadyForPaymentApi bool                 `json:"ready_for_payment_api"`
	Warnings           []string             `json:"warnings,omitempty"`
}
