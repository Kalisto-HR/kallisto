package usecases_impl

import (
	"context"
	"encoding/json"
	"regexp"
	"testing"
	"time"

	"kallisto/infra/middlewares"

	"github.com/jackc/pgx/v5"
	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestGetUniversityByIdUsesLatestPublishedApplicationSchema(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	queryPattern := `(?s)` + regexp.QuoteMeta(`SELECT id, manager_id, name, logo, description, province, city, country,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available,
		        city_type, campus_vibe, application_schema,
		        EXISTS(
		            SELECT 1
		            FROM university_application_structure_versions
		            WHERE university_id = universities.id AND published = TRUE
		        ) AS application_structure_published,
		        university_profile,
		        created_at, metadata, application_fee
		 FROM universities
		 WHERE id=$1`)

	publishedSchema := []byte(`{
		"fields": [
			{ "name": "gpa", "type": "number", "required": true },
			{ "name": "personal_statement", "type": "text", "required": true }
		]
	}`)
	city := "Tashkent"
	country := "Uzbekistan"
	applicationFee := 150.0

	mock.ExpectQuery(queryPattern).
		WithArgs("wiut-id").
		WillReturnRows(
			pgxmock.NewRows([]string{
				"id",
				"manager_id",
				"name",
				"logo",
				"description",
				"province",
				"city",
				"country",
				"acceptance_rate",
				"tuition_fee",
				"application_deadline",
				"ielts_min",
				"toefl_min",
				"scholarship_available",
				"city_type",
				"campus_vibe",
				"application_schema",
				"application_structure_published",
				"university_profile",
				"created_at",
				"metadata",
				"application_fee",
			}).AddRow(
				"wiut-id",
				nil,
				"Westminster International University in Tashkent",
				nil,
				nil,
				nil,
				&city,
				&country,
				nil,
				nil,
				nil,
				nil,
				nil,
				nil,
				nil,
				nil,
				nil,
				true,
				nil,
				time.Now().UTC(),
				nil,
				&applicationFee,
			),
		)
	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT schema
		FROM university_application_structure_versions
		WHERE university_id = $1 AND published = TRUE
		ORDER BY version_no DESC
		LIMIT 1
	`)).
		WithArgs("wiut-id").
		WillReturnRows(pgxmock.NewRows([]string{"schema"}).AddRow(publishedSchema))

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	university, err := GetUniversityById(ctx, "wiut-id")
	if err != nil {
		t.Fatalf("GetUniversityById returned error: %v", err)
	}
	if !university.ApplicationStructurePublished {
		t.Fatalf("expected published structure flag to be true")
	}

	decoded := decodeSchemaForUniversityTest(t, university.ApplicationSchema)
	sections := decoded["sections"].([]any)
	if len(sections) != 1 {
		t.Fatalf("unexpected section count: got %d want 1", len(sections))
	}

	fields := sections[0].(map[string]any)["fields"].([]any)
	if len(fields) != 2 {
		t.Fatalf("unexpected field count: got %d want 2", len(fields))
	}
	if fields[0].(map[string]any)["type"] != "number" {
		t.Fatalf("expected first field to stay numeric, got %#v", fields[0].(map[string]any)["type"])
	}
	if fields[1].(map[string]any)["type"] != "essay" {
		t.Fatalf("expected personal_statement to normalize to essay, got %#v", fields[1].(map[string]any)["type"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}

func TestGetUniversityByIdFallsBackWhenNoPublishedApplicationSchemaExists(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	queryPattern := `(?s)` + regexp.QuoteMeta(`SELECT id, manager_id, name, logo, description, province, city, country,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available,
		        city_type, campus_vibe, application_schema,
		        EXISTS(
		            SELECT 1
		            FROM university_application_structure_versions
		            WHERE university_id = universities.id AND published = TRUE
		        ) AS application_structure_published,
		        university_profile,
		        created_at, metadata, application_fee
		 FROM universities
		 WHERE id=$1`)

	city := "Bukhara"
	country := "Uzbekistan"
	applicationFee := 120.0

	mock.ExpectQuery(queryPattern).
		WithArgs("bukhara-id").
		WillReturnRows(
			pgxmock.NewRows([]string{
				"id",
				"manager_id",
				"name",
				"logo",
				"description",
				"province",
				"city",
				"country",
				"acceptance_rate",
				"tuition_fee",
				"application_deadline",
				"ielts_min",
				"toefl_min",
				"scholarship_available",
				"city_type",
				"campus_vibe",
				"application_schema",
				"application_structure_published",
				"university_profile",
				"created_at",
				"metadata",
				"application_fee",
			}).AddRow(
				"bukhara-id",
				nil,
				"Bukhara State University",
				nil,
				nil,
				nil,
				&city,
				&country,
				nil,
				nil,
				nil,
				nil,
				nil,
				nil,
				nil,
				nil,
				nil,
				false,
				nil,
				time.Now().UTC(),
				nil,
				&applicationFee,
			),
		)
	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT schema
		FROM university_application_structure_versions
		WHERE university_id = $1 AND published = TRUE
		ORDER BY version_no DESC
		LIMIT 1
	`)).
		WithArgs("bukhara-id").
		WillReturnError(pgx.ErrNoRows)

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	university, err := GetUniversityById(ctx, "bukhara-id")
	if err != nil {
		t.Fatalf("GetUniversityById returned error: %v", err)
	}
	if university.ApplicationStructurePublished {
		t.Fatalf("expected fallback baseline to be marked unpublished")
	}

	decoded := decodeSchemaForUniversityTest(t, university.ApplicationSchema)
	sections := decoded["sections"].([]any)
	if len(sections) != 1 {
		t.Fatalf("unexpected fallback section count: got %d want 1", len(sections))
	}

	fields := sections[0].(map[string]any)["fields"].([]any)
	if len(fields) != 4 {
		t.Fatalf("unexpected fallback field count: got %d want 4", len(fields))
	}
	if fields[0].(map[string]any)["label"] != "Full Name" {
		t.Fatalf("expected fallback schema to expose applicant baseline, got %#v", fields[0].(map[string]any)["label"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}

func decodeSchemaForUniversityTest(t *testing.T, raw json.RawMessage) map[string]any {
	t.Helper()

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("failed to decode schema: %v", err)
	}
	return out
}
