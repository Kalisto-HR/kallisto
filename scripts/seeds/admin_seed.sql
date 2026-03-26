-- Admin Service Seed Data
-- Run against admin_db after running migrations

-- Insert staff admin user
-- Email: admin@kallisto.uz
-- Password: admin123 (bcrypt hashed)
INSERT INTO users (email, password, first_name, last_name, role, created_at)
VALUES (
    'admin@kallisto.uz',
    '$2a$10$izwy57AAb.X.R4K09No64.QqDJt2LJx6Qe/InDHzriICaDjs8urtq',
    'System',
    'Administrator',
    'staff',
    NOW()
) ON CONFLICT (email) DO UPDATE
SET
    password = EXCLUDED.password,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role;

-- Insert partner user linked to National University of Uzbekistan.
-- Fallback to first available university only if the expected seed university is missing.
WITH selected_university AS (
    SELECT COALESCE(
        (SELECT id FROM universities WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
        (SELECT id FROM universities ORDER BY created_at ASC LIMIT 1)
    ) AS id
)
INSERT INTO users (email, password, first_name, last_name, role, university_linked, created_at)
SELECT
    'manager@kallisto.uz',
    '$2a$10$izwy57AAb.X.R4K09No64.QqDJt2LJx6Qe/InDHzriICaDjs8urtq',
    'University',
    'Manager',
    'partner',
    su.id,
    NOW()
FROM selected_university su
WHERE su.id IS NOT NULL
ON CONFLICT (email) DO UPDATE
SET
    password = EXCLUDED.password,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = 'partner',
    university_linked = EXCLUDED.university_linked;

-- Insert dedicated manager account for Kazakh-British Technical University (KBTU).
-- Email: kbtu.manager@kallisto.uz
-- Password: admin123 (bcrypt hashed)
WITH kbtu_university AS (
    SELECT COALESCE(
        (SELECT id FROM universities WHERE id = 'e1f2a3b4-c5d6-7890-4567-901234567890'),
        (SELECT id FROM universities WHERE name ILIKE 'Kazakh-British Technical University' LIMIT 1)
    ) AS id
)
INSERT INTO users (email, password, first_name, last_name, role, university_linked, created_at)
SELECT
    'kbtu.manager@kallisto.uz',
    '$2a$10$izwy57AAb.X.R4K09No64.QqDJt2LJx6Qe/InDHzriICaDjs8urtq',
    'KBTU',
    'Manager',
    'partner',
    ku.id,
    NOW()
FROM kbtu_university ku
WHERE ku.id IS NOT NULL
ON CONFLICT (email) DO UPDATE
SET
    password = EXCLUDED.password,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = 'partner',
    university_linked = EXCLUDED.university_linked;

-- Insert dedicated manager account for Bukhara State University.
-- Email: bukhara.manager@kallisto.uz
-- Password: admin123 (bcrypt hashed)
WITH bukhara_university AS (
    SELECT COALESCE(
        (SELECT id FROM universities WHERE id = 'e5f6a7b8-c9d0-1234-ef01-345678901234'),
        (SELECT id FROM universities WHERE name ILIKE 'Bukhara State University' LIMIT 1)
    ) AS id
)
INSERT INTO users (email, password, first_name, last_name, role, university_linked, created_at)
SELECT
    'bukhara.manager@kallisto.uz',
    '$2a$10$izwy57AAb.X.R4K09No64.QqDJt2LJx6Qe/InDHzriICaDjs8urtq',
    'Bukhara State',
    'Manager',
    'partner',
    bu.id,
    NOW()
FROM bukhara_university bu
WHERE bu.id IS NOT NULL
ON CONFLICT (email) DO UPDATE
SET
    password = EXCLUDED.password,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = 'partner',
    university_linked = EXCLUDED.university_linked;

-- Global settings seed
WITH staff_user AS (
    SELECT id
    FROM users
    WHERE email = 'admin@kallisto.uz'
    LIMIT 1
)
INSERT INTO global_settings (setting_key, setting_value, updated_by)
SELECT
    k.setting_key,
    k.setting_value::jsonb,
    su.id
FROM staff_user su
CROSS JOIN (
    VALUES
        ('maintenance_mode', '{"enabled": false}'),
        ('new_user_registration', '{"enabled": true}'),
        ('application_submissions', '{"enabled": true}'),
        ('session_timeout_minutes', '{"value": 60}'),
        ('require_2fa_superuser', '{"enabled": true}'),
        ('notification_email', '{"value": "superadmin@damen.com"}')
) AS k(setting_key, setting_value)
ON CONFLICT (setting_key) DO UPDATE
SET
    setting_value = EXCLUDED.setting_value,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();

-- Seed global drafts
WITH staff_user AS (
    SELECT id, email
    FROM users
    WHERE email = 'admin@kallisto.uz'
    LIMIT 1
)
INSERT INTO drafts (
    author_id,
    draft_type,
    title,
    content,
    status,
    scope,
    requested_by_email,
    target_entity,
    priority
)
SELECT
    su.id,
    x.draft_type,
    x.title,
    x.content::jsonb,
    x.status,
    'global',
    su.email,
    x.target_entity,
    x.priority
FROM staff_user su
CROSS JOIN (
    VALUES
        (
            'ban-user',
            'Ban User USER-45678',
            '{"description":"Ban request for policy violation","user_id":"USER-45678","reason":"Policy violation - fraudulent applications","duration":"permanent","changes":[{"field":"Account Status","before":"active","after":"banned"}],"comments":2}',
            'pending_review',
            'USER-45678',
            'high'
        ),
        (
            'university-profile-update',
            'Update Profile for Zhejiang University',
            '{"description":"Requested profile updates to acceptance rate and deadlines","target_entity":"Zhejiang University","changes":[{"field":"Acceptance Rate","before":"9.5%","after":"9.3%"}],"comments":4}',
            'executed',
            'Zhejiang University',
            'medium'
        )
) AS x(draft_type, title, content, status, target_entity, priority)
ON CONFLICT DO NOTHING;

-- Seed service logs
INSERT INTO service_logs (level, microservice, handler, message, user_id, request_id, method, status_code, duration_ms, role, ip_address, user_agent, metadata)
VALUES
    ('info', 'staff', '/v1.0/staff/dashboard', 'GET /v1.0/staff/dashboard -> 200', 'staff-1', 'seed-req-001', 'GET', 200, 42, 'staff', '127.0.0.1', 'seed-agent', '{}'),
    ('warn', 'partner', '/v1.0/partner/university/profile', 'PUT /v1.0/partner/university/profile -> 403', 'partner-1', 'seed-req-002', 'PUT', 403, 28, 'partner', '127.0.0.1', 'seed-agent', '{"reason":"csrf validation failed"}'),
    ('error', 'auth', '/v1.0/auth/sign-in', 'POST /v1.0/auth/sign-in -> 401', NULL, 'seed-req-003', 'POST', 401, 19, 'anonymous', '127.0.0.1', 'seed-agent', '{"reason":"invalid credentials"}')
ON CONFLICT DO NOTHING;

-- Seed audit logs
INSERT INTO audit_logs (actor_name, actor_id, actor_type, action_type, action_description, target_entity, target_id, outcome, request_id, metadata)
VALUES
    ('System Admin', 'staff-1', 'staff', 'draft.approve', 'Approved and executed draft request', 'draft', NULL, 'success', 'seed-req-001', '{"source":"seed"}'),
    ('Anonymous', NULL, 'anonymous', 'auth.sign-in', 'Sign-in failed', 'session', NULL, 'failed', 'seed-req-003', '{"email_masked":"a***@example.com"}')
ON CONFLICT DO NOTHING;
