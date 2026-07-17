package usecases_impl

import (
	"context"
	"testing"
	"time"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestGetUniversitiesByIdsScansUniversityListShape(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	deadline := time.Date(2026, 10, 15, 0, 0, 0, 0, time.UTC)
	description := "Selective university"
	province := "Beijing"
	city := "Beijing"
	country := "China"
	ranking := 20
	applicationFee := 600.0
	acceptanceRate := 15.0
	tuitionFee := 52000.0
	ieltsMin := 7.0
	toeflMin := 100
	scholarshipAvailable := true
	cityType := "urban"
	campusVibe := "research"
	programGroups := "Computer Science, AI"

	mock.ExpectQuery(`SELECT\s+id, name, description`).
		WithArgs([]string{"uni-1"}).
		WillReturnRows(pgxmock.NewRows([]string{
			"id", "name", "description", "province", "city", "country", "ranking", "application_fee",
			"acceptance_rate", "tuition_fee", "application_deadline", "ielts_min", "toefl_min",
			"scholarship_available", "city_type", "campus_vibe", "program_groups",
		}).AddRow(
			"uni-1", "Tsinghua University", &description, &province, &city, &country, &ranking, &applicationFee,
			&acceptanceRate, &tuitionFee, &deadline, &ieltsMin, &toeflMin, &scholarshipAvailable,
			&cityType, &campusVibe, &programGroups,
		))

	items, err := getUniversitiesByIds(context.Background(), mock, []string{"uni-1"})
	if err != nil {
		t.Fatalf("getUniversitiesByIds returned error: %v", err)
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
