package handlers

import (
	"net/http"
	"testing"

	"kallisto/infra/utils"
)

func TestEnforcePartnerUniversityFilter(t *testing.T) {
	t.Run("non-partner uses requested filter", func(t *testing.T) {
		requested := "uni-1"
		filtered, err := enforcePartnerUniversityFilter("staff", nil, &requested)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if filtered == nil || *filtered != requested {
			t.Fatalf("expected filter %q, got %v", requested, filtered)
		}
	})

	t.Run("partner missing linked university is forbidden", func(t *testing.T) {
		_, err := enforcePartnerUniversityFilter("partner", nil, nil)
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
		if handlerErr.Error() != "partner account missing linked university" {
			t.Fatalf("unexpected error message: %s", handlerErr.Error())
		}
	})

	t.Run("partner without requested filter uses linked university", func(t *testing.T) {
		linked := "uni-1"
		filtered, err := enforcePartnerUniversityFilter("partner", &linked, nil)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if filtered == nil || *filtered != linked {
			t.Fatalf("expected filter %q, got %v", linked, filtered)
		}
	})

	t.Run("partner with mismatched requested filter is forbidden", func(t *testing.T) {
		linked := "uni-1"
		requested := "uni-2"
		_, err := enforcePartnerUniversityFilter("partner", &linked, &requested)
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
		if handlerErr.Error() != "partners cannot access other universities" {
			t.Fatalf("unexpected error message: %s", handlerErr.Error())
		}
	})

	t.Run("partner with matching requested filter is allowed", func(t *testing.T) {
		linked := "uni-1"
		requested := "uni-1"
		filtered, err := enforcePartnerUniversityFilter("partner", &linked, &requested)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if filtered == nil || *filtered != linked {
			t.Fatalf("expected filter %q, got %v", linked, filtered)
		}
	})
}

func TestEnforcePartnerUniversityAccess(t *testing.T) {
	t.Run("non-partner allowed", func(t *testing.T) {
		if err := enforcePartnerUniversityAccess("staff", nil, "uni-1"); err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
	})

	t.Run("partner missing linked university is forbidden", func(t *testing.T) {
		err := enforcePartnerUniversityAccess("partner", nil, "uni-1")
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
		if handlerErr.Error() != "partner account missing linked university" {
			t.Fatalf("unexpected error message: %s", handlerErr.Error())
		}
	})

	t.Run("partner mismatch is forbidden", func(t *testing.T) {
		linked := "uni-1"
		err := enforcePartnerUniversityAccess("partner", &linked, "uni-2")
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
		if handlerErr.Error() != "partners cannot access other universities" {
			t.Fatalf("unexpected error message: %s", handlerErr.Error())
		}
	})

	t.Run("partner match is allowed", func(t *testing.T) {
		linked := "uni-1"
		if err := enforcePartnerUniversityAccess("partner", &linked, "uni-1"); err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
	})
}
