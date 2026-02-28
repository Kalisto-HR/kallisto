package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
)

func TestCreateProfileTestScoreHandler_RejectsInvalidType(t *testing.T) {
	body := `{"test_type":"GRE","score":320,"out_of":340}`
	req := httptest.NewRequest(http.MethodPost, "/v1.0/profile/test-scores", strings.NewReader(body))
	req = withTestClaims(req)

	rec := httptest.NewRecorder()
	CreateProfileTestScoreHandler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestCreateProfileTestScoreHandler_RejectsOtherWithoutName(t *testing.T) {
	body := `{"test_type":"OTHER","score":120,"out_of":160}`
	req := httptest.NewRequest(http.MethodPost, "/v1.0/profile/test-scores", strings.NewReader(body))
	req = withTestClaims(req)

	rec := httptest.NewRecorder()
	CreateProfileTestScoreHandler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestImportApplicationTestScoresHandler_RejectsInvalidUniversityID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/v1.0/applications/not-a-uuid/2026-Fall/import-test-scores", nil)
	req = withTestClaims(req)
	req = mux.SetURLVars(req, map[string]string{
		"universityId": "not-a-uuid",
		"cycle":        "2026-Fall",
	})

	rec := httptest.NewRecorder()
	ImportApplicationTestScoresHandler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}
