\c admin_db;

BEGIN;

ALTER TABLE universities
    ADD COLUMN IF NOT EXISTS management_status TEXT CHECK (management_status IN ('active', 'inactive', 'pending', 'suspended')) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS university_type TEXT CHECK (university_type IN ('public', 'private', 'international')) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS management_accounts_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

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

ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_status_check;
ALTER TABLE drafts
    ADD CONSTRAINT drafts_status_check
    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'executed'));

ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_draft_type_check;
ALTER TABLE drafts
    ADD CONSTRAINT drafts_draft_type_check
    CHECK (
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
    );

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

COMMIT;
