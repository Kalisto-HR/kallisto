package models

import (
	"encoding/json"
	"time"
)

type GlobalOverviewStats struct {
	TotalUniversities  int `json:"total_universities"`
	ManagementAccounts int `json:"management_accounts"`
	TotalApplications  int `json:"total_applications"`
	PendingDrafts      int `json:"pending_drafts"`
}

type GlobalOverviewActivity struct {
	Id          string `json:"id" db:"id"`
	Type        string `json:"type"`
	Description string `json:"description"`
	User        string `json:"user"`
	Timestamp   string `json:"timestamp"`
	Status      string `json:"status"`
}

type GlobalOverviewPendingDraft struct {
	Id        string `json:"id"`
	Type      string `json:"type"`
	Target    string `json:"target"`
	Requester string `json:"requester"`
	CreatedAt string `json:"created_at"`
	Priority  string `json:"priority"`
}

type GlobalOverviewHealthMetric struct {
	Label  string `json:"label"`
	Value  string `json:"value"`
	Status string `json:"status"`
}

type GlobalOverviewResponse struct {
	Stats          GlobalOverviewStats          `json:"stats"`
	RecentActivity []GlobalOverviewActivity     `json:"recent_activity"`
	PendingDrafts  []GlobalOverviewPendingDraft `json:"pending_drafts"`
	SystemHealth   []GlobalOverviewHealthMetric `json:"system_health"`
}

type GlobalUniversityListItem struct {
	Id             string `json:"id" db:"id"`
	Name           string `json:"name" db:"name"`
	NameEn         string `json:"name_en" db:"name_en"`
	Type           string `json:"type" db:"type"`
	Location       string `json:"location" db:"location"`
	Status         string `json:"status" db:"status"`
	Admins         int    `json:"admins" db:"admins"`
	Applications   int    `json:"applications" db:"applications"`
	AcceptanceRate string `json:"acceptance_rate" db:"acceptance_rate"`
	JoinedDate     string `json:"joined_date" db:"joined_date"`
	LastActive     string `json:"last_active" db:"last_active"`
}

type GlobalDraftListItem struct {
	Id             string              `json:"id"`
	Type           string              `json:"type"`
	Status         string              `json:"status"`
	Title          string              `json:"title"`
	Description    string              `json:"description"`
	Requester      string              `json:"requester"`
	RequesterEmail string              `json:"requester_email"`
	TargetEntity   string              `json:"target_entity"`
	TargetId       string              `json:"target_id"`
	CreatedAt      string              `json:"created_at"`
	ReviewedAt     *string             `json:"reviewed_at,omitempty"`
	ExecutedAt     *string             `json:"executed_at,omitempty"`
	ReviewedBy     *string             `json:"reviewed_by,omitempty"`
	Priority       string              `json:"priority"`
	Changes        []GlobalDraftChange `json:"changes"`
	Comments       int                 `json:"comments"`
}

type GlobalDraftChange struct {
	Field  string `json:"field"`
	Before string `json:"before"`
	After  string `json:"after"`
}

type DraftDecisionRequest struct {
	Notes  string `json:"notes"`
	Reason string `json:"reason"`
}

type GlobalServiceLogItem struct {
	Id           string          `json:"id" db:"id"`
	Timestamp    time.Time       `json:"timestamp" db:"logged_at"`
	Level        string          `json:"level" db:"level"`
	Microservice string          `json:"microservice" db:"microservice"`
	Handler      string          `json:"handler" db:"handler"`
	Message      string          `json:"message" db:"message"`
	UserId       *string         `json:"user_id,omitempty" db:"user_id"`
	RequestId    *string         `json:"request_id,omitempty" db:"request_id"`
	Metadata     json.RawMessage `json:"metadata,omitempty" db:"metadata"`
}

type GlobalAuditLogItem struct {
	Id                string          `json:"id" db:"id"`
	Timestamp         time.Time       `json:"timestamp" db:"occurred_at"`
	Actor             string          `json:"actor" db:"actor_name"`
	ActorId           *string         `json:"actor_id,omitempty" db:"actor_id"`
	ActorType         string          `json:"actor_type" db:"actor_type"`
	Action            string          `json:"action" db:"action_type"`
	ActionDescription string          `json:"action_description" db:"action_description"`
	TargetEntity      string          `json:"target_entity" db:"target_entity"`
	TargetId          *string         `json:"target_id,omitempty" db:"target_id"`
	Outcome           string          `json:"outcome" db:"outcome"`
	IpAddress         *string         `json:"ip_address,omitempty" db:"ip_address"`
	Metadata          json.RawMessage `json:"metadata,omitempty" db:"metadata"`
}

type GlobalSettingsItem struct {
	SettingKey   string          `json:"setting_key" db:"setting_key"`
	SettingValue json.RawMessage `json:"setting_value" db:"setting_value"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
	UpdatedBy    *string         `json:"updated_by,omitempty" db:"updated_by"`
}

type GlobalUserListItem struct {
	UserId    string          `json:"user_id" db:"user_id"`
	Name      string          `json:"name" db:"display_name"`
	Email     *string         `json:"email,omitempty" db:"email"`
	Phone     *string         `json:"phone,omitempty" db:"phone"`
	Status    string          `json:"status" db:"status"`
	UpdatedAt time.Time       `json:"updated_at" db:"updated_at"`
	BanReason *string         `json:"ban_reason,omitempty" db:"ban_reason"`
	BanUntil  *time.Time      `json:"ban_until,omitempty" db:"ban_until"`
	Metadata  json.RawMessage `json:"metadata,omitempty" db:"metadata"`
}

type CreateUserBanDraftRequest struct {
	Reason   string `json:"reason"`
	Duration string `json:"duration"`
}

type UpsertGlobalSettingsRequest struct {
	Settings map[string]json.RawMessage `json:"settings"`
}

type GlobalLogWrite struct {
	Level        string
	Microservice string
	Handler      string
	Message      string
	UserId       *string
	RequestId    *string
	Metadata     json.RawMessage
}

type GlobalAuditWrite struct {
	ActorName         string
	ActorId           *string
	ActorType         string
	ActionType        string
	ActionDescription string
	TargetEntity      string
	TargetId          *string
	Outcome           string
	IpAddress         *string
	Metadata          json.RawMessage
}
