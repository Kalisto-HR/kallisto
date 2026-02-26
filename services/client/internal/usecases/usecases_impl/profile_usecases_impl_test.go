package usecases_impl

import (
	"context"
	"kallisto/services/client/internal/models"
	"testing"
)

func TestProfileUsecases_RequireDBConnection(t *testing.T) {
	t.Run("UpdateUserProfile requires DB connection", func(t *testing.T) {
		firstName := "Test"
		req := &models.ProfileUpdateRequest{FirstName: &firstName}

		err := UpdateUserProfile(context.Background(), "user-id", req)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("ChangeUserPassword requires DB connection", func(t *testing.T) {
		err := ChangeUserPassword(context.Background(), "user-id", "old-pass", "new-pass-123")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("UpdateUserPhoto requires DB connection", func(t *testing.T) {
		err := UpdateUserPhoto(context.Background(), "user-id", []byte("photo"))
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("GetUserPhoto requires DB connection", func(t *testing.T) {
		_, err := GetUserPhoto(context.Background(), "user-id")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}
