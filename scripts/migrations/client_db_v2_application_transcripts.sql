\c client_db;

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS application_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    university_id UUID NOT NULL,
    application_cycle TEXT NOT NULL,
    sequence_no INT NOT NULL,
    institution_name TEXT NOT NULL,
    country TEXT,
    degree_awarded TEXT,
    gpa TEXT,
    graduation_year INT,
    transcript_files JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_application_transcripts_application FOREIGN KEY (user_id, university_id, application_cycle)
        REFERENCES applications (user_id, university_id, application_cycle) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_transcripts_application
    ON application_transcripts(user_id, university_id, application_cycle);

CREATE INDEX IF NOT EXISTS idx_application_transcripts_institution_name
    ON application_transcripts(institution_name);

COMMIT;
