package usecases_impl

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/applicant/models"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const maxCompareItems = 4

type compareUniversityRow struct {
	Id                            string
	Slug                          *string
	Name                          string
	Province                      *string
	City                          *string
	Country                       *string
	TuitionFee                    *float64
	ApplicationDeadline           *time.Time
	ApplicationFee                *float64
	ScholarshipAvailable          *bool
	UniversityProfile             []byte
	ApplicationStructurePublished bool
}

func GetUserCompareList(ctx context.Context, userId string) ([]models.CompareUniversityItem, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	if err := pruneOrphanCompareRows(ctx, conn, userId); err != nil {
		return nil, err
	}

	rows, err := conn.Query(ctx, `
		SELECT 
			u.id, u.slug, u.name, u.province, u.city, u.country, u.tuition_fee,
			u.application_deadline, u.application_fee, u.scholarship_available,
			COALESCE(u.university_profile, '{}'::jsonb) AS university_profile,
			EXISTS (
				SELECT 1
				FROM university_application_structure_versions uasv
				WHERE uasv.university_id = u.id AND uasv.published = TRUE
			) AS application_structure_published
		FROM user_compare uc
		JOIN universities u ON u.id = uc.university_id
		WHERE uc.user_id = $1
		  AND u.is_active = TRUE
		  AND (
			LOWER(COALESCE(u.country, '')) = 'uzbekistan'
			OR UPPER(COALESCE(u.university_profile->>'countryCode', '')) = 'UZ'
		  )
		ORDER BY uc.created_at ASC
	`, userId)
	if err != nil {
		return nil, fmt.Errorf("failed to query compare universities: %s", err.Error())
	}
	defer rows.Close()

	items := make([]models.CompareUniversityItem, 0)
	for rows.Next() {
		var row compareUniversityRow
		if err := rows.Scan(
			&row.Id,
			&row.Slug,
			&row.Name,
			&row.Province,
			&row.City,
			&row.Country,
			&row.TuitionFee,
			&row.ApplicationDeadline,
			&row.ApplicationFee,
			&row.ScholarshipAvailable,
			&row.UniversityProfile,
			&row.ApplicationStructurePublished,
		); err != nil {
			return nil, fmt.Errorf("failed to scan compare universities: %s", err.Error())
		}

		items = append(items, buildCompareUniversityItem(row))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to scan compare universities: %s", err.Error())
	}

	return items, nil
}

func buildCompareUniversityItem(row compareUniversityRow) models.CompareUniversityItem {
	profile := map[string]any{}
	_ = json.Unmarshal(row.UniversityProfile, &profile)

	region, city := normalizeUzbekLocation(row.Province, row.City, profile)
	averageContract := averageContractAmount(row.TuitionFee, profile)
	deadline, deadlineStatus := compareDeadline(row.ApplicationDeadline, profile)
	canApply := row.ApplicationStructurePublished && deadlineStatus != "closed"

	return models.CompareUniversityItem{
		Id:                    row.Id,
		Slug:                  row.Slug,
		Name:                  row.Name,
		Region:                region,
		City:                  city,
		AverageContractAmount: averageContract,
		ContractCurrency:      "UZS",
		ContractPeriod:        "year",
		UniversityType:        nullableNormalizedUniversityType(stringFromProfile(profile, "universityType", "type")),
		LanguagesOfInstruction: normalizedUniqueValues(
			stringSliceFromProfile(profile, "languagesOfInstruction", "languages"),
			programValues(profile, "language"),
			normalizeLanguage,
		),
		StudyFormats: normalizedUniqueValues(
			stringSliceFromProfile(profile, "studyFormats"),
			programValues(profile, "studyFormat"),
			normalizeStudyFormat,
		),
		FinancialSupport: models.CompareFinancialSupport{
			Scholarships:     scholarshipStatus(row.ScholarshipAvailable, profile),
			GovernmentGrants: normalizedStatus(stringFromProfile(profile, "governmentGrants"), "not_provided"),
			TuitionDiscounts: normalizedStatus(stringFromProfile(profile, "tuitionDiscounts"), "not_provided"),
			OtherSupport:     normalizedStatus(stringFromProfile(profile, "otherFinancialSupport"), "not_provided"),
		},
		DormitoryStatus: normalizedStatus(stringFromProfile(profile, "dormitoryAvailability", "dormitoryStatus"), "not_provided"),
		DormitoryNote:   nullableString(stringFromProfile(profile, "dormitoryNotes", "dormitoryNote", "accommodation")),
		Accreditation: models.CompareAccreditation{
			LicenceStatus:                    normalizedStatus(stringFromProfile(profile, "licenceStatus", "licenseStatus"), "not_provided"),
			NationalAccreditationStatus:      accreditationStatus(profile, "nationalAccreditationStatus"),
			InternationalAccreditationStatus: accreditationStatus(profile, "internationalAccreditationStatus"),
		},
		InternationalPartnerships: internationalPartnerships(profile),
		Mobility: models.CompareMobility{
			Exchange:         normalizedStatus(stringFromProfile(profile, "studentExchange", "exchange"), "not_provided"),
			AcademicMobility: normalizedStatus(stringFromProfile(profile, "academicMobility"), "not_provided"),
			DoubleDegree:     normalizedStatus(stringFromProfile(profile, "doubleDegree"), "not_provided"),
			SemesterAbroad:   normalizedStatus(stringFromProfile(profile, "semesterAbroad"), "not_provided"),
		},
		CareerSupport: models.CompareCareerSupport{
			CareerCentre:            normalizedStatus(stringFromProfile(profile, "careerCentre", "careerCenter"), "not_provided"),
			InternshipSupport:       normalizedStatus(stringFromProfile(profile, "internshipSupport"), "not_provided"),
			EmployerPartnerships:    normalizedStatus(stringFromProfile(profile, "employerPartnerships"), "not_provided"),
			JobFairs:                normalizedStatus(stringFromProfile(profile, "jobFairs"), "not_provided"),
			EntrepreneurshipSupport: normalizedStatus(stringFromProfile(profile, "entrepreneurshipSupport"), "not_provided"),
			EmploymentData:          nullableString(stringFromProfile(profile, "employmentData")),
		},
		Admissions: models.CompareAdmissions{
			Deadline:       deadline,
			DeadlineStatus: deadlineStatus,
			UniversityApplicationFee: models.CompareApplicationFee{
				Amount:   intPointerFromFloat(row.ApplicationFee),
				Currency: "UZS",
				Status:   feeStatus(row.ApplicationFee, profile),
			},
			KallistoApplicationFee: models.CompareApplicationFee{
				Amount:   intPointer(10000),
				Currency: "UZS",
				Status:   "provided",
			},
			CanApplyThroughKallisto:   canApply,
			KallistoApplicationStatus: kallistoApplicationStatus(canApply, deadlineStatus),
		},
	}
}

func AddToCompare(ctx context.Context, userId, universityId string) (err error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return err
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin compare mutation transaction: %s", err.Error())
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err = lockCompareOwner(ctx, tx, userId); err != nil {
		return err
	}

	if err = pruneOrphanCompareRows(ctx, tx, userId); err != nil {
		return err
	}

	var exists bool
	if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM universities WHERE id=$1 AND is_active = TRUE)", universityId).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check university existence: %s", err.Error())
	}
	if !exists {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	var alreadyAdded bool
	if err = tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM user_compare uc
			JOIN universities u ON u.id = uc.university_id
			WHERE uc.user_id = $1 AND uc.university_id = $2 AND u.is_active = TRUE
		)
	`, userId, universityId).Scan(&alreadyAdded); err != nil {
		return fmt.Errorf("failed to check compare list membership: %s", err.Error())
	}
	if alreadyAdded {
		if err = tx.Commit(ctx); err != nil {
			return fmt.Errorf("failed to commit compare mutation transaction: %s", err.Error())
		}
		return nil
	}

	var currentCount int
	if err = tx.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM user_compare uc
		JOIN universities u ON u.id = uc.university_id
		WHERE uc.user_id = $1 AND u.is_active = TRUE
	`, userId).Scan(&currentCount); err != nil {
		return fmt.Errorf("failed to check compare list size: %s", err.Error())
	}
	if currentCount >= maxCompareItems {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "compare list supports up to 4 universities")
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO user_compare (user_id, university_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, university_id) DO NOTHING
	`, userId, universityId)
	if err != nil {
		return fmt.Errorf("failed to add university to compare list: %s", err.Error())
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit compare mutation transaction: %s", err.Error())
	}

	return nil
}

func RemoveFromCompare(ctx context.Context, userId, universityId string) error {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return err
	}

	_, err = conn.Exec(ctx, "DELETE FROM user_compare WHERE user_id=$1 AND university_id=$2", userId, universityId)
	if err != nil {
		return fmt.Errorf("failed to remove university from compare list: %s", err.Error())
	}

	return nil
}

func ClearCompare(ctx context.Context, userId string) error {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return err
	}

	_, err = conn.Exec(ctx, "DELETE FROM user_compare WHERE user_id=$1", userId)
	if err != nil {
		return fmt.Errorf("failed to clear compare list: %s", err.Error())
	}

	return nil
}

func pruneOrphanCompareRows(ctx context.Context, conn middlewares.DB, userId string) error {
	_, err := conn.Exec(ctx, `
		DELETE FROM user_compare uc
		WHERE uc.user_id = $1
		  AND NOT EXISTS (
			  SELECT 1
			  FROM universities u
			  WHERE u.id = uc.university_id
		  )
	`, userId)
	if err != nil {
		return fmt.Errorf("failed to prune orphan compare rows: %s", err.Error())
	}

	return nil
}

func lockCompareOwner(ctx context.Context, conn middlewares.DB, userId string) error {
	var locked int
	if err := conn.QueryRow(ctx, "SELECT 1 FROM users WHERE id = $1 FOR UPDATE", userId).Scan(&locked); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "user not found")
		}
		return fmt.Errorf("failed to lock compare owner: %s", err.Error())
	}

	return nil
}

func normalizeUzbekLocation(province, city *string, profile map[string]any) (*string, *string) {
	regionValue := normalizeCityValue(firstNonEmpty(ptrValue(province), stringFromProfile(profile, "region", "province", "citySlug")))
	cityValue := normalizeCityValue(firstNonEmpty(ptrValue(city), stringFromProfile(profile, "city")))
	if regionValue == "" && cityValue != "" {
		regionValue = cityValue
	}
	if cityValue == "" && regionValue != "" {
		cityValue = regionValue
	}
	if regionValue == cityValue {
		return nullableString(regionValue), nullableString(cityValue)
	}
	return nullableString(regionValue), nullableString(cityValue)
}

func normalizeCityValue(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "_", " ")
	normalized = strings.ReplaceAll(normalized, "-", " ")
	normalized = strings.Join(strings.Fields(normalized), " ")
	switch normalized {
	case "tashkent", "toshkent", "tashkent city", "tashkent shahri", "toshkent shahri":
		return "tashkent"
	case "samarkand", "samarqand":
		return "samarkand"
	case "bukhara", "buxoro":
		return "bukhara"
	case "andijan", "andijon":
		return "andijan"
	case "fergana", "fargona", "farg'ona":
		return "fergana"
	case "namangan":
		return "namangan"
	case "nukus":
		return "nukus"
	case "qarshi", "karshi":
		return "qarshi"
	case "urganch":
		return "urganch"
	default:
		return strings.TrimSpace(value)
	}
}

func averageContractAmount(topLevel *float64, profile map[string]any) *int {
	if topLevel != nil && *topLevel > 0 {
		return intPointer(int(math.Round(*topLevel)))
	}
	values := make([]float64, 0)
	for _, item := range arrayFromProfile(profile, "programs") {
		program, ok := item.(map[string]any)
		if !ok || boolFromAny(program["archived"]) || boolFromAny(program["isArchived"]) {
			continue
		}
		if !boolFromAny(program["contractVerified"]) && !boolFromAny(program["tuitionVerified"]) && !boolFromAny(program["verified"]) {
			continue
		}
		if amount, ok := numberFromAny(firstAny(program["annualContractAmount"], program["tuitionFee"], program["tuition_fee"])); ok && amount > 0 {
			values = append(values, amount)
		}
	}
	if len(values) == 0 {
		return nil
	}
	var sum float64
	for _, value := range values {
		sum += value
	}
	return intPointer(int(math.Round(sum / float64(len(values)))))
}

func compareDeadline(deadline *time.Time, profile map[string]any) (*string, string) {
	if boolFromAny(profile["rollingAdmission"]) {
		return nil, "open"
	}
	status := normalizedDeadlineStatus(stringFromProfile(profile, "applicationDeadlineStatus", "deadlineStatus"))
	if status != "" && status != "exact" {
		return nil, status
	}
	if deadline == nil {
		deadlines := uniqueNonEmpty(programValues(profile, "deadline"))
		if len(deadlines) > 1 {
			return nil, "varies_by_program"
		}
		return nil, "not_provided"
	}
	value := deadline.UTC().Format("2006-01-02")
	if time.Now().After(deadline.Add(24 * time.Hour)) {
		return &value, "closed"
	}
	return &value, "exact"
}

func kallistoApplicationStatus(canApply bool, deadlineStatus string) string {
	if canApply {
		return "open"
	}
	if deadlineStatus == "closed" {
		return "closed"
	}
	return "not_available"
}

func scholarshipStatus(value *bool, profile map[string]any) string {
	if explicit := normalizedStatus(stringFromProfile(profile, "scholarshipAvailability", "scholarships"), ""); explicit != "" {
		return explicit
	}
	if value == nil {
		return "not_provided"
	}
	if *value {
		return "available"
	}
	return "not_available"
}

func accreditationStatus(profile map[string]any, key string) string {
	if value := normalizedStatus(stringFromProfile(profile, key), ""); value != "" {
		return value
	}
	if len(stringSliceFromProfile(profile, "accreditations")) > 0 {
		return "verified"
	}
	return "not_provided"
}

func internationalPartnerships(profile map[string]any) models.CompareInternationalPartnerships {
	partners := stringSliceFromProfile(profile, "internationalPartnerships", "partnerships")
	count := len(partners)
	if raw, ok := numberFromAny(profile["internationalPartnershipCount"]); ok && raw > float64(count) {
		count = int(raw)
	}
	status := "not_provided"
	if count > 0 {
		status = "available"
	}
	if explicit := normalizedStatus(stringFromProfile(profile, "internationalPartnershipStatus"), ""); explicit != "" {
		status = explicit
	}
	if len(partners) > 3 {
		partners = partners[:3]
	}
	return models.CompareInternationalPartnerships{Status: status, VerifiedCount: count, Partners: partners}
}

func normalizedUniqueValues(primary, fallback []string, normalize func(string) string) []string {
	return uniqueNonEmpty(append(normalizedValues(primary, normalize), normalizedValues(fallback, normalize)...))
}

func normalizedValues(values []string, normalize func(string) string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if normalized := normalize(value); normalized != "" {
			out = append(out, normalized)
		}
	}
	return out
}

func normalizeLanguage(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "uzbek", "uz", "o'zbek", "o‘zbek":
		return "uzbek"
	case "russian", "ru", "rus":
		return "russian"
	case "english", "en":
		return "english"
	case "karakalpak":
		return "karakalpak"
	default:
		return ""
	}
}

func normalizeStudyFormat(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "_", "-")
	switch normalized {
	case "full-time", "full time", "kunduzgi":
		return "full_time"
	case "evening", "kechki":
		return "evening"
	case "part-time", "part time", "sirtqi":
		return "part_time"
	case "online", "distance", "masofaviy":
		return "online"
	default:
		return ""
	}
}

func nullableNormalizedUniversityType(value string) *string {
	switch strings.ToLower(strings.TrimSpace(strings.ReplaceAll(value, "_", " "))) {
	case "public", "state":
		return stringPointer("public")
	case "private":
		return stringPointer("private")
	case "international university", "international":
		return stringPointer("international_university")
	case "foreign university branch", "foreign branch":
		return stringPointer("foreign_university_branch")
	default:
		return nil
	}
}

func normalizedStatus(value, fallback string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")
	switch normalized {
	case "available", "active", "verified", "pending_verification", "limited", "varies", "not_available", "unavailable", "not_provided", "provided", "free":
		if normalized == "unavailable" {
			return "not_available"
		}
		return normalized
	case "":
		return fallback
	default:
		return fallback
	}
}

func normalizedDeadlineStatus(value string) string {
	normalized := normalizedStatus(value, "")
	switch normalized {
	case "available", "active":
		return "open"
	case "not_available":
		return "closed"
	case "varies":
		return "varies_by_program"
	case "not_provided":
		return "not_provided"
	default:
		return normalized
	}
}

func feeStatus(value *float64, profile map[string]any) string {
	if explicit := normalizedStatus(stringFromProfile(profile, "universityApplicationFeeStatus", "applicationFeeStatus"), ""); explicit != "" {
		return explicit
	}
	if value == nil {
		return "not_provided"
	}
	if *value == 0 {
		return "free"
	}
	return "provided"
}

func programValues(profile map[string]any, key string) []string {
	values := make([]string, 0)
	for _, item := range arrayFromProfile(profile, "programs") {
		program, ok := item.(map[string]any)
		if !ok || boolFromAny(program["archived"]) || boolFromAny(program["isArchived"]) {
			continue
		}
		if value := stringFromAny(firstAny(program[key], program[toSnake(key)])); value != "" {
			values = append(values, value)
		}
	}
	return values
}

func stringSliceFromProfile(profile map[string]any, keys ...string) []string {
	for _, key := range keys {
		values := stringSliceFromAny(profile[key])
		if len(values) > 0 {
			return values
		}
	}
	return []string{}
}

func arrayFromProfile(profile map[string]any, key string) []any {
	if values, ok := profile[key].([]any); ok {
		return values
	}
	return nil
}

func stringSliceFromAny(value any) []string {
	switch typed := value.(type) {
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if text := stringFromAny(item); text != "" {
				out = append(out, text)
			}
		}
		return out
	case []string:
		return typed
	case string:
		parts := strings.FieldsFunc(typed, func(r rune) bool { return r == ',' || r == ';' || r == '/' })
		out := make([]string, 0, len(parts))
		for _, part := range parts {
			if text := strings.TrimSpace(part); text != "" {
				out = append(out, text)
			}
		}
		return out
	default:
		return nil
	}
}

func stringFromProfile(profile map[string]any, keys ...string) string {
	for _, key := range keys {
		if value := stringFromAny(profile[key]); value != "" {
			return value
		}
	}
	return ""
}

func stringFromAny(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case fmt.Stringer:
		return strings.TrimSpace(typed.String())
	default:
		return ""
	}
}

func numberFromAny(value any) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, true
	case int:
		return float64(typed), true
	case json.Number:
		parsed, err := typed.Float64()
		return parsed, err == nil
	case string:
		parsed, err := strconvParseNumber(typed)
		return parsed, err == nil
	default:
		return 0, false
	}
}

func strconvParseNumber(value string) (float64, error) {
	cleaned := strings.ReplaceAll(strings.ReplaceAll(value, ",", ""), " ", "")
	return strconv.ParseFloat(cleaned, 64)
}

func boolFromAny(value any) bool {
	typed, ok := value.(bool)
	return ok && typed
}

func uniqueNonEmpty(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		out = append(out, trimmed)
	}
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func firstAny(values ...any) any {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func toSnake(value string) string {
	var out strings.Builder
	for index, r := range value {
		if index > 0 && r >= 'A' && r <= 'Z' {
			out.WriteRune('_')
		}
		out.WriteRune(r)
	}
	return strings.ToLower(out.String())
}

func ptrValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func nullableString(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return &value
}

func stringPointer(value string) *string {
	return &value
}

func intPointer(value int) *int {
	return &value
}

func intPointerFromFloat(value *float64) *int {
	if value == nil {
		return nil
	}
	return intPointer(int(math.Round(*value)))
}
