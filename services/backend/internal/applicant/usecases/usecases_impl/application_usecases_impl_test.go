package usecases_impl

import (
	"context"
	"strings"
	"testing"

	"kallisto/infra/middlewares"
	"kallisto/services/backend/internal/applicant/models"

	"github.com/jackc/pgx/v5"
	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestSubmitApplicationFallsBackToApplicantBaselineWhenNoPublishedVersionExists(t *testing.T) {
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
	mock.ExpectQuery(`SELECT schema\s+FROM university_application_structure_versions\s+WHERE university_id = \$1 AND published = TRUE\s+ORDER BY version_no DESC\s+LIMIT 1`).
		WithArgs(universityID).
		WillReturnError(pgx.ErrNoRows)
	mock.ExpectQuery(`SELECT email, first_name, last_name, data FROM users WHERE id=\$1`).
		WithArgs(userID).
		WillReturnRows(pgxmock.NewRows([]string{"email", "first_name", "last_name", "data"}).AddRow("student@example.com", "Jane", "Doe", userData))
	mock.ExpectBegin()
	mock.ExpectExec(`SELECT 1 FROM users WHERE id=\$1 FOR UPDATE`).
		WithArgs(userID).
		WillReturnResult(pgxmock.NewResult("SELECT", 1))
	mock.ExpectQuery(`SELECT id, billing_exempt\s+FROM applications\s+WHERE user_id = \$1\s+AND university_id = \$2\s+AND application_cycle = \$3\s+AND status = \$4\s+FOR UPDATE`).
		WithArgs(userID, universityID, cycle, models.StatusDraft).
		WillReturnRows(pgxmock.NewRows([]string{"id", "billing_exempt"}).AddRow(applicationID, false))
	mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM application_submission_charges WHERE application_id=\$1\)`).
		WithArgs(applicationID).
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(false))
	mock.ExpectQuery(`SELECT COALESCE`).
		WithArgs(userID).
		WillReturnRows(pgxmock.NewRows([]string{"balance_after"}).AddRow(1))
	mock.ExpectQuery(`INSERT INTO application_credit_ledger`).
		WithArgs(userID, "application_submission", -1, 0, "application_submission", pgxmock.AnyArg(), pgxmock.AnyArg(), "Application submission credit consumed").
		WillReturnRows(pgxmock.NewRows([]string{"id"}).AddRow("44444444-4444-4444-4444-444444444444"))
	mock.ExpectExec(`INSERT INTO application_submission_charges`).
		WithArgs(applicationID, userID, "44444444-4444-4444-4444-444444444444").
		WillReturnResult(pgxmock.NewResult("INSERT", 1))
	mock.ExpectExec(`UPDATE applications`).
		WithArgs(pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), applicationID, models.StatusDraft).
		WillReturnResult(pgxmock.NewResult("UPDATE", 1))
	mock.ExpectExec(`UPDATE applications`).
		WithArgs(pgxmock.AnyArg(), applicationID).
		WillReturnResult(pgxmock.NewResult("UPDATE", 1))
	mock.ExpectExec(`INSERT INTO application_status_events`).
		WithArgs(applicationID, "Application submitted by student.", userID).
		WillReturnResult(pgxmock.NewResult("INSERT", 1))
	mock.ExpectExec(`INSERT INTO application_notifications`).
		WithArgs(userID, applicationID, universityID, "/applicant/applications/"+universityID+"/"+cycle).
		WillReturnResult(pgxmock.NewResult("INSERT", 1))
	mock.ExpectCommit()

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	if err := SubmitApplication(ctx, userID, universityID, cycle); err != nil {
		t.Fatalf("SubmitApplication returned error: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet admin mock expectations: %v", err)
	}
}

func TestSubmitApplicationRequiresCreditForNewDraftSubmission(t *testing.T) {
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
	mock.ExpectQuery(`SELECT schema\s+FROM university_application_structure_versions\s+WHERE university_id = \$1 AND published = TRUE\s+ORDER BY version_no DESC\s+LIMIT 1`).
		WithArgs(universityID).
		WillReturnError(pgx.ErrNoRows)
	mock.ExpectQuery(`SELECT email, first_name, last_name, data FROM users WHERE id=\$1`).
		WithArgs(userID).
		WillReturnRows(pgxmock.NewRows([]string{"email", "first_name", "last_name", "data"}).AddRow("student@example.com", "Jane", "Doe", userData))
	mock.ExpectBegin()
	mock.ExpectExec(`SELECT 1 FROM users WHERE id=\$1 FOR UPDATE`).
		WithArgs(userID).
		WillReturnResult(pgxmock.NewResult("SELECT", 1))
	mock.ExpectQuery(`SELECT id, billing_exempt\s+FROM applications\s+WHERE user_id = \$1\s+AND university_id = \$2\s+AND application_cycle = \$3\s+AND status = \$4\s+FOR UPDATE`).
		WithArgs(userID, universityID, cycle, models.StatusDraft).
		WillReturnRows(pgxmock.NewRows([]string{"id", "billing_exempt"}).AddRow(applicationID, false))
	mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM application_submission_charges WHERE application_id=\$1\)`).
		WithArgs(applicationID).
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(false))
	mock.ExpectQuery(`SELECT COALESCE`).
		WithArgs(userID).
		WillReturnRows(pgxmock.NewRows([]string{"balance_after"}).AddRow(0))
	mock.ExpectRollback()

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	err = SubmitApplication(ctx, userID, universityID, cycle)
	if err == nil {
		t.Fatalf("SubmitApplication unexpectedly succeeded")
	}
	if !strings.Contains(err.Error(), "APPLICATION_CREDIT_REQUIRED") {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet admin mock expectations: %v", err)
	}
}

func TestSubmitApplicationUsesPublishedApplicantSchemaForEssayValidation(t *testing.T) {
	const (
		userID       = "11111111-1111-1111-1111-111111111111"
		universityID = "22222222-2222-2222-2222-222222222222"
		cycle        = "2026-Fall"
	)

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	appData := []byte(`{"personal_essay":"one two three four"}`)
	mock.ExpectQuery(`SELECT status FROM applications WHERE user_id=\$1 AND university_id=\$2 AND application_cycle=\$3`).
		WithArgs(userID, universityID, cycle).
		WillReturnRows(pgxmock.NewRows([]string{"status"}).AddRow(models.StatusDraft))
	mock.ExpectQuery(`SELECT data FROM applications WHERE user_id=\$1 AND university_id=\$2 AND application_cycle=\$3`).
		WithArgs(userID, universityID, cycle).
		WillReturnRows(pgxmock.NewRows([]string{"data"}).AddRow(appData))
	mock.ExpectQuery(`SELECT schema\s+FROM university_application_structure_versions\s+WHERE university_id = \$1 AND published = TRUE\s+ORDER BY version_no DESC\s+LIMIT 1`).
		WithArgs(universityID).
		WillReturnRows(pgxmock.NewRows([]string{"schema"}).AddRow([]byte(`{
			"sections": [
				{
					"id": "essays",
					"title": "Essays",
					"order": 1,
					"visible": true,
					"fields": [
						{
							"id": "personal_essay",
							"type": "essay",
							"label": "Personal Essay",
							"required": true,
							"dataKey": "personal_essay",
							"validation": { "wordLimit": 3 }
						}
					]
				}
			]
		}`)))

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	err = SubmitApplication(ctx, userID, universityID, cycle)
	if err == nil {
		t.Fatalf("SubmitApplication unexpectedly succeeded")
	}
	if !strings.Contains(err.Error(), "Personal Essay exceeds the 3-word limit") {
		t.Fatalf("unexpected validation error: %v", err)
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

func TestExtractProfileGenderSupportsAllApplicantBuckets(t *testing.T) {
	tests := []struct {
		name string
		raw  []byte
		want string
	}{
		{name: "male", raw: []byte(`{"gender":"male"}`), want: "male"},
		{name: "female", raw: []byte(`{"gender":"female"}`), want: "female"},
		{name: "non binary", raw: []byte(`{"gender":"non-binary"}`), want: "non_binary"},
		{name: "legacy other", raw: []byte(`{"gender":"other"}`), want: "non_binary"},
		{name: "prefer not to say", raw: []byte(`{"gender":"prefer not to say"}`), want: "prefer_not_to_say"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := extractProfileGender(tt.raw); got != tt.want {
				t.Fatalf("extractProfileGender() = %q, want %q", got, tt.want)
			}
		})
	}
}
