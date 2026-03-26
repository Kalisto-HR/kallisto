# Kallisto API

## Base URL

- Backend API: `http://localhost:8081/v1.0`
- Frontend proxy during development: `/api`

Kallisto now runs as a single backend service with role-scoped routes.

## Authentication model

- `access_token` is an `HttpOnly` JWT cookie carrying the session ID (`sid`)
- `csrf_token` is a readable cookie used only for CSRF protection on authenticated unsafe requests
- The authoritative session state lives in `admin_db.auth_sessions`
- Protected requests resolve current role, permissions, and linked university from the server session row, not from a frontend-readable cookie
- Authenticated unsafe requests under `/v1.0/applicant/*`, `/v1.0/partner/*`, `/v1.0/staff/*`, and `POST /v1.0/auth/sign-out` require:
  - trusted `Origin` or `Referer`
  - `X-CSRF-Token` matching the `csrf_token` cookie

Unauthorized requests return `401`.
Authenticated but disallowed requests return `403`.

Session-related `401` responses may include one of these reasons:

- `session-expired`
- `session-revoked`
- `password-changed`
- `account-updated`

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

- checks `admin_db.users` first for `partner` and `staff`
- checks `client_db.users` second for `applicant`
- fails closed if the same email exists in both stores
- applies DB-backed sign-in throttling by email and IP
- may return `429 Too Many Requests` with `Retry-After`

### `GET /v1.0/auth/session`

Returns the current server-backed session payload for the SPA.

### `POST /v1.0/auth/sign-up`

Creates an `applicant` account only.

```json
{
  "email": "applicant@example.com",
  "password": "password123",
  "first_name": "Test",
  "last_name": "User"
}
```

### `POST /v1.0/auth/sign-out`

Revokes the current session and clears auth cookies.

Responses under `/v1.0/auth/*`, `/v1.0/partner/*`, and `/v1.0/staff/*` include `X-Request-Id`.

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

Application status in `client_db.applications` is limited to:

- `draft`
- `submitted`

Submission behavior:

- applicant draft validation happens first
- admin-side submission persistence in `admin_db` must succeed first
- only then is the applicant record marked `submitted`
- failures return `502 Bad Gateway`

University detail responses emit canonical application schema only:

- `application_schema.sections[*].fields[*]` is the supported read shape
- legacy flat payloads like `{"fields":[...]}` are normalized on read and are not emitted anymore
- canonical sections expose `id`, `title`, `order`, `visible`, and `fields`
- canonical fields expose `id`, `type`, `label`, `required`, `dataKey`, `visibility`, and `order`

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

Partner submissions are read-only. Kallisto does not expose accept/reject/review endpoints anymore.

Application-structure reads also return the canonical sectioned schema shape under `application_schema`.

Implementation note:

- schema visibility keys are still emitted in the existing compatibility shape from the builder layer
- the supported route/role model is `applicant|partner|staff`, but some schema visibility payloads may still use `applicant|reviewer|admin`

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
- current action taxonomy includes:
  - `auth.sign-in`
  - `auth.sign-out`
  - `security.access-denied`
  - `management-account.create`
  - `university.create`
  - `university.update`
  - `university.delete`
  - `application-structure.update`
  - `application-structure.publish`
  - `settings.update`

## Removed surfaces

These are not part of the supported API anymore:

- split-service sign-in paths such as `/v1.0/signin`, `/v1.0/signup`, `/v1.0/signout`
- `/v1.0/applications/receive`
- `/v1.0/global/*`
- `GET /v1.0/auth/sign-out`
- `/v1.0/staff/drafts*`
- applicant decision/release endpoints
- university-side staff subrole and invitation endpoints
- old route namespaces such as `/student/*`, `/management/*`, and `/superuser/*`

## Error codes

- `200` success
- `201` created
- `400` malformed or invalid request
- `401` unauthorized
- `403` forbidden
- `404` not found
- `409` duplicate/ambiguous account conflict
- `429` too many sign-in attempts
- `502` upstream persistence failure during applicant submission
- `503` currently unavailable features such as password reset
