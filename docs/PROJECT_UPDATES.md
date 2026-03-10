# Kallisto Project Updates

## 2026-03-10

### Mobile responsiveness hardening

- Standardized mobile shell behavior across auth, student, management, and superuser layouts while preserving frozen desktop sidebars.
- Fixed mobile overflow and action wrapping across active routed pages in the current `App.tsx` tree.
- Added mobile card/list fallbacks for dense management and superuser table views.
- Added manual verification runbook: `docs/MOBILE_QA_CHECKLIST.md`.

### Management dashboard and superuser data cleanup

- Fixed manager dashboard dead-end actions by mapping dashboard settings/alerts/applicant links to real management routes.
- Added dashboard-to-applications deep linking so manager "View" actions open the target application drawer.
- Removed runtime superuser demo-data fallback behavior so fake placeholder universities/logs/drafts do not render ahead of live data.

### Repository push-prep cleanup

- Removed frontend and backend automated test files from the repository tree for this delivery branch.
- Removed visual test assets/config tied to deleted test suites.
- Removed obsolete migration smoke-test script references and cleaned `Makefile` accordingly.
- Pruned the dead frontend legacy stack:
  - removed unused root-level page modules under `frontend/src/pages`
  - removed the unused legacy API layer under `frontend/src/api`
  - removed obsolete `AuthContext`, `ProtectedRoute`, `Layout`, and `SearchBox` modules tied only to that legacy stack
- Frontend build now verifies only the live routed application and `services/*` data-access layer.
- Updated core docs for current runnable workflow:
  - `README.md`
  - `docs/SETUP.md`
  - `docs/MIGRATIONS.md`
  - `docs/ARCHITECTURE.md`
- Documentation now reflects canonical migration scripts and current startup flow.

## 2026-03-07

### Auth/session and endpoint cleanup

- Added signed `session_meta` cookie alongside `access_token` for frontend role/identity resolution.
- Updated client/admin sign-in and sign-out handlers to set/clear both cookies consistently.
- Removed `/v1.0/me` endpoint usage from active frontend session flow.
- Added CORS middleware in shared infra and applied it to client/admin services.

### Password reset

- Added client endpoints:
  - `POST /v1.0/password/forgot`
  - `POST /v1.0/password/reset`
- Added admin endpoints:
  - `POST /v1.0/password/forgot`
  - `POST /v1.0/password/reset`
- Added `password_reset_tokens` schema in both databases.
- Implemented one-time hashed reset tokens with expiry and invalidation of prior active tokens.

### Migration and script consolidation

- Consolidated migration strategy to canonical base files:
  - `scripts/migrations/client_db.sql`
  - `scripts/migrations/admin_db.sql`
- Deleted versioned migration files superseded by canonical schema.
- Added Linux shell DB scripts:
  - `scripts/db/common.sh`
  - `scripts/db/apply_migrations.sh`
  - `scripts/db/apply_seeds.sh`
  - `scripts/db/bootstrap.sh`
- Updated PowerShell migration orchestrator to canonical files only.
- Updated `Makefile` DB targets to shell scripts.

## 2026-02-28

### Data model and migration stabilization

- Added canonical migration/seed runbook: `docs/MIGRATIONS.md`.
- Added deterministic migration orchestrator: `scripts/db/apply_migrations.ps1`.
- Added environment-aware seed orchestrator: `scripts/db/apply_seeds.ps1` with profiles:
  - `dev` -> full demo seed set
  - `staging` -> minimal deterministic bootstrap
  - `none` -> no seed actions
- Added one-command bootstrap script: `scripts/db/bootstrap.ps1`.
- Added staging-safe seed file: `scripts/seeds/admin_seed_staging.sql`.
- Added `-PsqlPath` argument and `PSQL_PATH` env fallback across DB orchestration scripts.

## 2026-02-27

### Management portal and routing

- Added manager vs superuser route guards and strict university/global context access rules.
- Added manager linkage fallback in admin auth flow.
- Added partner link backfill migration for existing environments.

### Student application flow

- Added schema-driven application rendering from university `application_schema`.
- Added draft deep-open behavior from dashboard/applications list into apply flow.
- Added country field suggestions with type-to-filter behavior.
- Added transcript entry UX improvements.
- Added profile-level test score management (IELTS/SAT/TOEFL/ACT/OTHER) in student settings.
- Added draft import action to pull selected profile test scores into application payload.
- Added canonical test-score mapping in application data (`test_scores` + top-level `ielts/sat/toefl/act`).

### Manager applications UX

- Added explicit `View` action in manager applications table.
- Added details drawer with applicant summary, applicant info, and application payload rendering.
- Added file-aware object rendering for uploaded document entries.

### Application file storage

- Implemented application attachment upload/storage pipeline.
- Client service supports:
  - `POST /v1.0/application-files/upload`
  - `GET /v1.0/application-files/{fileId}/download`
- Admin service supports manager download of submitted assets:
  - `GET /v1.0/applications/{id}/files/{fileId}/download`
- On submission, client forwards file assets to admin service and admin persists them.
