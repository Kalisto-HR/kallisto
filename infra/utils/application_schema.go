package utils

import (
	"bytes"
	"encoding/json"
	"strconv"
	"strings"
	"unicode"
)

const defaultApplicationSchemaSectionTitle = "Application Form"

var schemaAcronyms = map[string]string{
	"act":   "ACT",
	"dob":   "DOB",
	"gpa":   "GPA",
	"gre":   "GRE",
	"gmat":  "GMAT",
	"id":    "ID",
	"ielts": "IELTS",
	"sat":   "SAT",
	"toefl": "TOEFL",
}

func NormalizeApplicationSchema(raw json.RawMessage) json.RawMessage {
	defaultSchema := map[string]any{"sections": []any{}}

	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		return mustMarshalJSON(defaultSchema)
	}

	var doc map[string]any
	if err := json.Unmarshal(trimmed, &doc); err != nil || doc == nil {
		return mustMarshalJSON(defaultSchema)
	}

	if sections, ok := doc["sections"].([]any); ok {
		doc["sections"] = normalizeCanonicalSchemaSections(sections)
		delete(doc, "fields")
		return mustMarshalJSON(doc)
	}

	if fields, ok := doc["fields"].([]any); ok {
		doc["sections"] = []any{
			map[string]any{
				"id":      "application-form",
				"name":    defaultApplicationSchemaSectionTitle,
				"title":   defaultApplicationSchemaSectionTitle,
				"order":   1,
				"visible": true,
				"fields":  normalizeLegacySchemaFields(fields),
			},
		}
		delete(doc, "fields")
		return mustMarshalJSON(doc)
	}

	doc["sections"] = []any{}
	delete(doc, "fields")
	return mustMarshalJSON(doc)
}

func normalizeCanonicalSchemaSections(rawSections []any) []any {
	sections := make([]any, 0, len(rawSections))
	for index, rawSection := range rawSections {
		current, ok := rawSection.(map[string]any)
		if !ok {
			continue
		}

		fields, ok := current["fields"].([]any)
		if !ok {
			continue
		}

		out := copyAnyMap(current)
		sectionID := firstNonEmptyString(asString(out["id"]), slugifySchemaIdentifier(asString(out["title"])), slugifySchemaIdentifier(asString(out["name"])))
		if sectionID == "" {
			sectionID = "section-" + intString(index+1)
		}

		sectionTitle := firstNonEmptyString(asString(out["title"]), asString(out["name"]), humanizeSchemaIdentifier(sectionID))
		out["id"] = sectionID
		out["title"] = sectionTitle
		out["name"] = firstNonEmptyString(asString(out["name"]), sectionTitle)
		out["order"] = asInt(out["order"], index+1)
		out["visible"] = asBool(out["visible"], true)
		out["fields"] = normalizeCanonicalSchemaFields(fields)
		sections = append(sections, out)
	}

	return sections
}

func normalizeCanonicalSchemaFields(rawFields []any) []any {
	fields := make([]any, 0, len(rawFields))
	for index, rawField := range rawFields {
		current, ok := rawField.(map[string]any)
		if !ok {
			continue
		}

		out := copyAnyMap(current)
		fieldID := firstNonEmptyString(asString(out["id"]), asString(out["dataKey"]))
		if fieldID == "" {
			fieldID = "field-" + intString(index+1)
		}

		out["id"] = fieldID
		out["dataKey"] = firstNonEmptyString(asString(out["dataKey"]), fieldID)
		out["label"] = firstNonEmptyString(asString(out["label"]), humanizeSchemaIdentifier(asString(out["dataKey"])), humanizeSchemaIdentifier(fieldID))
		out["type"] = firstNonEmptyString(asString(out["type"]), "short-text")
		out["order"] = asInt(out["order"], index+1)
		out["visibility"] = normalizeSchemaVisibility(out["visibility"])
		fields = append(fields, out)
	}

	return fields
}

func normalizeLegacySchemaFields(rawFields []any) []any {
	fields := make([]any, 0, len(rawFields))
	for index, rawField := range rawFields {
		current, ok := rawField.(map[string]any)
		if !ok {
			continue
		}

		out := copyAnyMap(current)
		name := firstNonEmptyString(asString(out["name"]), asString(out["dataKey"]), asString(out["id"]))
		if name == "" {
			name = "field-" + intString(index+1)
		}

		out["id"] = firstNonEmptyString(asString(out["id"]), name)
		out["dataKey"] = firstNonEmptyString(asString(out["dataKey"]), name)
		out["label"] = firstNonEmptyString(asString(out["label"]), humanizeSchemaIdentifier(name))
		out["type"] = normalizeLegacySchemaFieldType(asString(out["type"]), name)
		out["required"] = asBool(out["required"], false)
		out["order"] = asInt(out["order"], index+1)
		out["visibility"] = normalizeSchemaVisibility(out["visibility"])
		delete(out, "name")
		fields = append(fields, out)
	}

	return fields
}

func normalizeLegacySchemaFieldType(rawType, fieldName string) string {
	switch strings.ToLower(strings.TrimSpace(rawType)) {
	case "number":
		return "number"
	case "text":
		if isEssayLikeSchemaField(fieldName) {
			return "essay"
		}
		return "long-text"
	case "":
		return "short-text"
	default:
		return rawType
	}
}

func isEssayLikeSchemaField(fieldName string) bool {
	name := strings.ToLower(strings.TrimSpace(fieldName))
	return strings.Contains(name, "essay") ||
		strings.Contains(name, "statement") ||
		strings.Contains(name, "letter") ||
		strings.Contains(name, "motivation")
}

func normalizeSchemaVisibility(raw any) map[string]any {
	visibility := map[string]any{
		"applicant": true,
		"reviewer":  true,
		"admin":     true,
	}

	current, ok := raw.(map[string]any)
	if !ok {
		return visibility
	}

	for key, value := range current {
		if boolValue, ok := value.(bool); ok {
			visibility[key] = boolValue
		}
	}

	for _, key := range []string{"applicant", "reviewer", "admin"} {
		if _, ok := visibility[key].(bool); !ok {
			visibility[key] = true
		}
	}

	return visibility
}

func humanizeSchemaIdentifier(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "Field"
	}

	parts := strings.FieldsFunc(trimmed, func(r rune) bool {
		return r == '_' || r == '-' || unicode.IsSpace(r)
	})
	if len(parts) == 0 {
		return "Field"
	}

	words := make([]string, 0, len(parts))
	for _, part := range parts {
		lower := strings.ToLower(part)
		if acronym, ok := schemaAcronyms[lower]; ok {
			words = append(words, acronym)
			continue
		}
		runes := []rune(lower)
		runes[0] = unicode.ToUpper(runes[0])
		words = append(words, string(runes))
	}

	return strings.Join(words, " ")
}

func slugifySchemaIdentifier(raw string) string {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	if trimmed == "" {
		return ""
	}

	var builder strings.Builder
	lastDash := false
	for _, r := range trimmed {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			builder.WriteRune(r)
			lastDash = false
		case r == '_' || r == '-' || unicode.IsSpace(r):
			if builder.Len() > 0 && !lastDash {
				builder.WriteByte('-')
				lastDash = true
			}
		}
	}

	return strings.Trim(builder.String(), "-")
}

func copyAnyMap(source map[string]any) map[string]any {
	out := make(map[string]any, len(source))
	for key, value := range source {
		out[key] = value
	}
	return out
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func asString(value any) string {
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(text)
}

func asBool(value any, fallback bool) bool {
	boolValue, ok := value.(bool)
	if !ok {
		return fallback
	}
	return boolValue
}

func asInt(value any, fallback int) int {
	switch current := value.(type) {
	case int:
		return current
	case int32:
		return int(current)
	case int64:
		return int(current)
	case float32:
		return int(current)
	case float64:
		return int(current)
	default:
		return fallback
	}
}

func intString(value int) string {
	return strconv.Itoa(value)
}

func mustMarshalJSON(value any) json.RawMessage {
	out, err := json.Marshal(value)
	if err != nil {
		return json.RawMessage(`{"sections":[]}`)
	}
	return out
}
