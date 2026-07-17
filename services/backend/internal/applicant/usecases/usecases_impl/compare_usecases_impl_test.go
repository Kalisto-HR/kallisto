package usecases_impl

import (
	"context"
	"testing"
	"time"

	"kallisto/infra/middlewares"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestGetUserCompareListScansUniversityListShape(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	deadline := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	description := "Research university"
	province := "Shanghai"
	city := "Shanghai"
	country := "China"
	ranking := 50
	applicationFee := 500.0
	acceptanceRate := 20.5
	tuitionFee := 45000.0
	ieltsMin := 6.5
	toeflMin := 90
	scholarshipAvailable := true
	cityType := "urban"
	campusVibe := "collaborative"
	programGroups := "Engineering, Business"

	mock.ExpectExec(`DELETE FROM user_compare uc`).
		WithArgs("user-compare").
		WillReturnResult(pgxmock.NewResult("DELETE", 0))
	mock.ExpectQuery(`SELECT\s+u\.id, u\.name, u\.description`).
		WithArgs("user-compare").
		WillReturnRows(pgxmock.NewRows([]string{
			"id", "name", "description", "province", "city", "country", "ranking", "application_fee",
			"acceptance_rate", "tuition_fee", "application_deadline", "ielts_min", "toefl_min",
			"scholarship_available", "city_type", "campus_vibe", "program_groups",
		}).AddRow(
			"uni-1", "Fudan University", &description, &province, &city, &country, &ranking, &applicationFee,
			&acceptanceRate, &tuitionFee, &deadline, &ieltsMin, &toeflMin, &scholarshipAvailable,
			&cityType, &campusVibe, &programGroups,
		))

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	items, err := GetUserCompareList(ctx, "user-compare")
	if err != nil {
		t.Fatalf("GetUserCompareList returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("len(items) = %d, want 1", len(items))
	}
	if items[0].Description == nil || *items[0].Description != description {
		t.Fatalf("description = %v, want %q", items[0].Description, description)
	}
	if items[0].ProgramGroups == nil || *items[0].ProgramGroups != programGroups {
		t.Fatalf("program groups = %v, want %q", items[0].ProgramGroups, programGroups)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}

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
	mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM universities WHERE id=\$1\)`).
		WithArgs("uni-1").
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(true))
	mock.ExpectQuery(`SELECT EXISTS\(\s*SELECT 1\s*FROM user_compare uc\s*JOIN universities u ON u.id = uc.university_id\s*WHERE uc.user_id = \$1 AND uc.university_id = \$2\s*\)`).
		WithArgs("user-1", "uni-1").
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(false))
	mock.ExpectQuery(`SELECT COUNT\(\*\)\s+FROM user_compare uc\s+JOIN universities u ON u.id = uc.university_id\s+WHERE uc.user_id = \$1`).
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
	mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM universities WHERE id=\$1\)`).
		WithArgs("uni-2").
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(true))
	mock.ExpectQuery(`SELECT EXISTS\(\s*SELECT 1\s*FROM user_compare uc\s+JOIN universities u ON u.id = uc.university_id\s+WHERE uc.user_id = \$1 AND uc.university_id = \$2\s*\)`).
		WithArgs("user-2", "uni-2").
		WillReturnRows(pgxmock.NewRows([]string{"exists"}).AddRow(false))
	mock.ExpectQuery(`SELECT COUNT\(\*\)\s+FROM user_compare uc\s+JOIN universities u ON u.id = uc.university_id\s+WHERE uc.user_id = \$1`).
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
