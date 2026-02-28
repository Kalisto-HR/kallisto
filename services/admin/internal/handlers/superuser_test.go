package handlers

import (
	"context"
	"net/http"
	"testing"

	auth "kallisto/infra/auth/jwt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
)

func TestEnsureStaffAccess(t *testing.T) {
	t.Run("staff is allowed", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), middlewares.CtxClaimsKey, &auth.Claims{
			UID:       "staff-1",
			FirstName: "System",
			LastName:  "Admin",
			Role:      "staff",
		})

		claims, err := ensureStaffAccess(ctx)
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		if claims.UID != "staff-1" {
			t.Fatalf("expected uid staff-1, got %s", claims.UID)
		}
	})

	t.Run("partner is forbidden", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), middlewares.CtxClaimsKey, &auth.Claims{
			UID:  "partner-1",
			Role: "partner",
		})

		_, err := ensureStaffAccess(ctx)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		handlerErr, ok := err.(utils.HandlerFuncErr)
		if !ok {
			t.Fatalf("expected HandlerFuncErr, got %T", err)
		}
		if handlerErr.Status() != http.StatusForbidden {
			t.Fatalf("expected status %d, got %d", http.StatusForbidden, handlerErr.Status())
		}
	})

	t.Run("missing claims is unauthorized", func(t *testing.T) {
		_, err := ensureStaffAccess(context.Background())
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		handlerErr, ok := err.(utils.HandlerFuncErr)
		if !ok {
			t.Fatalf("expected HandlerFuncErr, got %T", err)
		}
		if handlerErr.Status() != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, handlerErr.Status())
		}
	})
}
