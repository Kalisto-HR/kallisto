# Kallisto Architecture

## Overview

Kallisto currently runs as:

- one React SPA frontend
- one Go backend monolith
- two PostgreSQL databases used by that single backend process

The backend is operationally a monolith, but the codebase still keeps `services/client` and `services/admin` as internal domain modules.

## Runtime topology

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8081/v1.0`
- Frontend dev proxy: `/api -> http://localhost:8081`

There is no separate supported admin service runtime and no supported `/adminapi` proxy anymore.

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
- role/permission checks
- request logging and CORS

The effective request stack is:

1. Gorilla Mux router
2. shared middleware
3. thin handler export layer in `services/client/api` or `services/admin/api`
4. internal HTTP handlers
5. usecases
6. PostgreSQL

## Databases and ownership

### `client_db`

`client_db` is the applicant-side store. Main tables include:

- `users`
- `universities`
- `applications`
- `application_files`
- `application_transcripts`
- `profile_test_scores`
- `application_test_scores`
- `password_reset_tokens`

Important constraints:

- `users.role` is fixed to `applicant`
- `applications.status` is limited to `draft` or `submitted`

### `admin_db`

`admin_db` is the management-side store. Main tables include:

- `users`
- `universities`
- `submitted_applications`
- `submitted_application_files`
- `drafts`
- `auth_sessions`
- `auth_login_attempts`
- `service_logs`
- `audit_logs`
- `global_settings`
- `university_application_structure_versions`
- `password_reset_tokens`

Important constraints:

- `users.role` is limited to `partner` or `staff`
- `submitted_applications.status` is limited to `submitted`

## Data flow

### Account flow

- Public sign-up creates applicant accounts in `client_db.users`.
- Staff can provision `partner` and `staff` accounts in `admin_db.users`.
- Sign-in checks `admin_db.users` first, then `client_db.users`.
- If the same email exists in both stores, sign-in fails closed.

### University data flow

- `admin_db.universities` is the source of truth.
- The backend syncs university records into `client_db.universities` for applicant-facing reads.
- Sync happens from backend usecases directly, not through a service-to-service HTTP call.

### Application flow

1. Applicant creates and edits a draft in `client_db.applications`.
2. On submit, the backend validates the draft and essay limits.
3. The backend writes or upserts the management copy into `admin_db.submitted_applications`.
4. The backend copies submitted file blobs into `admin_db.submitted_application_files`.
5. Only after the admin-side write succeeds does it mark the applicant-side row as `submitted`.

Kallisto no longer handles application verdict release. Partner and staff users can inspect submitted applications and files, but decision release is external to Kallisto.

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

Only these roles are supported:

- `applicant`
- `partner`
- `staff`

Authorization is fail-closed:

- unauthenticated requests return `401`
- authenticated but unauthorized requests return `403`

Backend permission checks are fail-closed and server-backed:

1. validate JWT signature and `exp`
2. load the current session row from `auth_sessions`
3. reject revoked or expired sessions
4. derive request claims from the session row

Unsafe authenticated requests also require trusted origin checks plus a matching CSRF header/cookie pair.

## Frontend architecture and restriction

The React SPA routes users into these public route namespaces:

- `/auth/*`
- `/applicant/*`
- `/partner/:universityId/*`
- `/staff/*`

Frontend restriction is implemented through:

- `SessionProvider` for session bootstrap from `GET /v1.0/auth/session`, idle timeout, and auth-expiry handling
- `RoleProtectedRoute` for route gating
- a dedicated forbidden page for `403` scenarios

Important behavior:

- `401` responses trigger reauth handling with machine-readable reasons such as `password-changed` and `account-updated`
- `403` responses remain forbidden states and do not log the user out
- role guards resolve session state before protected layouts mount

## Application schema contract

University application schemas are normalized on read into one canonical shape:

- `application_schema.sections[*].fields[*]`

Legacy flat schema payloads like `{"fields":[...]}` are normalized by the backend before they reach the frontend. This protects seeded and legacy university records from silently dropping fields in the applicant form.

## Supported surface vs legacy internals

The supported runtime and public docs use the `applicant`, `partner`, and `staff` model.

The repository still contains some legacy internal naming and historical code paths, especially in:

- frontend page/module filenames such as `student`, `management`, and `superuser`
- some old review-era usecase code that is no longer part of the supported flow
- schema visibility keys such as `reviewer` and `admin`, kept for builder compatibility

Treat the route namespaces, migrations, and backend entrypoint as the source of truth for current behavior.
