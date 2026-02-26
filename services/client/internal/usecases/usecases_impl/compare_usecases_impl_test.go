package usecases_impl

import (
	"context"
	"testing"
)

func TestCompareUsecases_RequireDBConnection(t *testing.T) {
	t.Run("GetUserCompareList requires DB", func(t *testing.T) {
		_, err := GetUserCompareList(context.Background(), "user-id")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("AddToCompare requires DB", func(t *testing.T) {
		err := AddToCompare(context.Background(), "user-id", "university-id")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("RemoveFromCompare requires DB", func(t *testing.T) {
		err := RemoveFromCompare(context.Background(), "user-id", "university-id")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("ClearCompare requires DB", func(t *testing.T) {
		err := ClearCompare(context.Background(), "user-id")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "could not establish connection with the database" {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}
