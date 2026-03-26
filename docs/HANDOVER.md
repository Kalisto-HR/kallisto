# Kallisto Dev Handover

## Quick context

- Product: university application platform
- Stack: React SPA (Vite) + Go monolith + PostgreSQL
- Runtime:
  - Frontend: `http://localhost:5173`
  - Backend API: `http://localhost:8081/v1.0`
- Databases:
  - `client_db` for applicants, drafts, applicant-side files and profile data
  - `admin_db` for partner/staff users, university source-of-truth data, submissions, drafts, and logs

## Current supported roles

- `applicant`
- `partner`
- `staff`

These are the only supported runtime roles. Older labels such as `student`, `superuser`, `university manager`, and university-side subroles are not part of the supported architecture.

## Repo layout

- `frontend/` : React SPA
- `services/backend/` : active backend entrypoint
- `services/client/` : applicant-domain handlers/usecases used by the monolith
- `services/admin/` : partner/staff-domain handlers/usecases used by the monolith
- `infra/` : auth, middleware, utilities, logging, validation
- `scripts/` : migrations and seed scripts
- `docs/` : architecture, API, setup, migrations, handover

## Core flows

### 1. Auth

- Unified auth endpoints live under `/v1.0/auth/*`
- Sign-in checks `admin_db.users` first, then `client_db.users`
- JWT is stored in `HttpOnly` cookie `access_token`
- CSRF protection uses readable cookie `csrf_token`
- Current identity is bootstrapped from `GET /v1.0/auth/session`
- Sessions are server-backed in `admin_db.auth_sessions`
- Sign-in throttling is DB-backed in `admin_db.auth_login_attempts`
- JWT TTL is 15 minutes with extension during active sessions

### 2. Application lifecycle

- Applicant creates and updates drafts in `client_db.applications`
- Draft status is `draft`
- Submit validates the draft and writes the management-side submission into `admin_db.submitted_applications`
- Only after that succeeds does the applicant-side application become `submitted`
- Kallisto does not release application verdicts anymore

### 3. University data

- `admin_db.universities` is the source of truth
- `client_db.universities` is the applicant-facing copy
- Sync is implemented directly inside backend usecases

### 4. Application schema

- The supported read contract is `application_schema.sections[*].fields[*]`
- The backend normalizes legacy flat schema payloads on read
- Applicant form rendering is strict about the canonical sectioned shape

## Setup (short)

1. Create databases:
   - `client_db`
   - `admin_db`
2. Run migrations:
   - `powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432`
3. Optional seeds:
   - `powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432`
4. Configure `.env`:
   - `APP_ENV`
   - `DB_CONNECTION_URL`
   - `ADMIN_DB_CONNECTION_URL`
   - `SECRET_KEY`
   - `COOKIE_SECURE`
   - `COOKIE_SAMESITE`
   - `CORS_ALLOWED_ORIGINS`
5. Run:
   - `go run services/backend/cmd/main.go`
   - `cd frontend && npm install && npm run dev`

## Seed accounts

- Staff: `admin@kallisto.uz / admin123`
- Partner: `manager@kallisto.uz / admin123`
- Applicant: create via `/auth/sign-up`

## Frontend routing and restriction

- `/auth/*`
- `/applicant/*`
- `/partner/:universityId/*`
- `/staff/*`

Frontend route guards depend on session role and render a forbidden page for disallowed navigation. Backend middleware remains the real enforcement layer and returns `401` or `403`.

## Operational notes

- Password reset is intentionally disabled and returns `503`
- `POST /v1.0/auth/sign-out` is the only supported sign-out route
- Authenticated unsafe requests require `X-CSRF-Token`
- The frontend dev proxy is `/api` only
- Partner routes require a linked university in claims
- Duplicate email creation is blocked by supported account-creation handlers across both user stores

## Known gaps / cleanup debt

- Some internal filenames and modules still use older naming such as `student`, `management`, and `superuser`
- Some historical review-era code remains in the repository even though the supported product flow is submit/read-only
- Schema visibility keys still use older compatibility labels such as `reviewer` and `admin`
- There is no real email delivery path yet

## Handover checklist

- Verify backend responds on `:8081`
- Verify frontend proxy reaches backend through `/api`
- Demo unified sign-in
- Demo applicant draft -> submit flow
- Demo partner read-only submissions view
- Call out that verdict release is out of scope for Kallisto
- Call out the two-database monolith model and university sync ownership
