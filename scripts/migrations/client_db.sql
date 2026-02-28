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
CREATE INDEX IF NOT EXISTS idx_universities_total_cost ON universities(total_cost);
CREATE INDEX IF NOT EXISTS idx_universities_application_deadline ON universities(application_deadline);
CREATE INDEX IF NOT EXISTS idx_universities_ielts_min ON universities(ielts_min);
CREATE INDEX IF NOT EXISTS idx_universities_toefl_min ON universities(toefl_min);
CREATE INDEX IF NOT EXISTS idx_universities_scholarship_available ON universities(scholarship_available);
CREATE INDEX IF NOT EXISTS idx_universities_competitiveness ON universities(competitiveness);
CREATE INDEX IF NOT EXISTS idx_universities_safety_level ON universities(safety_level);
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

COMMIT;
