-- Admin Service Seed Data
-- Run against admin_db after running migrations

-- Insert staff admin user
-- Email: admin@kallisto.uz
-- Password: admin123 (bcrypt hashed)
INSERT INTO users (email, password, first_name, last_name, role, created_at)
VALUES (
    'admin@kallisto.uz',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqcBrBwKbKpW9FfJf/JqLZkVKbVLi',
    'System',
    'Administrator',
    'staff',
    NOW()
) ON CONFLICT (email) DO NOTHING;
