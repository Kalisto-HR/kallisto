# Kallisto Project Updates

## 2026-03-11

### Review sync, gender analytics, and working application templates

- Manager review decisions now sync terminal outcomes back into `client_db.applications` after admin review updates:
  - `accepted` -> student-facing `accepted`
  - `rejected` -> student-facing `rejected`
  - non-terminal manager review states keep the student-facing record at `submitted`
- Student dashboard, applications list, and application detail pages now reflect accepted and rejected outcomes correctly.
- Added gender capture to student profile settings and server-side validation for supported values:
  - `male`
  - `female`
  - `other`
  - `prefer_not_to_say`
- Student application submission now mirrors profile gender into forwarded `applicant_info.gender` so management analytics can use a reliable source of truth.
- Replaced the stubbed manager `Use Template` action in Application Structure with a real template catalog plus a confirmation-driven replace flow.
- Added working built-in application-structure templates:
  - `Common App Standard`
  - `Graduate Program`
  - `Scholarship Application`
  - `International Student`
- Expanded manager preview parity for builder-supported field types:
  - `country`
  - `rating`
  - `address`
  - `recommender`
  - `repeating-group`

## 2026-03-10

### Manager and student workflow fixes

- Fixed management dashboard analytics to derive average SAT / IELTS and gender distribution from real submitted application payloads, including imported `test_scores` fallback data.
- Fixed management applications page actions:
  - aligned desktop action column
  - added explicit review / accept / reject actions
  - kept application detail viewing intact
- Fixed management Users & Staff runtime behavior so the page no longer renders dummy staff/role/invitation content before live data arrives.
- Removed the unused student header search input from the dashboard shell.
- Removed the extra refresh action from Find Universities and adjusted desktop scrolling so filters and university results scroll independently instead of dragging the whole page awkwardly.
- Restored schema-driven student application rendering:
  - student application flow now loads university-published sections instead of filtering down to personal-only fields
  - added support for essay, choice, dropdown, agreement, address, recommender, repeating-group, and file/document upload field types
  - added transcript uploads inside education-history repeating groups
  - kept draft autosave/resume behavior intact while allowing full university-configured payload submission

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

## 2026-03-16

### Student application and university detail fixes

- Added fast duplicate-application feedback in the student apply flow for the same `university + cycle` combination.
- Added live essay word counting and over-limit blocking in the student application form.
- Kept backend essay word-limit validation on final submit, while allowing over-limit drafts to continue autosaving so student work is not lost mid-edit.
- Restricted student gender selection to `male` or `female` and made it required when saving profile settings.
- Restricted forwarded application analytics gender to `male` or `female` only.

### University profile and student detail sync

- Added `management_profile` to `client_db.universities`.
- Synced admin university updates and application-structure publish actions into client DB with `management_profile`.
- Exposed `management_profile` from the client university API.
- Replaced placeholder student university detail tabs with:
  - published programs offered
  - intake terms
  - admission requirements
  - minimum test score requirements
  - required supporting documents
- Added backward-compatible student detail parsing so seeded/imported universities still render programs from `metadata.programs` and requirement fields from flat `applicationSchema.fields` while newer management-profile/section-based shapes remain supported.
- Fixed manager university profile program/intake editors to use controlled state so changes persist correctly on save.
- Extended university replication so admin create/import paths now sync into `client_db.universities`, not just later update/publish flows.

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
