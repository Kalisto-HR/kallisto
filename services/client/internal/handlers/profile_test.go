package handlers

import (
	"bytes"
	"context"
	auth "kallisto/infra/auth/jwt"
	"kallisto/infra/middlewares"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func withTestClaims(req *http.Request) *http.Request {
	claims := &auth.Claims{
		UID:       "test-user-id",
		FirstName: "Test",
		LastName:  "User",
		Role:      "applicant",
	}
	ctx := context.WithValue(req.Context(), middlewares.CtxClaimsKey, claims)
	return req.WithContext(ctx)
}

func TestUpdateProfileHandler_InvalidDataShape(t *testing.T) {
	body := `{"data":["invalid"]}`
	req := httptest.NewRequest(http.MethodPut, "/v1.0/profile", strings.NewReader(body))
	req = withTestClaims(req)

	rec := httptest.NewRecorder()
	UpdateProfileHandler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestUpdatePasswordHandler_RejectsSamePassword(t *testing.T) {
	body := `{"current_password":"same-pass-123","new_password":"same-pass-123"}`
	req := httptest.NewRequest(http.MethodPut, "/v1.0/profile/password", strings.NewReader(body))
	req = withTestClaims(req)

	rec := httptest.NewRecorder()
	UpdatePasswordHandler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestUpdateProfilePhotoHandler_RejectsUnsupportedType(t *testing.T) {
	var payload bytes.Buffer
	writer := multipart.NewWriter(&payload)
	part, err := writer.CreateFormFile("photo", "profile.txt")
	if err != nil {
		t.Fatalf("failed to create multipart file: %v", err)
	}
	if _, err := part.Write([]byte("not-an-image")); err != nil {
		t.Fatalf("failed to write multipart payload: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPut, "/v1.0/profile/photo", &payload)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = withTestClaims(req)

	rec := httptest.NewRecorder()
	UpdateProfilePhotoHandler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}
