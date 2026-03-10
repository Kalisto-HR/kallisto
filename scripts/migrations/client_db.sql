-- Connect to the target database

\c client_db;

BEGIN;

-- =============================
-- USERS TABLE
-- =============================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- store hashed passwords
    first_name TEXT,
    last_name TEXT,
    data JSONB, -- encrypted personal data
    last_seen TIMESTAMP,
    photo BYTEA
);

-- =============================
-- UNIVERSITY TABLE
-- =============================

CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY,
    manager_id UUID, -- FK to partner representative in admin_db
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

CREATE TABLE IF NOT EXISTS user_compare (
    user_id UUID NOT NULL,
    university_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, university_id),
    CONSTRAINT fk_compare_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_compare_university FOREIGN KEY (university_id)
        REFERENCES universities(id) ON DELETE CASCADE
);

-- =============================
-- APPLICATIONS TABLE 
-- =============================

CREATE TABLE IF NOT EXISTS applications (
    user_id UUID NOT NULL,
    university_id UUID NOT NULL,
    application_cycle TEXT NOT NULL,
    status TEXT CHECK (status in ('draft', 'submitted', 'accepted', 'rejected')),
    data JSONB,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, university_id, application_cycle),
    CONSTRAINT fk_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_university FOREIGN KEY (university_id)
        REFERENCES universities (id) ON DELETE CASCADE 
);

CREATE TABLE IF NOT EXISTS application_transcripts (
    id UUID PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS application_files (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    application_cycle TEXT NOT NULL,
    field_key TEXT,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_application_files_application FOREIGN KEY (user_id, university_id, application_cycle)
        REFERENCES applications (user_id, university_id, application_cycle) ON DELETE CASCADE
);

-- =============================
-- INDEXES
-- =============================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_application_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_universities_ranking ON universities(ranking);
CREATE INDEX IF NOT EXISTS idx_universities_country ON universities(country);
CREATE INDEX IF NOT EXISTS idx_universities_city ON universities(city);
CREATE INDEX IF NOT EXISTS idx_universities_acceptance_rate ON universities(acceptance_rate);
CREATE INDEX IF NOT EXISTS idx_universities_tuition_fee ON universities(tuition_fee);
CREATE INDEX IF NOT EXISTS idx_universities_application_deadline ON universities(application_deadline);
CREATE INDEX IF NOT EXISTS idx_universities_ielts_min ON universities(ielts_min);
CREATE INDEX IF NOT EXISTS idx_universities_toefl_min ON universities(toefl_min);
CREATE INDEX IF NOT EXISTS idx_universities_scholarship_available ON universities(scholarship_available);
CREATE INDEX IF NOT EXISTS idx_user_compare_user_id ON user_compare(user_id);
CREATE INDEX IF NOT EXISTS idx_application_transcripts_application ON application_transcripts(user_id, university_id, application_cycle);
CREATE INDEX IF NOT EXISTS idx_application_transcripts_institution_name ON application_transcripts(institution_name);
CREATE INDEX IF NOT EXISTS idx_application_files_application ON application_files(user_id, university_id, application_cycle);
CREATE INDEX IF NOT EXISTS idx_application_files_created_at ON application_files(created_at DESC);

-- =============================
-- UUID Autogeneration
-- =============================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE users
    ALTER COLUMN id SET DEFAULT  uuid_generate_v4();

ALTER TABLE universities
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE application_transcripts
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE application_files
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

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

DROP INDEX IF EXISTS idx_universities_total_cost;
DROP INDEX IF EXISTS idx_universities_competitiveness;
DROP INDEX IF EXISTS idx_universities_safety_level;
ALTER TABLE universities DROP COLUMN IF EXISTS living_cost;
ALTER TABLE universities DROP COLUMN IF EXISTS total_cost;
ALTER TABLE universities DROP COLUMN IF EXISTS competitiveness;
ALTER TABLE universities DROP COLUMN IF EXISTS safety_level;
ALTER TABLE universities DROP COLUMN IF EXISTS visa_required;

CREATE TABLE IF NOT EXISTS profile_test_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL CHECK (test_type IN ('IELTS', 'SAT', 'TOEFL', 'ACT', 'OTHER')),
    other_test_name TEXT,
    score NUMERIC(8,2) NOT NULL CHECK (score >= 0),
    out_of NUMERIC(8,2) NOT NULL CHECK (out_of > 0),
    taken_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_profile_test_scores_other_name
        CHECK (
            (test_type = 'OTHER' AND other_test_name IS NOT NULL AND length(trim(other_test_name)) > 0)
            OR (test_type <> 'OTHER' AND (other_test_name IS NULL OR length(trim(other_test_name)) = 0))
        )
);

CREATE INDEX IF NOT EXISTS idx_profile_test_scores_user_id ON profile_test_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_test_scores_user_created_at ON profile_test_scores(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_test_scores_user_type ON profile_test_scores(user_id, test_type);

CREATE TABLE IF NOT EXISTS application_test_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    university_id UUID NOT NULL,
    application_cycle TEXT NOT NULL,
    profile_test_score_id UUID REFERENCES profile_test_scores(id) ON DELETE SET NULL,
    test_type TEXT NOT NULL CHECK (test_type IN ('IELTS', 'SAT', 'TOEFL', 'ACT', 'OTHER')),
    other_test_name TEXT,
    score NUMERIC(8,2) NOT NULL CHECK (score >= 0),
    out_of NUMERIC(8,2) NOT NULL CHECK (out_of > 0),
    taken_on DATE,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_application_test_scores_application
        FOREIGN KEY (user_id, university_id, application_cycle)
        REFERENCES applications (user_id, university_id, application_cycle) ON DELETE CASCADE,
    CONSTRAINT chk_application_test_scores_other_name
        CHECK (
            (test_type = 'OTHER' AND other_test_name IS NOT NULL AND length(trim(other_test_name)) > 0)
            OR (test_type <> 'OTHER' AND (other_test_name IS NULL OR length(trim(other_test_name)) = 0))
        )
);

CREATE INDEX IF NOT EXISTS idx_application_test_scores_application ON application_test_scores(user_id, university_id, application_cycle);
CREATE INDEX IF NOT EXISTS idx_application_test_scores_profile_link ON application_test_scores(profile_test_score_id);
CREATE INDEX IF NOT EXISTS idx_application_test_scores_imported_at ON application_test_scores(imported_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_client_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

COMMIT;
