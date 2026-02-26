// Admin user models for authentication and profile management
package models

import "time"

// AdminUser represents an admin user (staff or partner)
type AdminUser struct {
	Id               string     `json:"id" db:"id"`
	Email            string     `json:"email" db:"email"`
	Password         string     `json:"-" db:"password"`
	FirstName        string     `json:"first_name" db:"first_name"`
	LastName         string     `json:"last_name" db:"last_name"`
	LastSeen         *time.Time `json:"last_seen,omitempty" db:"last_seen"`
	Role             string     `json:"role" db:"role"`
	UniversityLinked *string    `json:"university_linked,omitempty" db:"university_linked"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
}

// AdminSignInRequest represents the request body for admin sign in
type AdminSignInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AdminSignUpRequest represents the request body for admin account creation
type AdminSignUpRequest struct {
	Email            string  `json:"email"`
	Password         string  `json:"password"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	Role             string  `json:"role"`
	UniversityLinked *string `json:"university_linked,omitempty"`
}

// UniversityUserCreateRequest represents creating a partner user for a university.
type UniversityUserCreateRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

// UniversityUserListItem is a minimal users-and-staff payload for management pages.
type UniversityUserListItem struct {
	Id               string    `json:"id" db:"id"`
	Email            string    `json:"email" db:"email"`
	FirstName        string    `json:"first_name" db:"first_name"`
	LastName         string    `json:"last_name" db:"last_name"`
	Role             string    `json:"role" db:"role"`
	UniversityLinked *string   `json:"university_linked,omitempty" db:"university_linked"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}
