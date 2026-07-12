package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculateFitScoreHandlerCalculatesDirectObjectRequest(t *testing.T) {
	body := `{
		"studentProfile": {
			"gpa": 3.8,
			"gpaScale": 4,
			"ielts": 7,
			"intendedMajor": "Computer Science",
			"budgetPerYear": 30000,
			"documentsReady": ["Passport", "Transcript"]
		},
		"program": {
			"universityId": "uni-1",
			"universityName": "Kallisto University",
			"programId": "cs-bsc",
			"majorName": "Software Engineering",
			"language": "English",
			"minGpa": 3.2,
			"minIelts": 6.5,
			"tuition": 25000,
			"scholarshipAvailable": true,
			"deadline": "2099-08-01",
			"requiredDocuments": ["Passport", "Transcript"]
		}
	}`
	req := httptest.NewRequest(http.MethodPost, "/v1.0/applicant/fit-score/calculate", strings.NewReader(body))
	recorder := httptest.NewRecorder()

	CalculateFitScoreHandler(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Success bool `json:"success"`
		Data    struct {
			FinalScore int    `json:"finalScore"`
			Label      string `json:"label"`
			Breakdown  struct {
				AcademicScore float64 `json:"academicScore"`
				LanguageScore float64 `json:"languageScore"`
			} `json:"breakdown"`
			Reasons []string `json:"reasons"`
		} `json:"data"`
	}
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.Success {
		t.Fatal("expected success response")
	}
	if response.Data.FinalScore <= 0 || response.Data.FinalScore > 100 {
		t.Fatalf("unexpected final score %d", response.Data.FinalScore)
	}
	if response.Data.Label == "" {
		t.Fatal("expected score label")
	}
	if response.Data.Breakdown.AcademicScore <= 0 || response.Data.Breakdown.LanguageScore <= 0 {
		t.Fatalf("expected populated breakdown: %+v", response.Data.Breakdown)
	}
	if len(response.Data.Reasons) == 0 {
		t.Fatal("expected deterministic reasons")
	}
}

func TestCalculateFitScoreHandlerRejectsIDOnlyLookupForMVP(t *testing.T) {
	req := httptest.NewRequest(
		http.MethodPost,
		"/v1.0/applicant/fit-score/calculate",
		strings.NewReader(`{"studentId":"student-1","programId":"program-1"}`),
	)
	recorder := httptest.NewRecorder()

	CalculateFitScoreHandler(recorder, req)

	if recorder.Code != http.StatusNotImplemented {
		t.Fatalf("expected 501, got %d", recorder.Code)
	}
}

func TestCalculateFitScoreHandlerValidatesSupportedRanges(t *testing.T) {
	body := `{
		"studentProfile": {
			"gpa": 5.2,
			"gpaScale": 4,
			"ielts": 12,
			"budgetPerYear": -1
		},
		"program": {
			"majorName": "Computer Science",
			"language": "English",
			"minIelts": 6.5,
			"tuition": 25000
		}
	}`
	req := httptest.NewRequest(http.MethodPost, "/v1.0/applicant/fit-score/calculate", strings.NewReader(body))
	recorder := httptest.NewRecorder()

	CalculateFitScoreHandler(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "studentProfile.gpa") {
		t.Fatalf("expected field validation response, got %s", recorder.Body.String())
	}
}
