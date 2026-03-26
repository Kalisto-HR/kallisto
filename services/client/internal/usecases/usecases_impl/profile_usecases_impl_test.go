package usecases_impl

import (
	"context"
	"testing"

	"kallisto/infra/middlewares"

	pgxmock "github.com/pashagolub/pgxmock/v4"
)

func TestUpdateUserPhotoDoesNotRequireSessionStore(t *testing.T) {
	t.Parallel()

	const userID = "11111111-1111-1111-1111-111111111111"

	clientMock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgx mock: %v", err)
	}
	defer clientMock.Close()

	clientMock.ExpectExec(`UPDATE users SET photo=\$1 WHERE id=\$2`).
		WithArgs([]byte{1, 2, 3}, userID).
		WillReturnResult(pgxmock.NewResult("UPDATE", 1))

	ctx := context.WithValue(context.Background(), middlewares.CtxPostgresKey, clientMock)
	if err := UpdateUserPhoto(ctx, userID, []byte{1, 2, 3}); err != nil {
		t.Fatalf("UpdateUserPhoto returned error: %v", err)
	}

	if err := clientMock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet mock expectations: %v", err)
	}
}
