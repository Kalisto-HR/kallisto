package usecases_impl

import (
	"context"
	"regexp"
	"testing"
	"time"

	"kallisto/infra/middlewares"
	"kallisto/services/admin/internal/models"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestGetSubmittedApplicationsBuildsFallbackSearchAndCitizenshipFilters(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	search := "jane doe"
	citizenship := "Kazakhstan"
	query := models.SubmittedApplicationsQuery{
		Search:      &search,
		Citizenship: &citizenship,
		Page:        1,
		Limit:       20,
	}

	queryPattern := `(?s)` + regexp.QuoteMeta(submittedApplicantNameExpr()) + `.*` + regexp.QuoteMeta(submittedApplicantCitizenshipExpr())

	mock.ExpectQuery(queryPattern).
		WithArgs("%"+search+"%", citizenship).
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(1))

	now := time.Now().UTC()
	mock.ExpectQuery(queryPattern).
		WithArgs("%"+search+"%", citizenship, 20, 0).
		WillReturnRows(
			pgxmock.NewRows([]string{
				"id",
				"user_id",
				"university_id",
				"application_cycle",
				"applicant_info",
				"application_data",
				"submitted_at",
				"received_at",
				"status",
			}).AddRow(
				"app-1",
				"user-1",
				"uni-1",
				"2026-Fall",
				[]byte(`{"first_name":"Jane","last_name":"Doe"}`),
				[]byte(`{"citizenship":"Kazakhstan"}`),
				nil,
				now,
				"pending",
			),
		)

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	items, total, err := GetSubmittedApplications(ctx, query)
	if err != nil {
		t.Fatalf("GetSubmittedApplications returned error: %v", err)
	}
	if total != 1 {
		t.Fatalf("unexpected total: got %d want 1", total)
	}
	if len(items) != 1 {
		t.Fatalf("unexpected item count: got %d want 1", len(items))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}

func TestSubmittedApplicationFallbackExpressionsCoverLegacyFields(t *testing.T) {
	t.Parallel()

	nameExpr := submittedApplicantNameExpr()
	if !regexp.MustCompile(`first_name.*last_name`).MatchString(nameExpr) {
		t.Fatalf("name fallback expression does not include first/last name fields: %s", nameExpr)
	}

	citizenshipExpr := submittedApplicantCitizenshipExpr()
	if !regexp.MustCompile(`applicant_info->>'citizenship'.*application_data->>'citizenship'`).MatchString(citizenshipExpr) {
		t.Fatalf("citizenship fallback expression does not include legacy application data: %s", citizenshipExpr)
	}
}
