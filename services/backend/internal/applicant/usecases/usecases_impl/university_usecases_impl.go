// university_usecases_impl.go implements university-related business logic.
package usecases_impl

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/applicant/models"
	"net/http"
	"regexp"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
)

var nonSlugCharacterPattern = regexp.MustCompile(`[^a-z0-9]+`)

var regionAliases = map[string]string{
	"tashkent":      "tashkent",
	"toshkent":      "tashkent",
	"tashkent-city": "tashkent",
	"toshkent-city": "tashkent",
	"samarkand":     "samarkand",
	"samarqand":     "samarkand",
	"bukhara":       "bukhara",
	"buxoro":        "bukhara",
	"andijan":       "andijan",
	"andijon":       "andijan",
	"fergana":       "fergana",
	"fargona":       "fergana",
	"farg-ona":      "fergana",
	"namangan":      "namangan",
	"nukus":         "nukus",
	"qarshi":        "qarshi",
	"karshi":        "qarshi",
	"urganch":       "urganch",
}

var regionLabels = map[string]string{
	"tashkent":  "Toshkent",
	"samarkand": "Samarqand",
	"bukhara":   "Buxoro",
	"andijan":   "Andijon",
	"fergana":   "Farg'ona",
	"namangan":  "Namangan",
	"nukus":     "Nukus",
	"qarshi":    "Qarshi",
	"urganch":   "Urganch",
}

var studyFormatTerms = map[string][]string{
	"full-time": {"full-time", "full time", "kunduzgi", "daytime"},
	"part-time": {"part-time", "part time", "sirtqi"},
	"evening":   {"evening", "kechki"},
	"distance":  {"distance", "online", "remote", "masofaviy"},
}

var studyFormatLabels = map[string]string{
	"full-time": "Kunduzgi",
	"part-time": "Sirtqi",
	"evening":   "Kechki",
	"distance":  "Masofaviy",
}

var languageTerms = map[string][]string{
	"uzbek":      {"uzbek", "o'zbek", "ozbek", "uzbekcha", "o'zbekcha"},
	"russian":    {"russian", "rus", "russian language", "rus tili"},
	"english":    {"english", "ingliz", "english language", "ingliz tili"},
	"karakalpak": {"karakalpak", "qoraqalpoq", "karakalpak language", "qoraqalpoq tili"},
}

var languageLabels = map[string]string{
	"uzbek":      "O'zbek",
	"russian":    "Rus",
	"english":    "Ingliz",
	"karakalpak": "Qoraqalpoq",
}

func GetAllUniversities(ctx context.Context, page, limit int) ([]models.UniversityListItem, int, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, 0, err
	}

	var total int
	err = conn.QueryRow(ctx, "SELECT COUNT(*) FROM universities WHERE is_active = TRUE").Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %s", err.Error())
	}

	offset := (page - 1) * limit
	rows, err := conn.Query(ctx,
		`SELECT id, name, description, province, city, country, application_fee,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available,
		        city_type, campus_vibe,
		        university_profile->>'programGroups' AS program_groups
		 FROM universities
		 WHERE is_active = TRUE
		 ORDER BY name ASC
		 LIMIT $1 OFFSET $2`,
		limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.UniversityListItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return items, total, nil
}

func GetUniversityById(ctx context.Context, id string) (*models.University, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(ctx,
		`SELECT id, manager_id, name, logo, description, province, city, country,
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
		 WHERE id=$1 AND is_active = TRUE`,
		id)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	university, err := pgx.RowToStructByName[models.University](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	applicationSchema, published, err := loadApplicantVisibleApplicationSchema(ctx, conn, id)
	if err != nil {
		return nil, err
	}
	university.ApplicationSchema = applicationSchema
	university.ApplicationStructurePublished = published

	return &university, nil
}

func loadApplicantVisibleApplicationSchema(ctx context.Context, conn middlewares.DB, universityId string) (json.RawMessage, bool, error) {
	var schemaRaw json.RawMessage
	err := conn.QueryRow(ctx, `
		SELECT schema
		FROM university_application_structure_versions
		WHERE university_id = $1 AND published = TRUE
		ORDER BY version_no DESC
		LIMIT 1
	`, universityId).Scan(&schemaRaw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return applicantFallbackApplicationSchema(), false, nil
		}
		return nil, false, fmt.Errorf("failed to load published application structure: %s", err.Error())
	}

	trimmed := strings.TrimSpace(string(schemaRaw))
	if trimmed == "" || trimmed == "null" {
		return applicantFallbackApplicationSchema(), false, nil
	}

	return utils.NormalizeApplicationSchema(schemaRaw), true, nil
}

func applicantFallbackApplicationSchema() json.RawMessage {
	raw, err := json.Marshal(map[string]any{
		"sections": []any{
			map[string]any{
				"id":          "personal-info",
				"name":        "Personal Information",
				"title":       "Personal Information",
				"description": "Basic applicant details",
				"order":       1,
				"visible":     true,
				"fields": []any{
					map[string]any{
						"id":       "full_name",
						"type":     "short-text",
						"label":    "Full Name",
						"required": true,
						"dataKey":  "full_name",
						"order":    1,
						"visibility": map[string]any{
							"applicant": true,
							"partner":   true,
							"staff":     true,
						},
					},
					map[string]any{
						"id":       "email",
						"type":     "email",
						"label":    "Email",
						"required": true,
						"dataKey":  "email",
						"order":    2,
						"visibility": map[string]any{
							"applicant": true,
							"partner":   true,
							"staff":     true,
						},
					},
					map[string]any{
						"id":       "dob",
						"type":     "date",
						"label":    "Date of Birth",
						"required": true,
						"dataKey":  "dob",
						"order":    3,
						"visibility": map[string]any{
							"applicant": true,
							"partner":   true,
							"staff":     true,
						},
					},
					map[string]any{
						"id":       "citizenship",
						"type":     "country",
						"label":    "Country of Citizenship",
						"required": true,
						"dataKey":  "citizenship",
						"order":    4,
						"visibility": map[string]any{
							"applicant": true,
							"partner":   true,
							"staff":     true,
						},
					},
				},
			},
		},
	})
	if err != nil {
		return json.RawMessage(`{"sections":[]}`)
	}
	return utils.NormalizeApplicationSchema(raw)
}

func slugifyFilterValue(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "ʻ", "'")
	normalized = strings.ReplaceAll(normalized, "‘", "'")
	normalized = strings.ReplaceAll(normalized, "'", "")
	normalized = nonSlugCharacterPattern.ReplaceAllString(normalized, "-")
	return strings.Trim(normalized, "-")
}

func normalizeRegionFilter(value string) string {
	slug := slugifyFilterValue(value)
	if canonical, ok := regionAliases[slug]; ok {
		return canonical
	}
	return slug
}

func regionMatchValues(region string) []string {
	canonical := normalizeRegionFilter(region)
	seen := map[string]bool{}
	values := []string{}
	add := func(value string) {
		value = strings.ToLower(strings.TrimSpace(value))
		if value == "" || seen[value] {
			return
		}
		seen[value] = true
		values = append(values, value)
	}

	add(canonical)
	if label := regionLabels[canonical]; label != "" {
		add(strings.ToLower(label))
	}
	for alias, aliasCanonical := range regionAliases {
		if aliasCanonical != canonical {
			continue
		}
		add(alias)
		add(strings.ReplaceAll(alias, "-", " "))
	}
	return values
}

func normalizeKnownValue(value string, allowed map[string][]string) string {
	slug := slugifyFilterValue(value)
	for canonical, terms := range allowed {
		if slug == canonical {
			return canonical
		}
		for _, term := range terms {
			if slug == slugifyFilterValue(term) {
				return canonical
			}
		}
	}
	return ""
}

func normalizeKnownValues(values []string, allowed map[string][]string) []string {
	seen := map[string]bool{}
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		canonical := normalizeKnownValue(value, allowed)
		if canonical == "" || seen[canonical] {
			continue
		}
		seen[canonical] = true
		normalized = append(normalized, canonical)
	}
	sort.Strings(normalized)
	return normalized
}

func universitySearchTextExpression() string {
	return `lower(
		COALESCE(university_profile::text, '') || ' ' ||
		COALESCE(metadata::text, '') || ' ' ||
		COALESCE(city_type, '') || ' ' ||
		COALESCE(campus_vibe, '')
	)`
}

func appendAnyTermFilter(whereClauses []string, args []any, argIndex int, values []string, terms map[string][]string) ([]string, []any, int) {
	if len(values) == 0 {
		return whereClauses, args, argIndex
	}

	groupClauses := make([]string, 0, len(values))
	for _, value := range values {
		valueTerms := terms[value]
		if len(valueTerms) == 0 {
			continue
		}
		termClauses := make([]string, 0, len(valueTerms))
		for _, term := range valueTerms {
			termClauses = append(termClauses, fmt.Sprintf("%s LIKE $%d", universitySearchTextExpression(), argIndex))
			args = append(args, "%"+strings.ToLower(term)+"%")
			argIndex++
		}
		groupClauses = append(groupClauses, "("+strings.Join(termClauses, " OR ")+")")
	}
	if len(groupClauses) > 0 {
		whereClauses = append(whereClauses, "("+strings.Join(groupClauses, " OR ")+")")
	}
	return whereClauses, args, argIndex
}

func SearchUniversities(ctx context.Context, params *models.UniversitySearchParams) ([]models.UniversityListItem, int, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, 0, err
	}

	whereClauses := []string{"is_active = TRUE"}
	var args []any
	argIndex := 1

	if params.Query != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("name ILIKE $%d", argIndex))
		args = append(args, "%"+params.Query+"%")
		argIndex++
	}
	if params.Province != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("province = $%d", argIndex))
		args = append(args, *params.Province)
		argIndex++
	}
	if params.City != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("city = $%d", argIndex))
		args = append(args, *params.City)
		argIndex++
	}
	if params.Country != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("country = $%d", argIndex))
		args = append(args, *params.Country)
		argIndex++
	}
	if params.Region != nil {
		regions := regionMatchValues(*params.Region)
		whereClauses = append(whereClauses, fmt.Sprintf("(city_slug = ANY($%d::text[]) OR lower(city) = ANY($%d::text[]) OR lower(province) = ANY($%d::text[]))", argIndex, argIndex, argIndex))
		args = append(args, regions)
		argIndex++
	}
	if params.MinPrice != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("tuition_fee IS NOT NULL AND tuition_fee >= $%d", argIndex))
		args = append(args, *params.MinPrice)
		argIndex++
	}
	if params.MaxPrice != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("tuition_fee IS NOT NULL AND tuition_fee <= $%d", argIndex))
		args = append(args, *params.MaxPrice)
		argIndex++
	}
	params.StudyFormats = normalizeKnownValues(params.StudyFormats, studyFormatTerms)
	params.Languages = normalizeKnownValues(params.Languages, languageTerms)
	whereClauses, args, argIndex = appendAnyTermFilter(whereClauses, args, argIndex, params.StudyFormats, studyFormatTerms)
	whereClauses, args, argIndex = appendAnyTermFilter(whereClauses, args, argIndex, params.Languages, languageTerms)
	if params.MaxFee != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("application_fee <= $%d", argIndex))
		args = append(args, *params.MaxFee)
		argIndex++
	}
	if params.MaxTuition != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("tuition_fee <= $%d", argIndex))
		args = append(args, *params.MaxTuition)
		argIndex++
	}

	if params.MinAcceptanceRate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("acceptance_rate >= $%d", argIndex))
		args = append(args, *params.MinAcceptanceRate)
		argIndex++
	}
	if params.MaxAcceptanceRate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("acceptance_rate <= $%d", argIndex))
		args = append(args, *params.MaxAcceptanceRate)
		argIndex++
	}
	if params.MinIelts != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("ielts_min <= $%d", argIndex))
		args = append(args, *params.MinIelts)
		argIndex++
	}
	if params.MinToefl != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("toefl_min <= $%d", argIndex))
		args = append(args, *params.MinToefl)
		argIndex++
	}
	if params.ScholarshipAvailable != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("scholarship_available = $%d", argIndex))
		args = append(args, *params.ScholarshipAvailable)
		argIndex++
	}
	if params.CityType != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("city_type = $%d", argIndex))
		args = append(args, *params.CityType)
		argIndex++
	}
	if params.CampusVibe != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("campus_vibe = $%d", argIndex))
		args = append(args, *params.CampusVibe)
		argIndex++
	}
	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM universities %s", whereClause)
	err = conn.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %s", err.Error())
	}

	offset := (params.Page - 1) * params.Limit
	selectQuery := fmt.Sprintf(
		`SELECT id, name, description, province, city, country, application_fee,
		        acceptance_rate, tuition_fee, application_deadline,
		        ielts_min, toefl_min, scholarship_available,
		        city_type, campus_vibe,
		        university_profile->>'programGroups' AS program_groups
		 FROM universities
		 %s
		 ORDER BY name ASC LIMIT $%d OFFSET $%d`,
		whereClause, argIndex, argIndex+1)
	args = append(args, params.Limit, offset)

	rows, err := conn.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.UniversityListItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return items, total, nil
}

func GetUniversityFilterOptions(ctx context.Context) (*models.UniversityFilterOptions, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	options := &models.UniversityFilterOptions{
		Regions:      []models.UniversityFilterOption{},
		StudyFormats: []models.UniversityFilterOption{},
		Languages:    []models.UniversityFilterOption{},
	}

	var minPrice, maxPrice *float64
	if err := conn.QueryRow(ctx, `
		SELECT MIN(tuition_fee), MAX(tuition_fee)
		FROM universities
		WHERE is_active = TRUE AND country_code = 'UZ' AND tuition_fee IS NOT NULL
	`).Scan(&minPrice, &maxPrice); err != nil {
		return nil, fmt.Errorf("failed to load university price filter range: %s", err.Error())
	}
	options.PriceRange.Min = minPrice
	options.PriceRange.Max = maxPrice

	rows, err := conn.Query(ctx, `
		SELECT city_slug, city, province, COALESCE(university_profile::text, '') || ' ' || COALESCE(metadata::text, '') AS searchable_text
		FROM universities
		WHERE is_active = TRUE AND country_code = 'UZ'
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to load university filter options: %s", err.Error())
	}
	defer rows.Close()

	regionSet := map[string]bool{}
	studyFormatSet := map[string]bool{}
	languageSet := map[string]bool{}
	for rows.Next() {
		var citySlug, city, province *string
		var searchableText string
		if err := rows.Scan(&citySlug, &city, &province, &searchableText); err != nil {
			return nil, fmt.Errorf("failed to scan university filter option: %s", err.Error())
		}
		for _, value := range []*string{citySlug, city, province} {
			if value == nil || strings.TrimSpace(*value) == "" {
				continue
			}
			region := normalizeRegionFilter(*value)
			if region != "" {
				regionSet[region] = true
				break
			}
		}
		lowerSearchableText := strings.ToLower(searchableText)
		for value, terms := range studyFormatTerms {
			for _, term := range terms {
				if strings.Contains(lowerSearchableText, strings.ToLower(term)) {
					studyFormatSet[value] = true
					break
				}
			}
		}
		for value, terms := range languageTerms {
			for _, term := range terms {
				if strings.Contains(lowerSearchableText, strings.ToLower(term)) {
					languageSet[value] = true
					break
				}
			}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate university filter options: %s", err.Error())
	}

	options.Regions = filterOptionList(regionSet, regionLabels)
	options.StudyFormats = filterOptionList(studyFormatSet, studyFormatLabels)
	options.Languages = filterOptionList(languageSet, languageLabels)
	return options, nil
}

func filterOptionList(values map[string]bool, labels map[string]string) []models.UniversityFilterOption {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	options := make([]models.UniversityFilterOption, 0, len(keys))
	for _, key := range keys {
		label := labels[key]
		if label == "" {
			label = strings.Title(strings.ReplaceAll(key, "-", " "))
		}
		options = append(options, models.UniversityFilterOption{Value: key, Label: label})
	}
	return options
}
