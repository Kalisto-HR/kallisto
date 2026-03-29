# Kallisto API

## Base URL

- Backend API: `http://localhost:8081/v1.0`
- Frontend proxy during development: `/api`

Kallisto runs as one backend service with role-scoped routes.

## Authentication model

- `access_token` is an `HttpOnly` JWT cookie carrying the session ID (`sid`)
- `csrf_token` is a readable cookie used only for CSRF protection on authenticated unsafe requests
- the authoritative session state lives in `admin_db.auth_sessions`
- protected requests resolve current role, permissions, and linked university from the server session row
- authenticated unsafe requests under `/v1.0/applicant/*`, `/v1.0/partner/*`, `/v1.0/staff/*`, and `POST /v1.0/auth/sign-out` require:
  - trusted `Origin` or `Referer`
  - `X-CSRF-Token` matching the `csrf_token` cookie

Unauthorized requests return `401`.
Authenticated but disallowed requests return `403`.

Session-related `401` responses may include:

- `session-expired`
- `session-revoked`
- `password-changed`
- `account-updated`

Responses under `/v1.0/auth/*`, `/v1.0/applicant/*`, `/v1.0/partner/*`, and `/v1.0/staff/*` include `X-Request-Id`.

## Auth endpoints

### `POST /v1.0/auth/sign-in`

Unified sign-in for `applicant`, `partner`, and `staff`.

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Behavior:

- reads the unified `admin_db.users` table
- applies DB-backed sign-in throttling by email and IP
- may return `429 Too Many Requests` with `Retry-After`

### `GET /v1.0/auth/session`

Returns the current server-backed session payload for the SPA.

### `POST /v1.0/auth/sign-up`

Creates an `applicant` account only.

### `POST /v1.0/auth/sign-out`

Revokes the current session and clears auth cookies.

### `POST /v1.0/auth/password/forgot`
### `POST /v1.0/auth/password/reset`

Both return `503 Service Unavailable`.

## Applicant routes

All applicant routes live under `/v1.0/applicant/*`.

Examples:

- `GET /v1.0/applicant/universities`
- `GET /v1.0/applicant/favorites`
- `GET /v1.0/applicant/compare`
- `GET /v1.0/applicant/basket`
- `GET /v1.0/applicant/applications`
- `POST /v1.0/applicant/applications`
- `POST /v1.0/applicant/applications/{universityId}/{cycle}/submit`
- `GET /v1.0/applicant/profile`

Application status in `admin_db.applications` is limited to:

- `draft`
- `submitted`

Submission behavior:

- applicant draft validation happens first
- submission persistence is one transaction in the unified database
- the same row transitions from `draft` to `submitted`

University detail responses emit one canonical application schema:

- `application_schema.sections[*].fields[*]`
- canonical visibility keys are `applicant|partner|staff`

## Partner routes

All partner routes live under `/v1.0/partner/*` and require a linked university in claims.

Examples:

- `GET /v1.0/partner/dashboard`
- `GET|PUT /v1.0/partner/university/profile`
- `GET|PUT /v1.0/partner/university/application-structure`
- `GET /v1.0/partner/university/application-structure/history`
- `POST /v1.0/partner/university/application-structure/publish`
- `GET /v1.0/partner/applications`
- `GET /v1.0/partner/applications/{id}`
- `GET /v1.0/partner/applications/{id}/files`
- `GET /v1.0/partner/applications/{id}/files/{fileId}/download`

Partner submissions are read-only. Kallisto does not expose accept, reject, or review endpoints.

## Staff routes

All staff routes live under `/v1.0/staff/*`.

Examples:

- `GET /v1.0/staff/dashboard`
- `POST /v1.0/staff/accounts`
- `GET|POST /v1.0/staff/universities`
- `GET|PUT|DELETE /v1.0/staff/universities/{id}`
- `GET /v1.0/staff/universities/{id}/dashboard`
- `GET|PUT /v1.0/staff/universities/{id}/application-structure`
- `GET /v1.0/staff/universities/{id}/applications`
- `GET /v1.0/staff/service-logs`
- `GET /v1.0/staff/audit-logs`
- `GET|PUT /v1.0/staff/settings`

`POST /v1.0/staff/accounts` creates `partner` or `staff` accounts only.

### Staff observability filters

`GET /v1.0/staff/service-logs`

- existing filters: `level`, `microservice`, `handler`, `user_id`, `time_range`
- additional filters: `request_id`, `method`, `status_code`, `role`, `from`, `to`
- response fields include `request_id`, `method`, `status_code`, `duration_ms`, `role`, `ip_address`, and `user_agent`

`GET /v1.0/staff/audit-logs`

- existing filters: `q`, `action`, `outcome`
- additional filters: `request_id`, `actor_type`, `target_entity`, `from`, `to`
- `actor_type` is normalized to `applicant|partner|staff|system|anonymous`

## Removed surfaces

These are not part of the supported API anymore:

- split-service sign-in paths such as `/v1.0/signin`, `/v1.0/signup`, `/v1.0/signout`
- `/v1.0/applications/receive`
- `/v1.0/global/*`
- `GET /v1.0/auth/sign-out`
- `/v1.0/staff/drafts*`
- applicant decision or release endpoints
- university-side staff subrole and invitation endpoints
- old route namespaces such as `/student/*`, `/management/*`, and `/superuser/*`

## Error codes

- `200` success
- `201` created
- `400` malformed or invalid request
- `401` unauthorized
- `403` forbidden
- `404` not found
- `409` duplicate or ambiguous account conflict
- `429` too many sign-in attempts
- `503` currently unavailable features such as password reset
