package usecases_impl

import (
	"context"
	"encoding/json"
	"regexp"
	"testing"
	"time"

	"kallisto/infra/middlewares"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestGetUniversityByIdNormalizesLegacyApplicationSchema(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	queryPattern := `(?s)` + regexp.QuoteMeta(`SELECT id, manager_id, name, logo, description, province, city, country,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available,
		        city_type, campus_vibe, application_schema, university_profile, ranking,
		        created_at, metadata, application_fee
		 FROM universities
		 WHERE id=$1`)

	rawSchema := []byte(`{
		"fields": [
			{ "name": "gpa", "type": "number", "required": true },
			{ "name": "personal_statement", "type": "text", "required": true }
		]
	}`)
	city := "Tashkent"
	country := "Uzbekistan"
	ranking := 8
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
				"university_profile",
				"ranking",
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
				rawSchema,
				nil,
				&ranking,
				time.Now().UTC(),
				nil,
				&applicationFee,
			),
		)

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	university, err := GetUniversityById(ctx, "wiut-id")
	if err != nil {
		t.Fatalf("GetUniversityById returned error: %v", err)
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

func decodeSchemaForUniversityTest(t *testing.T, raw json.RawMessage) map[string]any {
	t.Helper()

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("failed to decode schema: %v", err)
	}
	return out
}
