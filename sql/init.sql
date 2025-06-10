-- Таблица пользователей
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL, -- admin, university_admin, user
    university_id INT
);

-- Таблица университетов
CREATE TABLE IF NOT EXISTS universities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- Таблица программ
CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    university_id INT REFERENCES universities(id),
    deadline DATE
);

-- Таблица заявок
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES accounts(id),
    university_id INT REFERENCES universities(id),
    program_id INT REFERENCES programs(id),
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    motivation TEXT,
    status TEXT DEFAULT 'pending',
    is_draft BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вопросы анкеты
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    required BOOLEAN DEFAULT TRUE
);

-- Ответы на вопросы анкеты
CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES applications(id),
    question_id INT REFERENCES questions(id),
    answer TEXT
);

-- Временные коды для 2FA
CREATE TABLE IF NOT EXISTS twofa_tokens (
    username TEXT,
    code TEXT,
    expires_at TIMESTAMP
);

-- Аудит-лог (действия пользователей)
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    username TEXT,
    action TEXT,
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
