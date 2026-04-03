package usecases_impl

import (
	"context"
	"testing"

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
