# Application Builder Changelog

## Files Added

- `docs/APPLICATION_BUILDER_AUDIT.md`
- `docs/APPLICATION_BUILDER_DESIGN.md`
- `docs/APPLICATION_BUILDER_CHANGELOG.md`

## Files Changed

- `frontend/src/components/university/ApplicationStructure.tsx`
- `frontend/src/components/university/ApplicationStructure.test.tsx`
- `frontend/src/pages/partner/PartnerApplicationStructurePage.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/portal/PortalSidebar.tsx`
- `frontend/src/components/portal/portalRouting.ts`
- `frontend/src/types/portal.ts`
- `frontend/src/routes/routeConfig.ts`
- `frontend/src/i18n/locales/en/common.json`
- `frontend/src/i18n/locales/ru/common.json`
- `frontend/src/i18n/locales/uz/common.json`
- `frontend/src/i18n/locales/ru/landing.json`
- `frontend/src/pages/applicant/ApplicantApplicationCreatePage.tsx`

## Files Removed

No files were physically removed. The old user-facing `Application Structure` implementation was replaced in-place to preserve imports and reduce route risk.

## Old Routes Removed Or Redirected

- New primary partner route: `/partner/:universityId/application-builder`
- Legacy route: `/partner/:universityId/application-structure` redirects to the new route.
- User-facing navigation now says `Application Builder`.

## Data Migrations

No database migration was created in this change. Existing data remains in:

- `universities.application_schema`
- `university_application_structure_versions`

The new builder writes an `application_builder_v1` JSON schema into the existing draft storage. Publishing continues to use the existing versioning endpoint.

## Legacy Mapping

Legacy schemas are mapped at load time:

- passport/upload fields become document requirements;
- school/GPA/transcript fields become education requirements;
- name/email/phone fields become applicant information requirements;
- unknown fields are preserved as additional questions and flagged for manual review.

No legacy data is deleted.

## Tests

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed with the existing large bundle warning.
- `npm.cmd run test`: passed, 43 files and 125 tests.
- `go test ./...`: passed.

## Docker Verification

- `docker compose up -d --build`: passed.
- Running containers:
  - `kallisto-ver2-frontend-1`: healthy, `http://localhost:8080`
  - `kallisto-ver2-backend-1`: healthy, `127.0.0.1:8081`
  - `kallisto-ver2-postgres-1`: healthy, `127.0.0.1:55432`
- `/v1.0/auth/session` returned `401`, confirming the backend API is reachable and protected.
- `/health` and `/v1.0/health` returned `404`; no public health route exists in the current backend router.

## Unresolved Migration Warnings

- Submitted applications are preserved, but they are not yet linked to a specific builder version row.
- Student application rendering still uses the existing applicant application flow and compatibility schema handling.
- Program selection in the builder currently uses a safe local program reference list; deeper integration with real university-managed programs should follow.
- Backend endpoint names still include `application-structure` as compatibility API names.
