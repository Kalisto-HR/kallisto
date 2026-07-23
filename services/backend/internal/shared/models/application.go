// Submitted application models for partner/staff submission access
package models

import (
	"encoding/json"
	"time"
)

// SubmittedApplication represents an application received from the client service
type SubmittedApplication struct {
	Id                  string                   `json:"id" db:"id"`
	UserId              string                   `json:"user_id" db:"user_id"`
	UniversityId        string                   `json:"university_id" db:"university_id"`
	ApplicationCycle    string                   `json:"application_cycle" db:"application_cycle"`
	ApplicantInfo       json.RawMessage          `json:"applicant_info" db:"applicant_info"`
	ApplicationData     json.RawMessage          `json:"application_data" db:"application_data"`
	SubmittedAt         *time.Time               `json:"submitted_at" db:"submitted_at"`
	ReceivedAt          time.Time                `json:"received_at" db:"received_at"`
	Status              string                   `json:"status" db:"status"`
	StatusProgress      int                      `json:"status_progress" db:"status_progress"`
	StatusStage         string                   `json:"status_stage" db:"status_stage"`
	IsFinal             bool                     `json:"is_final" db:"is_final"`
	IsSuccessfulOutcome bool                     `json:"is_successful_outcome" db:"is_successful_outcome"`
	History             []ApplicationStatusEvent `json:"history,omitempty" db:"-"`
	Tasks               []ApplicationTask        `json:"tasks,omitempty" db:"-"`
	Decision            *ApplicationDecision     `json:"decision,omitempty" db:"-"`
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

type ApplicationStatusTransitionRequest struct {
	Status                 string                   `json:"status"`
	PublicComment          *string                  `json:"public_comment,omitempty"`
	InternalNote           *string                  `json:"internal_note,omitempty"`
	InternalExplanation    *string                  `json:"internal_explanation,omitempty"`
	ConfirmFinalCorrection bool                     `json:"confirm_final_correction,omitempty"`
	Tasks                  []ApplicationTaskRequest `json:"tasks,omitempty"`
}

type ApplicationTaskRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	Category    *string `json:"category,omitempty"`
	Required    bool    `json:"required"`
	DueAt       *string `json:"due_at,omitempty"`
}

type ApplicationStatusEvent struct {
	Id               string    `json:"id" db:"id"`
	ApplicationId    string    `json:"application_id" db:"application_id"`
	FromStatus       string    `json:"from_status" db:"from_status"`
	ToStatus         string    `json:"to_status" db:"to_status"`
	PublicComment    *string   `json:"public_comment,omitempty" db:"public_comment"`
	InternalNote     *string   `json:"internal_note,omitempty" db:"internal_note"`
	ChangedBy        *string   `json:"changed_by,omitempty" db:"changed_by"`
	ChangedByRole    *string   `json:"changed_by_role,omitempty" db:"changed_by_role"`
	ChangedAt        time.Time `json:"changed_at" db:"changed_at"`
	NotificationMade bool      `json:"notification_created" db:"notification_created"`
}

type ApplicationTask struct {
	Id                 string     `json:"id" db:"id"`
	ApplicationId      string     `json:"application_id" db:"application_id"`
	Title              string     `json:"title" db:"title"`
	Description        *string    `json:"description,omitempty" db:"description"`
	Category           string     `json:"category" db:"category"`
	Status             string     `json:"status" db:"status"`
	AssignedRole       string     `json:"assigned_role" db:"assigned_role"`
	Required           bool       `json:"required" db:"required"`
	DueAt              *time.Time `json:"due_at,omitempty" db:"due_at"`
	CompletedAt        *time.Time `json:"completed_at,omitempty" db:"completed_at"`
	VerifiedAt         *time.Time `json:"verified_at,omitempty" db:"verified_at"`
	CreatedBy          *string    `json:"created_by,omitempty" db:"created_by"`
	RelatedDocumentId  *string    `json:"related_document_id,omitempty" db:"related_document_id"`
	StudentResponse    *string    `json:"student_response,omitempty" db:"student_response"`
	UniversityFeedback *string    `json:"university_feedback,omitempty" db:"university_feedback"`
	SortOrder          int        `json:"sort_order" db:"sort_order"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" db:"updated_at"`
}

type ApplicationDecision struct {
	ApplicationId        string     `json:"application_id" db:"application_id"`
	DecisionStatus       string     `json:"decision_status" db:"decision_status"`
	DecisionDate         time.Time  `json:"decision_date" db:"decision_date"`
	PublicMessage        string     `json:"public_message" db:"public_message"`
	InternalReason       *string    `json:"internal_reason,omitempty" db:"internal_reason"`
	StudentVisibleReason *string    `json:"student_visible_reason,omitempty" db:"student_visible_reason"`
	ResponseDeadline     *time.Time `json:"response_deadline,omitempty" db:"response_deadline"`
	WaitlistPosition     *int       `json:"waitlist_position,omitempty" db:"waitlist_position"`
	DecisionDocumentId   *string    `json:"decision_document_id,omitempty" db:"decision_document_id"`
	IssuedBy             *string    `json:"issued_by,omitempty" db:"issued_by"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
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
