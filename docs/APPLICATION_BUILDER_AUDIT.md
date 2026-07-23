# Application Builder Audit

## Current User-Facing Feature

The current partner route exposes a page labeled `Application Structure` at:

- `/partner/:universityId/application-structure`

The page is implemented by:

- `frontend/src/pages/partner/PartnerApplicationStructurePage.tsx`
- `frontend/src/components/university/ApplicationStructure.tsx`

The current component behaves like a schema/form-builder surface. It exposes field types, internal keys, visibility, validation objects, section/field settings, audit history, templates, and publish actions on one large screen. This creates a high cognitive load for admissions users and makes it difficult to create a simple application.

## Frontend Connections

- `frontend/src/App.tsx` mounts the partner application structure route.
- `frontend/src/routes/routeConfig.ts` exposes `routes.partner.applicationStructure`.
- `frontend/src/components/portal/PortalSidebar.tsx` shows the old navigation label.
- `frontend/src/components/portal/portalRouting.ts` maps the route to the partner sidebar page id.
- `frontend/src/services/partner/universityService.ts` reads and writes the university application schema.
- `frontend/src/services/partner/dashboardService.ts` reads history and publishes the current schema.
- `frontend/src/types/domain.ts` defines `ApplicationStructureVersion`.

## Backend Connections

Existing backend endpoints are mounted in `services/backend/cmd/main.go`:

- `GET /partner/university/application-structure`
- `PUT /partner/university/application-structure`
- `GET /partner/university/application-structure/history`
- `POST /partner/university/application-structure/publish`
- Staff scoped equivalents under `/staff/universities/{id}/application-structure`

Existing usecases:

- `GetUniversityApplicationStructure`
- `UpdateUniversityApplicationStructure`
- `GetApplicationStructureHistory`
- `PublishApplicationStructure`

## Database Storage

The current schema storage is:

- `universities.application_schema JSONB`
- `university_application_structure_versions`

The version table already stores:

- `university_id`
- `version_no`
- `schema`
- `published`
- `changed_by`
- `change_note`
- `created_at`

## Student Application Dependency

Student application submission and status tracking use:

- `applications`
- `application_files`
- `application_transcripts`
- `profile_test_scores`
- application status event/message/decision tables

Student statuses must remain unchanged:

- `draft`
- `submitted`
- `under_review`
- `additional_information_required`
- `decision_pending`
- `accepted`
- `waitlisted`
- `rejected`

## Current Problems

- User-facing terminology is technical.
- The entire configuration appears on one screen.
- Universities can rebuild standard applicant profile fields manually.
- The UI mixes schema configuration, preview, history, field internals, and publishing.
- Internal keys and technical validation concepts are visible to admissions users.
- It is unclear how to create one usable admissions application.

## Migration Risks

- Existing `application_schema` values may contain legacy sections and fields.
- Existing published versions must remain readable.
- Submitted student applications must not be modified or deleted.
- Backend endpoint names are currently used by frontend services and tests.

## Safe Replacement Approach

Use the existing JSON storage and versioning endpoints as a compatibility layer for the first replacement. The new frontend writes a new guided `application_builder_v1` schema shape while preserving legacy schemas and mapping readable legacy fields where possible. No database columns or production data are dropped in this change.
