// application.go defines data models for application-related operations.
package models

import (
	"encoding/json"
	"kallisto/services/backend/internal/shared/applicationstatus"
	"time"
)

const (
	StatusDraft                         = applicationstatus.StatusDraft
	StatusSubmitted                     = applicationstatus.StatusSubmitted
	StatusUnderReview                   = applicationstatus.StatusUnderReview
	StatusAdditionalInformationRequired = applicationstatus.StatusAdditionalInformationRequired
	StatusDecisionPending               = applicationstatus.StatusDecisionPending
	StatusAccepted                      = applicationstatus.StatusAccepted
	StatusWaitlisted                    = applicationstatus.StatusWaitlisted
	StatusRejected                      = applicationstatus.StatusRejected
)

type Application struct {
	UserId              string          `json:"user_id" db:"user_id"`
	UniversityId        string          `json:"university_id" db:"university_id"`
	ApplicationCycle    string          `json:"application_cycle" db:"application_cycle"`
	Status              string          `json:"status" db:"status"`
	Data                json.RawMessage `json:"data,omitempty" db:"data"`
	SubmittedAt         *time.Time      `json:"submitted_at,omitempty" db:"submitted_at"`
	CreatedAt           time.Time       `json:"created_at" db:"created_at"`
	StatusProgress      int             `json:"status_progress" db:"status_progress"`
	StatusStage         string          `json:"status_stage" db:"status_stage"`
	IsFinal             bool            `json:"is_final" db:"is_final"`
	IsSuccessfulOutcome bool            `json:"is_successful_outcome" db:"is_successful_outcome"`
}

type ApplicationListItem struct {
	UniversityId        string     `json:"university_id" db:"university_id"`
	UniversityName      string     `json:"university_name" db:"university_name"`
	ApplicationCycle    string     `json:"application_cycle" db:"application_cycle"`
	Status              string     `json:"status" db:"status"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	SubmittedAt         *time.Time `json:"submitted_at,omitempty" db:"submitted_at"`
	StatusProgress      int        `json:"status_progress" db:"status_progress"`
	StatusStage         string     `json:"status_stage" db:"status_stage"`
	IsFinal             bool       `json:"is_final" db:"is_final"`
	IsSuccessfulOutcome bool       `json:"is_successful_outcome" db:"is_successful_outcome"`
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

type ApplicationImportTestScoresRequest struct {
	TestScoreIDs []string `json:"test_score_ids,omitempty"`
}

type ImportedTestScore struct {
	Id            string   `json:"id"`
	TestType      string   `json:"test_type"`
	OtherTestName *string  `json:"other_test_name,omitempty"`
	Score         float64  `json:"score"`
	OutOf         float64  `json:"out_of"`
	TakenOn       *string  `json:"taken_on,omitempty"`
	Normalized    *float64 `json:"normalized,omitempty"`
}

type ApplicationImportTestScoresResponse struct {
	ImportedCount int                 `json:"imported_count"`
	TestScores    []ImportedTestScore `json:"test_scores"`
}

type ApplicationFileUpload struct {
	FileName    string `json:"file_name" db:"file_name"`
	ContentType string `json:"content_type" db:"content_type"`
	FileSize    int64  `json:"file_size" db:"file_size"`
	FileData    []byte `json:"-"`
}

type ApplicationFile struct {
	Id               string    `json:"id" db:"id"`
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

type ApplicationFileResponse struct {
	Id          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Size        int64  `json:"size"`
	Storage     string `json:"storage"`
	DownloadURL string `json:"download_url"`
}

type ApplicationFileAsset struct {
	Id          string `json:"id"`
	FieldKey    string `json:"field_key,omitempty"`
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
	FileSize    int64  `json:"file_size"`
	ContentB64  string `json:"content_b64"`
}
