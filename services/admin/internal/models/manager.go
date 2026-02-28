package models

import (
	"encoding/json"
	"time"
)

type ManagerDashboardRecentApplication struct {
	Id            string     `json:"id" db:"id"`
	Name          string     `json:"name" db:"name"`
	Program       string     `json:"program" db:"program"`
	Citizenship   string     `json:"citizenship" db:"citizenship"`
	Status        string     `json:"status" db:"status"`
	SubmittedAt   *time.Time `json:"submitted_at" db:"submitted_at"`
	AcceptancePct *float64   `json:"acceptance_pct,omitempty" db:"acceptance_pct"`
}

type ManagerDashboardNotification struct {
	Id      string `json:"id"`
	Type    string `json:"type"`
	Message string `json:"message"`
	Time    string `json:"time"`
	Read    bool   `json:"read"`
}

type ManagerDashboardResponse struct {
	NewApplications    int                                 `json:"new_applications"`
	TotalApplicants    int                                 `json:"total_applicants"`
	AvgSAT             int                                 `json:"avg_sat"`
	AvgIELTS           float64                             `json:"avg_ielts"`
	MaleCount          int                                 `json:"male_count"`
	FemaleCount        int                                 `json:"female_count"`
	RecentApplications []ManagerDashboardRecentApplication `json:"recent_applications"`
	Notifications      []ManagerDashboardNotification      `json:"notifications"`
}

type UniversityStaffListItem struct {
	Id           string     `json:"id" db:"id"`
	Email        string     `json:"email" db:"email"`
	FirstName    string     `json:"first_name" db:"first_name"`
	LastName     string     `json:"last_name" db:"last_name"`
	StaffRole    string     `json:"staff_role" db:"staff_role"`
	Status       string     `json:"status" db:"status"`
	LastActiveAt *time.Time `json:"last_active_at,omitempty" db:"last_active_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
}

type UniversityStaffCreateRequest struct {
	Email     string  `json:"email"`
	Password  string  `json:"password"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	StaffRole *string `json:"staff_role,omitempty"`
	Status    *string `json:"status,omitempty"`
}

type UniversityStaffUpdateRequest struct {
	Email     *string `json:"email,omitempty"`
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
	StaffRole *string `json:"staff_role,omitempty"`
}

type UniversityStaffStatusUpdateRequest struct {
	Status string  `json:"status"`
	Reason *string `json:"reason,omitempty"`
}

type UniversityStaffInvitation struct {
	Id        string     `json:"id" db:"id"`
	Email     string     `json:"email" db:"email"`
	StaffRole string     `json:"staff_role" db:"staff_role"`
	Status    string     `json:"status" db:"status"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt time.Time  `json:"expires_at" db:"expires_at"`
	Accepted  *time.Time `json:"accepted_at,omitempty" db:"accepted_at"`
}

type UniversityStaffRole struct {
	Id          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	UserCount   int      `json:"user_count"`
	Permissions []string `json:"permissions"`
}

type ApplicationStructureVersion struct {
	Id         string          `json:"id" db:"id"`
	University string          `json:"university_id" db:"university_id"`
	VersionNo  int             `json:"version_no" db:"version_no"`
	Schema     json.RawMessage `json:"schema" db:"schema"`
	Published  bool            `json:"published" db:"published"`
	ChangedBy  *string         `json:"changed_by,omitempty" db:"changed_by"`
	ChangeNote *string         `json:"change_note,omitempty" db:"change_note"`
	CreatedAt  time.Time       `json:"created_at" db:"created_at"`
}

type PublishApplicationStructureRequest struct {
	ChangeNote *string `json:"change_note,omitempty"`
}
