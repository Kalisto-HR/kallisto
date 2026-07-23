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
	"csca":  "CSCA",
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

	if asString(doc["schemaType"]) == "application_builder_v1" {
		doc["sections"] = normalizeBuilderSchemaSections(doc)
		return mustMarshalJSON(doc)
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

func normalizeBuilderSchemaSections(doc map[string]any) []any {
	sections := []any{}
	order := 1

	if overview, ok := doc["overview"].(map[string]any); ok {
		fields := []any{}
		if instructions := asString(overview["instructions"]); instructions != "" {
			fields = append(fields, schemaInfoField("application_instructions", "Application instructions", instructions, len(fields)+1))
		}
		if deadline := asString(overview["deadline"]); deadline != "" {
			fields = append(fields, schemaInfoField("application_deadline", "Application deadline", deadline, len(fields)+1))
		}
		if len(fields) > 0 {
			sections = append(sections, schemaSection("application-overview", "Application Overview", "Published instructions from the university.", order, fields))
			order++
		}
	}

	if programs, ok := doc["programs"].(map[string]any); ok {
		fields := []any{}
		if asBool(programs["allowNoProgram"], false) {
			fields = append(fields, schemaInfoField("program_choice_notice", "Program choice", "This application can be submitted without selecting a specific program.", 1))
		} else {
			fields = append(fields, map[string]any{
				"id":         "program_choice",
				"dataKey":    "program_choice",
				"type":       "short-text",
				"label":      "Program choice",
				"required":   true,
				"order":      1,
				"helperText": "Enter the program you are applying for.",
				"visibility": defaultSchemaVisibility(),
			})
		}
		sections = append(sections, schemaSection("program-choice", "Program Choice", "Program selection rules for this application.", order, fields))
		order++
	}

	if profileRequirements, ok := doc["profileRequirements"].([]any); ok {
		fields := builderRequirementFields(profileRequirements, "profile", 1)
		if len(fields) > 0 {
			sections = append(sections, schemaSection("applicant-information", "Applicant Information", "Information required by the university.", order, fields))
			order++
		}
	}

	if educationRequirements, ok := doc["educationRequirements"].([]any); ok {
		fields := builderRequirementFields(educationRequirements, "education", 1)
		if len(fields) > 0 {
			sections = append(sections, schemaSection("education", "Education", "Academic information required by the university.", order, fields))
			order++
		}
	}

	if documents, ok := doc["documents"].([]any); ok {
		fields := builderDocumentFields(documents)
		if len(fields) > 0 {
			sections = append(sections, schemaSection("documents", "Documents", "Upload the documents requested by the university.", order, fields))
			order++
		}
	}

	if questions, ok := doc["questions"].([]any); ok {
		fields := builderQuestionFields(questions)
		if len(fields) > 0 {
			sections = append(sections, schemaSection("additional-questions", "Additional Questions", "University-specific questions.", order, fields))
			order++
		}
	}

	if rules, ok := doc["rules"].(map[string]any); ok {
		fields := []any{}
		if declaration := asString(rules["declaration"]); declaration != "" {
			fields = append(fields, schemaAgreementField("declaration", "Declaration", declaration, len(fields)+1))
		}
		if consent := asString(rules["consent"]); consent != "" {
			fields = append(fields, schemaAgreementField("consent", "Consent", consent, len(fields)+1))
		}
		if len(fields) > 0 {
			sections = append(sections, schemaSection("declarations", "Declarations", "Confirm the required statements before submitting.", order, fields))
		}
	}

	return normalizeCanonicalSchemaSections(sections)
}

func builderRequirementFields(rawItems []any, prefix string, startOrder int) []any {
	fields := []any{}
	for _, rawItem := range rawItems {
		item, ok := rawItem.(map[string]any)
		if !ok {
			continue
		}
		state := strings.ToLower(asString(item["state"]))
		if state == "" || state == "not_requested" {
			continue
		}
		label := firstNonEmptyString(asString(item["label"]), humanizeSchemaIdentifier(asString(item["key"])))
		fieldID := slugifySchemaIdentifier(firstNonEmptyString(asString(item["key"]), label))
		if fieldID == "" {
			fieldID = prefix + "-" + intString(len(fields)+1)
		}
		fields = append(fields, map[string]any{
			"id":         prefix + "_" + fieldID,
			"dataKey":    prefix + "_" + fieldID,
			"type":       builderRequirementFieldType(label),
			"label":      label,
			"required":   state == "required",
			"order":      startOrder + len(fields),
			"helperText": asString(item["condition"]),
			"visibility": defaultSchemaVisibility(),
		})
	}
	return fields
}

func builderRequirementFieldType(label string) string {
	normalized := strings.ToLower(label)
	switch {
	case strings.Contains(normalized, "email"):
		return "email"
	case strings.Contains(normalized, "phone"):
		return "phone"
	case strings.Contains(normalized, "birth") || strings.Contains(normalized, "date"):
		return "date"
	case strings.Contains(normalized, "gpa") || strings.Contains(normalized, "year"):
		return "number"
	case strings.Contains(normalized, "country"):
		return "country"
	default:
		return "short-text"
	}
}

func builderDocumentFields(rawDocuments []any) []any {
	fields := []any{}
	for _, rawDocument := range rawDocuments {
		document, ok := rawDocument.(map[string]any)
		if !ok {
			continue
		}
		name := asString(document["name"])
		if name == "" {
			continue
		}
		fieldID := slugifySchemaIdentifier(firstNonEmptyString(asString(document["id"]), name))
		validation := map[string]any{}
		if formats, ok := document["formats"].([]any); ok {
			fileTypes := []any{}
			for _, format := range formats {
				if value := asString(format); value != "" {
					fileTypes = append(fileTypes, value)
				}
			}
			if len(fileTypes) > 0 {
				validation["fileTypes"] = fileTypes
			}
		}
		if maxFileSizeMb := asInt(document["maxFileSizeMb"], 0); maxFileSizeMb > 0 {
			validation["maxFileSize"] = maxFileSizeMb * 1024 * 1024
		}
		if maxFiles := asInt(document["maxFiles"], 0); maxFiles > 0 {
			validation["maxFiles"] = maxFiles
		}
		fields = append(fields, map[string]any{
			"id":         "document_" + fieldID,
			"dataKey":    "document_" + fieldID,
			"type":       "document",
			"label":      name,
			"required":   asBool(document["required"], false),
			"order":      len(fields) + 1,
			"helperText": firstNonEmptyString(asString(document["instructions"]), asString(document["description"])),
			"validation": validation,
			"visibility": defaultSchemaVisibility(),
		})
	}
	return fields
}

func builderQuestionFields(rawQuestions []any) []any {
	fields := []any{}
	for _, rawQuestion := range rawQuestions {
		question, ok := rawQuestion.(map[string]any)
		if !ok {
			continue
		}
		text := asString(question["text"])
		if text == "" {
			continue
		}
		fieldID := slugifySchemaIdentifier(firstNonEmptyString(asString(question["id"]), text))
		field := map[string]any{
			"id":         "question_" + fieldID,
			"dataKey":    "question_" + fieldID,
			"type":       builderQuestionFieldType(asString(question["type"])),
			"label":      text,
			"required":   asBool(question["required"], false),
			"order":      len(fields) + 1,
			"helperText": asString(question["helperText"]),
			"visibility": defaultSchemaVisibility(),
		}
		if options, ok := question["options"].([]any); ok {
			outOptions := []any{}
			for _, option := range options {
				if value := asString(option); value != "" {
					outOptions = append(outOptions, value)
				}
			}
			if len(outOptions) > 0 {
				field["options"] = outOptions
			}
		}
		if field["type"] == "radio" {
			if _, hasOptions := field["options"]; !hasOptions && strings.EqualFold(asString(question["type"]), "yes_no") {
				field["options"] = []any{"Yes", "No"}
			}
		}
		fields = append(fields, field)
	}
	return fields
}

func builderQuestionFieldType(rawType string) string {
	switch strings.ToLower(strings.TrimSpace(rawType)) {
	case "long_text":
		return "long-text"
	case "single_choice":
		return "radio"
	case "multiple_choice":
		return "checkbox"
	case "yes_no":
		return "radio"
	case "file_upload":
		return "file-upload"
	case "date", "number", "dropdown":
		return rawType
	default:
		return "short-text"
	}
}

func schemaSection(id, title, description string, order int, fields []any) map[string]any {
	return map[string]any{
		"id":          id,
		"name":        title,
		"title":       title,
		"description": description,
		"order":       order,
		"visible":     true,
		"fields":      fields,
	}
}

func schemaInfoField(id, label, helperText string, order int) map[string]any {
	return map[string]any{
		"id":         id,
		"dataKey":    id,
		"type":       "long-text",
		"label":      label,
		"required":   false,
		"order":      order,
		"helperText": helperText,
		"visibility": defaultSchemaVisibility(),
	}
}

func schemaAgreementField(id, label, helperText string, order int) map[string]any {
	return map[string]any{
		"id":         id,
		"dataKey":    id,
		"type":       "agreement",
		"label":      label,
		"required":   true,
		"order":      order,
		"helperText": helperText,
		"visibility": defaultSchemaVisibility(),
	}
}

func defaultSchemaVisibility() map[string]any {
	return map[string]any{
		"applicant": true,
		"partner":   true,
		"staff":     true,
	}
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
		"partner":   true,
		"staff":     true,
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

	for _, key := range []string{"applicant", "partner", "staff"} {
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
