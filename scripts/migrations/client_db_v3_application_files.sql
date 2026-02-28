\c client_db;

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS application_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    university_id UUID NOT NULL,
    application_cycle TEXT NOT NULL,
    field_key TEXT,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_application_files_application FOREIGN KEY (user_id, university_id, application_cycle)
        REFERENCES applications (user_id, university_id, application_cycle) ON DELETE CASCADE,
    CONSTRAINT fk_application_files_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_files_university FOREIGN KEY (university_id)
        REFERENCES universities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_files_application
    ON application_files(user_id, university_id, application_cycle);

CREATE INDEX IF NOT EXISTS idx_application_files_created_at
    ON application_files(created_at DESC);

COMMIT;
