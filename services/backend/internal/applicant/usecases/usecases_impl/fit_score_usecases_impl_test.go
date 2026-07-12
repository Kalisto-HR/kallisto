package usecases_impl

import (
	"testing"
	"time"

	"kallisto/services/backend/internal/applicant/models"
)

func TestCalculateFitScoreStrongProfileMeetsRequirements(t *testing.T) {
	result := CalculateFitScore(strongStudent(), strongProgram(), testNow())

	if result.FinalScore < 85 {
		t.Fatalf("expected excellent fit, got %d (%s)", result.FinalScore, result.Label)
	}
	if result.Label != "Excellent Fit" {
		t.Fatalf("expected Excellent Fit, got %s", result.Label)
	}
}

func TestCalculateFitScoreMissingLanguageRequirementIsNeutralHigh(t *testing.T) {
	program := strongProgram()
	program.MinIELTS = nil
	program.MinTOEFL = nil

	result := CalculateFitScore(strongStudent(), program, testNow())

	if result.Breakdown.LanguageScore < 75 {
		t.Fatalf("expected neutral/high language score, got %.0f", result.Breakdown.LanguageScore)
	}
}

func TestCalculateFitScoreBudgetBelowTuitionWithScholarship(t *testing.T) {
	student := strongStudent()
	budget := 18000.0
	student.BudgetPerYear = &budget
	program := strongProgram()
	tuition := 24000.0
	program.Tuition = &tuition
	available := true
	program.ScholarshipAvailable = &available

	result := CalculateFitScore(student, program, testNow())

	if result.Breakdown.BudgetScore < 50 || result.Breakdown.BudgetScore > 80 {
		t.Fatalf("expected medium budget score with scholarship, got %.0f", result.Breakdown.BudgetScore)
	}
}

func TestCalculateFitScoreMissingDocuments(t *testing.T) {
	student := strongStudent()
	student.DocumentsReady = []string{"Passport"}

	result := CalculateFitScore(student, strongProgram(), testNow())

	if result.Breakdown.DocumentScore >= 100 {
		t.Fatalf("expected document penalty, got %.0f", result.Breakdown.DocumentScore)
	}
	if len(result.Recommendations) == 0 {
		t.Fatal("expected missing document recommendation")
	}
}

func TestCalculateFitScoreDeadlinePassed(t *testing.T) {
	program := strongProgram()
	program.Deadline = "2026-01-01"

	result := CalculateFitScore(strongStudent(), program, testNow())

	if result.Breakdown.DeadlineScore > 10 {
		t.Fatalf("expected very low deadline score, got %.0f", result.Breakdown.DeadlineScore)
	}
}

func TestCalculateFitScoreRelatedMajorGetsPartialCredit(t *testing.T) {
	student := strongStudent()
	student.IntendedMajor = "Artificial Intelligence"
	program := strongProgram()
	program.MajorName = "Software Engineering"

	result := CalculateFitScore(student, program, testNow())

	if result.Breakdown.MajorScore != 75 {
		t.Fatalf("expected related major score 75, got %.0f", result.Breakdown.MajorScore)
	}
}

func strongStudent() models.FitScoreStudentProfile {
	gpa := 3.8
	scale := 4.0
	ielts := 7.0
	toefl := 100.0
	hsk := 5.0
	sat := 1380.0
	budget := 30000.0
	return models.FitScoreStudentProfile{
		Nationality:       "Uzbekistan",
		EducationLevel:    "high-school",
		GPA:               &gpa,
		GPAScale:          &scale,
		IELTS:             &ielts,
		TOEFL:             &toefl,
		HSK:               &hsk,
		SAT:               &sat,
		IntendedMajor:     "Computer Science",
		BudgetPerYear:     &budget,
		PreferredLanguage: "English",
		PreferredCity:     "Shanghai",
		DocumentsReady:    []string{"Passport", "Transcript", "Recommendation Letter"},
		Achievements:      []string{"Olympiad finalist"},
	}
}

func strongProgram() models.FitScoreProgram {
	minGPA := 3.2
	minIELTS := 6.5
	minTOEFL := 90.0
	tuition := 24000.0
	scholarship := true
	return models.FitScoreProgram{
		UniversityID:         "uni-1",
		UniversityName:       "Kallisto University",
		ProgramID:            "cs-bsc",
		MajorName:            "Computer Science",
		DegreeLevel:          "Bachelor",
		Language:             "English",
		MinGPA:               &minGPA,
		MinIELTS:             &minIELTS,
		MinTOEFL:             &minTOEFL,
		Tuition:              &tuition,
		ScholarshipAvailable: &scholarship,
		Deadline:             "2026-08-01",
		RequiredDocuments:    []string{"Passport", "Transcript", "Recommendation Letter"},
		CompetitivenessLevel: "medium",
	}
}

func testNow() time.Time {
	return time.Date(2026, 5, 25, 0, 0, 0, 0, time.UTC)
}
