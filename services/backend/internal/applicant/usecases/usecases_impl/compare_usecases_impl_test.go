package usecases_impl

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"kallisto/infra/middlewares"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestAddToComparePrunesOrphansAndAllowsUnderLimit(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT 1 FROM users WHERE id = \$1 FOR UPDATE`).
		WithArgs("user-1").
		WillReturnRows(pgxmock.NewRows([]string{"?column?"}).AddRow(1))
	mock.ExpectExec(`DELETE FROM user_compare uc`).
		WithArgs("user-1").
		WillReturnResult(pgxmock.NewResult("DELETE", 2))
	mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM universities WHERE id=\$1 AND is_active = TRUE\)`).
		WithArgs("uni-1").
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(true))
	mock.ExpectQuery(`SELECT EXISTS\(\s*SELECT 1\s*FROM user_compare uc\s*JOIN universities u ON u.id = uc.university_id\s*WHERE uc.user_id = \$1 AND uc.university_id = \$2 AND u.is_active = TRUE\s*\)`).
		WithArgs("user-1", "uni-1").
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(false))
	mock.ExpectQuery(`SELECT COUNT\(\*\)\s+FROM user_compare uc\s+JOIN universities u ON u.id = uc.university_id\s+WHERE uc.user_id = \$1 AND u.is_active = TRUE`).
		WithArgs("user-1").
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(3))
	mock.ExpectExec(`INSERT INTO user_compare \(user_id, university_id\)\s+VALUES \(\$1, \$2\)\s+ON CONFLICT \(user_id, university_id\) DO NOTHING`).
		WithArgs("user-1", "uni-1").
		WillReturnResult(pgxmock.NewResult("INSERT", 1))
	mock.ExpectCommit()

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	if err := AddToCompare(ctx, "user-1", "uni-1"); err != nil {
		t.Fatalf("AddToCompare returned error: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}

func TestBuildCompareUniversityItemAggregatesInstitutionCriteria(t *testing.T) {
	t.Parallel()

	profile, _ := json.Marshal(map[string]any{
		"countryCode": "UZ",
		"programs": []map[string]any{
			{
				"name":                   "Should not appear",
				"language":               "English",
				"studyFormat":            "full-time",
				"annualContractAmount":   30000000,
				"contractVerified":       true,
			},
			{
				"language":             "Russian",
				"studyFormat":          "evening",
				"annualContractAmount": 90000000,
				"contractVerified":     false,
			},
			{
				"language":             "Uzbek",
				"studyFormat":          "online",
				"annualContractAmount": nil,
				"contractVerified":     true,
			},
		},
		"scholarshipAvailability": "available",
		"dormitoryAvailability":   "limited",
		"licenceStatus":           "verified",
		"careerCentre":            "available",
	})

	item := buildCompareUniversityItem(compareUniversityRow{
		Id:                            "uni-1",
		Name:                          "Uzbek Test University",
		City:                          stringPtr("Tashkent City"),
		Country:                       stringPtr("Uzbekistan"),
		UniversityProfile:             profile,
		ApplicationStructurePublished: true,
	})

	if item.Region == nil || *item.Region != "tashkent" {
		t.Fatalf("expected normalized Tashkent region, got %#v", item.Region)
	}
	if item.AverageContractAmount == nil || *item.AverageContractAmount != 30000000 {
		t.Fatalf("expected average to ignore unverified/missing prices, got %#v", item.AverageContractAmount)
	}
	if got := len(item.LanguagesOfInstruction); got != 3 {
		t.Fatalf("expected three aggregated languages, got %d: %#v", got, item.LanguagesOfInstruction)
	}
	if got := len(item.StudyFormats); got != 3 {
		t.Fatalf("expected three aggregated study formats, got %d: %#v", got, item.StudyFormats)
	}
	if item.FinancialSupport.Scholarships != "available" {
		t.Fatalf("expected scholarships available, got %s", item.FinancialSupport.Scholarships)
	}
	if item.DormitoryStatus != "limited" {
		t.Fatalf("expected limited dormitory status, got %s", item.DormitoryStatus)
	}
	if !item.Admissions.CanApplyThroughKallisto {
		t.Fatalf("expected application to be available when structure is published and deadline is open/missing")
	}
}

func TestBuildCompareUniversityItemDistinguishesDeadlineAndFees(t *testing.T) {
	t.Parallel()

	deadline := time.Now().Add(-48 * time.Hour)
	item := buildCompareUniversityItem(compareUniversityRow{
		Id:                            "uni-2",
		Name:                          "Closed University",
		ApplicationDeadline:           &deadline,
		ApplicationFee:                nil,
		UniversityProfile:             []byte(`{"applicationFeeStatus":"free"}`),
		ApplicationStructurePublished: true,
	})

	if item.Admissions.DeadlineStatus != "closed" {
		t.Fatalf("expected closed deadline, got %s", item.Admissions.DeadlineStatus)
	}
	if item.Admissions.CanApplyThroughKallisto {
		t.Fatalf("expected closed application period to block Kallisto application")
	}
	if item.Admissions.UniversityApplicationFee.Status != "free" {
		t.Fatalf("expected explicit free status without converting null amount, got %s", item.Admissions.UniversityApplicationFee.Status)
	}
}

func stringPtr(value string) *string {
	return &value
}

func TestAddToCompareBlocksWhenLiveRowsReachLimit(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT 1 FROM users WHERE id = \$1 FOR UPDATE`).
		WithArgs("user-2").
		WillReturnRows(pgxmock.NewRows([]string{"?column?"}).AddRow(1))
	mock.ExpectExec(`DELETE FROM user_compare uc`).
		WithArgs("user-2").
		WillReturnResult(pgxmock.NewResult("DELETE", 1))
	mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM universities WHERE id=\$1 AND is_active = TRUE\)`).
		WithArgs("uni-2").
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(true))
	mock.ExpectQuery(`SELECT EXISTS\(\s*SELECT 1\s*FROM user_compare uc\s+JOIN universities u ON u.id = uc.university_id\s+WHERE uc.user_id = \$1 AND uc.university_id = \$2 AND u.is_active = TRUE\s*\)`).
		WithArgs("user-2", "uni-2").
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(false))
	mock.ExpectQuery(`SELECT COUNT\(\*\)\s+FROM user_compare uc\s+JOIN universities u ON u.id = uc.university_id\s+WHERE uc.user_id = \$1 AND u.is_active = TRUE`).
		WithArgs("user-2").
		WillReturnRows(pgxmock.NewRows([]string{"count"}).AddRow(4))
	mock.ExpectRollback()

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	err = AddToCompare(ctx, "user-2", "uni-2")
	if err == nil {
		t.Fatalf("expected AddToCompare to fail at capacity")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}
