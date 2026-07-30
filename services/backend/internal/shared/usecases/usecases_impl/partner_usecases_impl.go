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
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	partnerAnalyticsStageSuspect  = "suspect"
	partnerAnalyticsStageProspect = "prospect"
)

func GetPartnerDashboard(ctx context.Context, universityId string) (*models.PartnerDashboardResponse, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	resp := &models.PartnerDashboardResponse{}

	err = conn.QueryRow(ctx, `
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
			WHERE university_id = $1::uuid AND status <> 'draft'
		)
		SELECT
			COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '7 days') AS new_applications,
			COUNT(*) AS total_applicants,
			COALESCE(ROUND(AVG(sat_score))::int, 0) AS avg_sat,
			COALESCE(ROUND(AVG(ielts_score), 1), 0) AS avg_ielts,
			COUNT(*) FILTER (WHERE gender_value IN ('male', 'm', 'man', 'boy')) AS male_count,
			COUNT(*) FILTER (WHERE gender_value IN ('female', 'f', 'woman', 'girl')) AS female_count,
			COUNT(*) FILTER (WHERE gender_value IN ('non_binary', 'non-binary', 'nonbinary', 'nb', 'other')) AS non_binary_count,
			COUNT(*) FILTER (
				WHERE gender_value NOT IN (
					'male', 'm', 'man', 'boy',
					'female', 'f', 'woman', 'girl',
					'non_binary', 'non-binary', 'nonbinary', 'nb', 'other'
				)
			) AS prefer_not_to_say_count
		FROM application_metrics
	`, universityId).Scan(
		&resp.NewApplications,
		&resp.TotalApplicants,
		&resp.AvgSAT,
		&resp.AvgIELTS,
		&resp.MaleCount,
		&resp.FemaleCount,
		&resp.NonBinaryCount,
		&resp.PreferNotToSayCount,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load dashboard stats: %s", err.Error())
	}

	suspectsCount, prospectsCount, err := loadPartnerFunnelCounts(ctx, conn, universityId)
	if err != nil {
		return nil, err
	}
	resp.SuspectsCount = suspectsCount
	resp.ProspectsCount = prospectsCount

	originStats, err := loadPartnerStudentOriginStats(ctx, conn, universityId)
	if err != nil {
		return nil, err
	}
	resp.StudentOriginStats = originStats

	rows, err := conn.Query(ctx, `
		SELECT
			id,
			COALESCE(NULLIF(`+unifiedSubmittedApplicantNameExpr+`, ''), 'Applicant') AS name,
			COALESCE(NULLIF(data->>'program', ''), NULLIF(applicant_info->>'program', ''), 'General') AS program,
			COALESCE(NULLIF(`+unifiedSubmittedApplicantCitizenExpr+`, ''), 'Unknown') AS citizenship,
			status,
			submitted_at,
			NULL::double precision AS acceptance_pct
		FROM applications
		WHERE university_id = $1::uuid AND status <> 'draft'
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

func loadPartnerFunnelCounts(ctx context.Context, conn middlewares.DB, universityId string) (int, int, error) {
	var suspectsCount int
	var prospectsCount int
	err := conn.QueryRow(ctx, `
		WITH submitted_users AS (
			SELECT DISTINCT user_id
			FROM applications
			WHERE university_id = $1::uuid AND status <> 'draft'
		),
		draft_users AS (
			SELECT DISTINCT user_id
			FROM applications
			WHERE university_id = $1::uuid AND status = 'draft'
		),
		basket_users AS (
			SELECT u.id AS user_id
			FROM users u
			WHERE u.role = 'applicant'
			  AND EXISTS (
				SELECT 1
				FROM jsonb_array_elements_text(COALESCE(u.data->'basket'->'university_ids', '[]'::jsonb)) AS basket(university_id)
				WHERE basket.university_id = $1::text
			  )
		),
		funnel_users AS (
			SELECT b.user_id, 'suspect' AS stage
			FROM basket_users b
			WHERE NOT EXISTS (
				SELECT 1
				FROM applications a
				WHERE a.user_id = b.user_id AND a.university_id = $1::uuid
			)
			UNION ALL
			SELECT d.user_id, 'prospect' AS stage
			FROM draft_users d
			WHERE NOT EXISTS (
				SELECT 1
				FROM submitted_users s
				WHERE s.user_id = d.user_id
			)
		)
		SELECT
			COUNT(*) FILTER (WHERE stage = 'suspect')::int AS suspects_count,
			COUNT(*) FILTER (WHERE stage = 'prospect')::int AS prospects_count
		FROM funnel_users
	`, universityId).Scan(&suspectsCount, &prospectsCount)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to load partner funnel counts: %s", err.Error())
	}
	return suspectsCount, prospectsCount, nil
}

func loadPartnerStudentOriginStats(ctx context.Context, conn middlewares.DB, universityId string) ([]models.PartnerStudentOriginStat, error) {
	rows, err := conn.Query(ctx, `
		WITH submitted AS (
			SELECT DISTINCT ON (a.user_id)
				a.user_id,
				COALESCE(NULLIF(BTRIM(
					COALESCE(
						a.data->>'regionOfResidence',
						a.data->>'region_of_residence',
						a.data->>'residenceRegion',
						a.data->>'residence_region',
						a.data->>'region',
						a.applicant_info->>'regionOfResidence',
						a.applicant_info->>'region_of_residence',
						a.applicant_info->>'residenceRegion',
						a.applicant_info->>'residence_region',
						a.applicant_info->>'region',
						u.data->>'regionOfResidence',
						u.data->>'region_of_residence',
						u.data->>'residenceRegion',
						u.data->>'residence_region',
						u.data->>'region'
					)
				), ''), 'unknown') AS region
			FROM applications a
			JOIN users u ON u.id = a.user_id
			WHERE a.university_id = $1::uuid AND a.status <> 'draft'
			ORDER BY a.user_id, COALESCE(a.received_at, a.submitted_at, a.created_at) DESC
		),
		prospects AS (
			SELECT DISTINCT ON (a.user_id)
				a.user_id,
				COALESCE(NULLIF(BTRIM(
					COALESCE(
						a.data->>'regionOfResidence',
						a.data->>'region_of_residence',
						a.data->>'residenceRegion',
						a.data->>'residence_region',
						a.data->>'region',
						u.data->>'regionOfResidence',
						u.data->>'region_of_residence',
						u.data->>'residenceRegion',
						u.data->>'residence_region',
						u.data->>'region'
					)
				), ''), 'unknown') AS region
			FROM applications a
			JOIN users u ON u.id = a.user_id
			WHERE a.university_id = $1::uuid
			  AND a.status = 'draft'
			  AND NOT EXISTS (
				SELECT 1
				FROM submitted s
				WHERE s.user_id = a.user_id
			  )
			ORDER BY a.user_id, COALESCE(a.updated_at, a.created_at) DESC
		),
		suspects AS (
			SELECT
				u.id AS user_id,
				COALESCE(NULLIF(BTRIM(
					COALESCE(
						u.data->>'regionOfResidence',
						u.data->>'region_of_residence',
						u.data->>'residenceRegion',
						u.data->>'residence_region',
						u.data->>'region'
					)
				), ''), 'unknown') AS region
			FROM users u
			WHERE u.role = 'applicant'
			  AND EXISTS (
				SELECT 1
				FROM jsonb_array_elements_text(COALESCE(u.data->'basket'->'university_ids', '[]'::jsonb)) AS basket(university_id)
				WHERE basket.university_id = $1::text
			  )
			  AND NOT EXISTS (
				SELECT 1
				FROM applications a
				WHERE a.user_id = u.id AND a.university_id = $1::uuid
			  )
		),
		student_origins AS (
			SELECT region FROM submitted
			UNION ALL
			SELECT region FROM prospects
			UNION ALL
			SELECT region FROM suspects
		),
		normalized_origins AS (
			SELECT
				CASE
					WHEN LOWER(region) IN ('tashkent_city', 'tashkent city', 'toshkent shahri', 'tashkent', 'toshkent') THEN 'tashkent_city'
					WHEN LOWER(region) IN ('karakalpakstan', 'republic of karakalpakstan', 'qoraqalpogiston', 'qoraqalpogiston respublikasi') THEN 'karakalpakstan'
					WHEN LOWER(region) IN ('andijan', 'andijon') THEN 'andijan'
					WHEN LOWER(region) IN ('bukhara', 'buxoro') THEN 'bukhara'
					WHEN LOWER(region) IN ('fergana', 'fargona', 'fargona viloyati') THEN 'fergana'
					WHEN LOWER(region) IN ('jizzakh', 'jizzax') THEN 'jizzakh'
					WHEN LOWER(region) IN ('khorezm', 'xorazm') THEN 'khorezm'
					WHEN LOWER(region) IN ('namangan') THEN 'namangan'
					WHEN LOWER(region) IN ('navoiy', 'navoi') THEN 'navoiy'
					WHEN LOWER(region) IN ('qashqadaryo', 'kashkadarya', 'qarshi') THEN 'qashqadaryo'
					WHEN LOWER(region) IN ('samarqand', 'samarkand') THEN 'samarqand'
					WHEN LOWER(region) IN ('sirdaryo', 'syrdarya') THEN 'sirdaryo'
					WHEN LOWER(region) IN ('surxondaryo', 'surkhandarya') THEN 'surxondaryo'
					WHEN LOWER(region) IN ('tashkent_region', 'tashkent region', 'toshkent viloyati') THEN 'tashkent_region'
					ELSE 'unknown'
				END AS country
			FROM student_origins
		)
		SELECT
			country,
			COUNT(*)::int AS count,
			ROUND((COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0)) * 100, 1)::double precision AS percentage
		FROM normalized_origins
		GROUP BY country
		ORDER BY count DESC, country ASC
	`, universityId)
	if err != nil {
		return nil, fmt.Errorf("failed to load student origin stats: %s", err.Error())
	}
	defer rows.Close()

	stats, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.PartnerStudentOriginStat])
	if err != nil {
		return nil, fmt.Errorf("failed to scan student origin stats: %s", err.Error())
	}
	return stats, nil
}

func GetPartnerAnalyticsContacts(ctx context.Context, universityId, stage string) ([]models.PartnerAnalyticsContact, error) {
	normalizedStage := strings.ToLower(strings.TrimSpace(stage))
	if normalizedStage == "" {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "stage query parameter is required")
	}
	if normalizedStage != partnerAnalyticsStageSuspect && normalizedStage != partnerAnalyticsStageProspect {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "stage must be 'suspect' or 'prospect'")
	}

	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	query := partnerSuspectContactsSQL
	if normalizedStage == partnerAnalyticsStageProspect {
		query = partnerProspectContactsSQL
	}

	rows, err := conn.Query(ctx, query, universityId)
	if err != nil {
		return nil, fmt.Errorf("failed to load %s contacts: %s", normalizedStage, err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.PartnerAnalyticsContact])
	if err != nil {
		return nil, fmt.Errorf("failed to scan %s contacts: %s", normalizedStage, err.Error())
	}
	return items, nil
}

const partnerProspectContactsSQL = `
	SELECT DISTINCT ON (u.id)
		u.id::text AS user_id,
		COALESCE(
			NULLIF(BTRIM(a.data->>'full_name'), ''),
			NULLIF(BTRIM(a.data->>'name'), ''),
			NULLIF(BTRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
			'Applicant'
		) AS name,
		u.email,
		COALESCE(
			NULLIF(BTRIM(a.data->>'citizenship'), ''),
			NULLIF(BTRIM(u.data->>'citizenship'), ''),
			NULLIF(BTRIM(u.data->>'country'), ''),
			'Unknown'
		) AS country,
		'prospect' AS stage,
		to_char(COALESCE(a.updated_at, a.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_activity_at
	FROM applications a
	JOIN users u ON u.id = a.user_id
	WHERE a.university_id = $1::uuid
	  AND a.status = 'draft'
	  AND NOT EXISTS (
		SELECT 1
		FROM applications submitted
		WHERE submitted.user_id = a.user_id
		  AND submitted.university_id = $1::uuid
		  AND submitted.status <> 'draft'
	  )
	ORDER BY u.id, COALESCE(a.updated_at, a.created_at) DESC
`

const partnerSuspectContactsSQL = `
	SELECT
		u.id::text AS user_id,
		COALESCE(
			NULLIF(BTRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
			'Applicant'
		) AS name,
		u.email,
		COALESCE(
			NULLIF(BTRIM(u.data->>'citizenship'), ''),
			NULLIF(BTRIM(u.data->>'country'), ''),
			'Unknown'
		) AS country,
		'suspect' AS stage,
		COALESCE(
			to_char(
				COALESCE(
					CASE
						WHEN COALESCE(u.data #>> '{basket,updated_at}', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
						THEN (u.data #>> '{basket,updated_at}')::timestamptz
						ELSE NULL
					END,
					u.last_seen::timestamptz
				) AT TIME ZONE 'UTC',
				'YYYY-MM-DD"T"HH24:MI:SS"Z"'
			),
			''
		) AS last_activity_at
	FROM users u
	WHERE u.role = 'applicant'
	  AND EXISTS (
		SELECT 1
		FROM jsonb_array_elements_text(COALESCE(u.data->'basket'->'university_ids', '[]'::jsonb)) AS basket(university_id)
		WHERE basket.university_id = $1::text
	  )
	  AND NOT EXISTS (
		SELECT 1
		FROM applications a
		WHERE a.user_id = u.id AND a.university_id = $1::uuid
	  )
	ORDER BY last_activity_at DESC NULLS LAST, name ASC
`

func GetApplicationStructureHistory(ctx context.Context, universityId string, limit int) ([]models.ApplicationStructureVersion, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx, `
		SELECT id, university_id, version_no, schema, published, changed_by, change_note, created_at
		FROM university_application_structure_versions
		WHERE university_id = $1::uuid
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
		if err := tx.QueryRow(ctx, "SELECT application_schema FROM universities WHERE id = $1::uuid", universityId).Scan(&schema); err != nil {
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
			WHERE university_id = $1::uuid
		`, universityId).Scan(&nextVersion); err != nil {
			return fmt.Errorf("failed to compute next version: %s", err.Error())
		}

		if _, err := tx.Exec(ctx, `
			UPDATE university_application_structure_versions
			SET published = FALSE
			WHERE university_id = $1::uuid AND published = TRUE
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
