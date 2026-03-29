package models

import "time"

type CompareItem struct {
	UserId       string    `json:"user_id" db:"user_id"`
	UniversityId string    `json:"university_id" db:"university_id"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}
