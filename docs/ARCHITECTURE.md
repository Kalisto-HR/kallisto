# Kallisto Architecture

## Overview

Kallisto is a monorepo with one React SPA and two Go backend services.

- `services/client` is applicant-facing.
- `services/admin` is management/superuser-facing.
- Both services use PostgreSQL databases with explicit ownership boundaries.

## Runtime Topology

- Frontend: `http://localhost:5173`
- Client API: `http://localhost:8081/v1.0`
- Admin API: `http://localhost:8082/v1.0`

The frontend uses API proxy routes (`/api` and `/adminapi`) to reach the two services.

## Frontend Composition

- Routed UI lives under:
  - `frontend/src/pages/auth`
  - `frontend/src/pages/student`
  - `frontend/src/pages/management`
  - `frontend/src/pages/superuser`
- Frontend data access is standardized through:
  - `frontend/src/services/*`
  - `frontend/src/services/api/httpClient.ts`
- Legacy root-level page modules and the old `frontend/src/api` client layer are not part of the supported runtime architecture.

## Service Responsibilities

### Client Service (`services/client`)

- Student authentication and session handling
- Student profile management
- University browse/search/favorites/compare/basket interactions
- Application drafts, autosave, and submission
- File upload for application assets before submit

### Admin Service (`services/admin`)

- Staff/partner/superuser authentication
- University manager dashboard and workflows
- Submitted application intake/review lifecycle
- University source-of-truth management
- Global/superuser administration surfaces

### Shared Infra (`infra`)

- JWT and cookie helpers
- Auth/CORS/logging middlewares
- Validation and response helpers
- Env and logger bootstrap

## Data Boundaries

### `client_db`

Core tables include:

- `users`
- `universities` (read-side copy)
- `applications`
- `favorites`
- `application_files`
- `profile_test_scores`
- `application_test_scores`
- `password_reset_tokens`

### `admin_db`

Core tables include:

- `users`
- `universities` (source of truth)
- `submitted_applications`
- `submitted_application_files`
- `drafts`
- `blacklist`
- `password_reset_tokens`

## Main Application Data Flow

1. Student creates/updates a draft in `client_db.applications`.
2. Student submits application from client service.
3. Client service forwards payload to admin service (`/v1.0/applications/receive`).
4. Admin service persists into `admin_db.submitted_applications`.
5. Manager/superuser reviews and updates review status.

## Authentication Model

- Auth token is in `HttpOnly` cookie `access_token`.
- Session metadata is also provided via signed cookie for frontend role-aware routing.
- JWT algorithm: HS256.
- Token TTL: 15 minutes with renewal behavior in active sessions.

## Routing and Access Model

- Student routes are under `/student/*`.
- Management routes are under `/management/*`.
- Partner users are restricted to university-scoped management routes.
- Superusers can access global management routes and university-context routes.

## Project Layout

```text
frontend/
services/client/
services/admin/
infra/
scripts/migrations/
scripts/seeds/
docs/
```

## Design Constraints

- Keep cross-service contracts explicit and versioned (`/v1.0`).
- Maintain canonical DB schema files in `scripts/migrations/client_db.sql` and `scripts/migrations/admin_db.sql`.
- Keep route guards strict with default-deny behavior for unauthorized contexts.
- Preserve source-of-truth ownership in `admin_db.universities`.
