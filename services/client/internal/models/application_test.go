// Unit tests for application models
package models

import (
	"encoding/json"
	"testing"
)

func TestApplicationStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"StatusDraft", StatusDraft, "draft"},
		{"StatusSubmitted", StatusSubmitted, "submitted"},
		{"StatusAccepted", StatusAccepted, "accepted"},
		{"StatusRejected", StatusRejected, "rejected"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("%s = %q, want %q", tt.name, tt.constant, tt.expected)
			}
		})
	}
}

func TestApplicationCreateRequest_Fields(t *testing.T) {
	t.Run("can instantiate with all fields", func(t *testing.T) {
		req := ApplicationCreateRequest{
			UniversityId:     "123e4567-e89b-12d3-a456-426614174000",
			ApplicationCycle: "2024-fall",
			Data:             json.RawMessage(`{"field": "value"}`),
		}

		if req.UniversityId != "123e4567-e89b-12d3-a456-426614174000" {
			t.Errorf("UniversityId = %q, want %q", req.UniversityId, "123e4567-e89b-12d3-a456-426614174000")
		}
		if req.ApplicationCycle != "2024-fall" {
			t.Errorf("ApplicationCycle = %q, want %q", req.ApplicationCycle, "2024-fall")
		}
		if string(req.Data) != `{"field": "value"}` {
			t.Errorf("Data = %q, want %q", string(req.Data), `{"field": "value"}`)
		}
	})

	t.Run("can instantiate with minimal fields", func(t *testing.T) {
		req := ApplicationCreateRequest{
			UniversityId:     "123e4567-e89b-12d3-a456-426614174000",
			ApplicationCycle: "2024-fall",
		}

		if req.UniversityId == "" {
			t.Error("UniversityId should not be empty")
		}
		if req.ApplicationCycle == "" {
			t.Error("ApplicationCycle should not be empty")
		}
		if req.Data != nil {
			t.Errorf("Data should be nil, got %v", req.Data)
		}
	})

	t.Run("json marshaling", func(t *testing.T) {
		req := ApplicationCreateRequest{
			UniversityId:     "test-uuid",
			ApplicationCycle: "2024-fall",
			Data:             json.RawMessage(`{"key":"value"}`),
		}

		data, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}

		var unmarshaled ApplicationCreateRequest
		if err := json.Unmarshal(data, &unmarshaled); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}

		if unmarshaled.UniversityId != req.UniversityId {
			t.Errorf("UniversityId = %q, want %q", unmarshaled.UniversityId, req.UniversityId)
		}
		if unmarshaled.ApplicationCycle != req.ApplicationCycle {
			t.Errorf("ApplicationCycle = %q, want %q", unmarshaled.ApplicationCycle, req.ApplicationCycle)
		}
	})
}

func TestApplicationUpdateRequest_Fields(t *testing.T) {
	t.Run("can instantiate with data only", func(t *testing.T) {
		req := ApplicationUpdateRequest{
			Data: json.RawMessage(`{"updated": true}`),
		}

		if req.Data == nil {
			t.Error("Data should not be nil")
		}
		if req.Status != nil {
			t.Error("Status should be nil")
		}
	})

	t.Run("can instantiate with status pointer", func(t *testing.T) {
		status := StatusSubmitted
		req := ApplicationUpdateRequest{
			Status: &status,
		}

		if req.Status == nil {
			t.Error("Status should not be nil")
		}
		if *req.Status != StatusSubmitted {
			t.Errorf("Status = %q, want %q", *req.Status, StatusSubmitted)
		}
	})
}

func TestApplication_Fields(t *testing.T) {
	t.Run("can instantiate full application", func(t *testing.T) {
		app := Application{
			UserId:           "user-uuid",
			UniversityId:     "uni-uuid",
			ApplicationCycle: "2024-fall",
			Status:           StatusDraft,
			Data:             json.RawMessage(`{}`),
		}

		if app.UserId != "user-uuid" {
			t.Errorf("UserId = %q, want %q", app.UserId, "user-uuid")
		}
		if app.Status != StatusDraft {
			t.Errorf("Status = %q, want %q", app.Status, StatusDraft)
		}
	})
}

func TestApplicationListItem_Fields(t *testing.T) {
	t.Run("can instantiate list item", func(t *testing.T) {
		item := ApplicationListItem{
			UniversityId:     "uni-uuid",
			UniversityName:   "Test University",
			ApplicationCycle: "2024-fall",
			Status:           StatusSubmitted,
		}

		if item.UniversityName != "Test University" {
			t.Errorf("UniversityName = %q, want %q", item.UniversityName, "Test University")
		}
		if item.Status != StatusSubmitted {
			t.Errorf("Status = %q, want %q", item.Status, StatusSubmitted)
		}
	})
}
