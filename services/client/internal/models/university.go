// university.go defines data models for university-related operations.
package models

import (
	"encoding/json"
	"time"
)

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

type UniversityListItem struct {
	Id             string   `json:"id" db:"id"`
	Name           string   `json:"name" db:"name"`
	Province       *string  `json:"province,omitempty" db:"province"`
	Ranking        *int     `json:"ranking,omitempty" db:"ranking"`
	ApplicationFee *float64 `json:"application_fee,omitempty" db:"application_fee"`
}

type UniversitySearchParams struct {
	Query       string   `json:"query"`
	Province    *string  `json:"province,omitempty"`
	MinRanking  *int     `json:"min_ranking,omitempty"`
	MaxRanking  *int     `json:"max_ranking,omitempty"`
	MaxFee      *float64 `json:"max_fee,omitempty"`
	Page        int      `json:"page"`
	Limit       int      `json:"limit"`
}
