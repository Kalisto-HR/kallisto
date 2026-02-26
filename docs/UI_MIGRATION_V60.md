# UI Migration v60 (Source -> frontend)

## 1) Migrated Files

### Visual system
- `frontend/src/styles/index.css`
- `frontend/src/styles/fonts.css`
- `frontend/src/styles/tailwind.css`
- `frontend/src/styles/theme.css`
- `frontend/src/components/ui/*` (full UI kit copied from `kallisto_design_v60/src/app/components/ui`)

### Routing/auth/session architecture
- `frontend/src/App.tsx`
- `frontend/src/routes/routeConfig.ts`
- `frontend/src/components/routing/RoleProtectedRoute.tsx`
- `frontend/src/components/routing/LegacyRedirects.tsx`
- `frontend/src/context/SessionContext.tsx`
- `frontend/src/hooks/useSession.ts`

### Layout shells
- `frontend/src/components/layout/AuthShell.tsx`
- `frontend/src/components/layout/StudentShell.tsx`
- `frontend/src/components/layout/ManagementShell.tsx`
- `frontend/src/components/layout/SuperuserShell.tsx`

### Service/hook data layer
- `frontend/src/services/api/httpClient.ts`
- `frontend/src/services/mappers/responseMappers.ts`
- `frontend/src/services/client/authService.ts`
- `frontend/src/services/client/universitiesService.ts`
- `frontend/src/services/client/applicationsService.ts`
- `frontend/src/services/client/profileService.ts`
- `frontend/src/services/client/favoritesService.ts`
- `frontend/src/services/admin/authService.ts`
- `frontend/src/services/admin/applicationsService.ts`
- `frontend/src/services/admin/universitiesService.ts`
- `frontend/src/hooks/useAsyncState.ts`
- `frontend/src/hooks/useStudentDashboardData.ts`
- `frontend/src/hooks/useUniversitySearchData.ts`
- `frontend/src/hooks/useApplicationFlowData.ts`
- `frontend/src/hooks/useManagementApplicantsData.ts`
- `frontend/src/hooks/useManagementUniversityData.ts`

### Pages
- `frontend/src/pages/auth/SignInPage.tsx`
- `frontend/src/pages/auth/SignUpPage.tsx`
- `frontend/src/pages/auth/ForgotPasswordPage.tsx` (placeholder)
- `frontend/src/pages/auth/ResetPasswordPage.tsx` (placeholder)
- `frontend/src/pages/student/StudentDashboardPage.tsx`
- `frontend/src/pages/student/UniversitySearchPage.tsx`
- `frontend/src/pages/student/UniversityDetailPage.tsx`
- `frontend/src/pages/student/StudentApplicationsPage.tsx`
- `frontend/src/pages/student/StudentApplicationDetailPage.tsx`
- `frontend/src/pages/student/StudentApplicationCreatePage.tsx`
- `frontend/src/pages/student/StudentComparePage.tsx`
- `frontend/src/pages/student/StudentSettingsPage.tsx`
- `frontend/src/pages/student/StudentHelpPage.tsx` (placeholder)
- `frontend/src/pages/student/StudentBillingPage.tsx` (placeholder)
- `frontend/src/pages/student/StudentPricingPage.tsx` (placeholder)
- `frontend/src/pages/student/StudentCheckoutPage.tsx` (placeholder)
- `frontend/src/pages/management/ManagementDashboardPage.tsx`
- `frontend/src/pages/management/ManagementApplicationsPage.tsx`
- `frontend/src/pages/management/ManagementUniversityProfilePage.tsx`
- `frontend/src/pages/management/ManagementApplicationStructurePage.tsx` (placeholder)
- `frontend/src/pages/management/ManagementUsersPage.tsx` (placeholder)
- `frontend/src/pages/management/ManagementBillingPage.tsx` (placeholder)
- `frontend/src/pages/superuser/SuperuserOverviewPage.tsx` (placeholder)
- `frontend/src/pages/superuser/SuperuserUniversitiesPage.tsx`
- `frontend/src/pages/superuser/SuperuserDraftsPage.tsx` (placeholder)
- `frontend/src/pages/superuser/SuperuserApplicationsPage.tsx`
- `frontend/src/pages/superuser/SuperuserUsersPage.tsx` (placeholder)
- `frontend/src/pages/superuser/SuperuserServiceLogsPage.tsx` (placeholder)
- `frontend/src/pages/superuser/SuperuserAuditLogsPage.tsx` (placeholder)
- `frontend/src/pages/superuser/SuperuserSettingsPage.tsx` (placeholder)
- `frontend/src/pages/NotFoundPage.tsx`

### Shared state widgets
- `frontend/src/components/common/PageState.tsx`
- `frontend/src/components/common/PlaceholderPage.tsx`

### Test stack and tests
- `frontend/src/test/setup.ts`
- `frontend/src/test/renderWithProviders.tsx`
- `frontend/src/test/server.ts`
- `frontend/src/components/routing/__tests__/RoleProtectedRoute.test.tsx`
- `frontend/src/components/routing/__tests__/LegacyRedirects.test.tsx`
- `frontend/src/services/mappers/__tests__/responseMappers.test.ts`
- `frontend/src/services/api/__tests__/httpClient.test.ts`
- `frontend/src/services/admin/__tests__/applicationsService.test.ts`
- `frontend/src/hooks/__tests__/useUniversitySearchData.test.ts`
- `frontend/src/hooks/__tests__/useApplicationFlowData.test.ts`
- `frontend/src/hooks/__tests__/useAsyncState.test.ts`
- `frontend/src/context/__tests__/SessionContext.test.tsx`
- `frontend/src/pages/auth/__tests__/SignInPage.test.tsx`

### Build/tooling updates
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.app.json`
- `frontend/eslint.config.js`
- `frontend/src/main.tsx`

## 2) API Integration Points

### Client service (`/api` -> `:8080`)
- `POST /v1.0/signin` (student sign-in)
- `POST /v1.0/signup` (student sign-up)
- `GET /v1.0/signout`
- `GET /v1.0/me`
- `GET /v1.0/profile`
- `PUT /v1.0/profile`
- `GET /v1.0/universities`
- `GET /v1.0/universities/search`
- `GET /v1.0/universities/{id}`
- `GET /v1.0/favorites`
- `POST /v1.0/universities/{id}/favorite`
- `DELETE /v1.0/universities/{id}/favorite`
- `GET /v1.0/applications`
- `POST /v1.0/applications`
- `GET /v1.0/applications/{universityId}/{cycle}`
- `PUT /v1.0/applications/{universityId}/{cycle}`
- `POST /v1.0/applications/{universityId}/{cycle}/submit`

### Admin service (`/adminapi` -> `:8082`)
- `POST /v1.0/signin` (staff/partner sign-in)
- `GET /v1.0/signout`
- `GET /v1.0/me`
- `GET /v1.0/applications`
- `GET /v1.0/applications/{id}`
- `PUT /v1.0/applications/{id}/review`
- `GET /v1.0/universities`
- `GET /v1.0/universities/{id}`
- `GET /v1.0/universities/{id}/application-structure`
- `PUT /v1.0/universities/{id}/application-structure`
- `GET /v1.0/universities/{id}/users`
- `POST /v1.0/universities/{id}/users`
- `PUT /v1.0/universities/{id}/manager`

### Placeholder-only routes (no production endpoint used)
- Forgot/reset password
- Billing/pricing/checkout flows
- Superuser global logs/audit/drafts/settings
- Management structure/users/billing advanced features

## 3) Route Map (source -> target)

### Auth
- `sign-in` -> `/auth/sign-in`
- `sign-up` -> `/auth/sign-up`
- `forgot-password` -> `/auth/forgot-password` (placeholder)
- `reset-password` -> `/auth/reset-password` (placeholder)

### Student
- `student-dashboard*` -> `/student/dashboard`
- `university-search*` -> `/student/universities`
- `university-detail` -> `/student/universities/:id`
- `applications` -> `/student/applications`
- `application-detail` -> `/student/applications/:universityId/:cycle`
- `application-flow` -> `/student/applications/new/:universityId`
- `university-compare*` -> `/student/compare`
- `settings` -> `/student/settings`
- `help` -> `/student/help` (placeholder)
- `billing*` -> `/student/billing` (placeholder)
- `pricing` -> `/student/pricing` (placeholder)
- `checkout*` -> `/student/checkout` (placeholder)

### Management
- `management-dashboard` -> `/management/:universityId/dashboard`
- `management-applications` -> `/management/:universityId/applications`
- `management-university-profile` -> `/management/:universityId/profile`
- `management-application-structure` -> `/management/:universityId/application-structure`
- `management-users` -> `/management/:universityId/users`
- `management-billing` -> superuser-only (not exposed in manager route set)

### Superuser
- `management-global-overview` -> `/management/global/overview` (placeholder)
- `management-global-universities` -> `/management/global/universities`
- `management-global-drafts` -> `/management/global/drafts` (placeholder)
- `management-global-applications` -> `/management/global/applications`
- `management-global-users` -> `/management/global/users` (placeholder)
- `management-global-service-logs` -> `/management/global/service-logs` (placeholder)
- `management-global-audit-logs` -> `/management/global/audit-logs` (placeholder)
- `management-global-settings` -> `/management/global/settings` (placeholder)

### Legacy redirects
- `/` -> `/auth/sign-in`
- `/signin` -> `/auth/sign-in`
- `/signup` -> `/auth/sign-up`
- `/dashboard` -> `/student/dashboard`
- `/search` -> `/student/universities`
- `/applications` -> `/student/applications`

## 4) Test Checklist

### Authentication and routing
- [ ] Student sign-in reaches `/student/dashboard`.
- [ ] Partner/staff sign-in reaches `/management/dashboard`.
- [ ] Staff can toggle to superuser mode and access `/superuser/*`.
- [ ] Unauthorized role access redirects to correct home area.
- [ ] Legacy URLs redirect to namespaced routes.

### Student area
- [ ] Search page shows loading, empty, error, success states.
- [ ] University detail fetches from real API.
- [ ] Application create page can save draft and submit.
- [ ] Application list/detail fetch from real API.
- [ ] Settings updates profile via PUT.

### Management area
- [ ] Applications list loads and filters by status.
- [ ] Review actions (`reviewing`, `accepted`, `rejected`) call real endpoint.
- [ ] University profile list loads from admin universities endpoint.

### Placeholder routes
- [ ] Placeholder pages display clear read-only badges/messages.
- [ ] Placeholder routes do not issue unsupported API calls.

### Test commands
- [ ] `npm run test` passes.
- [ ] `npm run test:coverage` passes.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes.

## 5) Self Unit Test Plan (Critical Functions)

### Session and auth control
- Function: `SessionProvider.refreshSession`
  - Validate student-first session resolution, then management fallback.
  - Validate `initialized/loading` transitions and null session behavior.
- Function: `SessionProvider.setSuperuserMode`
  - Validate staff-only toggle to `superuser-ui`.
  - Validate localStorage mode key read/write behavior.
- Function: `SessionProvider.signOut`
  - Validate both service signout calls and local cleanup.

### Routing/guard control
- Function: `RoleProtectedRoute`
  - Validate loading gate, unauth redirect, authorized render, unauthorized redirect.
- Function: `LegacyRedirect`
  - Validate canonical mapping from legacy URLs.

### API normalization and client wrappers
- Function: `normalizeEnvelope` and core mappers
  - Validate success/failure envelope parsing and shape coercion.
- Function: `httpClient.request`
  - Validate JSON body parse, error text fallback, and network failure fallback.
- Function: `applicationsService` wrappers
  - Validate endpoint paths and error propagation for list/detail/review/submit.

### Feature hooks (critical UX state)
- Function: `useApplicationFlowData`
  - Validate draft save sequence, submit path, step transitions, and error surfacing.
- Function: `useUniversitySearchData`
  - Validate initial load, query-driven search, and list replacement.
- Function: `useAsyncState`
  - Validate success and failure state transitions for reusable async state.

