package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
)

func TestAddCompareHandler_InvalidUUID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/v1.0/compare/not-a-uuid", nil)
	req = withTestClaims(req)
	req = mux.SetURLVars(req, map[string]string{"id": "not-a-uuid"})

	rec := httptest.NewRecorder()
	AddCompareHandler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestGetCompareHandler_UnauthorizedWithoutClaims(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1.0/compare", nil)
	rec := httptest.NewRecorder()

	GetCompareHandler(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}
