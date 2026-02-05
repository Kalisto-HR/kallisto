// University models for the admin service (source of truth)
package models

import (
	"encoding/json"
	"time"
)

// University represents a university managed by the admin service
type University struct {
	Id                string          `json:"id" db:"id"`
	ManagerId         *string         `json:"manager_id,omitempty" db:"manager_id"`
	Name              string          `json:"name" db:"name"`
	Logo              []byte          `json:"logo,omitempty" db:"logo"`
	Description       *string         `json:"description,omitempty" db:"description"`
	Province          *string         `json:"province,omitempty" db:"province"`
	ApplicationSchema json.RawMessage `json:"application_schema,omitempty" db:"application_schema"`
	Ranking           *int            `json:"ranking,omitempty" db:"ranking"`
	CreatedAt         time.Time       `json:"created_at" db:"created_at"`
	Metadata          json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	ApplicationFee    *float64        `json:"application_fee,omitempty" db:"application_fee"`
}

// CreateUniversityRequest represents the request body for creating a university
type CreateUniversityRequest struct {
	Name              string          `json:"name"`
	Description       *string         `json:"description,omitempty"`
	Province          *string         `json:"province,omitempty"`
	ApplicationSchema json.RawMessage `json:"application_schema,omitempty"`
	Ranking           *int            `json:"ranking,omitempty"`
	Metadata          json.RawMessage `json:"metadata,omitempty"`
	ApplicationFee    *float64        `json:"application_fee,omitempty"`
}

// UpdateUniversityRequest represents the request body for updating a university
type UpdateUniversityRequest struct {
	Name              *string         `json:"name,omitempty"`
	Description       *string         `json:"description,omitempty"`
	Province          *string         `json:"province,omitempty"`
	ApplicationSchema json.RawMessage `json:"application_schema,omitempty"`
	Ranking           *int            `json:"ranking,omitempty"`
	Metadata          json.RawMessage `json:"metadata,omitempty"`
	ApplicationFee    *float64        `json:"application_fee,omitempty"`
}
