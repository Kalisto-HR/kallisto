package models

type FitScoreStudentProfile struct {
	Nationality       string   `json:"nationality,omitempty"`
	EducationLevel    string   `json:"educationLevel,omitempty"`
	GPA               *float64 `json:"gpa,omitempty"`
	GPAScale          *float64 `json:"gpaScale,omitempty"`
	IELTS             *float64 `json:"ielts,omitempty"`
	TOEFL             *float64 `json:"toefl,omitempty"`
	HSK               *float64 `json:"hsk,omitempty"`
	SAT               *float64 `json:"sat,omitempty"`
	IntendedMajor     string   `json:"intendedMajor,omitempty"`
	BudgetPerYear     *float64 `json:"budgetPerYear,omitempty"`
	PreferredLanguage string   `json:"preferredLanguage,omitempty"`
	PreferredCity     string   `json:"preferredCity,omitempty"`
	DocumentsReady    []string `json:"documentsReady,omitempty"`
	Achievements      []string `json:"achievements,omitempty"`
}

type FitScoreProgram struct {
	UniversityID         string   `json:"universityId,omitempty"`
	UniversityName       string   `json:"universityName,omitempty"`
	ProgramID            string   `json:"programId,omitempty"`
	MajorName            string   `json:"majorName,omitempty"`
	DegreeLevel          string   `json:"degreeLevel,omitempty"`
	Language             string   `json:"language,omitempty"`
	MinGPA               *float64 `json:"minGpa,omitempty"`
	MinIELTS             *float64 `json:"minIelts,omitempty"`
	MinTOEFL             *float64 `json:"minToefl,omitempty"`
	MinHSK               *float64 `json:"minHsk,omitempty"`
	Tuition              *float64 `json:"tuition,omitempty"`
	ScholarshipAvailable *bool    `json:"scholarshipAvailable,omitempty"`
	Deadline             string   `json:"deadline,omitempty"`
	RequiredDocuments    []string `json:"requiredDocuments,omitempty"`
	CompetitivenessLevel string   `json:"competitivenessLevel,omitempty"`
}

type FitScoreRequest struct {
	StudentProfile *FitScoreStudentProfile `json:"studentProfile,omitempty"`
	Program        *FitScoreProgram        `json:"program,omitempty"`
	StudentID      string                  `json:"studentId,omitempty"`
	ProgramID      string                  `json:"programId,omitempty"`
}

type FitScoreBreakdown struct {
	AcademicScore float64 `json:"academicScore"`
	LanguageScore float64 `json:"languageScore"`
	MajorScore    float64 `json:"majorScore"`
	BudgetScore   float64 `json:"budgetScore"`
	DocumentScore float64 `json:"documentScore"`
	DeadlineScore float64 `json:"deadlineScore"`
}

type FitScoreResult struct {
	FinalScore      int               `json:"finalScore"`
	Label           string            `json:"label"`
	Breakdown       FitScoreBreakdown `json:"breakdown"`
	Reasons         []string          `json:"reasons"`
	Recommendations []string          `json:"recommendations"`
	Explanation     string            `json:"explanation,omitempty"`
}
