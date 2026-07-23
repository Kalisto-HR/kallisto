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
	if visibility["applicant"] != true || visibility["partner"] != true || visibility["staff"] != true {
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

func TestNormalizeApplicationSchemaMapsBuilderSchemaToApplicantSections(t *testing.T) {
	t.Parallel()

	raw := json.RawMessage(`{
		"schemaType": "application_builder_v1",
		"overview": {
			"instructions": "Complete every required item.",
			"deadline": "2026-08-01"
		},
		"programs": {
			"allowNoProgram": false
		},
		"profileRequirements": [
			{ "key": "phone", "label": "Phone", "state": "required" },
			{ "key": "postal_code", "label": "Postal code", "state": "not_requested" }
		],
		"educationRequirements": [
			{ "key": "hsk", "label": "HSK", "state": "optional" },
			{ "key": "csca", "label": "CSCA", "state": "required" }
		],
		"documents": [
			{
				"id": "passport",
				"name": "Passport",
				"required": true,
				"formats": [".pdf"],
				"maxFileSizeMb": 5,
				"maxFiles": 1
			}
		],
		"questions": [
			{ "id": "scholarship", "type": "yes_no", "text": "Are you applying for a scholarship?", "required": false }
		],
		"rules": {
			"declaration": "I confirm the information is accurate."
		}
	}`)

	normalized := decodeNormalizedSchema(t, NormalizeApplicationSchema(raw))
	sections := normalized["sections"].([]any)
	if len(sections) != 7 {
		t.Fatalf("unexpected builder section count: got %d want 7", len(sections))
	}

	requireField(t, sections, "applicant-information", "profile_phone", "Phone", "phone", true)
	requireField(t, sections, "education", "education_hsk", "HSK", "short-text", false)
	requireField(t, sections, "education", "education_csca", "CSCA", "short-text", true)
	requireField(t, sections, "documents", "document_passport", "Passport", "document", true)

	question := requireField(t, sections, "additional-questions", "question_scholarship", "Are you applying for a scholarship?", "radio", false)
	options := question["options"].([]any)
	if len(options) != 2 || options[0] != "Yes" || options[1] != "No" {
		t.Fatalf("unexpected yes/no options: %#v", options)
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

func requireField(t *testing.T, sections []any, sectionID, fieldID, label, fieldType string, required bool) map[string]any {
	t.Helper()

	for _, rawSection := range sections {
		section := rawSection.(map[string]any)
		if section["id"] != sectionID {
			continue
		}
		for _, rawField := range section["fields"].([]any) {
			field := rawField.(map[string]any)
			if field["id"] != fieldID {
				continue
			}
			if field["label"] != label {
				t.Fatalf("unexpected label for %s: got %#v want %q", fieldID, field["label"], label)
			}
			if field["type"] != fieldType {
				t.Fatalf("unexpected type for %s: got %#v want %q", fieldID, field["type"], fieldType)
			}
			if field["required"] != required {
				t.Fatalf("unexpected required for %s: got %#v want %v", fieldID, field["required"], required)
			}
			return field
		}
		t.Fatalf("field %s not found in section %s", fieldID, sectionID)
	}

	t.Fatalf("section %s not found", sectionID)
	return nil
}
