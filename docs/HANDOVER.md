# Kallisto Dev Handover

## Quick context

- Product: university application platform
- Stack: React SPA (Vite) + Go monolith + PostgreSQL
- Runtime:
  - Frontend: `http://localhost:5173`
  - Backend API: `http://localhost:8081/v1.0`
- Database:
  - `admin_db` for applicant, partner, staff, university, application, auth-session, and observability data

## Supported roles

- `applicant`
- `partner`
- `staff`

These are the only supported runtime roles.

## Repo layout

- `frontend/` : React SPA
- `services/backend/` : active backend entrypoint
- `services/backend/internal/auth` : auth and session endpoints
- `services/backend/internal/applicant` : applicant-domain handlers/usecases/models
- `services/backend/internal/partner` : partner-owned handlers
- `services/backend/internal/staff` : staff-owned handlers
- `services/backend/internal/shared` : shared partner/staff models and usecases
- `infra/` : auth, middleware, utilities, logging, validation
- `scripts/` : migrations and seed scripts
- `docs/` : current architecture, API, setup, migrations, handover

## Core flows

### Auth

- unified auth endpoints live under `/v1.0/auth/*`
- sign-in reads the unified `admin_db.users` table
- JWT is stored in `HttpOnly` cookie `access_token`
- CSRF protection uses readable cookie `csrf_token`
- current identity is bootstrapped from `GET /v1.0/auth/session`
- sessions are server-backed in `admin_db.auth_sessions`
- sign-in throttling is DB-backed in `admin_db.auth_login_attempts`

### Application lifecycle

- applicant creates and updates drafts in `admin_db.applications`
- submit validates the draft and marks the same row `submitted` inside one transaction
- partner and staff read submitted applications from the same unified tables
- Kallisto does not release application verdicts

### University data

- `admin_db.universities` is the source of truth
- `universities.university_profile` is the canonical university profile JSON column

### Application schema

- supported read contract: `application_schema.sections[*].fields[*]`
- canonical visibility keys: `applicant|partner|staff`

## Setup

1. Create `admin_db`
2. Run `psql -U postgres -d admin_db -f scripts/migrations/deploy_admin_db.sql`
3. Optional: run `scripts/db/apply_seeds.*`
4. Configure `.env`
5. Run:
   - `go run services/backend/cmd/main.go`
   - `cd frontend && npm install && npm run dev`

## Seed accounts

- Staff: `admin@kallisto.uz / admin123`
- Partner: `manager@kallisto.uz / admin123`
- Applicant: create via `/auth/sign-up`

## Frontend routing

- `/auth/*`
- `/applicant/*`
- `/partner/:universityId/*`
- `/staff/*`
- `/staff/universities/:id`
- `/staff/universities/:id/edit`

Backend middleware remains the real enforcement layer and returns `401` or `403`.

## Operational notes

- password reset is intentionally disabled and returns `503`
- `POST /v1.0/auth/sign-out` is the only supported sign-out route
- authenticated unsafe requests require `X-CSRF-Token`
- frontend dev proxy is `/api` only
- partner routes require a linked university in claims
- `global_settings.maintenance_mode.enabled` blocks non-staff sign-in, session bootstrap, and applicant or partner protected routes with `503`
- staff sign-in and staff routes stay available during maintenance mode
- all role-scoped route groups now emit `service_logs` rows with `X-Request-Id`
- audit logging remains focused on auth, security, and partner or staff administrative actions
- the partner submissions screen downloads the currently selected submission as a client-side JSON snapshot; attachment files still use the backend file download endpoints

## Verification baseline

- `go test ./...`
- `cd frontend && npm run test -- --run`
- `cd frontend && npm run test:coverage`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

## Handover checklist

- verify backend responds on `:8081`
- verify frontend proxy reaches backend through `/api`
- demo unified sign-in
- demo applicant draft -> submit flow
- demo partner read-only submissions view
- demo partner submission JSON download and attachment links
- demo staff university detail and edit routes
- confirm canonical schema visibility keys are `applicant|partner|staff`
- confirm `universities.university_profile` is present on the deployed schema
