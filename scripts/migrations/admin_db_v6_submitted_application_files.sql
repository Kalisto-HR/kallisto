-- Submitted application file storage for manager-side previews/downloads.
-- Apply after admin_db.sql.

\c admin_db;

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE INDEX IF NOT EXISTS idx_submitted_application_files_application_id
    ON submitted_application_files(application_id);

CREATE INDEX IF NOT EXISTS idx_submitted_application_files_university_cycle
    ON submitted_application_files(university_id, application_cycle);

COMMIT;
