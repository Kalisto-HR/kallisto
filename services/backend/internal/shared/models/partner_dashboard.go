package models

import (
	"encoding/json"
	"time"
)

type PartnerDashboardRecentApplication struct {
	Id            string     `json:"id" db:"id"`
	Name          string     `json:"name" db:"name"`
	Program       string     `json:"program" db:"program"`
	Citizenship   string     `json:"citizenship" db:"citizenship"`
	Status        string     `json:"status" db:"status"`
	SubmittedAt   *time.Time `json:"submitted_at" db:"submitted_at"`
	AcceptancePct *float64   `json:"acceptance_pct,omitempty" db:"acceptance_pct"`
}

type PartnerDashboardNotification struct {
	Id      string `json:"id"`
	Type    string `json:"type"`
	Message string `json:"message"`
	Time    string `json:"time"`
	Read    bool   `json:"read"`
}

type PartnerDashboardResponse struct {
	NewApplications    int                                 `json:"new_applications"`
	TotalApplicants    int                                 `json:"total_applicants"`
	AvgSAT             int                                 `json:"avg_sat"`
	AvgIELTS           float64                             `json:"avg_ielts"`
	MaleCount          int                                 `json:"male_count"`
	FemaleCount        int                                 `json:"female_count"`
	RecentApplications []PartnerDashboardRecentApplication `json:"recent_applications"`
	Notifications      []PartnerDashboardNotification      `json:"notifications"`
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
