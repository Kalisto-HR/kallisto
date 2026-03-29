// Submitted application models for partner/staff submission access
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
}

type SubmittedApplicationsQuery struct {
	UniversityId *string
	Status       *string
	Search       *string
	Program      *string
	Citizenship  *string
	Intake       *string
	SortBy       string
	SortOrder    string
	Page         int
	Limit        int
}

type SubmittedApplicationFile struct {
	Id               string    `json:"id" db:"id"`
	ApplicationId    string    `json:"application_id" db:"application_id"`
	UserId           string    `json:"user_id" db:"user_id"`
	UniversityId     string    `json:"university_id" db:"university_id"`
	ApplicationCycle string    `json:"application_cycle" db:"application_cycle"`
	FieldKey         *string   `json:"field_key,omitempty" db:"field_key"`
	FileName         string    `json:"file_name" db:"file_name"`
	ContentType      string    `json:"content_type" db:"content_type"`
	FileSize         int64     `json:"file_size" db:"file_size"`
	FileData         []byte    `json:"-" db:"file_data"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

type SubmittedApplicationFileMeta struct {
	Id            string    `json:"id" db:"id"`
	ApplicationId string    `json:"application_id" db:"application_id"`
	FieldKey      *string   `json:"field_key,omitempty" db:"field_key"`
	FileName      string    `json:"file_name" db:"file_name"`
	ContentType   string    `json:"content_type" db:"content_type"`
	FileSize      int64     `json:"file_size" db:"file_size"`
	DownloadURL   string    `json:"download_url"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}
