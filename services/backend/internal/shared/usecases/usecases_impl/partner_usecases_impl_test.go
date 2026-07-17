package usecases_impl

import (
	"context"
	"net/http"
	"regexp"
	"testing"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestLoadPartnerFunnelCountsUsesExclusiveStages(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	queryPattern := `(?s)WITH submitted_users AS.*draft_users AS.*basket_users AS.*jsonb_array_elements_text.*funnel_users AS`
	mock.ExpectQuery(queryPattern).
		WithArgs("uni-1").
		WillReturnRows(pgxmock.NewRows([]string{"suspects_count", "prospects_count"}).AddRow(2, 3))

	suspects, prospects, err := loadPartnerFunnelCounts(context.Background(), mock, "uni-1")
	if err != nil {
		t.Fatalf("loadPartnerFunnelCounts returned error: %v", err)
	}
	if suspects != 2 || prospects != 3 {
		t.Fatalf("unexpected counts: suspects=%d prospects=%d", suspects, prospects)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}

func TestLoadPartnerStudentOriginStatsGroupsRegionCodes(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	queryPattern := `(?s)WITH submitted AS.*normalize_uz_region_code.*u\.region_code.*a\.data->>'regionCode'.*jsonb_array_elements_text.*GROUP BY region_code.*ORDER BY count DESC, region_code ASC NULLS LAST`
	samarqand := "samarqand"
	mock.ExpectQuery(queryPattern).
		WithArgs("uni-1").
		WillReturnRows(
			pgxmock.NewRows([]string{"region_code", "count", "percentage"}).
				AddRow(&samarqand, 2, 66.67).
				AddRow(nil, 1, 33.33),
		)

	stats, err := loadPartnerStudentOriginStats(context.Background(), mock, "uni-1")
	if err != nil {
		t.Fatalf("loadPartnerStudentOriginStats returned error: %v", err)
	}
	if len(stats) != 2 {
		t.Fatalf("unexpected stats length: got %d want 2", len(stats))
	}
	if stats[0].RegionCode == nil || *stats[0].RegionCode != "samarqand" || stats[0].Count != 2 || stats[0].Percentage != 66.67 {
		t.Fatalf("unexpected first stat: %+v", stats[0])
	}
	if stats[1].RegionCode != nil {
		t.Fatalf("expected nil fallback bucket, got %+v", stats[1])
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}

func TestGetPartnerAnalyticsContactsRejectsInvalidStage(t *testing.T) {
	t.Parallel()

	_, err := GetPartnerAnalyticsContacts(context.Background(), "uni-1", "lead")
	if err == nil {
		t.Fatal("expected invalid stage error")
	}
	handlerErr, ok := err.(utils.HandlerFuncErr)
	if !ok {
		t.Fatalf("expected HandlerFuncErr, got %T", err)
	}
	if handlerErr.Status() != http.StatusBadRequest {
		t.Fatalf("unexpected status: got %d want %d", handlerErr.Status(), http.StatusBadRequest)
	}
}

func TestGetPartnerAnalyticsContactsLoadsProspectsForLinkedUniversity(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	queryPattern := `(?s)` + regexp.QuoteMeta("FROM applications a") + `.*` + regexp.QuoteMeta("WHERE a.university_id = $1")
	mock.ExpectQuery(queryPattern).
		WithArgs("uni-1").
		WillReturnRows(
			pgxmock.NewRows([]string{"user_id", "name", "email", "country", "stage", "last_activity_at"}).
				AddRow("user-1", "Jane Doe", "jane@example.com", "Kazakhstan", "prospect", "2026-04-20T10:00:00Z"),
		)

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	items, err := GetPartnerAnalyticsContacts(ctx, "uni-1", "prospect")
	if err != nil {
		t.Fatalf("GetPartnerAnalyticsContacts returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("unexpected item count: got %d want 1", len(items))
	}
	if items[0].Email != "jane@example.com" || items[0].Stage != "prospect" {
		t.Fatalf("unexpected item: %+v", items[0])
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}

func TestGetPartnerAnalyticsContactsDetectsBasketSuspects(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	queryPattern := `(?s)` + regexp.QuoteMeta("FROM users u") + `.*jsonb_array_elements_text.*` + regexp.QuoteMeta("WHERE basket.university_id = $1::text")
	mock.ExpectQuery(queryPattern).
		WithArgs("uni-1").
		WillReturnRows(
			pgxmock.NewRows([]string{"user_id", "name", "email", "country", "stage", "last_activity_at"}).
				AddRow("user-2", "Sam Student", "sam@example.com", "Uzbekistan", "suspect", ""),
		)

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, mock)
	items, err := GetPartnerAnalyticsContacts(ctx, "uni-1", "suspect")
	if err != nil {
		t.Fatalf("GetPartnerAnalyticsContacts returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("unexpected item count: got %d want 1", len(items))
	}
	if items[0].Stage != "suspect" || items[0].Email != "sam@example.com" {
		t.Fatalf("unexpected suspect item: %+v", items[0])
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}
