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
  ('1fe4a36b-09cd-4c6d-b59c-ac236d8add41', 'jiang.long@duke.edu', '$2a$10$jf2hGcl3oV56NtuDQvS7euIyxMSXGfgmUDO0ibF2N2zduT/O9tYL6', 'Jiang', 'Long', 'applicant', NULL, '2026-04-05 08:23:53.49618'),
  ('8d0342b3-ebc2-4c5a-9195-128ee4641844', 'tsinghua.partner@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', NULL, NULL, 'partner', '8f3ca3c2-8e66-5244-9b99-6f9fa6c29c7f', '2026-05-11 07:24:22.524004'),
  ('49bf9fcc-f7cd-4a3a-8151-9f9727feaa54', 'peking.partner@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', NULL, NULL, 'partner', '33f03549-1561-583f-9024-2ae642209f67', '2026-05-11 07:24:22.524004'),
  ('9777bef9-0ebb-45c5-ae57-da59cc208c3f', 'fudan.partner@example.com', '$2a$10$izwy57AAb.X.R4K09No64.QqDJt2LJx6Qe/InDHzriICaDjs8urtq', NULL, NULL, 'partner', '3c1b7456-0119-5206-9683-288291c6436c', '2026-05-11 07:24:22.524004'),
  ('da23b6d8-e850-4985-b3e9-21a51a714f05', 'sjtu.partner@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', NULL, NULL, 'partner', '252e0f4f-8ca3-5844-bcb9-51b371bec54f', '2026-05-11 07:24:22.524004'),
  ('23984484-8094-4742-88fd-b4d0b59dfc13', 'zhejiang.partner@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', NULL, NULL, 'partner', '36b875ac-a3b7-5dbc-8a4f-ff863f477484', '2026-05-11 07:24:22.524004'),
  ('41ae67d5-3782-4133-9d34-e6f6062395bb', 'nanjing.partner@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', NULL, NULL, 'partner', '921b765f-9792-572e-89ec-32331fac953a', '2026-05-11 07:24:22.524004'),
  ('aed3639f-3af2-4ad7-91df-0cb635bd962f', 'ustc.partner@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', NULL, NULL, 'partner', 'b6394d4d-581b-5255-8915-aecef7c5773a', '2026-05-11 07:24:22.524004'),
  ('be172844-21cd-4255-9b8f-7ac432740350', 'wuhan.partner@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', NULL, NULL, 'partner', 'e53fe41d-77e6-5c66-86f6-0f1d79a96ffc', '2026-05-11 07:24:22.524004'),
  ('f3577b6b-4405-4c77-bcf0-6b11e999da87', 'sysu.partner@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', NULL, NULL, 'partner', '0903e09d-36e8-592e-9362-4dc1e4e7c3f2', '2026-05-11 07:24:22.524004'),
  ('c91a1d45-c9f1-46f4-9c17-6275eb2fd57a', 'xjtu.partner@example.com', '$2a$10$bxe.sRLQHSR3MaWLAsMGe.f4J2W2I8EhOcX4Pdqh8bK3D4fQhe/nm', NULL, NULL, 'partner', 'fa366464-bb1c-5100-b439-0aa4caa364cd', '2026-05-11 07:24:22.524004')
ON CONFLICT (email) DO NOTHING;
