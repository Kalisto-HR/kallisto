-- Deployment entrypoint for admin_db.
-- This is the supported production-facing SQL artifact.
-- It contains the canonical schema, current-state contract upgrades,
-- legacy cleanup, and a defensive compare-orphan cleanup in one file.

-- Kallisto canonical admin_db schema
-- Current-state bootstrap for the monolith runtime

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    last_seen TIMESTAMP,
    role TEXT NOT NULL CHECK (role IN ('staff', 'partner')),
    university_linked UUID,
    data JSONB,
    photo BYTEA,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE users ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo BYTEA;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('applicant', 'partner', 'staff'));

-- =============================================================================
-- UNIVERSITIES TABLE (Source of Truth)
-- =============================================================================

CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID REFERENCES users(id),
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

CREATE INDEX IF NOT EXISTS idx_universities_ranking ON universities(ranking);
CREATE INDEX IF NOT EXISTS idx_universities_country ON universities(country);
CREATE INDEX IF NOT EXISTS idx_universities_city ON universities(city);
CREATE INDEX IF NOT EXISTS idx_universities_acceptance_rate ON universities(acceptance_rate);
CREATE INDEX IF NOT EXISTS idx_universities_tuition_fee ON universities(tuition_fee);
CREATE INDEX IF NOT EXISTS idx_universities_application_deadline ON universities(application_deadline);
CREATE INDEX IF NOT EXISTS idx_universities_ielts_min ON universities(ielts_min);
CREATE INDEX IF NOT EXISTS idx_universities_toefl_min ON universities(toefl_min);
CREATE INDEX IF NOT EXISTS idx_universities_scholarship_available ON universities(scholarship_available);

-- =============================================================================
-- APPLICANT FEATURE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_compare (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, university_id)
);

CREATE INDEX IF NOT EXISTS idx_user_compare_user_id ON user_compare(user_id);

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    application_cycle TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    data JSONB,
    applicant_info JSONB,
    submitted_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, university_id, application_cycle)
);

ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_info JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_university_id ON applications(university_id);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_admin_application_transcripts_application FOREIGN KEY (user_id, university_id, application_cycle)
        REFERENCES applications (user_id, university_id, application_cycle) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_application_transcripts_application ON application_transcripts(user_id, university_id, application_cycle);
CREATE INDEX IF NOT EXISTS idx_admin_application_transcripts_institution_name ON application_transcripts(institution_name);

CREATE TABLE IF NOT EXISTS application_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    application_cycle TEXT NOT NULL,
    field_key TEXT,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_admin_application_files_application FOREIGN KEY (user_id, university_id, application_cycle)
        REFERENCES applications (user_id, university_id, application_cycle) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_application_files_application ON application_files(user_id, university_id, application_cycle);
CREATE INDEX IF NOT EXISTS idx_admin_application_files_created_at ON application_files(created_at DESC);

CREATE TABLE IF NOT EXISTS profile_test_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL CHECK (test_type IN ('IELTS', 'SAT', 'TOEFL', 'ACT', 'HSK', 'CSCA', 'OTHER')),
    other_test_name TEXT,
    score NUMERIC(8,2) NOT NULL CHECK (score >= 0),
    out_of NUMERIC(8,2) NOT NULL CHECK (out_of > 0),
    taken_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_admin_profile_test_scores_other_name
        CHECK (
            (test_type = 'OTHER' AND other_test_name IS NOT NULL AND length(trim(other_test_name)) > 0)
            OR (test_type <> 'OTHER' AND (other_test_name IS NULL OR length(trim(other_test_name)) = 0))
        )
);

CREATE INDEX IF NOT EXISTS idx_admin_profile_test_scores_user_id ON profile_test_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_profile_test_scores_user_created_at ON profile_test_scores(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_profile_test_scores_user_type ON profile_test_scores(user_id, test_type);

CREATE TABLE IF NOT EXISTS application_test_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    university_id UUID NOT NULL,
    application_cycle TEXT NOT NULL,
    profile_test_score_id UUID REFERENCES profile_test_scores(id) ON DELETE SET NULL,
    test_type TEXT NOT NULL CHECK (test_type IN ('IELTS', 'SAT', 'TOEFL', 'ACT', 'HSK', 'CSCA', 'OTHER')),
    other_test_name TEXT,
    score NUMERIC(8,2) NOT NULL CHECK (score >= 0),
    out_of NUMERIC(8,2) NOT NULL CHECK (out_of > 0),
    taken_on DATE,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_admin_application_test_scores_application
        FOREIGN KEY (user_id, university_id, application_cycle)
        REFERENCES applications (user_id, university_id, application_cycle) ON DELETE CASCADE,
    CONSTRAINT chk_admin_application_test_scores_other_name
        CHECK (
            (test_type = 'OTHER' AND other_test_name IS NOT NULL AND length(trim(other_test_name)) > 0)
            OR (test_type <> 'OTHER' AND (other_test_name IS NULL OR length(trim(other_test_name)) = 0))
        )
);

CREATE INDEX IF NOT EXISTS idx_admin_application_test_scores_application ON application_test_scores(user_id, university_id, application_cycle);
CREATE INDEX IF NOT EXISTS idx_admin_application_test_scores_profile_link ON application_test_scores(profile_test_score_id);
CREATE INDEX IF NOT EXISTS idx_admin_application_test_scores_imported_at ON application_test_scores(imported_at DESC);

ALTER TABLE profile_test_scores
    DROP CONSTRAINT IF EXISTS profile_test_scores_test_type_check,
    ADD CONSTRAINT profile_test_scores_test_type_check
        CHECK (test_type IN ('IELTS', 'SAT', 'TOEFL', 'ACT', 'HSK', 'CSCA', 'OTHER'));

ALTER TABLE application_test_scores
    DROP CONSTRAINT IF EXISTS application_test_scores_test_type_check,
    ADD CONSTRAINT application_test_scores_test_type_check
        CHECK (test_type IN ('IELTS', 'SAT', 'TOEFL', 'ACT', 'HSK', 'CSCA', 'OTHER'));

-- Add foreign key constraint for university_linked after universities table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_university_linked'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT fk_users_university_linked
            FOREIGN KEY (university_linked) REFERENCES universities(id);
    END IF;
END $$;

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

-- =============================================================================
-- BLACKLIST TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passport_no TEXT,
    email TEXT,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_blacklist_passport_no ON blacklist(passport_no);
CREATE INDEX IF NOT EXISTS idx_blacklist_email ON blacklist(email);

-- =============================================================================
-- DRAFTS TABLE (Admin Action Drafts)
-- =============================================================================

CREATE TABLE IF NOT EXISTS drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    draft_type TEXT NOT NULL CHECK (
        draft_type IN (
            'application_review',
            'university_update',
            'blacklist_entry',
            'announcement',
            'create-mgmt-account',
            'delete-mgmt-account',
            'university-profile-update',
            'ban-user',
            'suspend-university',
            'restore-university'
        )
    ),
    title TEXT,
    content JSONB,
    target_id UUID,
    status TEXT CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'executed')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_author_id ON drafts(author_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);

-- =============================================================================
-- GLOBAL TABLES / EXTENSIONS
-- =============================================================================

ALTER TABLE universities
    ADD COLUMN IF NOT EXISTS management_status TEXT CHECK (management_status IN ('active', 'inactive', 'pending', 'suspended')) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS university_type TEXT CHECK (university_type IN ('public', 'private', 'international')) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS management_accounts_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS university_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE drafts
    ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('global', 'university')) DEFAULT 'global',
    ADD COLUMN IF NOT EXISTS requested_by_email TEXT,
    ADD COLUMN IF NOT EXISTS target_entity TEXT,
    ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS review_notes TEXT,
    ADD COLUMN IF NOT EXISTS created_by_ip INET;

CREATE INDEX IF NOT EXISTS idx_drafts_scope ON drafts(scope);
CREATE INDEX IF NOT EXISTS idx_drafts_reviewed_by ON drafts(reviewed_by);

CREATE TABLE IF NOT EXISTS global_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS service_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL CHECK (level IN ('trace', 'debug', 'info', 'warn', 'error', 'fatal')),
    microservice TEXT NOT NULL,
    handler TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id TEXT,
    request_id TEXT,
    method TEXT,
    status_code INT,
    duration_ms BIGINT,
    role TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS status_code INT;
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS duration_ms BIGINT;
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_service_logs_logged_at ON service_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_logs_level ON service_logs(level);
CREATE INDEX IF NOT EXISTS idx_service_logs_microservice ON service_logs(microservice);
CREATE INDEX IF NOT EXISTS idx_service_logs_request_id ON service_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_service_logs_status_code ON service_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_service_logs_role ON service_logs(role);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actor_name TEXT NOT NULL,
    actor_id TEXT,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('applicant', 'partner', 'staff', 'system', 'anonymous')),
    action_type TEXT NOT NULL,
    action_description TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failed', 'pending')),
    ip_address INET,
    request_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome ON audit_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_type ON audit_logs(actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('applicant', 'partner', 'staff')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    university_linked UUID,
    csrf_token TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_revoked_at ON auth_sessions(revoked_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_role ON auth_sessions(role);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    normalized_email TEXT NOT NULL,
    ip_address INET,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    succeeded BOOLEAN NOT NULL DEFAULT FALSE,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_email_attempted_at ON auth_login_attempts(normalized_email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_ip_attempted_at ON auth_login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_attempted_at ON auth_login_attempts(attempted_at DESC);

CREATE TABLE IF NOT EXISTS university_application_structure_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    version_no INT NOT NULL,
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    changed_by UUID REFERENCES users(id),
    change_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(university_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_structure_versions_university_id ON university_application_structure_versions(university_id);
CREATE INDEX IF NOT EXISTS idx_structure_versions_created_at ON university_application_structure_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_structure_versions_published ON university_application_structure_versions(published);

-- =============================================================================
-- PASSWORD RESET TOKENS
-- =============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_actor_type_check;

UPDATE audit_logs
SET actor_type = CASE
    WHEN LOWER(BTRIM(actor_type)) IN ('superuser', 'staff') THEN 'staff'
    WHEN LOWER(BTRIM(actor_type)) IN ('admin', 'partner') THEN 'partner'
    WHEN LOWER(BTRIM(actor_type)) IN ('user', 'applicant') THEN 'applicant'
    WHEN LOWER(BTRIM(actor_type)) = 'anonymous' THEN 'anonymous'
    ELSE 'system'
END
WHERE actor_type IS DISTINCT FROM CASE
    WHEN LOWER(BTRIM(actor_type)) IN ('superuser', 'staff') THEN 'staff'
    WHEN LOWER(BTRIM(actor_type)) IN ('admin', 'partner') THEN 'partner'
    WHEN LOWER(BTRIM(actor_type)) IN ('user', 'applicant') THEN 'applicant'
    WHEN LOWER(BTRIM(actor_type)) = 'anonymous' THEN 'anonymous'
    ELSE 'system'
END;

ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_actor_type_check CHECK (actor_type IN ('applicant', 'partner', 'staff', 'system', 'anonymous'));

DROP TABLE IF EXISTS university_staff_status_events;
DROP TABLE IF EXISTS university_staff_invitations;
DROP TABLE IF EXISTS university_staff_profiles;

-- Forward migration for current-state contracts on existing environments.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'management_profile'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'university_profile'
    ) THEN
        ALTER TABLE universities RENAME COLUMN management_profile TO university_profile;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'management_profile'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'university_profile'
    ) THEN
        EXECUTE $merge$
            UPDATE universities
            SET university_profile = CASE
                WHEN COALESCE(university_profile, '{}'::jsonb) = '{}'::jsonb
                    THEN COALESCE(management_profile, '{}'::jsonb)
                ELSE university_profile
            END
            WHERE management_profile IS NOT NULL
        $merge$;

        ALTER TABLE universities DROP COLUMN management_profile;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'university_profile'
    ) THEN
        ALTER TABLE universities
            ADD COLUMN university_profile JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

UPDATE universities
SET application_schema = REPLACE(
    REPLACE(application_schema::text, '"reviewer"', '"partner"'),
    '"admin"',
    '"staff"'
)::jsonb
WHERE application_schema IS NOT NULL
  AND application_schema::text ~ '"(reviewer|admin)"';

UPDATE university_application_structure_versions
SET schema = REPLACE(
    REPLACE(schema::text, '"reviewer"', '"partner"'),
    '"admin"',
    '"staff"'
)::jsonb
WHERE schema IS NOT NULL
  AND schema::text ~ '"(reviewer|admin)"';

-- Forward cleanup for legacy tables and compatibility artifacts.

DROP TABLE IF EXISTS submitted_application_files;
DROP TABLE IF EXISTS submitted_applications;

DROP TABLE IF EXISTS university_staff_status_events;
DROP TABLE IF EXISTS university_staff_invitations;
DROP TABLE IF EXISTS university_staff_profiles;

-- Defensive cleanup for environments with legacy/manual compare drift.
DELETE FROM user_compare uc
WHERE NOT EXISTS (
    SELECT 1
    FROM universities u
    WHERE u.id = uc.university_id
);
