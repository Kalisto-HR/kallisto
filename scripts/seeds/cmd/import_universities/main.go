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
	ApplicationDeadline *string         `json:"applicationDeadline"`
	IeltsMin            *float64        `json:"ieltsMin"`
	ToeflMin            *int            `json:"toeflMin"`
	Scholarship         *bool           `json:"scholarshipAvailable"`
	CityType            *string         `json:"cityType"`
	CampusVibe          *string         `json:"campusVibe"`
	ApplicationSchema   json.RawMessage `json:"applicationSchema"`
	Ranking             *int            `json:"ranking"`
	Metadata            json.RawMessage `json:"metadata"`
	ApplicationFee      *float64        `json:"applicationFee"`
	UniversityProfile   json.RawMessage `json:"universityProfile"`
}

const upsertUniversityQuery = `
INSERT INTO universities (
	id, name, description, province, city, country,
	acceptance_rate, tuition_fee, application_deadline,
	ielts_min, toefl_min, scholarship_available, city_type,
	campus_vibe, application_schema, ranking, metadata, application_fee,
	university_profile
) VALUES (
	$1, $2, $3, $4, $5, $6,
	$7, $8, $9,
	$10, $11, $12, $13,
	$14, $15, $16, $17, $18,
	$19
)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	description = EXCLUDED.description,
	province = EXCLUDED.province,
	city = EXCLUDED.city,
	country = EXCLUDED.country,
	acceptance_rate = EXCLUDED.acceptance_rate,
	tuition_fee = EXCLUDED.tuition_fee,
	application_deadline = EXCLUDED.application_deadline,
	ielts_min = EXCLUDED.ielts_min,
	toefl_min = EXCLUDED.toefl_min,
	scholarship_available = EXCLUDED.scholarship_available,
	city_type = EXCLUDED.city_type,
	campus_vibe = EXCLUDED.campus_vibe,
	application_schema = EXCLUDED.application_schema,
	ranking = EXCLUDED.ranking,
	metadata = EXCLUDED.metadata,
	application_fee = EXCLUDED.application_fee,
	university_profile = EXCLUDED.university_profile
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
	application_deadline DATE,
	ielts_min NUMERIC(3,1),
	toefl_min INT,
	scholarship_available BOOLEAN DEFAULT FALSE,
	city_type TEXT CHECK (city_type in ('urban', 'suburban', 'rural')),
	campus_vibe TEXT,
	created_at TIMESTAMP DEFAULT NOW(),
	metadata JSONB,
	application_fee FLOAT
);

ALTER TABLE universities ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS acceptance_rate NUMERIC(5,2);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS tuition_fee NUMERIC(12,2);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS application_deadline DATE;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS ielts_min NUMERIC(3,1);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS toefl_min INT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS scholarship_available BOOLEAN DEFAULT FALSE;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS city_type TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS campus_vibe TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS university_profile JSONB;

CREATE INDEX IF NOT EXISTS idx_universities_ranking ON universities(ranking);
CREATE INDEX IF NOT EXISTS idx_universities_country ON universities(country);
CREATE INDEX IF NOT EXISTS idx_universities_city ON universities(city);
CREATE INDEX IF NOT EXISTS idx_universities_acceptance_rate ON universities(acceptance_rate);
CREATE INDEX IF NOT EXISTS idx_universities_tuition_fee ON universities(tuition_fee);
CREATE INDEX IF NOT EXISTS idx_universities_application_deadline ON universities(application_deadline);
CREATE INDEX IF NOT EXISTS idx_universities_ielts_min ON universities(ielts_min);
CREATE INDEX IF NOT EXISTS idx_universities_toefl_min ON universities(toefl_min);
CREATE INDEX IF NOT EXISTS idx_universities_scholarship_available ON universities(scholarship_available);
`

func main() {
	_ = env.LoadEnv(".env")

	defaultDataPath := filepath.Join("scripts", "seeds", "data", "universities.v2.json")
	dataPath := flag.String("data", defaultDataPath, "path to universities JSON seed file")
	databaseURL := flag.String("database-url", os.Getenv("DATABASE_URL"), "database connection URL")
	flag.Parse()

	if *databaseURL == "" {
		exitWithError(errors.New("DATABASE_URL is required (or pass -database-url)"))
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

	pool, err := pgxpool.New(ctx, *databaseURL)
	if err != nil {
		exitWithError(fmt.Errorf("failed to connect database: %w", err))
	}
	defer pool.Close()

	if err := ensureUniversitySchema(ctx, pool, "database"); err != nil {
		exitWithError(err)
	}

	count, err := upsertUniversities(ctx, pool, universities)
	if err != nil {
		exitWithError(formatSeedError("database", err))
	}

	fmt.Printf("Seed import complete. universities.v1 records: %d\n", len(universities))
	fmt.Printf("database upserts: %d\n", count)
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
				deadline,
				university.IeltsMin,
				university.ToeflMin,
				university.Scholarship,
				university.CityType,
				university.CampusVibe,
				nullIfEmptyJSON(university.ApplicationSchema),
				university.Ranking,
				nullIfEmptyJSON(university.Metadata),
				university.ApplicationFee,
				nullIfEmptyJSON(university.UniversityProfile),
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
