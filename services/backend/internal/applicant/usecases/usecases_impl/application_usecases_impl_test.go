package usecases_impl

import (
	"context"
	"testing"

	"kallisto/infra/middlewares"
	"kallisto/services/backend/internal/applicant/models"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestSubmitApplicationUsesUnifiedApplicationsTable(t *testing.T) {
	const (
		userID        = "11111111-1111-1111-1111-111111111111"
		universityID  = "22222222-2222-2222-2222-222222222222"
		cycle         = "2026-Fall"
		applicationID = "33333333-3333-3333-3333-333333333333"
	)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	appData := []byte(`{"program":"Computer Science","citizenship":"Kazakhstan"}`)
	userData := []byte(`{"gender":"female"}`)
	mock.ExpectQuery(`SELECT status FROM applications WHERE user_id=\$1 AND university_id=\$2 AND application_cycle=\$3`).
		WithArgs(userID, universityID, cycle).
		WillReturnRows(pgxmock.NewRows([]string{"status"}).AddRow(models.StatusDraft))
	mock.ExpectQuery(`SELECT data FROM applications WHERE user_id=\$1 AND university_id=\$2 AND application_cycle=\$3`).
		WithArgs(userID, universityID, cycle).
		WillReturnRows(pgxmock.NewRows([]string{"data"}).AddRow(appData))
	mock.ExpectQuery(`SELECT application_schema FROM universities WHERE id = \$1`).
		WithArgs(universityID).
		WillReturnRows(pgxmock.NewRows([]string{"application_schema"}).AddRow([]byte(`{"sections":[]}`)))
	mock.ExpectQuery(`SELECT email, first_name, last_name, data FROM users WHERE id=\$1`).
		WithArgs(userID).
		WillReturnRows(pgxmock.NewRows([]string{"email", "first_name", "last_name", "data"}).AddRow("student@example.com", "Jane", "Doe", userData))
	mock.ExpectBegin()
	mock.ExpectQuery(`UPDATE applications`).
		WithArgs(pgxmock.AnyArg(), pgxmock.AnyArg(), userID, universityID, cycle, models.StatusDraft).
		WillReturnRows(pgxmock.NewRows([]string{"id"}).AddRow(applicationID))
	mock.ExpectExec(`UPDATE applications`).
		WithArgs(pgxmock.AnyArg(), applicationID).
		WillReturnResult(pgxmock.NewResult("UPDATE", 1))
	mock.ExpectCommit()

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	if err := SubmitApplication(ctx, userID, universityID, cycle); err != nil {
		t.Fatalf("SubmitApplication returned error: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
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
