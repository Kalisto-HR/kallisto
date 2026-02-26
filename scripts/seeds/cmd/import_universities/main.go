package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"kallisto/infra/env"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type universitySeed struct {
	ID                  string          `json:"id"`
	Name                string          `json:"name"`
	Description         *string         `json:"description"`
	Province            *string         `json:"province"`
	City                *string         `json:"city"`
	Country             *string         `json:"country"`
	AcceptanceRate      *float64        `json:"acceptanceRate"`
	TuitionFee          *float64        `json:"tuitionFee"`
	LivingCost          *float64        `json:"livingCost"`
	TotalCost           *float64        `json:"totalCost"`
	ApplicationDeadline *string         `json:"applicationDeadline"`
	IeltsMin            *float64        `json:"ieltsMin"`
	ToeflMin            *int            `json:"toeflMin"`
	Scholarship         *bool           `json:"scholarshipAvailable"`
	Competitiveness     *string         `json:"competitiveness"`
	CityType            *string         `json:"cityType"`
	SafetyLevel         *string         `json:"safetyLevel"`
	CampusVibe          *string         `json:"campusVibe"`
	VisaRequired        *bool           `json:"visaRequired"`
	ApplicationSchema   json.RawMessage `json:"applicationSchema"`
	Ranking             *int            `json:"ranking"`
	Metadata            json.RawMessage `json:"metadata"`
	ApplicationFee      *float64        `json:"applicationFee"`
}

const upsertUniversityQuery = `
INSERT INTO universities (
	id, name, description, province, city, country,
	acceptance_rate, tuition_fee, living_cost, total_cost, application_deadline,
	ielts_min, toefl_min, scholarship_available, competitiveness, city_type,
	safety_level, campus_vibe, visa_required, application_schema, ranking, metadata, application_fee
) VALUES (
	$1, $2, $3, $4, $5, $6,
	$7, $8, $9, $10, $11,
	$12, $13, $14, $15, $16,
	$17, $18, $19, $20, $21, $22, $23
)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	description = EXCLUDED.description,
	province = EXCLUDED.province,
	city = EXCLUDED.city,
	country = EXCLUDED.country,
	acceptance_rate = EXCLUDED.acceptance_rate,
	tuition_fee = EXCLUDED.tuition_fee,
	living_cost = EXCLUDED.living_cost,
	total_cost = EXCLUDED.total_cost,
	application_deadline = EXCLUDED.application_deadline,
	ielts_min = EXCLUDED.ielts_min,
	toefl_min = EXCLUDED.toefl_min,
	scholarship_available = EXCLUDED.scholarship_available,
	competitiveness = EXCLUDED.competitiveness,
	city_type = EXCLUDED.city_type,
	safety_level = EXCLUDED.safety_level,
	campus_vibe = EXCLUDED.campus_vibe,
	visa_required = EXCLUDED.visa_required,
	application_schema = EXCLUDED.application_schema,
	ranking = EXCLUDED.ranking,
	metadata = EXCLUDED.metadata,
	application_fee = EXCLUDED.application_fee
`

const ensureUniversitySchemaQuery = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS universities (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	manager_id UUID,
	name TEXT NOT NULL,
	logo BYTEA,
	description TEXT,
	province TEXT,
	city TEXT,
	country TEXT,
	application_schema JSONB,
	ranking INT,
	acceptance_rate NUMERIC(5,2),
	tuition_fee NUMERIC(12,2),
	living_cost NUMERIC(12,2),
	total_cost NUMERIC(12,2),
	application_deadline DATE,
	ielts_min NUMERIC(3,1),
	toefl_min INT,
	scholarship_available BOOLEAN DEFAULT FALSE,
	competitiveness TEXT CHECK (competitiveness in ('reach', 'match', 'safety')),
	city_type TEXT CHECK (city_type in ('urban', 'suburban', 'rural')),
	safety_level TEXT CHECK (safety_level in ('high', 'medium', 'low')),
	campus_vibe TEXT,
	visa_required BOOLEAN,
	created_at TIMESTAMP DEFAULT NOW(),
	metadata JSONB,
	application_fee FLOAT
);

ALTER TABLE universities ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS acceptance_rate NUMERIC(5,2);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS tuition_fee NUMERIC(12,2);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS living_cost NUMERIC(12,2);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12,2);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS application_deadline DATE;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS ielts_min NUMERIC(3,1);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS toefl_min INT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS scholarship_available BOOLEAN DEFAULT FALSE;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS competitiveness TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS city_type TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS safety_level TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS campus_vibe TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS visa_required BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_universities_ranking ON universities(ranking);
CREATE INDEX IF NOT EXISTS idx_universities_country ON universities(country);
CREATE INDEX IF NOT EXISTS idx_universities_city ON universities(city);
CREATE INDEX IF NOT EXISTS idx_universities_acceptance_rate ON universities(acceptance_rate);
CREATE INDEX IF NOT EXISTS idx_universities_tuition_fee ON universities(tuition_fee);
CREATE INDEX IF NOT EXISTS idx_universities_total_cost ON universities(total_cost);
CREATE INDEX IF NOT EXISTS idx_universities_application_deadline ON universities(application_deadline);
CREATE INDEX IF NOT EXISTS idx_universities_ielts_min ON universities(ielts_min);
CREATE INDEX IF NOT EXISTS idx_universities_toefl_min ON universities(toefl_min);
CREATE INDEX IF NOT EXISTS idx_universities_scholarship_available ON universities(scholarship_available);
CREATE INDEX IF NOT EXISTS idx_universities_competitiveness ON universities(competitiveness);
CREATE INDEX IF NOT EXISTS idx_universities_safety_level ON universities(safety_level);
`

func main() {
	_ = env.LoadEnv(".env")

	defaultDataPath := filepath.Join("scripts", "seeds", "data", "universities.v1.json")
	dataPath := flag.String("data", defaultDataPath, "path to universities JSON seed file")
	adminURL := flag.String("admin-db-url", os.Getenv("ADMIN_DB_CONNECTION_URL"), "admin database connection URL")
	clientURL := flag.String("client-db-url", os.Getenv("DB_CONNECTION_URL"), "client database connection URL")
	flag.Parse()

	if *adminURL == "" {
		exitWithError(errors.New("ADMIN_DB_CONNECTION_URL is required (or pass -admin-db-url)"))
	}
	if *clientURL == "" {
		exitWithError(errors.New("DB_CONNECTION_URL is required (or pass -client-db-url)"))
	}

	universities, err := readSeedFile(*dataPath)
	if err != nil {
		exitWithError(err)
	}
	if len(universities) == 0 {
		exitWithError(errors.New("seed file contains no universities"))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	adminPool, err := pgxpool.New(ctx, *adminURL)
	if err != nil {
		exitWithError(fmt.Errorf("failed to connect admin DB: %w", err))
	}
	defer adminPool.Close()

	clientPool, err := pgxpool.New(ctx, *clientURL)
	if err != nil {
		exitWithError(fmt.Errorf("failed to connect client DB: %w", err))
	}
	defer clientPool.Close()

	if err := ensureUniversitySchema(ctx, adminPool, "admin DB"); err != nil {
		exitWithError(err)
	}
	if err := ensureUniversitySchema(ctx, clientPool, "client DB"); err != nil {
		exitWithError(err)
	}

	adminCount, err := upsertUniversities(ctx, adminPool, universities)
	if err != nil {
		exitWithError(formatSeedError("admin DB", err))
	}

	clientCount, err := upsertUniversities(ctx, clientPool, universities)
	if err != nil {
		exitWithError(formatSeedError("client DB", err))
	}

	fmt.Printf("Seed import complete. universities.v1 records: %d\n", len(universities))
	fmt.Printf("admin_db upserts: %d\n", adminCount)
	fmt.Printf("client_db upserts: %d\n", clientCount)
}

func readSeedFile(path string) ([]universitySeed, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read seed file '%s': %w", path, err)
	}

	var universities []universitySeed
	if err := json.Unmarshal(content, &universities); err != nil {
		return nil, fmt.Errorf("failed to parse seed JSON '%s': %w", path, err)
	}

	return universities, nil
}

func upsertUniversities(ctx context.Context, pool *pgxpool.Pool, universities []universitySeed) (int, error) {
	upserted := 0
	err := pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		for _, university := range universities {
			if university.ID == "" {
				return errors.New("seed university id is required")
			}
			if university.Name == "" {
				return fmt.Errorf("seed university name is required for id '%s'", university.ID)
			}

			deadline, err := parseDeadline(university.ApplicationDeadline)
			if err != nil {
				return fmt.Errorf("invalid applicationDeadline for id '%s': %w", university.ID, err)
			}

			_, err = tx.Exec(ctx, upsertUniversityQuery,
				university.ID,
				university.Name,
				university.Description,
				university.Province,
				university.City,
				university.Country,
				university.AcceptanceRate,
				university.TuitionFee,
				university.LivingCost,
				university.TotalCost,
				deadline,
				university.IeltsMin,
				university.ToeflMin,
				university.Scholarship,
				university.Competitiveness,
				university.CityType,
				university.SafetyLevel,
				university.CampusVibe,
				university.VisaRequired,
				nullIfEmptyJSON(university.ApplicationSchema),
				university.Ranking,
				nullIfEmptyJSON(university.Metadata),
				university.ApplicationFee,
			)
			if err != nil {
				return fmt.Errorf("upsert failed for id '%s': %w", university.ID, err)
			}
			upserted++
		}
		return nil
	})

	if err != nil {
		return 0, err
	}

	return upserted, nil
}

func parseDeadline(raw *string) (*time.Time, error) {
	if raw == nil {
		return nil, nil
	}

	parsed, err := time.Parse("2006-01-02", *raw)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func nullIfEmptyJSON(raw json.RawMessage) any {
	if len(raw) == 0 {
		return nil
	}
	return raw
}

func ensureUniversitySchema(ctx context.Context, pool *pgxpool.Pool, databaseLabel string) error {
	if _, err := pool.Exec(ctx, ensureUniversitySchemaQuery); err != nil {
		return fmt.Errorf("failed bootstrapping university schema in %s: %w", databaseLabel, err)
	}
	return nil
}

func formatSeedError(databaseLabel string, err error) error {
	return fmt.Errorf("failed seeding %s: %w", databaseLabel, err)
}

func exitWithError(err error) {
	fmt.Fprintf(os.Stderr, "error: %v\n", err)
	os.Exit(1)
}
