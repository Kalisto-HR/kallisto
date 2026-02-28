\c client_db;

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE INDEX IF NOT EXISTS idx_application_test_scores_application
    ON application_test_scores(user_id, university_id, application_cycle);

CREATE INDEX IF NOT EXISTS idx_application_test_scores_profile_link
    ON application_test_scores(profile_test_score_id);

CREATE INDEX IF NOT EXISTS idx_application_test_scores_imported_at
    ON application_test_scores(imported_at DESC);

COMMIT;
