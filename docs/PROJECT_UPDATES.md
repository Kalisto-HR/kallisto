# Kallisto Project Updates

## 2026-02-28

### Data model and migration stabilization
- Added canonical migration/seed runbook: `docs/MIGRATIONS.md`.
- Added deterministic migration orchestrator: `scripts/db/apply_migrations.ps1`.
- Added environment-aware seed orchestrator: `scripts/db/apply_seeds.ps1` with profiles:
  - `dev` -> full demo seed set (`admin_seed.sql`)
  - `staging` -> minimal deterministic admin bootstrap (`admin_seed_staging.sql`)
  - `none` -> no seed actions
- Added one-command bootstrap script: `scripts/db/bootstrap.ps1` (optional DB creation + migrations + seeds).
- Added migration smoke test script: `scripts/db/smoke_test_migrations.ps1` (temporary DBs, double-apply idempotency check, verification queries, cleanup).
- Added staging-safe seed file: `scripts/seeds/admin_seed_staging.sql`.
- Added `-PsqlPath` argument and `PSQL_PATH` env fallback across DB orchestration scripts.

### Migration/seed reliability hotfixes
- Hardened `scripts/migrations/admin_db.sql` to be re-runnable on existing environments:
  - switched base `CREATE TABLE/INDEX` to `IF NOT EXISTS`
  - guarded `fk_users_university_linked` creation with constraint existence check
- Fixed alias scoping bug in `scripts/migrations/admin_db_v5_partner_link_backfill.sql` (`UPDATE ... FROM` join condition).
- Fixed university seed SQL output BOM issue in `scripts/seeds/import_universities.ps1` by writing UTF-8 without BOM.

## 2026-02-27

### Management portal and routing
- Added manager vs superuser route guards and strict university/global context access rules.
- Added manager linkage fallback in admin auth flow (resolves linked university from `university_staff_profiles` when needed).
- Added partner link backfill migration for existing environments.

### Student application flow
- Added schema-driven application rendering from university `application_schema`.
- Added draft deep-open behavior from dashboard/applications list into apply flow.
- Added country field suggestions with type-to-filter behavior.
- Added transcript entry UX improvements.
- Added profile-level test score management (IELTS/SAT/TOEFL/ACT/OTHER) in student settings.
- Added draft application import action to pull selected profile test scores into application payload.
- Added canonical test-score mapping in application data (`test_scores` + top-level `ielts/sat/toefl/act`).

### Manager applications UX
- Added explicit `View` action in manager applications table.
- Added details drawer with applicant summary, applicant info, and application payload rendering.
- Added file-aware object rendering for uploaded document entries.

### Application file storage (new)
- Implemented real application attachment upload/storage pipeline.
- Client service now supports:
  - `POST /v1.0/application-files/upload`
  - `GET /v1.0/application-files/{fileId}/download`
- Admin service now supports manager download of submitted assets:
  - `GET /v1.0/applications/{id}/files/{fileId}/download`
- On submission, client forwards file assets to admin service (`file_assets`) and admin persists them.
- Submitted application payload now gets file URLs rewritten to admin download paths for manager-side access.

### Database migrations added
- `scripts/migrations/client_db_v2_application_transcripts.sql`
- `scripts/migrations/client_db_v3_application_files.sql`
- `scripts/migrations/client_db_v4_profile_test_scores.sql`
- `scripts/migrations/client_db_v5_application_test_scores.sql`
- `scripts/migrations/admin_db_v5_partner_link_backfill.sql`
- `scripts/migrations/admin_db_v6_submitted_application_files.sql`

### Required post-update actions
1. Run the new migrations on both databases.
2. Restart client service (`:8080`) and admin service (`:8082`).
3. Hard refresh frontend (`Ctrl+F5`).

### Important compatibility note
- Files uploaded before the new application file pipeline were stored as metadata only and are not previewable/downloadable as binary assets.
- New uploads after these migrations and service updates are persisted and downloadable.
