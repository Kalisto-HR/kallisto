// application_usecases_impl.go implements application-related business logic.
package usecases_impl

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/client/internal/models"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

func GetApplicationsByUser(ctx context.Context, userId string) ([]models.ApplicationListItem, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		`SELECT a.university_id, u.name as university_name, a.application_cycle, a.status, a.created_at, a.submitted_at
		FROM applications a JOIN universities u ON a.university_id = u.id
		WHERE a.user_id=$1 ORDER BY a.created_at DESC`, userId)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.ApplicationListItem])
	if err != nil {
		return nil, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return items, nil
}

func GetApplicationById(ctx context.Context, userId, universityId, cycle string) (*models.Application, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	rows, err := conn.Query(ctx,
		"SELECT user_id, university_id, application_cycle, status, data, submitted_at, created_at FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3",
		userId, universityId, cycle)
	if err != nil {
		return nil, fmt.Errorf("failed to perform database query: %s", err.Error())
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
	}

	application, err := pgx.RowToStructByName[models.Application](rows)
	if err != nil {
		return nil, fmt.Errorf("failed to convert database results to struct: %s", err.Error())
	}

	return &application, nil
}

func CreateApplication(ctx context.Context, userId string, req *models.ApplicationCreateRequest) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var universityExists bool
	err := conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM universities WHERE id=$1)", req.UniversityId).Scan(&universityExists)
	if err != nil {
		return fmt.Errorf("failed to check university existence: %s", err.Error())
	}
	if !universityExists {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "university not found")
	}

	var applicationExists bool
	err = conn.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3)",
		userId, req.UniversityId, req.ApplicationCycle).Scan(&applicationExists)
	if err != nil {
		return fmt.Errorf("failed to check application existence: %s", err.Error())
	}
	if applicationExists {
		return utils.NewHandlerFuncErr(http.StatusConflict, "application already exists for this cycle")
	}

	_, err = conn.Exec(ctx,
		"INSERT INTO applications (user_id, university_id, application_cycle, status, data, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
		userId, req.UniversityId, req.ApplicationCycle, models.StatusDraft, req.Data)
	if err != nil {
		return fmt.Errorf("failed to create application: %s", err.Error())
	}

	if err := syncApplicationTranscripts(ctx, conn, userId, req.UniversityId, req.ApplicationCycle, req.Data); err != nil {
		return fmt.Errorf("failed to sync transcript records: %s", err.Error())
	}

	return nil
}

func UpdateApplication(ctx context.Context, userId, universityId, cycle string, req *models.ApplicationUpdateRequest) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var status string
	err := conn.QueryRow(ctx,
		"SELECT status FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3",
		userId, universityId, cycle).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
		}
		return fmt.Errorf("failed to check application status: %s", err.Error())
	}
	if status != models.StatusDraft {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "cannot update submitted application")
	}

	result, err := conn.Exec(ctx,
		"UPDATE applications SET data=$1 WHERE user_id=$2 AND university_id=$3 AND application_cycle=$4 AND status=$5",
		req.Data, userId, universityId, cycle, models.StatusDraft)
	if err != nil {
		return fmt.Errorf("failed to update application: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
	}

	if err := syncApplicationTranscripts(ctx, conn, userId, universityId, cycle, req.Data); err != nil {
		return fmt.Errorf("failed to sync transcript records: %s", err.Error())
	}

	return nil
}

func SubmitApplication(ctx context.Context, userId, universityId, cycle string) error {
	log := zap.L()

	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	var status string
	err := conn.QueryRow(ctx,
		"SELECT status FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3",
		userId, universityId, cycle).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
		}
		return fmt.Errorf("failed to check application status: %s", err.Error())
	}
	if status != models.StatusDraft {
		return utils.NewHandlerFuncErr(http.StatusBadRequest, "application already submitted")
	}

	// Update application status to submitted
	submittedAt := time.Now()
	result, err := conn.Exec(ctx,
		"UPDATE applications SET status=$1, submitted_at=$2 WHERE user_id=$3 AND university_id=$4 AND application_cycle=$5 AND status=$6",
		models.StatusSubmitted, submittedAt, userId, universityId, cycle, models.StatusDraft)
	if err != nil {
		return fmt.Errorf("failed to submit application: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
	}

	// Fetch application data and user info To forward to admin service
	var applicationData json.RawMessage
	err = conn.QueryRow(ctx,
		"SELECT data FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3",
		userId, universityId, cycle).Scan(&applicationData)
	if err != nil {
		log.Error("failed to fetch application data for forwarding", zap.Error(err))
		// Don't fail the submission, just log the error
	}

	var (
		userEmail     string
		userFirstName string
		userLastName  string
		userData      json.RawMessage
	)
	err = conn.QueryRow(ctx,
		"SELECT email, first_name, last_name, data FROM users WHERE id=$1",
		userId).Scan(&userEmail, &userFirstName, &userLastName, &userData)
	if err != nil {
		log.Error("failed to fetch user info for forwarding", zap.Error(err))
		// Don't fail the submission, just log the error
	}

	applicantInfo := map[string]string{
		"email":      userEmail,
		"first_name": userFirstName,
		"last_name":  userLastName,
	}
	if gender := extractProfileGender(userData); gender != "" {
		applicantInfo["gender"] = gender
	}

	// Forward application to admin service
	fileAssets := []models.ApplicationFileAsset{}
	fileIDs := extractApplicationFileIDs(applicationData)
	if len(fileIDs) > 0 {
		assets, assetErr := GetApplicationFileAssetsByIDs(ctx, userId, universityId, cycle, fileIDs)
		if assetErr != nil {
			log.Error("failed to resolve file assets for admin forwarding",
				zap.Error(assetErr),
				zap.String("user_id", userId),
				zap.String("university_id", universityId),
				zap.String("cycle", cycle))
		} else {
			fileAssets = assets
		}
	}

	go forwardApplicationToAdmin(
		userId,
		universityId,
		cycle,
		applicationData,
		applicantInfo,
		fileAssets,
		submittedAt,
	)

	return nil
}

// forwardApplicationToAdmin sends the submitted application to the admin service
func forwardApplicationToAdmin(
	userId, universityId, cycle string,
	applicationData json.RawMessage,
	applicantInfo map[string]string,
	fileAssets []models.ApplicationFileAsset,
	submittedAt time.Time,
) {
	log := zap.L()

	// Build the request payload
	payload := map[string]interface{}{
		"user_id":           userId,
		"university_id":     universityId,
		"application_cycle": cycle,
		"applicant_info":    applicantInfo,
		"application_data": applicationData,
		"file_assets":      fileAssets,
		"submitted_at":     submittedAt.Format(time.RFC3339),
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		log.Error("failed to marshal application payload for admin service", zap.Error(err))
		return
	}

	// Get admin service URL from environment or use default
	adminServiceURL := os.Getenv("ADMIN_SERVICE_URL")
	if adminServiceURL == "" {
		adminServiceURL = "http://localhost:8082"
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", adminServiceURL+"/v1.0/applications/receive", bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Error("failed to create request to admin service", zap.Error(err))
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// Send request with timeout
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Error("failed to forward application to admin service",
			zap.Error(err),
			zap.String("user_id", userId),
			zap.String("university_id", universityId),
			zap.String("cycle", cycle))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusCreated {
		log.Info("successfully forwarded application to admin service",
			zap.String("user_id", userId),
			zap.String("university_id", universityId),
			zap.String("cycle", cycle))
	} else {
		log.Warn("admin service returned non-success status",
			zap.Int("status", resp.StatusCode),
			zap.String("user_id", userId),
			zap.String("university_id", universityId),
			zap.String("cycle", cycle))
	}
}

func extractProfileGender(raw json.RawMessage) string {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" {
		return ""
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return ""
	}

	value, ok := payload["gender"].(string)
	if !ok {
		return ""
	}

	switch strings.TrimSpace(strings.ToLower(value)) {
	case "male":
		return "male"
	case "female":
		return "female"
	case "other":
		return "other"
	case "prefer_not_to_say":
		return "prefer_not_to_say"
	default:
		return ""
	}
}

func extractApplicationFileIDs(applicationData json.RawMessage) []string {
	result := make([]string, 0)
	seen := map[string]struct{}{}

	var payload any
	if err := json.Unmarshal(applicationData, &payload); err != nil {
		return result
	}

	var walk func(node any)
	walk = func(node any) {
		switch typed := node.(type) {
		case map[string]any:
			storage := firstNonEmptyString(typed["storage"])
			if storage == "application_file" {
				fileID := strings.TrimSpace(firstNonEmptyString(typed["id"], typed["file_id"], typed["fileId"]))
				if fileID != "" {
					if _, exists := seen[fileID]; !exists {
						seen[fileID] = struct{}{}
						result = append(result, fileID)
					}
				}
			}
			for _, value := range typed {
				walk(value)
			}
		case []any:
			for _, item := range typed {
				walk(item)
			}
		}
	}

	walk(payload)
	return result
}

type profileTestScoreRow struct {
	Id            string
	TestType      string
	OtherTestName *string
	Score         float64
	OutOf         float64
	TakenOn       *string
}

func ImportProfileTestScoresToApplication(
	ctx context.Context,
	userId, universityId, cycle string,
	testScoreIDs []string,
) (*models.ApplicationImportTestScoresResponse, error) {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return nil, errors.New("could not establish connection with the database")
	}

	var status string
	var applicationData json.RawMessage
	err := conn.QueryRow(
		ctx,
		`SELECT status, data
		 FROM applications
		 WHERE user_id = $1 AND university_id = $2 AND application_cycle = $3`,
		userId,
		universityId,
		cycle,
	).Scan(&status, &applicationData)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "application not found")
		}
		return nil, fmt.Errorf("failed to fetch application: %s", err.Error())
	}
	if status != models.StatusDraft {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "test scores can only be imported into draft applications")
	}

	scores, err := fetchProfileTestScoresForImport(ctx, conn, userId, testScoreIDs)
	if err != nil {
		return nil, err
	}
	if len(scores) == 0 {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "no profile test scores found to import")
	}

	updatedData, importedScores, err := mergeApplicationDataWithTestScores(applicationData, scores)
	if err != nil {
		return nil, err
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %s", err.Error())
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(
		ctx,
		`UPDATE applications
		 SET data = $1
		 WHERE user_id = $2 AND university_id = $3 AND application_cycle = $4 AND status = $5`,
		updatedData,
		userId,
		universityId,
		cycle,
		models.StatusDraft,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update application data with test scores: %s", err.Error())
	}

	_, err = tx.Exec(
		ctx,
		`DELETE FROM application_test_scores
		 WHERE user_id = $1 AND university_id = $2 AND application_cycle = $3`,
		userId,
		universityId,
		cycle,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to clear application test score snapshots: %s", err.Error())
	}

	for _, score := range scores {
		takenOnDate, parseErr := parseOptionalDateString(score.TakenOn)
		if parseErr != nil {
			return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "taken_on must be in YYYY-MM-DD format")
		}
		_, err = tx.Exec(
			ctx,
			`INSERT INTO application_test_scores (
				user_id,
				university_id,
				application_cycle,
				profile_test_score_id,
				test_type,
				other_test_name,
				score,
				out_of,
				taken_on,
				imported_at
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
			userId,
			universityId,
			cycle,
			score.Id,
			score.TestType,
			score.OtherTestName,
			score.Score,
			score.OutOf,
			takenOnDate,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to write application test score snapshot: %s", err.Error())
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit test score import transaction: %s", err.Error())
	}

	return &models.ApplicationImportTestScoresResponse{
		ImportedCount: len(importedScores),
		TestScores:    importedScores,
	}, nil
}

func fetchProfileTestScoresForImport(
	ctx context.Context,
	conn *pgxpool.Pool,
	userId string,
	testScoreIDs []string,
) ([]profileTestScoreRow, error) {
	args := []any{userId}
	query := `
		SELECT
			id,
			test_type,
			other_test_name,
			score,
			out_of,
			to_char(taken_on, 'YYYY-MM-DD') AS taken_on
		FROM profile_test_scores
		WHERE user_id = $1
	`
	if len(testScoreIDs) > 0 {
		query += " AND id = ANY($2::uuid[])"
		args = append(args, testScoreIDs)
	}
	query += " ORDER BY created_at DESC"

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch profile test scores: %s", err.Error())
	}
	defer rows.Close()

	results := make([]profileTestScoreRow, 0)
	for rows.Next() {
		item := profileTestScoreRow{}
		if err := rows.Scan(
			&item.Id,
			&item.TestType,
			&item.OtherTestName,
			&item.Score,
			&item.OutOf,
			&item.TakenOn,
		); err != nil {
			return nil, fmt.Errorf("failed to scan profile test scores: %s", err.Error())
		}
		results = append(results, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate profile test scores: %s", err.Error())
	}
	return results, nil
}

func mergeApplicationDataWithTestScores(
	applicationData json.RawMessage,
	scores []profileTestScoreRow,
) (json.RawMessage, []models.ImportedTestScore, error) {
	data := map[string]any{}
	trimmed := strings.TrimSpace(string(applicationData))
	if trimmed != "" && trimmed != "null" {
		if err := json.Unmarshal(applicationData, &data); err != nil {
			return nil, nil, fmt.Errorf("failed to parse application data payload: %s", err.Error())
		}
	}

	imported := make([]models.ImportedTestScore, 0, len(scores))
	scoreRows := make([]map[string]any, 0, len(scores))

	type rankedScore struct {
		score      float64
		normalized float64
	}
	bestByType := map[string]rankedScore{}

	for _, score := range scores {
		normalized := 0.0
		if score.OutOf > 0 {
			normalized = score.Score / score.OutOf
		}
		normalizedCopy := normalized

		imported = append(imported, models.ImportedTestScore{
			Id:            score.Id,
			TestType:      score.TestType,
			OtherTestName: score.OtherTestName,
			Score:         score.Score,
			OutOf:         score.OutOf,
			TakenOn:       score.TakenOn,
			Normalized:    &normalizedCopy,
		})
		scoreRows = append(scoreRows, map[string]any{
			"id":              score.Id,
			"test_type":       score.TestType,
			"other_test_name": score.OtherTestName,
			"score":           score.Score,
			"out_of":          score.OutOf,
			"taken_on":        score.TakenOn,
			"normalized":      normalized,
		})

		if score.TestType == string(models.TestScoreTypeOther) {
			continue
		}
		existing, exists := bestByType[score.TestType]
		if !exists || normalized > existing.normalized || (normalized == existing.normalized && score.Score > existing.score) {
			bestByType[score.TestType] = rankedScore{
				score:      score.Score,
				normalized: normalized,
			}
		}
	}

	data["test_scores"] = scoreRows

	canonicalMap := map[string]string{
		string(models.TestScoreTypeIELTS): "ielts",
		string(models.TestScoreTypeSAT):   "sat",
		string(models.TestScoreTypeTOEFL): "toefl",
		string(models.TestScoreTypeACT):   "act",
	}
	for testType, key := range canonicalMap {
		best, ok := bestByType[testType]
		if ok {
			data[key] = best.score
		} else {
			delete(data, key)
		}
	}

	updated, err := json.Marshal(data)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to encode application data payload: %s", err.Error())
	}
	return updated, imported, nil
}

type transcriptRecord struct {
	InstitutionName string
	Country         *string
	DegreeAwarded   *string
	GPA             *string
	GraduationYear  *int
	TranscriptFiles json.RawMessage
}

func syncApplicationTranscripts(
	ctx context.Context,
	conn *pgxpool.Pool,
	userId, universityId, applicationCycle string,
	applicationData json.RawMessage,
) error {
	_, err := conn.Exec(
		ctx,
		`DELETE FROM application_transcripts
		 WHERE user_id = $1 AND university_id = $2 AND application_cycle = $3`,
		userId, universityId, applicationCycle,
	)
	if err != nil {
		return err
	}

	records, err := extractTranscriptRecords(applicationData)
	if err != nil {
		return err
	}
	if len(records) == 0 {
		return nil
	}

	for i, record := range records {
		_, err = conn.Exec(
			ctx,
			`INSERT INTO application_transcripts (
				user_id,
				university_id,
				application_cycle,
				sequence_no,
				institution_name,
				country,
				degree_awarded,
				gpa,
				graduation_year,
				transcript_files
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			userId,
			universityId,
			applicationCycle,
			i+1,
			record.InstitutionName,
			record.Country,
			record.DegreeAwarded,
			record.GPA,
			record.GraduationYear,
			record.TranscriptFiles,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func extractTranscriptRecords(applicationData json.RawMessage) ([]transcriptRecord, error) {
	trimmed := strings.TrimSpace(string(applicationData))
	if trimmed == "" || trimmed == "null" {
		return nil, nil
	}

	payload := map[string]any{}
	if err := json.Unmarshal(applicationData, &payload); err != nil {
		return nil, nil
	}

	records := make([]transcriptRecord, 0)

	appendFromAny := func(value any) {
		array, ok := value.([]any)
		if !ok {
			return
		}
		for _, item := range array {
			record, ok := toTranscriptRecord(item)
			if !ok {
				continue
			}
			records = append(records, record)
		}
	}

	for key, value := range payload {
		if strings.Contains(strings.ToLower(key), "transcript") {
			appendFromAny(value)
		}
	}

	return records, nil
}

func toTranscriptRecord(value any) (transcriptRecord, bool) {
	row, ok := value.(map[string]any)
	if !ok {
		return transcriptRecord{}, false
	}

	institutionName := firstNonEmptyString(
		row["institutionName"],
		row["institution_name"],
		row["school"],
		row["school_name"],
	)
	country := toOptionalString(firstNonEmptyString(row["country"]))
	degree := toOptionalString(firstNonEmptyString(row["degree"], row["degreeAwarded"], row["degree_awarded"]))
	gpa := toOptionalString(firstNonEmptyString(row["gpa"]))
	graduationYear := toOptionalInt(row["graduationYear"], row["graduation_year"], row["year"])

	files := row["transcriptFiles"]
	if files == nil {
		files = row["files"]
	}
	filesJSON, _ := json.Marshal(normalizeFileNames(files))

	if institutionName == "" && country == nil && degree == nil && gpa == nil && graduationYear == nil {
		return transcriptRecord{}, false
	}

	return transcriptRecord{
		InstitutionName: institutionName,
		Country:         country,
		DegreeAwarded:   degree,
		GPA:             gpa,
		GraduationYear:  graduationYear,
		TranscriptFiles: json.RawMessage(filesJSON),
	}, true
}

func firstNonEmptyString(values ...any) string {
	for _, value := range values {
		switch typed := value.(type) {
		case string:
			text := strings.TrimSpace(typed)
			if text != "" {
				return text
			}
		}
	}
	return ""
}

func toOptionalString(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	res := strings.TrimSpace(value)
	return &res
}

func toOptionalInt(values ...any) *int {
	for _, value := range values {
		switch typed := value.(type) {
		case float64:
			year := int(typed)
			return &year
		case int:
			year := typed
			return &year
		case string:
			cleaned := strings.TrimSpace(typed)
			if cleaned == "" {
				continue
			}
			var parsed int
			if _, err := fmt.Sscanf(cleaned, "%d", &parsed); err == nil {
				return &parsed
			}
		}
	}
	return nil
}

func normalizeFileNames(value any) []string {
	files := make([]string, 0)
	array, ok := value.([]any)
	if !ok {
		return files
	}
	for _, file := range array {
		switch typed := file.(type) {
		case string:
			name := strings.TrimSpace(typed)
			if name != "" {
				files = append(files, name)
			}
		case map[string]any:
			name := firstNonEmptyString(typed["name"], typed["fileName"], typed["file_name"])
			if name != "" {
				files = append(files, name)
			}
		}
	}
	return files
}

func DeleteApplication(ctx context.Context, userId, universityId, cycle string) error {
	conn, ok := ctx.Value(middlewares.CtxPostgresKey).(*pgxpool.Pool)
	if !ok {
		return errors.New("could not establish connection with the database")
	}

	result, err := conn.Exec(ctx,
		"DELETE FROM applications WHERE user_id=$1 AND university_id=$2 AND application_cycle=$3 AND status=$4",
		userId, universityId, cycle, models.StatusDraft)
	if err != nil {
		return fmt.Errorf("failed to delete application: %s", err.Error())
	}

	if result.RowsAffected() == 0 {
		return utils.NewHandlerFuncErr(http.StatusNotFound, "application not found or already submitted")
	}

	return nil
}
