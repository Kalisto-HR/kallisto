package models

import (
	"encoding/json"
	"time"
)

const (
	BillingProductSingleApplication = "single_application"
	BillingProductApplicationPack5  = "application_pack_5"
	BillingProductApplicationPack10 = "application_pack_10"
	BillingProductPremiumMonthly    = "premium_monthly"
)

type BillingProduct struct {
	Id            string          `json:"id" db:"id"`
	ProductType   string          `json:"product_type" db:"product_type"`
	Name          string          `json:"name" db:"name"`
	Description   *string         `json:"description,omitempty" db:"description"`
	Credits       int             `json:"credits" db:"credits"`
	PriceAmount   int64           `json:"price_amount" db:"price_amount"`
	Currency      string          `json:"currency" db:"currency"`
	Interval      *string         `json:"interval,omitempty" db:"interval"`
	IntervalCount *int            `json:"interval_count,omitempty" db:"interval_count"`
	Active        bool            `json:"active" db:"active"`
	Metadata      json.RawMessage `json:"metadata" db:"metadata"`
}

type BillingOrder struct {
	Id              string          `json:"id" db:"id"`
	UserId          string          `json:"user_id" db:"user_id"`
	ProductId       string          `json:"product_id" db:"product_id"`
	OrderNumber     string          `json:"order_number" db:"order_number"`
	OrderType       string          `json:"order_type" db:"order_type"`
	Quantity        int             `json:"quantity" db:"quantity"`
	UnitPrice       int64           `json:"unit_price" db:"unit_price"`
	TotalAmount     int64           `json:"total_amount" db:"total_amount"`
	Currency        string          `json:"currency" db:"currency"`
	Status          string          `json:"status" db:"status"`
	PaymentProvider string          `json:"payment_provider" db:"payment_provider"`
	PaidAt          *time.Time      `json:"paid_at,omitempty" db:"paid_at"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
	Metadata        json.RawMessage `json:"metadata" db:"metadata"`
}

type CreditLedgerEntry struct {
	Id              string          `json:"id" db:"id"`
	UserId          string          `json:"user_id" db:"user_id"`
	TransactionType string          `json:"transaction_type" db:"transaction_type"`
	CreditChange    int             `json:"credit_change" db:"credit_change"`
	BalanceAfter    int             `json:"balance_after" db:"balance_after"`
	SourceType      string          `json:"source_type" db:"source_type"`
	SourceId        *string         `json:"source_id,omitempty" db:"source_id"`
	ApplicationId   *string         `json:"application_id,omitempty" db:"application_id"`
	Description     string          `json:"description" db:"description"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	Metadata        json.RawMessage `json:"metadata" db:"metadata"`
}

type Subscription struct {
	Id                 string          `json:"id" db:"id"`
	UserId             string          `json:"user_id" db:"user_id"`
	PlanId             string          `json:"plan_id" db:"plan_id"`
	Status             string          `json:"status" db:"status"`
	StartsAt           time.Time       `json:"starts_at" db:"starts_at"`
	CurrentPeriodStart time.Time       `json:"current_period_start" db:"current_period_start"`
	CurrentPeriodEnd   time.Time       `json:"current_period_end" db:"current_period_end"`
	CancelAtPeriodEnd  bool            `json:"cancel_at_period_end" db:"cancel_at_period_end"`
	CancelledAt        *time.Time      `json:"cancelled_at,omitempty" db:"cancelled_at"`
	PaymentProvider    string          `json:"payment_provider" db:"payment_provider"`
	CreatedAt          time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at" db:"updated_at"`
	Metadata           json.RawMessage `json:"metadata" db:"metadata"`
}

type BillingSummary struct {
	CreditBalance         int                 `json:"credit_balance"`
	CreditsPurchased      int                 `json:"credits_purchased"`
	CreditsUsed           int                 `json:"credits_used"`
	DraftApplications     int                 `json:"draft_applications"`
	SubmittedApplications int                 `json:"submitted_applications"`
	Products              []BillingProduct    `json:"products"`
	Orders                []BillingOrder      `json:"orders"`
	CreditHistory         []CreditLedgerEntry `json:"credit_history"`
	Subscription          *Subscription       `json:"subscription,omitempty"`
	HasActivePremium      bool                `json:"has_active_premium"`
}

type CreateBillingOrderRequest struct {
	ProductId string `json:"product_id"`
}
