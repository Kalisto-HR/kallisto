package usecases_impl

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/admin/internal/models"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var (
	allowedStaffRoles = map[string]bool{
		"University Manager": true,
		"Admissions Officer": true,
		"Reviewer":           true,
		"Read-only":          true,
	}
	allowedStaffStatuses = map[string]bool{
		"active":      true,
		"suspended":   true,
		"pending":     true,
		"deactivated": true,
	}
)

func GetUniversityDashboard(ctx context.Context, universityId string) (*models.ManagerDashboardResponse, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	resp := &models.ManagerDashboardResponse{}

	err := conn.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '7 days') AS new_applications,
			COUNT(*) AS total_applicants,
			COALESCE(ROUND(AVG(
				CASE
					WHEN COALESCE(application_data->>'sat', applicant_info->>'sat') ~ '^[0-9]+(\.[0-9]+)?$'
					THEN (COALESCE(application_data->>'sat', applicant_info->>'sat'))::numeric
					ELSE NULL
				END
			))::int, 0) AS avg_sat,
			COALESCE(ROUND(AVG(
				CASE
					WHEN COALESCE(application_data->>'ielts', applicant_info->>'ielts') ~ '^[0-9]+(\.[0-9]+)?$'
					THEN (COALESCE(application_data->>'ielts', applicant_info->>'ielts'))::numeric
					ELSE NULL
				END
			), 1), 0) AS avg_ielts,
			COUNT(*) FILTER (WHERE LOWER(COALESCE(applicant_info->>'gender', application_data->>'gender', '')) = 'male') AS male_count,
			COUNT(*) FILTER (WHERE LOWER(COALESCE(applicant_info->>'gender', application_data->>'gender', '')) = 'female') AS female_count
		FROM submitted_applications
		WHERE university_id = $1
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
			COALESCE(
				NULLIF(applicant_info->>'name', ''),
				TRIM(COALESCE(applicant_info->>'first_name', '') || ' ' || COALESCE(applicant_info->>'last_name', '')),
				'Applicant'
			) AS name,
			COALESCE(NULLIF(application_data->>'program', ''), NULLIF(applicant_info->>'program', ''), 'General') AS program,
			COALESCE(NULLIF(applicant_info->>'citizenship', ''), 'Unknown') AS citizenship,
			status,
			submitted_at,
			NULL::double precision AS acceptance_pct
		FROM submitted_applications
		WHERE university_id = $1
		ORDER BY received_at DESC
		LIMIT 10
	`, universityId)
	if err != nil {
		return nil, fmt.Errorf("failed to load recent applications: %s", err.Error())
	}
	defer rows.Close()

	recent, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.ManagerDashboardRecentApplication])
	if err != nil {
		return nil, fmt.Errorf("failed to scan recent applications: %s", err.Error())
	}
	resp.RecentApplications = recent

	notifications := make([]models.ManagerDashboardNotification, 0, len(recent))
	for i, item := range recent {
		ts := "recently"
		if item.SubmittedAt != nil {
			ts = item.SubmittedAt.Format("Jan 2, 2006")
		}
		notifications = append(notifications, models.ManagerDashboardNotification{
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

func GetUniversityStaff(
	ctx context.Context,
	universityId string,
	search, staffRole, status *string,
	page, limit int,
) ([]models.UniversityStaffListItem, int, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, 0, errors.New("could not establish connection with the database")
	}

	baseQuery := `
		FROM university_staff_profiles usp
		JOIN users u ON u.id = usp.user_id
		WHERE usp.university_id = $1
	`
	args := []interface{}{universityId}
	argCount := 1

	if search != nil && strings.TrimSpace(*search) != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND (LOWER(u.email) LIKE LOWER($%d) OR LOWER(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) LIKE LOWER($%d))", argCount, argCount)
		args = append(args, "%"+strings.TrimSpace(*search)+"%")
	}
	if staffRole != nil && strings.TrimSpace(*staffRole) != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND usp.staff_role = $%d", argCount)
		args = append(args, strings.TrimSpace(*staffRole))
	}
	if status != nil && strings.TrimSpace(*status) != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND usp.status = $%d", argCount)
		args = append(args, strings.TrimSpace(*status))
	}

	var total int
	countQuery := "SELECT COUNT(*) " + baseQuery
	if err := conn.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count staff: %s", err.Error())
	}

	offset := (page - 1) * limit
	argCount++
	limitArg := argCount
	argCount++
	offsetArg := argCount
	listQuery := fmt.Sprintf(`
		SELECT
			u.id,
			u.email,
			u.first_name,
			u.last_name,
			usp.staff_role,
			usp.status,
			COALESCE(usp.last_active_at, u.last_seen) AS last_active_at,
			u.created_at
		%s
		ORDER BY u.created_at DESC
		LIMIT $%d OFFSET $%d
	`, baseQuery, limitArg, offsetArg)
	args = append(args, limit, offset)

	rows, err := conn.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query staff: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.UniversityStaffListItem])
	if err != nil {
		return nil, 0, fmt.Errorf("failed to scan staff rows: %s", err.Error())
	}
	return items, total, nil
}

func CreateUniversityStaff(
	ctx context.Context,
	universityId string,
	actorId string,
	req *models.UniversityStaffCreateRequest,
) (string, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return "", errors.New("could not establish connection with the database")
	}

	role := "Admissions Officer"
	if req.StaffRole != nil && strings.TrimSpace(*req.StaffRole) != "" {
		role = strings.TrimSpace(*req.StaffRole)
	}
	if !allowedStaffRoles[role] {
		return "", utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid staff_role")
	}

	nextStatus := "active"
	if req.Status != nil && strings.TrimSpace(*req.Status) != "" {
		nextStatus = strings.TrimSpace(*req.Status)
	}
	if !allowedStaffStatuses[nextStatus] {
		return "", utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid status")
	}

	var universityExists bool
	if err := conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM universities WHERE id = $1)", universityId).Scan(&universityExists); err != nil {
		return "", fmt.Errorf("failed to verify university: %s", err.Error())
	}
	if !universityExists {
		return "", utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %s", err.Error())
	}

	var userId string
	err = pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx, `
			INSERT INTO users (email, password, first_name, last_name, role, university_linked)
			VALUES ($1, $2, $3, $4, 'partner', $5)
			RETURNING id
		`, req.Email, string(hashedPassword), req.FirstName, req.LastName, universityId).Scan(&userId); err != nil {
			return fmt.Errorf("failed to create user: %s", err.Error())
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO university_staff_profiles (
				user_id, university_id, staff_role, status, invited_by, invited_at, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
		`, userId, universityId, role, nextStatus, actorId)
		if err != nil {
			return fmt.Errorf("failed to create staff profile: %s", err.Error())
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO university_staff_status_events (
				user_id, university_id, previous_status, next_status, changed_by, changed_at, metadata
			) VALUES ($1, $2, NULL, $3, $4, NOW(), '{"source":"create"}'::jsonb)
		`, userId, universityId, nextStatus, actorId)
		if err != nil {
			return fmt.Errorf("failed to create staff status event: %s", err.Error())
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	return userId, nil
}

func UpdateUniversityStaff(
	ctx context.Context,
	universityId string,
	staffId string,
	req *models.UniversityStaffUpdateRequest,
) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	if req.StaffRole != nil && !allowedStaffRoles[strings.TrimSpace(*req.StaffRole)] {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid staff_role")
	}

	return pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		if req.Email != nil || req.FirstName != nil || req.LastName != nil {
			updates := make([]string, 0, 3)
			args := make([]interface{}, 0, 4)
			argCount := 0
			if req.Email != nil {
				argCount++
				updates = append(updates, fmt.Sprintf("email = $%d", argCount))
				args = append(args, strings.TrimSpace(*req.Email))
			}
			if req.FirstName != nil {
				argCount++
				updates = append(updates, fmt.Sprintf("first_name = $%d", argCount))
				args = append(args, strings.TrimSpace(*req.FirstName))
			}
			if req.LastName != nil {
				argCount++
				updates = append(updates, fmt.Sprintf("last_name = $%d", argCount))
				args = append(args, strings.TrimSpace(*req.LastName))
			}
			argCount++
			args = append(args, staffId)
			query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d AND university_linked = $%d",
				strings.Join(updates, ", "),
				argCount,
				argCount+1,
			)
			args = append(args, universityId)
			result, err := tx.Exec(ctx, query, args...)
			if err != nil {
				return fmt.Errorf("failed updating staff identity: %s", err.Error())
			}
			if result.RowsAffected() == 0 {
				return utils.NewHandlerFuncErr(http.StatusNotFound, "staff member not found")
			}
		}

		if req.StaffRole != nil {
			result, err := tx.Exec(ctx, `
				UPDATE university_staff_profiles
				SET staff_role = $1, updated_at = NOW()
				WHERE user_id = $2 AND university_id = $3
			`, strings.TrimSpace(*req.StaffRole), staffId, universityId)
			if err != nil {
				return fmt.Errorf("failed updating staff role: %s", err.Error())
			}
			if result.RowsAffected() == 0 {
				return utils.NewHandlerFuncErr(http.StatusNotFound, "staff member not found")
			}
		}

		return nil
	})
}

func UpdateUniversityStaffStatus(
	ctx context.Context,
	universityId string,
	staffId string,
	actorId string,
	req *models.UniversityStaffStatusUpdateRequest,
) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}
	if !allowedStaffStatuses[req.Status] {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "invalid status")
	}

	return pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		var previousStatus string
		err := tx.QueryRow(ctx, `
			SELECT status
			FROM university_staff_profiles
			WHERE user_id = $1 AND university_id = $2
		`, staffId, universityId).Scan(&previousStatus)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return utils.NewHandlerFuncErr(http.StatusNotFound, "staff member not found")
			}
			return fmt.Errorf("failed to read current staff status: %s", err.Error())
		}

		_, err = tx.Exec(ctx, `
			UPDATE university_staff_profiles
			SET status = $1, updated_at = NOW()
			WHERE user_id = $2 AND university_id = $3
		`, req.Status, staffId, universityId)
		if err != nil {
			return fmt.Errorf("failed to update staff status: %s", err.Error())
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO university_staff_status_events (
				user_id, university_id, previous_status, next_status, reason, changed_by, changed_at
			) VALUES ($1, $2, $3, $4, $5, $6, NOW())
		`, staffId, universityId, previousStatus, req.Status, req.Reason, actorId)
		if err != nil {
			return fmt.Errorf("failed to write status event: %s", err.Error())
		}
		return nil
	})
}

func ResendUniversityStaffInvite(ctx context.Context, universityId, staffId, actorId string) (string, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return "", errors.New("could not establish connection with the database")
	}

	var email string
	var role string
	err := conn.QueryRow(ctx, `
		SELECT u.email, usp.staff_role
		FROM university_staff_profiles usp
		JOIN users u ON u.id = usp.user_id
		WHERE usp.user_id = $1 AND usp.university_id = $2
	`, staffId, universityId).Scan(&email, &role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", utils.NewHandlerFuncErr(http.StatusNotFound, "staff member not found")
		}
		return "", fmt.Errorf("failed to fetch staff profile: %s", err.Error())
	}

	token := fmt.Sprintf("%s:%s:%d", universityId, staffId, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	var invitationId string
	err = conn.QueryRow(ctx, `
		INSERT INTO university_staff_invitations (
			university_id, email, staff_role, status, invite_token_hash, expires_at, invited_by, accepted_user_id
		) VALUES ($1, $2, $3, 'pending', $4, NOW() + INTERVAL '7 days', $5, $6)
		RETURNING id
	`, universityId, email, role, tokenHash, actorId, staffId).Scan(&invitationId)
	if err != nil {
		return "", fmt.Errorf("failed to create invitation: %s", err.Error())
	}
	return invitationId, nil
}

func GetUniversityStaffInvitations(ctx context.Context, universityId string) ([]models.UniversityStaffInvitation, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx, `
		SELECT
			id,
			email,
			staff_role,
			status,
			created_at,
			expires_at,
			CASE WHEN status = 'accepted' THEN updated_at ELSE NULL END AS accepted_at
		FROM university_staff_invitations
		WHERE university_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, universityId)
	if err != nil {
		return nil, fmt.Errorf("failed to query invitations: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.UniversityStaffInvitation])
	if err != nil {
		return nil, fmt.Errorf("failed to scan invitations: %s", err.Error())
	}
	return items, nil
}

func GetUniversityStaffRoles(ctx context.Context, universityId string) ([]models.UniversityStaffRole, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx, `
		SELECT staff_role, COUNT(*)::int
		FROM university_staff_profiles
		WHERE university_id = $1
		GROUP BY staff_role
	`, universityId)
	if err != nil {
		return nil, fmt.Errorf("failed to query role counts: %s", err.Error())
	}
	defer rows.Close()

	counts := map[string]int{}
	for rows.Next() {
		var role string
		var count int
		if err := rows.Scan(&role, &count); err != nil {
			return nil, fmt.Errorf("failed to scan role count: %s", err.Error())
		}
		counts[role] = count
	}

	roleDefinitions := []models.UniversityStaffRole{
		{
			Id:          "role-university-manager",
			Name:        "University Manager",
			Description: "Full access to university settings and applications",
			UserCount:   counts["University Manager"],
			Permissions: []string{"Manage staff", "Edit university profile", "View all applications", "Review decisions", "Access analytics"},
		},
		{
			Id:          "role-admissions-officer",
			Name:        "Admissions Officer",
			Description: "Review and manage applications",
			UserCount:   counts["Admissions Officer"],
			Permissions: []string{"View applications", "Review applications", "Update statuses", "Access analytics"},
		},
		{
			Id:          "role-reviewer",
			Name:        "Reviewer",
			Description: "Review applications only",
			UserCount:   counts["Reviewer"],
			Permissions: []string{"View applications", "Review applications"},
		},
		{
			Id:          "role-read-only",
			Name:        "Read-only",
			Description: "View-only access to applications and reports",
			UserCount:   counts["Read-only"],
			Permissions: []string{"View applications", "Access analytics"},
		},
	}
	return roleDefinitions, nil
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
	return versions, nil
}

func PublishApplicationStructure(
	ctx context.Context,
	universityId string,
	actorId string,
	req *models.PublishApplicationStructureRequest,
) (*models.ApplicationStructureVersion, error) {
	adminConn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}
	clientConn, ok := ctx.Value(middlewares.CtxClientPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the client database")
	}

	var out models.ApplicationStructureVersion
	var schema []byte
	var universityName string
	err := pgx.BeginFunc(ctx, adminConn, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx, "SELECT application_schema, name FROM universities WHERE id = $1", universityId).Scan(&schema, &universityName); err != nil {
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
		return nil
	})
	if err != nil {
		return nil, err
	}

	if _, err := clientConn.Exec(ctx, `
		INSERT INTO universities (id, name, application_schema)
		VALUES ($1, $2, $3)
		ON CONFLICT (id) DO UPDATE
		SET
			name = EXCLUDED.name,
			application_schema = EXCLUDED.application_schema
	`, universityId, universityName, schema); err != nil {
		return nil, fmt.Errorf("published in admin db but failed syncing to client db: %s", err.Error())
	}

	return &out, nil
}
