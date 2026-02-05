// application.go defines data models for application-related operations.
package models

import (
	"encoding/json"
	"time"
)

const (
	StatusDraft     = "draft"
	StatusSubmitted = "submitted"
	StatusAccepted  = "accepted"
	StatusRejected  = "rejected"
)

type Application struct {
	UserId           string          `json:"user_id" db:"user_id"`
	UniversityId     string          `json:"university_id" db:"university_id"`
	ApplicationCycle string          `json:"application_cycle" db:"application_cycle"`
	Status           string          `json:"status" db:"status"`
	Data             json.RawMessage `json:"data,omitempty" db:"data"`
	SubmittedAt      *time.Time      `json:"submitted_at,omitempty" db:"submitted_at"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
}

type ApplicationListItem struct {
	UniversityId     string     `json:"university_id" db:"university_id"`
	UniversityName   string     `json:"university_name" db:"university_name"`
	ApplicationCycle string     `json:"application_cycle" db:"application_cycle"`
	Status           string     `json:"status" db:"status"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	SubmittedAt      *time.Time `json:"submitted_at,omitempty" db:"submitted_at"`
}

type ApplicationCreateRequest struct {
	UniversityId     string          `json:"university_id"`
	ApplicationCycle string          `json:"application_cycle"`
	Data             json.RawMessage `json:"data,omitempty"`
}

type ApplicationUpdateRequest struct {
	Data   json.RawMessage `json:"data,omitempty"`
	Status *string         `json:"status,omitempty"`
}
