package usecases_impl

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestSubmitApplicationPersistsApplicantInfoAndMarksSubmitted(t *testing.T) {
	const (
		userID       = "11111111-1111-1111-1111-111111111111"
		universityID = "22222222-2222-2222-2222-222222222222"
		cycle        = "2026-Fall"
		adminAppID   = "33333333-3333-3333-3333-333333333333"
	)

	clientMock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer clientMock.Close()

	adminMock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create admin pgx mock: %v", err)
	}
	defer adminMock.Close()

	appData := []byte(`{"program":"Computer Science","citizenship":"Kazakhstan"}`)
	userData := []byte(`{"gender":"female"}`)
	clientMock.ExpectQuery(`SELECT status FROM applications WHERE user_id=\$1 AND university_id=\$2 AND application_cycle=\$3`).
		WithArgs(userID, universityID, cycle).
		WillReturnRows(pgxmock.NewRows([]string{"status"}).AddRow(models.StatusDraft))
	clientMock.ExpectQuery(`SELECT data FROM applications WHERE user_id=\$1 AND university_id=\$2 AND application_cycle=\$3`).
		WithArgs(userID, universityID, cycle).
		WillReturnRows(pgxmock.NewRows([]string{"data"}).AddRow(appData))
	clientMock.ExpectQuery(`SELECT application_schema FROM universities WHERE id = \$1`).
		WithArgs(universityID).
		WillReturnRows(pgxmock.NewRows([]string{"application_schema"}).AddRow([]byte(`{"sections":[]}`)))
	clientMock.ExpectQuery(`SELECT email, first_name, last_name, data FROM users WHERE id=\$1`).
		WithArgs(userID).
		WillReturnRows(pgxmock.NewRows([]string{"email", "first_name", "last_name", "data"}).AddRow("student@example.com", "Jane", "Doe", userData))
	clientMock.ExpectExec(`UPDATE applications SET status=\$1, submitted_at=\$2 WHERE user_id=\$3 AND university_id=\$4 AND application_cycle=\$5 AND status=\$6`).
		WithArgs(models.StatusSubmitted, pgxmock.AnyArg(), userID, universityID, cycle, models.StatusDraft).
		WillReturnResult(pgxmock.NewResult("UPDATE", 1))

	adminMock.ExpectQuery(`INSERT INTO submitted_applications`).
		WithArgs(userID, universityID, cycle, pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg()).
		WillReturnRows(pgxmock.NewRows([]string{"id"}).AddRow(adminAppID))
	adminMock.ExpectExec(`DELETE FROM submitted_application_files WHERE application_id = \$1`).
		WithArgs(adminAppID).
		WillReturnResult(pgxmock.NewResult("DELETE", 0))
	adminMock.ExpectExec(`UPDATE submitted_applications SET application_data = \$1 WHERE id = \$2`).
		WithArgs(pgxmock.AnyArg(), adminAppID).
		WillReturnResult(pgxmock.NewResult("UPDATE", 1))

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, clientMock)
	ctx = context.WithValue(ctx, middlewares.CtxClientPostgresKey, adminMock)
	if err := SubmitApplication(ctx, userID, universityID, cycle); err != nil {
		t.Fatalf("SubmitApplication returned error: %v", err)
	}

	if err := clientMock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
	if err := adminMock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet admin mock expectations: %v", err)
	}
}

func TestSubmitApplicationCanRetryAfterAdminFailure(t *testing.T) {
	const (
		userID       = "11111111-1111-1111-1111-111111111111"
		universityID = "22222222-2222-2222-2222-222222222222"
		cycle        = "2026-Fall"
		adminAppID   = "33333333-3333-3333-3333-333333333333"
	)

	clientMock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer clientMock.Close()

	adminMock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create admin pgx mock: %v", err)
	}
	defer adminMock.Close()

	appData := []byte(`{"program":"Computer Science","citizenship":"Kazakhstan"}`)
	userData := []byte(`{"gender":"female"}`)
	expectDraftSubmissionQueries := func() {
		clientMock.ExpectQuery(`SELECT status FROM applications WHERE user_id=\$1 AND university_id=\$2 AND application_cycle=\$3`).
			WithArgs(userID, universityID, cycle).
			WillReturnRows(pgxmock.NewRows([]string{"status"}).AddRow(models.StatusDraft))
		clientMock.ExpectQuery(`SELECT data FROM applications WHERE user_id=\$1 AND university_id=\$2 AND application_cycle=\$3`).
			WithArgs(userID, universityID, cycle).
			WillReturnRows(pgxmock.NewRows([]string{"data"}).AddRow(appData))
		clientMock.ExpectQuery(`SELECT application_schema FROM universities WHERE id = \$1`).
			WithArgs(universityID).
			WillReturnRows(pgxmock.NewRows([]string{"application_schema"}).AddRow([]byte(`{"sections":[]}`)))
		clientMock.ExpectQuery(`SELECT email, first_name, last_name, data FROM users WHERE id=\$1`).
			WithArgs(userID).
			WillReturnRows(pgxmock.NewRows([]string{"email", "first_name", "last_name", "data"}).AddRow("student@example.com", "Jane", "Doe", userData))
	}

	expectDraftSubmissionQueries()
	expectDraftSubmissionQueries()
	clientMock.ExpectExec(`UPDATE applications SET status=\$1, submitted_at=\$2 WHERE user_id=\$3 AND university_id=\$4 AND application_cycle=\$5 AND status=\$6`).
		WithArgs(models.StatusSubmitted, pgxmock.AnyArg(), userID, universityID, cycle, models.StatusDraft).
		WillReturnResult(pgxmock.NewResult("UPDATE", 1))

	adminMock.ExpectQuery(`INSERT INTO submitted_applications`).
		WithArgs(userID, universityID, cycle, pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg()).
		WillReturnError(errors.New("admin unavailable"))
	adminMock.ExpectQuery(`INSERT INTO submitted_applications`).
		WithArgs(userID, universityID, cycle, pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg()).
		WillReturnRows(pgxmock.NewRows([]string{"id"}).AddRow(adminAppID))
	adminMock.ExpectExec(`DELETE FROM submitted_application_files WHERE application_id = \$1`).
		WithArgs(adminAppID).
		WillReturnResult(pgxmock.NewResult("DELETE", 0))
	adminMock.ExpectExec(`UPDATE submitted_applications SET application_data = \$1 WHERE id = \$2`).
		WithArgs(pgxmock.AnyArg(), adminAppID).
		WillReturnResult(pgxmock.NewResult("UPDATE", 1))

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, clientMock)
	ctx = context.WithValue(ctx, middlewares.CtxClientPostgresKey, adminMock)
	firstErr := SubmitApplication(ctx, userID, universityID, cycle)
	if firstErr == nil {
		t.Fatal("expected first submit attempt to fail")
	}

	handlerErr, ok := firstErr.(utils.HandlerFuncErr)
	if !ok || handlerErr.Status() != http.StatusBadGateway {
		t.Fatalf("expected bad gateway handler error, got %#v", firstErr)
	}

	if err := SubmitApplication(ctx, userID, universityID, cycle); err != nil {
		t.Fatalf("expected retry to succeed, got %v", err)
	}

	if err := clientMock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
	if err := adminMock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet admin mock expectations: %v", err)
	}
}

func TestBuildApplicantInfoIncludesDerivedNameCitizenshipAndGender(t *testing.T) {
	applicantInfo := buildApplicantInfo(
		"student@example.com",
		"Jane",
		"Doe",
		[]byte(`{"gender":"female"}`),
		[]byte(`{"citizenship":"Kazakhstan"}`),
	)

	if applicantInfo["email"] != "student@example.com" {
		t.Fatalf("unexpected email: %#v", applicantInfo["email"])
	}
	if applicantInfo["name"] != "Jane Doe" {
		t.Fatalf("unexpected derived name: %#v", applicantInfo["name"])
	}
	if applicantInfo["gender"] != "female" {
		t.Fatalf("unexpected gender: %#v", applicantInfo["gender"])
	}
	if applicantInfo["citizenship"] != "Kazakhstan" {
		t.Fatalf("unexpected citizenship: %#v", applicantInfo["citizenship"])
	}
}
