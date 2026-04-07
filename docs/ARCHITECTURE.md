# Kallisto Architecture

## Overview

Kallisto runs as:

- one React SPA frontend
- one Go backend monolith
- one PostgreSQL database

## Runtime topology

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8081/v1.0`
- Frontend dev proxy: `/api -> http://localhost:8081`

There is no supported split-service runtime and no supported `/adminapi` proxy.

## Backend composition

The backend entrypoint is `services/backend/cmd/main.go`.

It mounts four route groups:

- `/v1.0/auth/*`
- `/v1.0/applicant/*`
- `/v1.0/partner/*`
- `/v1.0/staff/*`

Each route group is protected by shared middleware from `infra/`:

- DB pool injection
- JWT authentication
- maintenance-mode gating for applicant and partner traffic
- CSRF enforcement
- role and permission checks
- request logging and CORS

The effective request stack is:

1. Gorilla Mux router
2. shared middleware
3. role packages under `services/backend/internal`
4. usecases
5. PostgreSQL

## Database and ownership

`admin_db` is the only supported runtime store. Main tables include:

- `users`
- `universities`
- `applications`
- `application_files`
- `application_transcripts`
- `profile_test_scores`
- `application_test_scores`
- `auth_sessions`
- `auth_login_attempts`
- `service_logs`
- `audit_logs`
- `global_settings`
- `password_reset_tokens`
- `university_application_structure_versions`

Important constraints:

- `users.role` is limited to `applicant`, `partner`, or `staff`
- `applications.status` is limited to `draft` or `submitted`
- `universities.university_profile` is the canonical profile JSON column

## Data flow

### Account flow

- public sign-up creates applicant accounts in `admin_db.users`
- staff can provision `partner` and `staff` accounts in `admin_db.users`
- sign-in reads the unified `users` table only

### University data flow

- all roles read the same `admin_db.universities` rows

### Application flow

1. The applicant creates and edits a draft in `admin_db.applications`.
2. On submit, the backend validates the draft and essay limits.
3. Applicant submit writes one transaction against `admin_db.applications` and `admin_db.application_files`.
4. Partner and staff read the same table filtered to `status = 'submitted'`.

Kallisto does not handle decision release. Partner and staff can inspect submitted applications and files, but release remains external to Kallisto.

## Auth and authorization

Kallisto uses:

- `access_token` as an `HttpOnly` JWT cookie carrying `sid`
- `csrf_token` as a readable cookie for CSRF protection
- `admin_db.auth_sessions` as the authoritative session store
- `admin_db.auth_login_attempts` for DB-backed sign-in throttling

Per-request authorization resolves the current session row and derives:

- `uid`
- `role`
- `permissions[]`
- `university_linked` for partner accounts when applicable

Authorization is fail-closed:

- unauthenticated requests return `401`
- authenticated but unauthorized requests return `403`
- authenticated applicant and partner traffic returns `503` while `global_settings.maintenance_mode.enabled` is true
- staff sign-in and staff routes stay available during maintenance mode so maintenance can be disabled

## Frontend architecture

The React SPA routes users into these public namespaces:

- `/auth/*`
- `/applicant/*`
- `/partner/:universityId/*`
- `/staff/*`

Notable role-owned views include:

- `/partner/:universityId/applications` for read-only submissions with client-side JSON export of the selected application payload
- `/staff/universities/:id` for read-only university detail
- `/staff/universities/:id/edit` for staff-driven university profile updates using the shared university profile form

Frontend restriction is implemented through:

- `SessionProvider` for session bootstrap from `GET /v1.0/auth/session`
- route guards for role gating
- a dedicated forbidden page for `403` scenarios
- role-owned frontend API layers under `frontend/src/services/{auth,applicant,partner,staff}`

## Application schema contract

University application schemas are normalized into one canonical read shape:

- `application_schema.sections[*].fields[*]`

Canonical schema visibility keys are:

- `applicant`
- `partner`
- `staff`

Legacy flat schema payloads are normalized before they reach the frontend.

## Observability

`service_logs` covers:

- `/v1.0/auth/*`
- `/v1.0/applicant/*`
- `/v1.0/partner/*`
- `/v1.0/staff/*`

Responses on those route groups include `X-Request-Id`.

`audit_logs` stays focused on auth, security, and administrative events rather than broad applicant activity logging.

## Quality gates

The supported local verification set is:

- `go test ./...`
- `cd frontend && npm run test -- --run`
- `cd frontend && npm run test:coverage`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
