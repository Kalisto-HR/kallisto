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
    application_schema JSONB,
    ranking INT,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    application_fee FLOAT
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

-- =============================
-- INDEXES
-- =============================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_application_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_universities_ranking ON universities(ranking);

-- =============================
-- UUID Autogeneration
-- =============================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE users
    ALTER COLUMN id SET DEFAULT  uuid_generate_v4();

ALTER TABLE universities
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

COMMIT;