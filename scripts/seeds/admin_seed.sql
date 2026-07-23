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

-- Insert generic partner user linked to the first available seeded university.
WITH selected_university AS (
    SELECT id
    FROM universities
    ORDER BY created_at ASC
    LIMIT 1
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


INSERT INTO users (id, email, password, first_name, last_name, role, university_linked, created_at)
VALUES
  ('19f11ce8-917c-460c-a58e-2c8e4f255b0c', 'partner.user@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', 'Alice', 'Partner', 'partner', NULL, '2026-03-30 09:44:52.85466'),
  ('5b8e0da4-3e43-4e69-bf5b-78fad953b904', 'staff.user@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', 'Bob', 'Staff', 'staff', NULL, '2026-03-30 09:44:52.856714'),
  ('905dba79-70d6-4a00-8751-c5565b3a19e2', 'rs721@gmail.com', '$2a$10$6bh3UccxdQd7hWvxd25LJOd9QXk1NZf9Xs8p5X8NpCGFUAcs2n/.a', 'Rustam', 'Safaev', 'applicant', NULL, '2026-03-30 22:43:08.832032'),
  ('0e07b273-721c-46c8-9bdf-01006da787a0', 'abdulkhayevbilol@gmail.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', 'Bilol', 'Abdilxayev', 'applicant', NULL, '2026-03-30 09:38:21.089857'),
  ('1fe4a36b-09cd-4c6d-b59c-ac236d8add41', 'jiang.long@duke.edu', '$2a$10$jf2hGcl3oV56NtuDQvS7euIyxMSXGfgmUDO0ibF2N2zduT/O9tYL6', 'Jiang', 'Long', 'applicant', NULL, '2026-04-05 08:23:53.49618')
ON CONFLICT (email) DO NOTHING;

-- Uzbekistan demo partner accounts.
-- WARNING: local/demo only. Initial password is stored only as a bcrypt hash and must be replaced before production.
WITH partner_seed(email, first_name, university_slug) AS (
    VALUES
        ('new-uzbekistan-university.partner@example.com', 'New Uzbekistan University', 'new-uzbekistan-university'),
        ('tafu.partner@example.com', 'TAFU', 'tashkent-university-of-applied-sciences'),
        ('webster.partner@example.com', 'Webster', 'webster-university-tashkent'),
        ('turin.partner@example.com', 'Turin', 'turin-polytechnic-university-tashkent'),
        ('mdis.partner@example.com', 'MDIS Tashkent', 'mdis-tashkent'),
        ('millat-umidi.partner@example.com', 'Millat Umidi', 'millat-umidi-university'),
        ('pharmaceutical-technical-university.partner@example.com', 'Pharmaceutical Technical University', 'pharmaceutical-technical-university'),
        ('inha.partner@example.com', 'Inha', 'inha-university-tashkent'),
        ('wiut.partner@example.com', 'WIUT', 'westminster-international-university-tashkent'),
        ('team.partner@example.com', 'TEAM', 'team-university'),
        ('amity.partner@example.com', 'Amity', 'amity-university-tashkent'),
        ('bmu.partner@example.com', 'BMU', 'british-management-university-tashkent'),
        ('cau.partner@example.com', 'CAU', 'central-asian-university'),
        ('kimyo.partner@example.com', 'Kimyo', 'kimyo-international-university-tashkent'),
        ('akfa.partner@example.com', 'AKFA', 'akfa-university'),
        ('tiue.partner@example.com', 'TIUE', 'tashkent-international-university-of-education'),
        ('udea.partner@example.com', 'UDEA', 'university-of-digital-economics-and-agrotechnologies'),
        ('tsue.partner@example.com', 'TSUE', 'tashkent-state-university-of-economics'),
        ('tuit.partner@example.com', 'TUIT', 'tashkent-university-of-information-technologies'),
        ('samarkand-state-university.partner@example.com', 'Samarkand State University', 'samarkand-state-university')
),
resolved_partner_seed AS (
    SELECT
        uuid_generate_v5(uuid_ns_url(), 'kallisto-partner:' || ps.email) AS id,
        ps.email,
        ps.first_name,
        u.id AS university_id
    FROM partner_seed ps
    JOIN universities u ON u.slug = ps.university_slug
    WHERE u.country_code = 'UZ' AND u.is_active = TRUE
)
INSERT INTO users (
    id, email, password, first_name, last_name, role, university_linked,
    is_active, must_change_password, disabled_reason, created_at
)
SELECT
    rps.id,
    rps.email,
    '$2a$10$AInckyTkkT/Fa1dYtPKlgO.TS49iGakbnL4zK095kkI8ypZmbXXWm',
    rps.first_name,
    'Partner',
    'partner',
    rps.university_id,
    TRUE,
    TRUE,
    NULL,
    NOW()
FROM resolved_partner_seed rps
ON CONFLICT (email) DO UPDATE
SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = 'partner',
    university_linked = EXCLUDED.university_linked,
    is_active = TRUE,
    must_change_password = TRUE,
    disabled_reason = NULL;

UPDATE universities u
SET manager_id = p.id,
    management_accounts_count = 1
FROM users p
WHERE p.role = 'partner'
  AND p.is_active = TRUE
  AND p.university_linked = u.id
  AND u.country_code = 'UZ'
  AND u.is_active = TRUE;

UPDATE users p
SET is_active = FALSE,
    disabled_reason = COALESCE(disabled_reason, 'University archived during Uzbekistan migration')
WHERE p.role = 'partner'
  AND p.university_linked IN (
      SELECT id FROM universities WHERE country_code = 'CN' OR country = 'China' OR is_active = FALSE
  )
  AND p.email NOT IN (
      SELECT email FROM (VALUES
        ('new-uzbekistan-university.partner@example.com'),
        ('tafu.partner@example.com'),
        ('webster.partner@example.com'),
        ('turin.partner@example.com'),
        ('mdis.partner@example.com'),
        ('millat-umidi.partner@example.com'),
        ('pharmaceutical-technical-university.partner@example.com'),
        ('inha.partner@example.com'),
        ('wiut.partner@example.com'),
        ('team.partner@example.com'),
        ('amity.partner@example.com'),
        ('bmu.partner@example.com'),
        ('cau.partner@example.com'),
        ('kimyo.partner@example.com'),
        ('akfa.partner@example.com'),
        ('tiue.partner@example.com'),
        ('udea.partner@example.com'),
        ('tsue.partner@example.com'),
        ('tuit.partner@example.com'),
        ('samarkand-state-university.partner@example.com')
      ) AS active_partner_emails(email)
  );
