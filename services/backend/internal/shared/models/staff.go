package models

import (
	"encoding/json"
	"time"
)

type GlobalOverviewStats struct {
	TotalStudents            int     `json:"total_students"`
	NewStudentsLast7Days     int     `json:"new_students_last_7_days"`
	TotalUniversities        int     `json:"total_universities"`
	ActivePrograms           int     `json:"active_programs"`
	ApplicationsStarted      int     `json:"applications_started"`
	ApplicationsSubmitted    int     `json:"applications_submitted"`
	ApplicationsUnderReview  int     `json:"applications_under_review"`
	AcceptedApplications     int     `json:"accepted_applications"`
	RejectedApplications     int     `json:"rejected_applications"`
	PendingDocumentReviews   int     `json:"pending_document_reviews"`
	CompletedStudentPayments int     `json:"completed_student_payments"`
	TotalPlatformRevenue     float64 `json:"total_platform_revenue"`
	PortalAccounts           int     `json:"portal_accounts"`
	TotalApplications        int     `json:"total_applications"`
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

type GlobalOverviewFunnelStep struct {
	Stage string `json:"stage" db:"stage"`
	Count int    `json:"count" db:"count"`
}

type GlobalOverviewSeriesPoint struct {
	Label string `json:"label" db:"label"`
	Count int    `json:"count" db:"count"`
}

type GlobalOverviewStatusPoint struct {
	Status string `json:"status" db:"status"`
	Count  int    `json:"count" db:"count"`
}

type GlobalOverviewResponse struct {
	Stats                 GlobalOverviewStats          `json:"stats"`
	ApplicationFunnel     []GlobalOverviewFunnelStep   `json:"application_funnel"`
	RegistrationsByDate   []GlobalOverviewSeriesPoint  `json:"registrations_by_date"`
	ApplicationsByStatus  []GlobalOverviewStatusPoint  `json:"applications_by_status"`
	PopularUniversities   []GlobalOverviewSeriesPoint  `json:"popular_universities"`
	PopularPrograms       []GlobalOverviewSeriesPoint  `json:"popular_programs"`
	StudentsByRegion      []GlobalOverviewSeriesPoint  `json:"students_by_region"`
	ApplicationConversion []GlobalOverviewSeriesPoint  `json:"application_conversion"`
	RecentActivity        []GlobalOverviewActivity     `json:"recent_activity"`
	SystemHealth          []GlobalOverviewHealthMetric `json:"system_health"`
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

type GlobalStudentListItem struct {
	StudentId                  string     `json:"student_id" db:"student_id"`
	FullName                   string     `json:"full_name" db:"full_name"`
	Email                      string     `json:"email" db:"email"`
	PhoneNumber                *string    `json:"phone_number,omitempty" db:"phone_number"`
	RegionCode                 *string    `json:"region_code,omitempty" db:"region_code"`
	InterfaceLanguage          string     `json:"interface_language" db:"interface_language"`
	ProfileCompletionPercent   int        `json:"profile_completion_percent" db:"profile_completion_percent"`
	ApplicationsCount          int        `json:"applications_count" db:"applications_count"`
	SubmittedApplicationsCount int        `json:"submitted_applications_count" db:"submitted_applications_count"`
	PaymentStatus              string     `json:"payment_status" db:"payment_status"`
	AccountStatus              string     `json:"account_status" db:"account_status"`
	RegistrationDate           time.Time  `json:"registration_date" db:"registration_date"`
	LastActivity               *time.Time `json:"last_activity,omitempty" db:"last_activity"`
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
	Method       string          `json:"method" db:"method"`
	StatusCode   int             `json:"status_code" db:"status_code"`
	DurationMs   int64           `json:"duration_ms" db:"duration_ms"`
	Role         *string         `json:"role,omitempty" db:"role"`
	IpAddress    *string         `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent    *string         `json:"user_agent,omitempty" db:"user_agent"`
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
	RequestId         *string         `json:"request_id,omitempty" db:"request_id"`
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
	Method       string
	StatusCode   int
	DurationMs   int64
	Role         *string
	IpAddress    *string
	UserAgent    string
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
	RequestId         *string
	Metadata          json.RawMessage
}
