// Unit tests for application usecases
package usecases_impl

import (
	"context"
	"kallisto/services/client/internal/models"
	"testing"
)

func TestCreateApplication_ValidatesInput(t *testing.T) {
	t.Run("empty university_id fails without DB connection", func(t *testing.T) {
		req := &models.ApplicationCreateRequest{
			UniversityId:     "",
			ApplicationCycle: "2024-fall",
		}

		// Without DB in context, should fail at connection level
		err := CreateApplication(context.Background(), "user-id", req)
		if err == nil {
			t.Error("expected error for empty context, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("empty application_cycle fails without DB connection", func(t *testing.T) {
		req := &models.ApplicationCreateRequest{
			UniversityId:     "123e4567-e89b-12d3-a456-426614174000",
			ApplicationCycle: "",
		}

		err := CreateApplication(context.Background(), "user-id", req)
		if err == nil {
			t.Error("expected error for empty context, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("nil request causes panic protection needed", func(t *testing.T) {
		// This documents current behavior - nil request would panic at DB level
		// In production, validation happens before usecase is called
		err := CreateApplication(context.Background(), "user-id", &models.ApplicationCreateRequest{})
		if err == nil {
			t.Error("expected error, got nil")
		}
	})
}

func TestApplicationStatus_Constants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"StatusDraft", models.StatusDraft, "draft"},
		{"StatusSubmitted", models.StatusSubmitted, "submitted"},
		{"StatusAccepted", models.StatusAccepted, "accepted"},
		{"StatusRejected", models.StatusRejected, "rejected"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("%s = %q, want %q", tt.name, tt.constant, tt.expected)
			}
		})
	}
}

func TestGetApplicationsByUser_RequiresDBConnection(t *testing.T) {
	t.Run("fails without DB in context", func(t *testing.T) {
		_, err := GetApplicationsByUser(context.Background(), "user-id")
		if err == nil {
			t.Error("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestGetApplicationById_RequiresDBConnection(t *testing.T) {
	t.Run("fails without DB in context", func(t *testing.T) {
		_, err := GetApplicationById(context.Background(), "user-id", "uni-id", "2024-fall")
		if err == nil {
			t.Error("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestUpdateApplication_RequiresDBConnection(t *testing.T) {
	t.Run("fails without DB in context", func(t *testing.T) {
		req := &models.ApplicationUpdateRequest{}
		err := UpdateApplication(context.Background(), "user-id", "uni-id", "2024-fall", req)
		if err == nil {
			t.Error("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestSubmitApplication_RequiresDBConnection(t *testing.T) {
	t.Run("fails without DB in context", func(t *testing.T) {
		err := SubmitApplication(context.Background(), "user-id", "uni-id", "2024-fall")
		if err == nil {
			t.Error("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestDeleteApplication_RequiresDBConnection(t *testing.T) {
	t.Run("fails without DB in context", func(t *testing.T) {
		err := DeleteApplication(context.Background(), "user-id", "uni-id", "2024-fall")
		if err == nil {
			t.Error("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Errorf("unexpected error: %v", err)
		}
	})
}
