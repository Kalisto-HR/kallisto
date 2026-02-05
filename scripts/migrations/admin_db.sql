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
    application_schema JSONB,
    ranking INT,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    application_fee FLOAT
);

CREATE INDEX idx_universities_ranking ON universities(ranking);

-- Add foreign key constraint for university_linked after universities table exists
ALTER TABLE users
    ADD CONSTRAINT fk_users_university_linked
    FOREIGN KEY (university_linked) REFERENCES universities(id);

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
