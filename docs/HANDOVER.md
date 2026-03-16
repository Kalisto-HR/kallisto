# Kallisto - Dev Handover

## Quick Context
- Product: university application management platform.
- Stack: React SPA (Vite) + Go (Gorilla Mux) services + PostgreSQL.
- Services:
  - Client API for applicants: http://localhost:8081/v1.0
  - Admin API for staff/partners: http://localhost:8082/v1.0

## Repo Layout
- frontend/ : React SPA (Vite) UI.
- services/client/ : applicant-facing service.
- services/admin/ : admin/partner service.
- infra/ : shared auth, middleware, env, utils.
- scripts/ : migrations and seed data.
- docs/ : architecture, API, setup, plus this handover.

## Core Flows
1) Auth
- Signup/signin returns JWT in HttpOnly cookie (access_token).
- JWT uses HS256, TTL 15 minutes, auto-extends at 75% TTL.

2) Application lifecycle
- Draft created in client_db.applications with status=draft.
- Submit updates status=submitted and posts to admin service.
- Admin service persists in admin_db.submitted_applications.
- Admins review and set status (accepted/rejected).

3) University data
- admin_db.universities is source of truth.
- client_db.universities is a read replica.
- Sync is planned but not implemented.

## Setup (Short)
1) Create databases:
- client_db, admin_db
2) Run migrations:
- powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
3) Optional seed:
- powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
4) Optional one-command bootstrap:
- powershell -ExecutionPolicy Bypass -File scripts/db/bootstrap.ps1 -CreateDatabases -SeedProfile dev -DbUser postgres -DbHost localhost -DbPort 5432
5) Optional session vars (avoid repeated prompts/path issues):
- $env:PGPASSWORD="your_postgres_password"
- $env:PSQL_PATH="C:\Program Files\PostgreSQL\17\bin\psql.exe"
6) Configure .env (see docs/SETUP.md)
7) Run:
- go run services/client/cmd/main.go
- go run services/admin/cmd/main/main.go
- cd frontend && npm install && npm run dev

## Test Accounts
- Admin: admin@kallisto.uz / admin123 (from seed)
- Manager: manager@kallisto.uz / admin123
- KBTU Manager: kbtu.manager@kallisto.uz / admin123
- Bukhara Manager: bukhara.manager@kallisto.uz / admin123

## Known Gaps / Future Work
- University sync from admin_db to client_db (event-driven or cron).
- Admin frontend UI.
- Email notifications.
- Rate limiting, caching, monitoring.

## Handover Checklist (for the meeting)
- Verify APIs respond on :8081 and :8082.
- Demo signup -> draft -> submit -> admin review.
- Call out university sync gap.
- Show env vars in .env and Vite proxy config.

See docs/SYSTEM_MAP.md for the system map and port list.
