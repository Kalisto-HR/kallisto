# Kallisto - Dev Handover

## Quick Context
- Product: university application management platform.
- Stack: React SPA (Vite) + Go (Gorilla Mux) services + PostgreSQL.
- Services:
  - Client API for applicants: http://localhost:8080/v1.0
  - Admin API for staff/partners: http://localhost:8081/v1.0

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
- scripts/migrations/client_db.sql
- scripts/migrations/admin_db.sql
3) Optional seed:
- scripts/seeds/universities_seed.sql
- scripts/seeds/admin_seed.sql
4) Configure .env (see docs/SETUP.md)
5) Run:
- go run services/client/cmd/main.go
- go run services/admin/cmd/main/main.go
- cd frontend && npm install && npm run dev

## Test Accounts
- Admin: admin@kallisto.uz / admin123 (from seed)

## Known Gaps / Future Work
- University sync from admin_db to client_db (event-driven or cron).
- Admin frontend UI.
- File uploads (logos, documents).
- Email notifications.
- Rate limiting, caching, monitoring.

## Handover Checklist (for the meeting)
- Verify APIs respond on :8080 and :8081.
- Demo signup -> draft -> submit -> admin review.
- Call out university sync gap.
- Show env vars in .env and Vite proxy config.

See docs/SYSTEM_MAP.md for the system map and port list.
