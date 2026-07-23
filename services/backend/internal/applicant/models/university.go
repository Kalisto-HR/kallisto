// university.go defines data models for university-related operations.
package models

import (
	"encoding/json"
	"time"
)

type University struct {
	Id                            string          `json:"id" db:"id"`
	ManagerId                     *string         `json:"manager_id,omitempty" db:"manager_id"`
	Name                          string          `json:"name" db:"name"`
	Logo                          []byte          `json:"logo,omitempty" db:"logo"`
	Description                   *string         `json:"description,omitempty" db:"description"`
	Province                      *string         `json:"province,omitempty" db:"province"`
	City                          *string         `json:"city,omitempty" db:"city"`
	Country                       *string         `json:"country,omitempty" db:"country"`
	AcceptanceRate                *float64        `json:"acceptance_rate,omitempty" db:"acceptance_rate"`
	TuitionFee                    *float64        `json:"tuition_fee,omitempty" db:"tuition_fee"`
	ApplicationDeadline           *time.Time      `json:"application_deadline,omitempty" db:"application_deadline"`
	IeltsMin                      *float64        `json:"ielts_min,omitempty" db:"ielts_min"`
	ToeflMin                      *int            `json:"toefl_min,omitempty" db:"toefl_min"`
	ScholarshipAvailable          *bool           `json:"scholarship_available,omitempty" db:"scholarship_available"`
	CityType                      *string         `json:"city_type,omitempty" db:"city_type"`
	CampusVibe                    *string         `json:"campus_vibe,omitempty" db:"campus_vibe"`
	ApplicationSchema             json.RawMessage `json:"application_schema,omitempty" db:"application_schema"`
	ApplicationStructurePublished bool            `json:"application_structure_published" db:"application_structure_published"`
	UniversityProfile             json.RawMessage `json:"university_profile,omitempty" db:"university_profile"`
	CreatedAt                     time.Time       `json:"created_at" db:"created_at"`
	Metadata                      json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	ApplicationFee                *float64        `json:"application_fee,omitempty" db:"application_fee"`
}

type UniversityListItem struct {
	Id                   string     `json:"id" db:"id"`
	Name                 string     `json:"name" db:"name"`
	Description          *string    `json:"description,omitempty" db:"description"`
	Province             *string    `json:"province,omitempty" db:"province"`
	City                 *string    `json:"city,omitempty" db:"city"`
	Country              *string    `json:"country,omitempty" db:"country"`
	ApplicationFee       *float64   `json:"application_fee,omitempty" db:"application_fee"`
	AcceptanceRate       *float64   `json:"acceptance_rate,omitempty" db:"acceptance_rate"`
	TuitionFee           *float64   `json:"tuition_fee,omitempty" db:"tuition_fee"`
	ApplicationDeadline  *time.Time `json:"application_deadline,omitempty" db:"application_deadline"`
	IeltsMin             *float64   `json:"ielts_min,omitempty" db:"ielts_min"`
	ToeflMin             *int       `json:"toefl_min,omitempty" db:"toefl_min"`
	ScholarshipAvailable *bool      `json:"scholarship_available,omitempty" db:"scholarship_available"`
	CityType             *string    `json:"city_type,omitempty" db:"city_type"`
	CampusVibe           *string    `json:"campus_vibe,omitempty" db:"campus_vibe"`
	ProgramGroups        *string    `json:"program_groups,omitempty" db:"program_groups"`
}

type CompareFinancialSupport struct {
	Scholarships     string `json:"scholarships"`
	GovernmentGrants string `json:"governmentGrants"`
	TuitionDiscounts string `json:"tuitionDiscounts"`
	OtherSupport     string `json:"otherSupport"`
}

type CompareAccreditation struct {
	LicenceStatus                    string `json:"licenceStatus"`
	NationalAccreditationStatus      string `json:"nationalAccreditationStatus"`
	InternationalAccreditationStatus string `json:"internationalAccreditationStatus"`
}

type CompareInternationalPartnerships struct {
	Status        string   `json:"status"`
	VerifiedCount int      `json:"verifiedCount"`
	Partners      []string `json:"partners"`
}

type CompareMobility struct {
	Exchange         string `json:"exchange"`
	AcademicMobility string `json:"academicMobility"`
	DoubleDegree     string `json:"doubleDegree"`
	SemesterAbroad   string `json:"semesterAbroad"`
}

type CompareCareerSupport struct {
	CareerCentre            string  `json:"careerCentre"`
	InternshipSupport       string  `json:"internshipSupport"`
	EmployerPartnerships    string  `json:"employerPartnerships"`
	JobFairs                string  `json:"jobFairs"`
	EntrepreneurshipSupport string  `json:"entrepreneurshipSupport"`
	EmploymentData          *string `json:"employmentData"`
}

type CompareApplicationFee struct {
	Amount   *int   `json:"amount"`
	Currency string `json:"currency"`
	Status   string `json:"status"`
}

type CompareAdmissions struct {
	Deadline                  *string               `json:"deadline"`
	DeadlineStatus            string                `json:"deadlineStatus"`
	UniversityApplicationFee  CompareApplicationFee `json:"universityApplicationFee"`
	KallistoApplicationFee    CompareApplicationFee `json:"kallistoApplicationFee"`
	CanApplyThroughKallisto   bool                  `json:"canApplyThroughKallisto"`
	KallistoApplicationStatus string                `json:"kallistoApplicationStatus"`
}

type CompareUniversityItem struct {
	Id                        string                           `json:"id"`
	Slug                      *string                          `json:"slug,omitempty"`
	Name                      string                           `json:"name"`
	LogoUrl                   *string                          `json:"logoUrl,omitempty"`
	Region                    *string                          `json:"region"`
	City                      *string                          `json:"city"`
	AverageContractAmount     *int                             `json:"averageContractAmount"`
	ContractCurrency          string                           `json:"contractCurrency"`
	ContractPeriod            string                           `json:"contractPeriod"`
	UniversityType            *string                          `json:"universityType"`
	LanguagesOfInstruction    []string                         `json:"languagesOfInstruction"`
	StudyFormats              []string                         `json:"studyFormats"`
	FinancialSupport          CompareFinancialSupport          `json:"financialSupport"`
	DormitoryStatus           string                           `json:"dormitoryStatus"`
	DormitoryNote             *string                          `json:"dormitoryNote,omitempty"`
	Accreditation             CompareAccreditation             `json:"accreditation"`
	InternationalPartnerships CompareInternationalPartnerships `json:"internationalPartnerships"`
	Mobility                  CompareMobility                  `json:"mobility"`
	CareerSupport             CompareCareerSupport             `json:"careerSupport"`
	Admissions                CompareAdmissions                `json:"admissions"`
}

type UniversitySearchParams struct {
	Query                string   `json:"query"`
	Province             *string  `json:"province,omitempty"`
	City                 *string  `json:"city,omitempty"`
	Country              *string  `json:"country,omitempty"`
	MinPrice             *float64 `json:"min_price,omitempty"`
	MaxPrice             *float64 `json:"max_price,omitempty"`
	Region               *string  `json:"region,omitempty"`
	StudyFormats         []string `json:"study_formats,omitempty"`
	Languages            []string `json:"languages,omitempty"`
	MaxFee               *float64 `json:"max_fee,omitempty"`
	MaxTuition           *float64 `json:"max_tuition,omitempty"`
	MinAcceptanceRate    *float64 `json:"min_acceptance_rate,omitempty"`
	MaxAcceptanceRate    *float64 `json:"max_acceptance_rate,omitempty"`
	MinIelts             *float64 `json:"min_ielts,omitempty"`
	MinToefl             *int     `json:"min_toefl,omitempty"`
	ScholarshipAvailable *bool    `json:"scholarship_available,omitempty"`
	CityType             *string  `json:"city_type,omitempty"`
	CampusVibe           *string  `json:"campus_vibe,omitempty"`
	Page                 int      `json:"page"`
	Limit                int      `json:"limit"`
}

type UniversityFilterOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type UniversityPriceRange struct {
	Min *float64 `json:"min,omitempty"`
	Max *float64 `json:"max,omitempty"`
}

type UniversityFilterOptions struct {
	PriceRange   UniversityPriceRange     `json:"price_range"`
	Regions      []UniversityFilterOption `json:"regions"`
	StudyFormats []UniversityFilterOption `json:"study_formats"`
	Languages    []UniversityFilterOption `json:"languages"`
}
