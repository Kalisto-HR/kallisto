package usecases_impl

import (
	"context"
	"encoding/json"
	"regexp"
	"testing"

	"kallisto/infra/middlewares"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestGetUniversityApplicationStructureNormalizesLegacySchema(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	queryPattern := regexp.QuoteMeta("SELECT application_schema FROM universities WHERE id = $1")
	mock.ExpectQuery(queryPattern).
		WithArgs("wiut-id").
		WillReturnRows(
			pgxmock.NewRows([]string{"application_schema"}).AddRow([]byte(`{
				"fields": [
					{ "name": "gpa", "type": "number", "required": true },
					{ "name": "ielts_score", "type": "number", "required": true },
					{ "name": "personal_statement", "type": "text", "required": true }
				]
			}`)),
		)

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	schema, err := GetUniversityApplicationStructure(ctx, "wiut-id")
	if err != nil {
		t.Fatalf("GetUniversityApplicationStructure returned error: %v", err)
	}

	decoded := decodeAdminSchema(t, schema)
	sections := decoded["sections"].([]any)
	if len(sections) != 1 {
		t.Fatalf("unexpected section count: got %d want 1", len(sections))
	}

	fields := sections[0].(map[string]any)["fields"].([]any)
	if len(fields) != 3 {
		t.Fatalf("unexpected field count: got %d want 3", len(fields))
	}
	if fields[2].(map[string]any)["label"] != "Personal Statement" {
		t.Fatalf("unexpected normalized label: %#v", fields[2].(map[string]any)["label"])
	}
	if fields[2].(map[string]any)["type"] != "essay" {
		t.Fatalf("unexpected normalized field type: %#v", fields[2].(map[string]any)["type"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}

func decodeAdminSchema(t *testing.T, raw json.RawMessage) map[string]any {
	t.Helper()

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("failed to decode schema: %v", err)
	}
	return out
}
