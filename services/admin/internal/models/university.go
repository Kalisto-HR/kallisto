// University models for the admin service (source of truth)
package models

import (
	"encoding/json"
	"time"
)

// University represents a university managed by the admin service
type University struct {
	Id                   string          `json:"id" db:"id"`
	ManagerId            *string         `json:"manager_id,omitempty" db:"manager_id"`
	Name                 string          `json:"name" db:"name"`
	Logo                 []byte          `json:"logo,omitempty" db:"logo"`
	Description          *string         `json:"description,omitempty" db:"description"`
	Province             *string         `json:"province,omitempty" db:"province"`
	City                 *string         `json:"city,omitempty" db:"city"`
	Country              *string         `json:"country,omitempty" db:"country"`
	AcceptanceRate       *float64        `json:"acceptance_rate,omitempty" db:"acceptance_rate"`
	TuitionFee           *float64        `json:"tuition_fee,omitempty" db:"tuition_fee"`
	ApplicationDeadline  *time.Time      `json:"application_deadline,omitempty" db:"application_deadline"`
	IeltsMin             *float64        `json:"ielts_min,omitempty" db:"ielts_min"`
	ToeflMin             *int            `json:"toefl_min,omitempty" db:"toefl_min"`
	ScholarshipAvailable *bool           `json:"scholarship_available,omitempty" db:"scholarship_available"`
	CityType             *string         `json:"city_type,omitempty" db:"city_type"`
	CampusVibe           *string         `json:"campus_vibe,omitempty" db:"campus_vibe"`
	ApplicationSchema    json.RawMessage `json:"application_schema,omitempty" db:"application_schema"`
	ManagementProfile    json.RawMessage `json:"management_profile,omitempty" db:"management_profile"`
	Ranking              *int            `json:"ranking,omitempty" db:"ranking"`
	CreatedAt            time.Time       `json:"created_at" db:"created_at"`
	Metadata             json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	ApplicationFee       *float64        `json:"application_fee,omitempty" db:"application_fee"`
}

// CreateUniversityRequest represents the request body for creating a university
type CreateUniversityRequest struct {
	Name                 string          `json:"name"`
	Description          *string         `json:"description,omitempty"`
	Province             *string         `json:"province,omitempty"`
	City                 *string         `json:"city,omitempty"`
	Country              *string         `json:"country,omitempty"`
	AcceptanceRate       *float64        `json:"acceptance_rate,omitempty"`
	TuitionFee           *float64        `json:"tuition_fee,omitempty"`
	ApplicationDeadline  *time.Time      `json:"application_deadline,omitempty"`
	IeltsMin             *float64        `json:"ielts_min,omitempty"`
	ToeflMin             *int            `json:"toefl_min,omitempty"`
	ScholarshipAvailable *bool           `json:"scholarship_available,omitempty"`
	CityType             *string         `json:"city_type,omitempty"`
	CampusVibe           *string         `json:"campus_vibe,omitempty"`
	ApplicationSchema    json.RawMessage `json:"application_schema,omitempty"`
	ManagementProfile    json.RawMessage `json:"management_profile,omitempty"`
	Ranking              *int            `json:"ranking,omitempty"`
	Metadata             json.RawMessage `json:"metadata,omitempty"`
	ApplicationFee       *float64        `json:"application_fee,omitempty"`
}

// UpdateUniversityRequest represents the request body for updating a university
type UpdateUniversityRequest struct {
	Name                 *string         `json:"name,omitempty"`
	Description          *string         `json:"description,omitempty"`
	Province             *string         `json:"province,omitempty"`
	City                 *string         `json:"city,omitempty"`
	Country              *string         `json:"country,omitempty"`
	AcceptanceRate       *float64        `json:"acceptance_rate,omitempty"`
	TuitionFee           *float64        `json:"tuition_fee,omitempty"`
	ApplicationDeadline  *time.Time      `json:"application_deadline,omitempty"`
	IeltsMin             *float64        `json:"ielts_min,omitempty"`
	ToeflMin             *int            `json:"toefl_min,omitempty"`
	ScholarshipAvailable *bool           `json:"scholarship_available,omitempty"`
	CityType             *string         `json:"city_type,omitempty"`
	CampusVibe           *string         `json:"campus_vibe,omitempty"`
	ApplicationSchema    json.RawMessage `json:"application_schema,omitempty"`
	ManagementProfile    json.RawMessage `json:"management_profile,omitempty"`
	Ranking              *int            `json:"ranking,omitempty"`
	Metadata             json.RawMessage `json:"metadata,omitempty"`
	ApplicationFee       *float64        `json:"application_fee,omitempty"`
}

type ImportUniversityRequest struct {
	Id                   *string         `json:"id,omitempty"`
	Name                 string          `json:"name"`
	Description          *string         `json:"description,omitempty"`
	Province             *string         `json:"province,omitempty"`
	City                 *string         `json:"city,omitempty"`
	Country              *string         `json:"country,omitempty"`
	AcceptanceRate       *float64        `json:"acceptance_rate,omitempty"`
	TuitionFee           *float64        `json:"tuition_fee,omitempty"`
	ApplicationDeadline  *time.Time      `json:"application_deadline,omitempty"`
	IeltsMin             *float64        `json:"ielts_min,omitempty"`
	ToeflMin             *int            `json:"toefl_min,omitempty"`
	ScholarshipAvailable *bool           `json:"scholarship_available,omitempty"`
	CityType             *string         `json:"city_type,omitempty"`
	CampusVibe           *string         `json:"campus_vibe,omitempty"`
	ApplicationSchema    json.RawMessage `json:"application_schema,omitempty"`
	ManagementProfile    json.RawMessage `json:"management_profile,omitempty"`
	Ranking              *int            `json:"ranking,omitempty"`
	Metadata             json.RawMessage `json:"metadata,omitempty"`
	ApplicationFee       *float64        `json:"application_fee,omitempty"`
}
