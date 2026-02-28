\c client_db;

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE INDEX IF NOT EXISTS idx_profile_test_scores_user_id
    ON profile_test_scores(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_test_scores_user_created_at
    ON profile_test_scores(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_test_scores_user_type
    ON profile_test_scores(user_id, test_type);

COMMIT;
