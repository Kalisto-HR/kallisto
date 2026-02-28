-- Manager portal production schema additions
-- Apply after admin_db.sql and admin_db_v3_superuser_global.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE universities
    ADD COLUMN IF NOT EXISTS management_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS university_staff_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    staff_role TEXT NOT NULL CHECK (staff_role IN ('University Manager', 'Admissions Officer', 'Reviewer', 'Read-only')),
    status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'pending', 'deactivated')) DEFAULT 'active',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_university_id ON university_staff_profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_status ON university_staff_profiles(status);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON university_staff_profiles(staff_role);

CREATE TABLE IF NOT EXISTS university_staff_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    staff_role TEXT NOT NULL CHECK (staff_role IN ('University Manager', 'Admissions Officer', 'Reviewer', 'Read-only')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',
    invite_token_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    invited_by UUID REFERENCES users(id),
    accepted_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_university_id ON university_staff_invitations(university_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON university_staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON university_staff_invitations(email);

CREATE TABLE IF NOT EXISTS university_staff_status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    previous_status TEXT,
    next_status TEXT NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_staff_status_events_university_id ON university_staff_status_events(university_id);
CREATE INDEX IF NOT EXISTS idx_staff_status_events_user_id ON university_staff_status_events(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_status_events_changed_at ON university_staff_status_events(changed_at DESC);

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

-- Backfill existing partner users into manager staff profiles.
INSERT INTO university_staff_profiles (
    user_id,
    university_id,
    staff_role,
    status,
    invited_at,
    created_at,
    updated_at
)
SELECT
    u.id,
    u.university_linked,
    CASE
        WHEN un.manager_id = u.id THEN 'University Manager'
        ELSE 'Admissions Officer'
    END,
    'active',
    NOW(),
    NOW(),
    NOW()
FROM users u
JOIN universities un ON un.id = u.university_linked
WHERE u.role = 'partner'
  AND u.university_linked IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
