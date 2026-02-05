// Submitted application models for application review workflow
package models

import (
	"encoding/json"
	"time"
)

// SubmittedApplication represents an application received from the client service
type SubmittedApplication struct {
	Id               string          `json:"id" db:"id"`
	UserId           string          `json:"user_id" db:"user_id"`
	UniversityId     string          `json:"university_id" db:"university_id"`
	ApplicationCycle string          `json:"application_cycle" db:"application_cycle"`
	ApplicantInfo    json.RawMessage `json:"applicant_info" db:"applicant_info"`
	ApplicationData  json.RawMessage `json:"application_data" db:"application_data"`
	SubmittedAt      *time.Time      `json:"submitted_at" db:"submitted_at"`
	ReceivedAt       time.Time       `json:"received_at" db:"received_at"`
	Status           string          `json:"status" db:"status"`
	ReviewedBy       *string         `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewedAt       *time.Time      `json:"reviewed_at,omitempty" db:"reviewed_at"`
	Notes            *string         `json:"notes,omitempty" db:"notes"`
}

// ApplicationReviewRequest represents the request body for reviewing an application
type ApplicationReviewRequest struct {
	Status string  `json:"status"`
	Notes  *string `json:"notes,omitempty"`
}

// ReceiveApplicationRequest represents the request body from client service when submitting an application
type ReceiveApplicationRequest struct {
	UserId           string          `json:"user_id"`
	UniversityId     string          `json:"university_id"`
	ApplicationCycle string          `json:"application_cycle"`
	ApplicantInfo    json.RawMessage `json:"applicant_info"`
	ApplicationData  json.RawMessage `json:"application_data"`
	SubmittedAt      string          `json:"submitted_at"`
}
