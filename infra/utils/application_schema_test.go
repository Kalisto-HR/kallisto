package utils

import (
	"encoding/json"
	"testing"
)

func TestNormalizeApplicationSchemaPreservesSectionedSchemaAndFillsDefaults(t *testing.T) {
	t.Parallel()

	raw := json.RawMessage(`{
		"sections": [
			{
				"id": "essays",
				"title": "Essay Responses",
				"fields": [
					{
						"id": "personal_essay",
						"type": "essay",
						"label": "Personal Essay",
						"conditional": { "show": true }
					}
				]
			}
		]
	}`)

	normalized := decodeNormalizedSchema(t, NormalizeApplicationSchema(raw))
	sections := normalized["sections"].([]any)
	if len(sections) != 1 {
		t.Fatalf("unexpected section count: got %d want 1", len(sections))
	}

	section := sections[0].(map[string]any)
	if section["title"] != "Essay Responses" {
		t.Fatalf("unexpected section title: %#v", section["title"])
	}
	if section["name"] != "Essay Responses" {
		t.Fatalf("expected section name default to title, got %#v", section["name"])
	}
	if section["visible"] != true {
		t.Fatalf("expected section visible default, got %#v", section["visible"])
	}
	if section["order"] != float64(1) {
		t.Fatalf("expected section order default, got %#v", section["order"])
	}

	field := section["fields"].([]any)[0].(map[string]any)
	if field["dataKey"] != "personal_essay" {
		t.Fatalf("expected field dataKey default to id, got %#v", field["dataKey"])
	}
	if field["order"] != float64(1) {
		t.Fatalf("expected field order default, got %#v", field["order"])
	}
	visibility := field["visibility"].(map[string]any)
	if visibility["applicant"] != true || visibility["reviewer"] != true || visibility["admin"] != true {
		t.Fatalf("unexpected default visibility: %#v", visibility)
	}
	if _, ok := field["conditional"]; !ok {
		t.Fatalf("expected custom field metadata to be preserved")
	}
}

func TestNormalizeApplicationSchemaWrapsLegacyWIUTSchema(t *testing.T) {
	t.Parallel()

	raw := json.RawMessage(`{
		"fields": [
			{ "name": "gpa", "type": "number", "required": true },
			{ "name": "ielts_score", "type": "number", "required": true },
			{ "name": "personal_statement", "type": "text", "required": true }
		]
	}`)

	normalized := decodeNormalizedSchema(t, NormalizeApplicationSchema(raw))
	sections := normalized["sections"].([]any)
	if len(sections) != 1 {
		t.Fatalf("unexpected section count: got %d want 1", len(sections))
	}

	section := sections[0].(map[string]any)
	if section["title"] != defaultApplicationSchemaSectionTitle {
		t.Fatalf("unexpected legacy section title: %#v", section["title"])
	}

	fields := section["fields"].([]any)
	if len(fields) != 3 {
		t.Fatalf("unexpected field count: got %d want 3", len(fields))
	}

	assertNormalizedLegacyField(t, fields[0].(map[string]any), "gpa", "GPA", "number", 1)
	assertNormalizedLegacyField(t, fields[1].(map[string]any), "ielts_score", "IELTS Score", "number", 2)
	assertNormalizedLegacyField(t, fields[2].(map[string]any), "personal_statement", "Personal Statement", "essay", 3)
}

func TestNormalizeApplicationSchemaMapsLegacyTextFieldsToEssayOrLongText(t *testing.T) {
	t.Parallel()

	raw := json.RawMessage(`{
		"fields": [
			{ "name": "motivation_essay", "type": "text" },
			{ "name": "research_background", "type": "text" }
		]
	}`)

	normalized := decodeNormalizedSchema(t, NormalizeApplicationSchema(raw))
	fields := normalized["sections"].([]any)[0].(map[string]any)["fields"].([]any)

	if fields[0].(map[string]any)["type"] != "essay" {
		t.Fatalf("expected motivation_essay to normalize to essay, got %#v", fields[0].(map[string]any)["type"])
	}
	if fields[1].(map[string]any)["type"] != "long-text" {
		t.Fatalf("expected research_background to normalize to long-text, got %#v", fields[1].(map[string]any)["type"])
	}
}

func decodeNormalizedSchema(t *testing.T, raw json.RawMessage) map[string]any {
	t.Helper()

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("failed to decode normalized schema: %v", err)
	}
	return out
}

func assertNormalizedLegacyField(t *testing.T, field map[string]any, id, label, fieldType string, order int) {
	t.Helper()

	if field["id"] != id {
		t.Fatalf("unexpected field id: got %#v want %q", field["id"], id)
	}
	if field["dataKey"] != id {
		t.Fatalf("unexpected field dataKey: got %#v want %q", field["dataKey"], id)
	}
	if field["label"] != label {
		t.Fatalf("unexpected field label: got %#v want %q", field["label"], label)
	}
	if field["type"] != fieldType {
		t.Fatalf("unexpected field type: got %#v want %q", field["type"], fieldType)
	}
	if field["order"] != float64(order) {
		t.Fatalf("unexpected field order: got %#v want %d", field["order"], order)
	}
}
