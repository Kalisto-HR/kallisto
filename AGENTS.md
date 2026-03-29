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
- Monolith backend API: `http://localhost:8081/v1.0`
- PostgreSQL default port: `5432`

### 2.3 Responsibilities
- `services/backend/internal/auth`: auth, session bootstrap, sign-in, sign-up, sign-out, management account creation.
- `services/backend/internal/applicant`: applicant-facing profile, universities, favorites, compare, basket, applications.
- `services/backend/internal/partner`: linked-university dashboard and application-structure management handlers.
- `services/backend/internal/staff`: staff overview, universities, settings, and observability handlers.
- `services/backend/internal/shared`: shared partner/staff models, university handlers, submitted-application access, and usecases.
- `infra`: shared auth, middleware, env loading, validation, utilities, logging.

### 2.4 Auth Model
- JWT in `HttpOnly` cookie: `access_token`
- Algorithm: HS256
- TTL: 15 minutes
- Auto-extension around 75% of TTL window

### 2.5 Data Ownership and Flow
- `admin_db.universities` is source of truth.
- All roles read the same `admin_db.universities` rows.
- Application flow:
1. Applicant drafts live in `admin_db.applications`.
2. On submit, the monolith validates the draft and commits the same row as `submitted`.
3. Partner and staff users read submitted applications from the same unified tables.

## 3. Project Structure Reference

- `frontend/`: React UI
- `services/backend/`: monolith backend service and internal role packages
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

1. Create `admin_db`.
2. Run migrations from `scripts/migrations/admin_db.sql`.
3. Seed development data in `scripts/seeds/` when needed.
4. Configure `.env`:
- `DATABASE_URL`
- `SECRET_KEY`
5. Run services:
- `go run services/backend/cmd/main.go`
- `cd frontend && npm install && npm run dev`
