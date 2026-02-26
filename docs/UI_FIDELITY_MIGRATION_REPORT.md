# UI Fidelity Migration Report

This report documents the spec-aligned student UI fidelity migration according to `UI_FIDELITY_MIGRATION_SPEC.md`.

## 1) Source Files Used

### Shell and dashboard
- Source: `kallisto_design_v60/src/app/components/Header.tsx`
  - Target: `frontend/src/components/Header.tsx`
- Source: `kallisto_design_v60/src/app/components/Sidebar.tsx`
  - Target: `frontend/src/components/Sidebar.tsx`
- Source: `kallisto_design_v60/src/app/components/student/StudentDashboardDefault.tsx`
  - Target: `frontend/src/pages/student/StudentDashboardPage.tsx`

### Student feature pages
- Source: `kallisto_design_v60/src/app/components/student/UniversitySearchResultsAdvanced.tsx`
  - Target: `frontend/src/pages/student/UniversitySearchPage.tsx`
- Source: `kallisto_design_v60/src/app/components/student/UniversityDetail.tsx`
  - Target: `frontend/src/pages/student/UniversityDetailPage.tsx`
- Source: `kallisto_design_v60/src/app/components/student/ApplicationFlow.tsx`
  - Target: `frontend/src/pages/student/StudentApplicationCreatePage.tsx`
- Source: `kallisto_design_v60/src/app/components/student/UniversityComparePage.tsx`
  - Target: `frontend/src/pages/student/StudentComparePage.tsx`
- Source: `kallisto_design_v60/src/app/components/student/SettingsPage.tsx`
  - Target: `frontend/src/pages/student/StudentSettingsPage.tsx`
- Source: `kallisto_design_v60/src/app/components/student/BillingDashboard.tsx`
  - Target: `frontend/src/pages/student/StudentBillingPage.tsx`
- Source: `kallisto_design_v60/src/app/components/student/PricingPage.tsx`
  - Target: `frontend/src/pages/student/StudentPricingPage.tsx`
- Source: `kallisto_design_v60/src/app/components/student/CheckoutPage.tsx`
  - Target: `frontend/src/pages/student/StudentCheckoutPage.tsx`
- Source: `kallisto_design_v60/src/app/components/student/HelpPage.tsx`
  - Target: `frontend/src/pages/student/StudentHelpPage.tsx`

### Styles and primitives
- Source: `kallisto_design_v60/src/styles/index.css`
  - Target: `frontend/src/styles/index.css`
- Source: `kallisto_design_v60/src/styles/tailwind.css`
  - Target: `frontend/src/styles/tailwind.css`
- Source: `kallisto_design_v60/src/styles/theme.css`
  - Target: `frontend/src/styles/theme.css`
- Source: `kallisto_design_v60/src/app/components/ui/*`
  - Target: `frontend/src/components/ui/*`

## 2) Route Mapping (Source View -> Target Route)

- `student-dashboard-default` -> `/student/dashboard`
- `university-search-results` -> `/student/universities`
- `university-detail` -> `/student/universities/:id`
- `application-flow` -> `/student/applications/new/:universityId`
- `applications` -> `/student/applications`
- `application-detail` -> `/student/applications/:universityId/:cycle`
- `university-compare` -> `/student/compare`
- `settings` -> `/student/settings`
- `billing-dashboard` -> `/student/billing`
- `pricing` -> `/student/pricing`
- `checkout` -> `/student/checkout`
- `help` -> `/student/help`

## 3) API Mapping (Source Mock Field -> Backend Field)

### Session/user
- Source mock user (`name`, `role`) -> `GET /api/v1.0/me` envelope data
  - mapped in `frontend/src/context/SessionContext.tsx`

### Dashboard
- Source `Universities Shortlisted` mock count -> `GET /api/v1.0/favorites` length
- Source `Applications In Progress` mock count -> `GET /api/v1.0/applications` filtered `status=draft`
- Source `Applications Submitted` mock count -> `GET /api/v1.0/applications` filtered `status=submitted`
- Source profile block mock -> `GET /api/v1.0/profile`

### Search/detail/compare
- Source universities sample list -> `GET /api/v1.0/universities` and `/api/v1.0/universities/search`
- Source university detail sample -> `GET /api/v1.0/universities/:id`
- Source compare list sample context -> `GET /api/v1.0/favorites`
- Source compare add/remove sample context -> `POST/DELETE /api/v1.0/universities/:id/favorite`

### Application flow
- Source local draft simulation -> `POST /api/v1.0/applications` + `PUT /api/v1.0/applications/:universityId/:cycle`
- Source local submit simulation -> `POST /api/v1.0/applications/:universityId/:cycle/submit`
- Source detail mock payload -> `GET /api/v1.0/applications/:universityId/:cycle`

## 4) Visual QA Artifacts

Automated visual screenshots are stored as Playwright snapshots:
- `frontend/tests/visual/student-dashboard.spec.ts-snapshots/student-dashboard-shell-desktop-chromium-win32.png`
- `frontend/tests/visual/student-dashboard.spec.ts-snapshots/student-dashboard-shell-mobile-chromium-win32.png`

Visual test spec:
- `frontend/tests/visual/student-dashboard.spec.ts`

Playwright configuration:
- `frontend/playwright.config.ts`

## 5) Approved Deviations

- No explicit visual redesign deviations were introduced.
- Backend-limited areas are rendered with explicit parity-aligned UI and read-only messaging:
  - billing payment posting
  - security/password mutation
  - notification/privacy persistence

