package session

import (
	"context"
	"testing"
	"time"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestEvaluateUsesOnlyUnblockedFailuresForEmailThreshold(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	now := time.Date(2026, time.March, 29, 14, 15, 0, 0, time.UTC)
	throttle := &DBThrottle{db: mock}

	mock.ExpectQuery(`(?s)SELECT COUNT\(\*\), MIN\(attempted_at\).*succeeded = FALSE.*blocked = FALSE.*attempted_at >= \$2`).
		WithArgs("applicant@example.com", now.Add(-throttleWindow)).
		WillReturnRows(
			pgxmock.NewRows([]string{"count", "min"}).AddRow(5, now.Add(-2*time.Minute)),
		)

	decision, err := throttle.Evaluate(context.Background(), "Applicant@Example.com", nil, now)
	if err != nil {
		t.Fatalf("expected evaluate to succeed, got %v", err)
	}
	if decision == nil || !decision.Blocked {
		t.Fatalf("expected email threshold to block request, got %+v", decision)
	}
	if decision.RetryAfter <= 0 {
		t.Fatalf("expected retry-after to be positive, got %v", decision.RetryAfter)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestEvaluateSkipsIPAddressThresholdWhenThereAreNoUnblockedFailures(t *testing.T) {
	t.Parallel()

	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer mock.Close()

	now := time.Date(2026, time.March, 29, 14, 15, 0, 0, time.UTC)
	throttle := &DBThrottle{db: mock}
	ipAddress := "::1"

	mock.ExpectQuery(`(?s)SELECT COUNT\(\*\), MIN\(attempted_at\).*normalized_email = \$1.*blocked = FALSE`).
		WithArgs("other@example.com", now.Add(-throttleWindow)).
		WillReturnRows(
			pgxmock.NewRows([]string{"count", "min"}).AddRow(0, nil),
		)

	mock.ExpectQuery(`(?s)SELECT COUNT\(\*\), MIN\(attempted_at\).*ip_address = NULLIF\(\$1, ''\)::inet.*blocked = FALSE`).
		WithArgs(ipAddress, now.Add(-throttleWindow)).
		WillReturnRows(
			pgxmock.NewRows([]string{"count", "min"}).AddRow(0, nil),
		)

	decision, err := throttle.Evaluate(context.Background(), "other@example.com", &ipAddress, now)
	if err != nil {
		t.Fatalf("expected evaluate to succeed, got %v", err)
	}
	if decision == nil || decision.Blocked {
		t.Fatalf("expected request to remain allowed, got %+v", decision)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
