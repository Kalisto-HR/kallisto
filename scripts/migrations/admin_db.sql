-- Admin Service Database Schema
-- PostgreSQL Migration for Kallisto Admin Service

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE (Admin Users - Staff and Partners)
-- =============================================================================

CREATE TABLE users (
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

CREATE INDEX idx_users_email ON users(email);

-- =============================================================================
-- UNIVERSITIES TABLE (Source of Truth)
-- =============================================================================

CREATE TABLE universities (
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

CREATE INDEX idx_universities_ranking ON universities(ranking);
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
ALTER TABLE users
    ADD CONSTRAINT fk_users_university_linked
    FOREIGN KEY (university_linked) REFERENCES universities(id);

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

CREATE TABLE submitted_applications (
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

CREATE INDEX idx_submitted_applications_status ON submitted_applications(status);
CREATE INDEX idx_submitted_applications_university_id ON submitted_applications(university_id);

-- =============================================================================
-- BLACKLIST TABLE
-- =============================================================================

CREATE TABLE blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passport_no TEXT,
    email TEXT,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_blacklist_passport_no ON blacklist(passport_no);
CREATE INDEX idx_blacklist_email ON blacklist(email);

-- =============================================================================
-- DRAFTS TABLE (Admin Action Drafts)
-- =============================================================================

CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    draft_type TEXT NOT NULL CHECK (draft_type IN ('application_review', 'university_update', 'blacklist_entry', 'announcement')),
    title TEXT,
    content JSONB,
    target_id UUID,
    status TEXT CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drafts_author_id ON drafts(author_id);
CREATE INDEX idx_drafts_status ON drafts(status);
