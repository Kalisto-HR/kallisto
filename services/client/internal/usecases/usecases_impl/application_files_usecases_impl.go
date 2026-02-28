package usecases_impl

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func SaveApplicationFiles(
	ctx context.Context,
	userId, universityId, cycle string,
	fieldKey *string,
	uploads []models.ApplicationFileUpload,
) ([]models.ApplicationFile, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	var status string
	err := conn.QueryRow(
		ctx,
		`SELECT status
		 FROM applications
		 WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3`,
		userId,
		universityId,
		cycle,
	).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			if _, createErr := conn.Exec(
				ctx,
				`INSERT INTO applications (user_id, university_id, application_cycle, status, data, created_at)
				 VALUES ($1, $2, $3, $4, '{}'::jsonb, NOW())`,
				userId,
				universityId,
				cycle,
				models.StatusDraft,
			); createErr != nil {
				return nil, fmt.Errorf("failed to initialize application draft for file upload: %s", createErr.Error())
			}
			status = models.StatusDraft
		} else {
			return nil, fmt.Errorf("failed to verify application before file upload: %s", err.Error())
		}
	}
	if status != models.StatusDraft {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "cannot upload files for non-draft application")
	}

	stored := make([]models.ApplicationFile, 0, len(uploads))
	for _, upload := range uploads {
		row := conn.QueryRow(
			ctx,
			`INSERT INTO application_files (
				user_id,
				university_id,
				application_cycle,
				field_key,
				file_name,
				content_type,
				file_size,
				file_data,
				created_at,
				updated_at
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
			RETURNING id, user_id, university_id, application_cycle, field_key, file_name, content_type, file_size, file_data, created_at`,
			userId,
			universityId,
			cycle,
			fieldKey,
			upload.FileName,
			upload.ContentType,
			upload.FileSize,
			upload.FileData,
		)

		var file models.ApplicationFile
		if err := row.Scan(
			&file.Id,
			&file.UserId,
			&file.UniversityId,
			&file.ApplicationCycle,
			&file.FieldKey,
			&file.FileName,
			&file.ContentType,
			&file.FileSize,
			&file.FileData,
			&file.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to store application file: %s", err.Error())
		}
		stored = append(stored, file)
	}

	return stored, nil
}

func GetApplicationFileByIdForUser(ctx context.Context, userId, fileId string) (*models.ApplicationFile, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	row := conn.QueryRow(
		ctx,
		`SELECT id, user_id, university_id, application_cycle, field_key, file_name, content_type, file_size, file_data, created_at
		 FROM application_files
		 WHERE id = $1 AND user_id = $2`,
		fileId,
		userId,
	)

	var file models.ApplicationFile
	if err := row.Scan(
		&file.Id,
		&file.UserId,
		&file.UniversityId,
		&file.ApplicationCycle,
		&file.FieldKey,
		&file.FileName,
		&file.ContentType,
		&file.FileSize,
		&file.FileData,
		&file.CreatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "file not found")
		}
		return nil, fmt.Errorf("failed to fetch application file: %s", err.Error())
	}

	return &file, nil
}

func GetApplicationFileAssetsByIDs(
	ctx context.Context,
	userId, universityId, cycle string,
	fileIDs []string,
) ([]models.ApplicationFileAsset, error) {
	if len(fileIDs) == 0 {
		return []models.ApplicationFileAsset{}, nil
	}

	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	assets := make([]models.ApplicationFileAsset, 0, len(fileIDs))
	for _, fileID := range fileIDs {
		trimmed := strings.TrimSpace(fileID)
		if trimmed == "" {
			continue
		}

		row := conn.QueryRow(
			ctx,
			`SELECT id, COALESCE(field_key, ''), file_name, content_type, file_size, file_data
			 FROM application_files
			 WHERE id = $1
			   AND user_id = $2
			   AND university_id = $3
			   AND application_cycle = $4`,
			trimmed,
			userId,
			universityId,
			cycle,
		)

		var (
			asset     models.ApplicationFileAsset
			fieldKey  string
			fileBytes []byte
		)
		if err := row.Scan(&asset.Id, &fieldKey, &asset.FileName, &asset.ContentType, &asset.FileSize, &fileBytes); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				continue
			}
			return nil, fmt.Errorf("failed to resolve application file asset: %s", err.Error())
		}
		asset.FieldKey = fieldKey
		asset.ContentB64 = base64.StdEncoding.EncodeToString(fileBytes)
		assets = append(assets, asset)
	}

	return assets, nil
}
