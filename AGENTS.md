# Kallisto Agent Guide

This file defines the default working rules and project knowledge baseline for coding agents in this repository.

## 1. Repository Rules

1. Kallisto is a monorepo. Any new Kallisto microservice or project component must be added here under a proper directory.
2. Go naming conventions:
- Use `camelCase` for internal variables, methods, and functions.
- Use `PascalCase` only for exported/public symbols.
3. Keep logic concise, verify assumptions, and question unclear requirements before locking design.
4. Keep formatting clean and compact. Avoid excessive empty lines and avoid over-cuddled code.
5. For Go concurrency, prefer channels over mutexes when asynchronous coordination is needed and channel-based flow is a good fit.
6. Place code under clear hierarchy and namespace boundaries (`services`, `infra`, `frontend`, `scripts`, `docs`).
7. Prefer generics where they improve flexibility and reduce future legacy coupling.
8. Never merge directly to `main`. Workflow is: feature branch -> changes -> merge request -> team review -> approval.
9. Maintain documentation for every meaningful change (API, architecture, setup, or service docs as applicable).
10. Any sensitive/critical adjustment must include appropriate automated tests; no test means no approval.

## 2. System Knowledge Baseline

### 2.1 Core Stack
- Frontend: React SPA (Vite)
- Backend: Go services (Gorilla Mux)
- Databases: PostgreSQL

### 2.2 Services and Ports
- Frontend dev server: `http://localhost:5173`
- Client service API: `http://localhost:8080/v1.0`
- Admin service API: `http://localhost:8082/v1.0`
- PostgreSQL default port: `5432`

### 2.3 Responsibilities
- `services/client`: applicant-facing auth, profile, universities, favorites, applications.
- `services/admin`: staff/partner auth, submitted application review workflow, university management.
- `infra`: shared auth, middleware, env loading, validation, utilities, logging.

### 2.4 Auth Model
- JWT in `HttpOnly` cookie: `access_token`
- Algorithm: HS256
- TTL: 15 minutes
- Auto-extension around 75% of TTL window

### 2.5 Data Ownership and Flow
- `admin_db.universities` is source of truth.
- `client_db.universities` is a read replica for applicant-facing reads.
- Application flow:
1. Applicant creates draft in `client_db.applications`.
2. Applicant submits from client service.
3. Client service forwards to admin service (`/applications/receive`).
4. Admin service stores in `admin_db.submitted_applications`.
5. Admin/partner reviews and updates status.
- University sync from admin DB to client DB is planned and should be treated as a known gap unless implemented.

## 3. Project Structure Reference

- `frontend/`: React UI
- `services/client/`: client API service
- `services/admin/`: admin API service
- `infra/`: shared backend infrastructure
- `scripts/migrations/`: SQL schema
- `scripts/seeds/`: seed data
- `docs/`: architecture, API, setup, handover, system map

## 4. Working Expectations for Agents

1. Before coding, read relevant docs in `docs/` and nearby service-specific docs.
2. Keep changes scoped and consistent with existing architecture.
3. Update tests and docs in the same change when behavior is affected.
4. Prefer explicit, maintainable code over clever shortcuts.
5. Surface tradeoffs and open questions early in PR/MR notes.

## 5. Quick Start Context

1. Create `client_db` and `admin_db`.
2. Run migrations in `scripts/migrations/`.
3. Seed development data in `scripts/seeds/` when needed.
4. Configure `.env`:
- `DB_CONNECTION_URL`
- `ADMIN_DB_CONNECTION_URL`
- `SECRET_KEY`
- `ADMIN_SERVICE_URL`
5. Run services:
- `go run services/client/cmd/main.go`
- `go run services/admin/cmd/main/main.go`
- `cd frontend && npm install && npm run dev`
