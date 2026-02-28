-- Admin Service Database Schema
-- PostgreSQL Migration for Kallisto Admin Service

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE (Admin Users - Staff and Partners)
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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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

-- =============================================================================
-- SUBMITTED APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS submitted_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    application_cycle TEXT NOT NULL,
    applicant_info JSONB,
    application_data JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE (user_id, university_id, application_cycle)
);

CREATE INDEX IF NOT EXISTS idx_submitted_applications_status ON submitted_applications(status);
CREATE INDEX IF NOT EXISTS idx_submitted_applications_university_id ON submitted_applications(university_id);

CREATE TABLE IF NOT EXISTS submitted_application_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES submitted_applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    university_id UUID NOT NULL,
    application_cycle TEXT NOT NULL,
    field_key TEXT,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submitted_application_files_application_id ON submitted_application_files(application_id);
CREATE INDEX IF NOT EXISTS idx_submitted_application_files_university_cycle ON submitted_application_files(university_id, application_cycle);

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
-- SUPERUSER GLOBAL TABLES / EXTENSIONS
-- =============================================================================

ALTER TABLE universities
    ADD COLUMN IF NOT EXISTS management_status TEXT CHECK (management_status IN ('active', 'inactive', 'pending', 'suspended')) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS university_type TEXT CHECK (university_type IN ('public', 'private', 'international')) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS management_accounts_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS management_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

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
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_service_logs_logged_at ON service_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_logs_level ON service_logs(level);
CREATE INDEX IF NOT EXISTS idx_service_logs_microservice ON service_logs(microservice);
CREATE INDEX IF NOT EXISTS idx_service_logs_request_id ON service_logs(request_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actor_name TEXT NOT NULL,
    actor_id TEXT,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('superuser', 'admin', 'system', 'user')),
    action_type TEXT NOT NULL,
    action_description TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failed', 'pending')),
    ip_address INET,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome ON audit_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_type ON audit_logs(actor_type);

CREATE TABLE IF NOT EXISTS user_moderation_states (
    user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'banned', 'suspended')) DEFAULT 'active',
    ban_reason TEXT,
    ban_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_moderation_status ON user_moderation_states(status);
CREATE INDEX IF NOT EXISTS idx_user_moderation_email ON user_moderation_states(email);
