// university.go defines data models for university-related operations.
package models

import (
	"encoding/json"
	"time"
)

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
	LivingCost           *float64        `json:"living_cost,omitempty" db:"living_cost"`
	TotalCost            *float64        `json:"total_cost,omitempty" db:"total_cost"`
	ApplicationDeadline  *time.Time      `json:"application_deadline,omitempty" db:"application_deadline"`
	IeltsMin             *float64        `json:"ielts_min,omitempty" db:"ielts_min"`
	ToeflMin             *int            `json:"toefl_min,omitempty" db:"toefl_min"`
	ScholarshipAvailable *bool           `json:"scholarship_available,omitempty" db:"scholarship_available"`
	Competitiveness      *string         `json:"competitiveness,omitempty" db:"competitiveness"`
	CityType             *string         `json:"city_type,omitempty" db:"city_type"`
	SafetyLevel          *string         `json:"safety_level,omitempty" db:"safety_level"`
	CampusVibe           *string         `json:"campus_vibe,omitempty" db:"campus_vibe"`
	VisaRequired         *bool           `json:"visa_required,omitempty" db:"visa_required"`
	ApplicationSchema    json.RawMessage `json:"application_schema,omitempty" db:"application_schema"`
	Ranking              *int            `json:"ranking,omitempty" db:"ranking"`
	CreatedAt            time.Time       `json:"created_at" db:"created_at"`
	Metadata             json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	ApplicationFee       *float64        `json:"application_fee,omitempty" db:"application_fee"`
}

type UniversityListItem struct {
	Id                   string     `json:"id" db:"id"`
	Name                 string     `json:"name" db:"name"`
	Province             *string    `json:"province,omitempty" db:"province"`
	City                 *string    `json:"city,omitempty" db:"city"`
	Country              *string    `json:"country,omitempty" db:"country"`
	Ranking              *int       `json:"ranking,omitempty" db:"ranking"`
	ApplicationFee       *float64   `json:"application_fee,omitempty" db:"application_fee"`
	AcceptanceRate       *float64   `json:"acceptance_rate,omitempty" db:"acceptance_rate"`
	TuitionFee           *float64   `json:"tuition_fee,omitempty" db:"tuition_fee"`
	LivingCost           *float64   `json:"living_cost,omitempty" db:"living_cost"`
	TotalCost            *float64   `json:"total_cost,omitempty" db:"total_cost"`
	ApplicationDeadline  *time.Time `json:"application_deadline,omitempty" db:"application_deadline"`
	IeltsMin             *float64   `json:"ielts_min,omitempty" db:"ielts_min"`
	ToeflMin             *int       `json:"toefl_min,omitempty" db:"toefl_min"`
	ScholarshipAvailable *bool      `json:"scholarship_available,omitempty" db:"scholarship_available"`
	Competitiveness      *string    `json:"competitiveness,omitempty" db:"competitiveness"`
	CityType             *string    `json:"city_type,omitempty" db:"city_type"`
	SafetyLevel          *string    `json:"safety_level,omitempty" db:"safety_level"`
	CampusVibe           *string    `json:"campus_vibe,omitempty" db:"campus_vibe"`
	VisaRequired         *bool      `json:"visa_required,omitempty" db:"visa_required"`
}

type UniversitySearchParams struct {
	Query                string   `json:"query"`
	Province             *string  `json:"province,omitempty"`
	City                 *string  `json:"city,omitempty"`
	Country              *string  `json:"country,omitempty"`
	MinRanking           *int     `json:"min_ranking,omitempty"`
	MaxRanking           *int     `json:"max_ranking,omitempty"`
	MaxFee               *float64 `json:"max_fee,omitempty"`
	MaxTuition           *float64 `json:"max_tuition,omitempty"`
	MaxLivingCost        *float64 `json:"max_living_cost,omitempty"`
	MaxTotalCost         *float64 `json:"max_total_cost,omitempty"`
	MinAcceptanceRate    *float64 `json:"min_acceptance_rate,omitempty"`
	MaxAcceptanceRate    *float64 `json:"max_acceptance_rate,omitempty"`
	MinIelts             *float64 `json:"min_ielts,omitempty"`
	MinToefl             *int     `json:"min_toefl,omitempty"`
	ScholarshipAvailable *bool    `json:"scholarship_available,omitempty"`
	Competitiveness      *string  `json:"competitiveness,omitempty"`
	CityType             *string  `json:"city_type,omitempty"`
	SafetyLevel          *string  `json:"safety_level,omitempty"`
	CampusVibe           *string  `json:"campus_vibe,omitempty"`
	VisaRequired         *bool    `json:"visa_required,omitempty"`
	Page                 int      `json:"page"`
	Limit                int      `json:"limit"`
}
