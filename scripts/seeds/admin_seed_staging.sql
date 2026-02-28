-- Admin staging seed
-- Minimal, deterministic, idempotent account provisioning for non-development environments.
-- Password for seeded account is admin123 (bcrypt hash). Rotate immediately after bootstrap.

INSERT INTO users (email, password, first_name, last_name, role, created_at)
VALUES (
    'admin@kallisto.uz',
    '$2a$10$izwy57AAb.X.R4K09No64.QqDJt2LJx6Qe/InDHzriICaDjs8urtq',
    'System',
    'Administrator',
    'staff',
    NOW()
)
ON CONFLICT (email) DO UPDATE
SET
    password = EXCLUDED.password,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role;

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
        ('require_2fa_superuser', '{"enabled": true}')
) AS k(setting_key, setting_value)
ON CONFLICT (setting_key) DO UPDATE
SET
    setting_value = EXCLUDED.setting_value,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();
