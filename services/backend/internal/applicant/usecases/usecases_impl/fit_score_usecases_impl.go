package usecases_impl

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
	"unicode"

	"kallisto/services/backend/internal/applicant/models"
)

const (
	academicWeight = 0.30
	languageWeight = 0.20
	majorWeight    = 0.20
	budgetWeight   = 0.15
	documentWeight = 0.10
	deadlineWeight = 0.05
)

var relatedMajorGroups = map[string][]string{
	"computing":   {"computer science", "ai", "artificial intelligence", "data science", "software engineering", "information technology", "cybersecurity"},
	"business":    {"business", "management", "marketing", "finance", "accounting", "economics", "commerce"},
	"health":      {"biology", "biochemistry", "biomedical science", "medicine", "medical", "pharmacy", "public health"},
	"engineering": {"engineering", "mechanical", "electrical", "civil", "chemical engineering", "industrial engineering"},
	"design":      {"design", "architecture", "urban planning", "visual communication", "digital media"},
}

var relatedMajorGroupOrder = []string{"computing", "business", "health", "engineering", "design"}

func CalculateFitScore(student models.FitScoreStudentProfile, program models.FitScoreProgram, now time.Time) models.FitScoreResult {
	reasons := make([]string, 0, 8)
	recommendations := make([]string, 0, 8)

	academicScore := scoreAcademicFit(student, program, &reasons, &recommendations)
	languageScore := scoreLanguageFit(student, program, &reasons, &recommendations)
	majorScore := scoreMajorFit(student, program, &reasons, &recommendations)
	budgetScore := scoreBudgetFit(student, program, &reasons, &recommendations)
	documentScore := scoreDocumentReadiness(student, program, &reasons, &recommendations)
	deadlineScore := scoreDeadlineFit(program, now, &reasons, &recommendations)

	final := academicScore*academicWeight +
		languageScore*languageWeight +
		majorScore*majorWeight +
		budgetScore*budgetWeight +
		documentScore*documentWeight +
		deadlineScore*deadlineWeight

	result := models.FitScoreResult{
		FinalScore: int(math.Round(clamp(final, 0, 100))),
		Breakdown: models.FitScoreBreakdown{
			AcademicScore: roundScore(academicScore),
			LanguageScore: roundScore(languageScore),
			MajorScore:    roundScore(majorScore),
			BudgetScore:   roundScore(budgetScore),
			DocumentScore: roundScore(documentScore),
			DeadlineScore: roundScore(deadlineScore),
		},
		Reasons:         dedupe(reasons),
		Recommendations: dedupe(recommendations),
	}
	result.Label = FitScoreLabel(result.FinalScore)
	result.Explanation = GenerateFitScoreExplanation(result, student, program)
	return result
}

func FitScoreLabel(score int) string {
	switch {
	case score >= 85:
		return "Excellent Fit"
	case score >= 70:
		return "Strong Fit"
	case score >= 55:
		return "Moderate Fit"
	case score >= 40:
		return "Risky Fit"
	default:
		return "Low Fit"
	}
}

func GenerateFitScoreExplanation(result models.FitScoreResult, _ models.FitScoreStudentProfile, program models.FitScoreProgram) string {
	programName := strings.TrimSpace(program.MajorName)
	if programName == "" {
		programName = "this program"
	}
	if len(result.Reasons) == 0 {
		return fmt.Sprintf("%s is scored as %s based on the available profile and program data.", programName, result.Label)
	}
	return fmt.Sprintf("%s is scored as %s. %s", programName, result.Label, strings.Join(result.Reasons, " "))
}

func scoreAcademicFit(student models.FitScoreStudentProfile, program models.FitScoreProgram, reasons *[]string, recommendations *[]string) float64 {
	if program.MinGPA == nil || *program.MinGPA <= 0 {
		*reasons = append(*reasons, "No minimum GPA is published, so academic fit is treated as neutral.")
		return 75
	}
	if student.GPA == nil || *student.GPA <= 0 {
		*reasons = append(*reasons, "Student GPA is missing while the program publishes a GPA requirement.")
		*recommendations = append(*recommendations, "Add your GPA to improve academic fit accuracy.")
		return 45
	}

	studentGPA := normalizeGPA(*student.GPA, student.GPAScale)
	minGPA := normalizeGPA(*program.MinGPA, nil)
	delta := studentGPA - minGPA

	switch {
	case delta >= 0.5:
		*reasons = append(*reasons, "GPA is comfortably above the program requirement.")
		return 98
	case delta >= 0:
		*reasons = append(*reasons, "GPA meets the program requirement.")
		return 90
	case delta >= -0.3:
		*reasons = append(*reasons, "GPA is slightly below the program requirement.")
		*recommendations = append(*recommendations, "Strengthen essays, achievements, or recent grades to offset the GPA gap.")
		return 68
	case delta >= -0.8:
		*reasons = append(*reasons, "GPA is meaningfully below the program requirement.")
		*recommendations = append(*recommendations, "Consider adding safer programs with lower GPA requirements.")
		return 42
	default:
		*reasons = append(*reasons, "GPA is far below the program requirement.")
		*recommendations = append(*recommendations, "Prioritize academic improvement or a better academic fit.")
		return 20
	}
}

func scoreLanguageFit(student models.FitScoreStudentProfile, program models.FitScoreProgram, reasons *[]string, recommendations *[]string) float64 {
	language := strings.ToLower(strings.TrimSpace(program.Language))
	if language == "" {
		language = strings.ToLower(strings.TrimSpace(student.PreferredLanguage))
	}

	switch {
	case strings.Contains(language, "english"):
		return scoreEnglishLanguage(student, program, reasons, recommendations)
	case strings.Contains(language, "chinese") || strings.Contains(language, "mandarin"):
		return scoreChineseLanguage(student, program, reasons, recommendations)
	default:
		if strings.TrimSpace(program.Language) == "" {
			*reasons = append(*reasons, "Program language is not published, so language fit is treated as neutral.")
			return 75
		}
		if strings.EqualFold(strings.TrimSpace(student.PreferredLanguage), strings.TrimSpace(program.Language)) {
			*reasons = append(*reasons, "Preferred study language matches the program language.")
			return 90
		}
		*reasons = append(*reasons, "Program language does not clearly match the preferred study language.")
		return 60
	}
}

func scoreEnglishLanguage(student models.FitScoreStudentProfile, program models.FitScoreProgram, reasons *[]string, recommendations *[]string) float64 {
	hasRequirement := (program.MinIELTS != nil && *program.MinIELTS > 0) || (program.MinTOEFL != nil && *program.MinTOEFL > 0)
	if !hasRequirement {
		if student.IELTS != nil || student.TOEFL != nil {
			*reasons = append(*reasons, "English program has no published test minimum and the student has English test data.")
			return 85
		}
		*reasons = append(*reasons, "English program has no published test minimum, so language fit is treated as neutral.")
		return 75
	}

	ieltsScore := scoreRequirement(student.IELTS, program.MinIELTS, 0.5)
	toeflScore := scoreRequirement(student.TOEFL, program.MinTOEFL, 10)
	score := math.Max(ieltsScore, toeflScore)
	if score >= 90 {
		*reasons = append(*reasons, "English test score meets the published requirement.")
		return score
	}
	if score >= 60 {
		*reasons = append(*reasons, "English test score is close to the published requirement.")
		*recommendations = append(*recommendations, "Retake IELTS or TOEFL if possible to strengthen language fit.")
		return score
	}
	*reasons = append(*reasons, "English test score is below the published requirement or missing.")
	*recommendations = append(*recommendations, "Add or improve IELTS/TOEFL before applying to this English-taught program.")
	return 30
}

func scoreChineseLanguage(student models.FitScoreStudentProfile, program models.FitScoreProgram, reasons *[]string, recommendations *[]string) float64 {
	if program.MinHSK == nil || *program.MinHSK <= 0 {
		if student.HSK != nil {
			*reasons = append(*reasons, "Chinese program has no published HSK minimum and the student has HSK data.")
			return 85
		}
		*reasons = append(*reasons, "Chinese program has no published HSK minimum, so language fit is treated as neutral.")
		return 75
	}
	score := scoreRequirement(student.HSK, program.MinHSK, 1)
	if score >= 90 {
		*reasons = append(*reasons, "HSK score meets the published requirement.")
		return score
	}
	if score >= 60 {
		*reasons = append(*reasons, "HSK score is close to the published requirement.")
		*recommendations = append(*recommendations, "Improve HSK by one level to reduce language risk.")
		return score
	}
	*reasons = append(*reasons, "HSK score is below the published requirement or missing.")
	*recommendations = append(*recommendations, "Add or improve HSK before applying to this Chinese-taught program.")
	return 30
}

func scoreMajorFit(student models.FitScoreStudentProfile, program models.FitScoreProgram, reasons *[]string, recommendations *[]string) float64 {
	intended := normalizeText(student.IntendedMajor)
	major := normalizeText(program.MajorName)
	if intended == "" || major == "" {
		*reasons = append(*reasons, "Major data is incomplete, so major fit is treated as neutral.")
		return 70
	}
	if intended == major || strings.Contains(intended, major) || strings.Contains(major, intended) {
		*reasons = append(*reasons, "Intended major closely matches the program major.")
		return 95
	}
	if majorGroup(intended) != "" && majorGroup(intended) == majorGroup(major) {
		*reasons = append(*reasons, "Intended major is related to the program major.")
		return 75
	}
	if hasSharedKeyword(intended, major) {
		*reasons = append(*reasons, "Intended major shares useful keywords with the program major.")
		return 55
	}
	*reasons = append(*reasons, "Intended major is not closely related to the program major.")
	*recommendations = append(*recommendations, "Clarify your academic goals or choose programs closer to your intended major.")
	return 35
}

func scoreBudgetFit(student models.FitScoreStudentProfile, program models.FitScoreProgram, reasons *[]string, recommendations *[]string) float64 {
	if program.Tuition == nil || *program.Tuition <= 0 {
		*reasons = append(*reasons, "Tuition is not published, so budget fit is treated as neutral.")
		return 75
	}
	if student.BudgetPerYear == nil || *student.BudgetPerYear <= 0 {
		*reasons = append(*reasons, "Student yearly budget is missing.")
		*recommendations = append(*recommendations, "Add your yearly budget to estimate affordability.")
		if boolValue(program.ScholarshipAvailable) {
			return 60
		}
		return 50
	}

	ratio := *student.BudgetPerYear / *program.Tuition
	switch {
	case ratio >= 1:
		*reasons = append(*reasons, "Budget covers the published tuition.")
		return 95
	case ratio >= 0.85 && boolValue(program.ScholarshipAvailable):
		*reasons = append(*reasons, "Budget is slightly below tuition, but scholarships are available.")
		*recommendations = append(*recommendations, "Prepare scholarship materials early to close the budget gap.")
		return 78
	case ratio >= 0.85:
		*reasons = append(*reasons, "Budget is slightly below published tuition.")
		*recommendations = append(*recommendations, "Confirm total costs and funding before applying.")
		return 60
	case boolValue(program.ScholarshipAvailable):
		*reasons = append(*reasons, "Budget is below tuition and would likely need scholarship support.")
		*recommendations = append(*recommendations, "Treat scholarship eligibility as a key requirement for this program.")
		return 55
	default:
		*reasons = append(*reasons, "Budget is far below tuition and no scholarship is published.")
		*recommendations = append(*recommendations, "Add lower-cost programs or increase confirmed funding.")
		return 25
	}
}

func scoreDocumentReadiness(student models.FitScoreStudentProfile, program models.FitScoreProgram, reasons *[]string, recommendations *[]string) float64 {
	required := normalizeList(program.RequiredDocuments)
	if len(required) == 0 {
		*reasons = append(*reasons, "No required document list is published, so document readiness is treated as neutral.")
		return 75
	}
	ready := toSet(normalizeList(student.DocumentsReady))
	missing := make([]string, 0)
	for _, document := range required {
		if _, ok := ready[normalizeText(document)]; !ok {
			missing = append(missing, document)
		}
	}
	completed := len(required) - len(missing)
	score := float64(completed) / float64(len(required)) * 100
	if len(missing) == 0 {
		*reasons = append(*reasons, "All listed required documents are ready.")
		return 100
	}
	sort.Strings(missing)
	*reasons = append(*reasons, fmt.Sprintf("%d of %d required documents are ready.", completed, len(required)))
	*recommendations = append(*recommendations, "Prepare missing documents: "+strings.Join(missing, ", ")+".")
	return score
}

func scoreDeadlineFit(program models.FitScoreProgram, now time.Time, reasons *[]string, recommendations *[]string) float64 {
	raw := strings.TrimSpace(program.Deadline)
	if raw == "" {
		*reasons = append(*reasons, "Application deadline is missing, so deadline risk is treated as neutral.")
		return 75
	}
	deadline, err := parseDeadline(raw)
	if err != nil {
		*reasons = append(*reasons, "Application deadline could not be parsed, so deadline risk is treated as neutral.")
		return 75
	}
	days := int(math.Ceil(deadline.Sub(now).Hours() / 24))
	switch {
	case days < 0:
		*reasons = append(*reasons, "Application deadline has already passed.")
		*recommendations = append(*recommendations, "Confirm whether late applications or a later intake are available.")
		return 10
	case days <= 7:
		*reasons = append(*reasons, "Application deadline is within 7 days.")
		*recommendations = append(*recommendations, "Prioritize this application immediately if you plan to apply.")
		return 40
	case days <= 30:
		*reasons = append(*reasons, "Application deadline is within 30 days.")
		*recommendations = append(*recommendations, "Finish documents soon to avoid deadline risk.")
		return 65
	default:
		*reasons = append(*reasons, "Application deadline is more than 30 days away.")
		return 95
	}
}

func normalizeGPA(value float64, scale *float64) float64 {
	if scale != nil && *scale > 0 {
		return clamp(value / *scale * 4, 0, 4)
	}
	if value > 4.5 {
		return clamp(value/100*4, 0, 4)
	}
	return clamp(value, 0, 4)
}

func scoreRequirement(actual *float64, required *float64, nearMiss float64) float64 {
	if required == nil || *required <= 0 {
		return 75
	}
	if actual == nil || *actual <= 0 {
		return 0
	}
	diff := *actual - *required
	switch {
	case diff >= 0:
		return 95
	case diff >= -nearMiss:
		return 65
	default:
		return 30
	}
}

func majorGroup(value string) string {
	normalized := normalizeText(value)
	for _, group := range relatedMajorGroupOrder {
		keywords := relatedMajorGroups[group]
		for _, keyword := range keywords {
			if strings.Contains(normalized, normalizeText(keyword)) {
				return group
			}
		}
	}
	return ""
}

func hasSharedKeyword(left, right string) bool {
	leftSet := toSet(strings.Fields(left))
	for _, token := range strings.Fields(right) {
		if len(token) < 4 {
			continue
		}
		if _, ok := leftSet[token]; ok {
			return true
		}
	}
	return false
}

func normalizeList(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := normalizeText(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func toSet(values []string) map[string]struct{} {
	result := make(map[string]struct{}, len(values))
	for _, value := range values {
		result[normalizeText(value)] = struct{}{}
	}
	return result
}

func normalizeText(value string) string {
	lowered := strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	previousSpace := false
	for _, r := range lowered {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			builder.WriteRune(r)
			previousSpace = false
			continue
		}
		if !previousSpace {
			builder.WriteRune(' ')
			previousSpace = true
		}
	}
	return strings.Join(strings.Fields(builder.String()), " ")
}

func parseDeadline(value string) (time.Time, error) {
	layouts := []string{time.RFC3339, "2006-01-02", "2006/01/02"}
	var lastErr error
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return parsed, nil
		}
		lastErr = err
	}
	return time.Time{}, lastErr
}

func boolValue(value *bool) bool {
	return value != nil && *value
}

func roundScore(value float64) float64 {
	return math.Round(clamp(value, 0, 100))
}

func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func dedupe(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}
