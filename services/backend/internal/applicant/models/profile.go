// profile.go defines models for user profile operations.
package models

import (
	"encoding/json"
	"time"
)

type TestScoreType string

const (
	TestScoreTypeIELTS TestScoreType = "IELTS"
	TestScoreTypeSAT   TestScoreType = "SAT"
	TestScoreTypeTOEFL TestScoreType = "TOEFL"
	TestScoreTypeACT   TestScoreType = "ACT"
	TestScoreTypeOther TestScoreType = "OTHER"
)

type ProfileResponse struct {
	Id        string          `json:"id" db:"id"`
	Email     string          `json:"email" db:"email"`
	FirstName string          `json:"first_name" db:"first_name"`
	LastName  string          `json:"last_name" db:"last_name"`
	Data      json.RawMessage `json:"data" db:"data"`
	Photo     []byte          `json:"photo,omitempty" db:"photo"`
	LastSeen  *time.Time      `json:"last_seen,omitempty" db:"last_seen"`
}

type ProfileUpdateRequest struct {
	FirstName *string         `json:"first_name,omitempty"`
	LastName  *string         `json:"last_name,omitempty"`
	Data      json.RawMessage `json:"data,omitempty"`
}

type ProfilePasswordUpdateRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type MeResponse struct {
	Id        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Role      string `json:"role"`
}

type ProfileTestScore struct {
	Id            string        `json:"id" db:"id"`
	UserId        string        `json:"user_id" db:"user_id"`
	TestType      TestScoreType `json:"test_type" db:"test_type"`
	OtherTestName *string       `json:"other_test_name,omitempty" db:"other_test_name"`
	Score         float64       `json:"score" db:"score"`
	OutOf         float64       `json:"out_of" db:"out_of"`
	TakenOn       *string       `json:"taken_on,omitempty" db:"taken_on"`
	CreatedAt     time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at" db:"updated_at"`
}

type ProfileTestScoreUpsertRequest struct {
	TestType      TestScoreType `json:"test_type"`
	OtherTestName *string       `json:"other_test_name,omitempty"`
	Score         float64       `json:"score"`
	OutOf         float64       `json:"out_of"`
	TakenOn       *string       `json:"taken_on,omitempty"`
}
