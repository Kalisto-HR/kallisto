// profile.go defines models for user profile operations.
package models

import (
	"encoding/json"
	"time"
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
