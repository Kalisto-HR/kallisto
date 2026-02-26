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
