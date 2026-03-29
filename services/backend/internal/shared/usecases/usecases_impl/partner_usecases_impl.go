package usecases_impl

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/observability"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/shared/models"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func GetPartnerDashboard(ctx context.Context, universityId string) (*models.PartnerDashboardResponse, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	resp := &models.PartnerDashboardResponse{}

	err := conn.QueryRow(ctx, `
		WITH application_metrics AS (
			SELECT
				`+unifiedSubmittedReceivedAtExpr+` AS received_at,
				CASE
					WHEN COALESCE(data->>'sat', applicant_info->>'sat') ~ '^[0-9]+(\.[0-9]+)?$'
					THEN (COALESCE(data->>'sat', applicant_info->>'sat'))::numeric
					ELSE (
						SELECT MAX(
							CASE
								WHEN COALESCE(score_item->>'score', '') ~ '^[0-9]+(\.[0-9]+)?$'
								THEN (score_item->>'score')::numeric
								ELSE NULL
							END
						)
						FROM jsonb_array_elements(COALESCE(data->'test_scores', '[]'::jsonb)) AS score_item
						WHERE UPPER(COALESCE(score_item->>'test_type', '')) = 'SAT'
					)
				END AS sat_score,
				CASE
					WHEN COALESCE(data->>'ielts', applicant_info->>'ielts') ~ '^[0-9]+(\.[0-9]+)?$'
					THEN (COALESCE(data->>'ielts', applicant_info->>'ielts'))::numeric
					ELSE (
						SELECT MAX(
							CASE
								WHEN COALESCE(score_item->>'score', '') ~ '^[0-9]+(\.[0-9]+)?$'
								THEN (score_item->>'score')::numeric
								ELSE NULL
							END
						)
						FROM jsonb_array_elements(COALESCE(data->'test_scores', '[]'::jsonb)) AS score_item
						WHERE UPPER(COALESCE(score_item->>'test_type', '')) = 'IELTS'
					)
				END AS ielts_score,
				LOWER(TRIM(COALESCE(
					NULLIF(applicant_info->>'gender', ''),
					NULLIF(data->>'gender', ''),
					NULLIF(applicant_info->>'sex', ''),
					NULLIF(data->>'sex', ''),
					''
				))) AS gender_value
			FROM applications
			WHERE university_id = $1 AND status = 'submitted'
		)
		SELECT
			COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '7 days') AS new_applications,
			COUNT(*) AS total_applicants,
			COALESCE(ROUND(AVG(sat_score))::int, 0) AS avg_sat,
			COALESCE(ROUND(AVG(ielts_score), 1), 0) AS avg_ielts,
			COUNT(*) FILTER (WHERE gender_value IN ('male', 'm', 'man', 'boy')) AS male_count,
			COUNT(*) FILTER (WHERE gender_value IN ('female', 'f', 'woman', 'girl')) AS female_count
		FROM application_metrics
	`, universityId).Scan(
		&resp.NewApplications,
		&resp.TotalApplicants,
		&resp.AvgSAT,
		&resp.AvgIELTS,
		&resp.MaleCount,
		&resp.FemaleCount,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load dashboard stats: %s", err.Error())
	}

	rows, err := conn.Query(ctx, `
		SELECT
			id,
			COALESCE(NULLIF(`+unifiedSubmittedApplicantNameExpr+`, ''), 'Applicant') AS name,
			COALESCE(NULLIF(data->>'program', ''), NULLIF(applicant_info->>'program', ''), 'General') AS program,
			COALESCE(NULLIF(`+unifiedSubmittedApplicantCitizenExpr+`, ''), 'Unknown') AS citizenship,
			'submitted' AS status,
			submitted_at,
			NULL::double precision AS acceptance_pct
		FROM applications
		WHERE university_id = $1 AND status = 'submitted'
		ORDER BY `+unifiedSubmittedReceivedAtExpr+` DESC
		LIMIT 10
	`, universityId)
	if err != nil {
		return nil, fmt.Errorf("failed to load recent applications: %s", err.Error())
	}
	defer rows.Close()

	recent, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.PartnerDashboardRecentApplication])
	if err != nil {
		return nil, fmt.Errorf("failed to scan recent applications: %s", err.Error())
	}
	resp.RecentApplications = recent

	notifications := make([]models.PartnerDashboardNotification, 0, len(recent))
	for i, item := range recent {
		ts := "recently"
		if item.SubmittedAt != nil {
			ts = item.SubmittedAt.Format("Jan 2, 2006")
		}
		notifications = append(notifications, models.PartnerDashboardNotification{
			Id:      item.Id,
			Type:    "application",
			Message: fmt.Sprintf("New application from %s for %s", item.Name, item.Program),
			Time:    ts,
			Read:    i > 2,
		})
	}
	resp.Notifications = notifications

	return resp, nil
}

func GetApplicationStructureHistory(ctx context.Context, universityId string, limit int) ([]models.ApplicationStructureVersion, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx, `
		SELECT id, university_id, version_no, schema, published, changed_by, change_note, created_at
		FROM university_application_structure_versions
		WHERE university_id = $1
		ORDER BY version_no DESC
		LIMIT $2
	`, universityId, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query application structure history: %s", err.Error())
	}
	defer rows.Close()

	versions, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.ApplicationStructureVersion])
	if err != nil {
		return nil, fmt.Errorf("failed to scan structure history: %s", err.Error())
	}

	for index := range versions {
		versions[index].Schema = utils.NormalizeApplicationSchema(versions[index].Schema)
	}
	return versions, nil
}

func PublishApplicationStructure(
	ctx context.Context,
	universityId string,
	actorId string,
	req *models.PublishApplicationStructureRequest,
) (*models.ApplicationStructureVersion, error) {
	dbConn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	var out models.ApplicationStructureVersion
	var schema []byte
	err := pgx.BeginFunc(ctx, dbConn, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx, "SELECT application_schema FROM universities WHERE id = $1", universityId).Scan(&schema); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
			}
			return fmt.Errorf("failed to fetch application structure: %s", err.Error())
		}
		if len(schema) == 0 {
			schema = []byte(`{"sections":[]}`)
		}

		var nextVersion int
		if err := tx.QueryRow(ctx, `
			SELECT COALESCE(MAX(version_no), 0) + 1
			FROM university_application_structure_versions
			WHERE university_id = $1
		`, universityId).Scan(&nextVersion); err != nil {
			return fmt.Errorf("failed to compute next version: %s", err.Error())
		}

		if _, err := tx.Exec(ctx, `
			UPDATE university_application_structure_versions
			SET published = FALSE
			WHERE university_id = $1 AND published = TRUE
		`, universityId); err != nil {
			return fmt.Errorf("failed to clear published versions: %s", err.Error())
		}

		if err := tx.QueryRow(ctx, `
			INSERT INTO university_application_structure_versions (
				university_id, version_no, schema, published, changed_by, change_note, created_at
			) VALUES ($1, $2, $3, TRUE, $4, $5, NOW())
			RETURNING id, university_id, version_no, schema, published, changed_by, change_note, created_at
		`, universityId, nextVersion, schema, actorId, req.ChangeNote).Scan(
			&out.Id,
			&out.University,
			&out.VersionNo,
			&out.Schema,
			&out.Published,
			&out.ChangedBy,
			&out.ChangeNote,
			&out.CreatedAt,
		); err != nil {
			return fmt.Errorf("failed to publish application structure: %s", err.Error())
		}
		schema = []byte(out.Schema)

		metadata, _ := json.Marshal(map[string]any{
			"version_no":  nextVersion,
			"change_note": req.ChangeNote,
		})
		if err := insertAuditLog(ctx, tx, observability.AuditEntry{
			ActionType:        "application-structure.publish",
			ActionDescription: "Published application structure",
			TargetEntity:      "university_application_structure",
			TargetID:          &universityId,
			Outcome:           "success",
			Metadata:          metadata,
		}); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	out.Schema = utils.NormalizeApplicationSchema(out.Schema)
	return &out, nil
}
