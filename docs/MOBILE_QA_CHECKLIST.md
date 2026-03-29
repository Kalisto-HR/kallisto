# Kallisto Mobile QA Checklist

Primary viewport: `390x844`

Tight viewport spot-check: `360x800`

## Global checks for every route

- No horizontal body scroll.
- Header content stays inside viewport.
- Primary actions are visible and tappable.
- Text does not clip, overlap, or render off-screen.
- Drawers, sheets, dialogs, and dropdowns open and close correctly.
- Sticky headers or footers do not cover interactive content.
- Desktop tables either collapse into cards or stay inside a local horizontal scroll container.

## Auth routes

### `/auth/sign-in`

- Session-expired banner wraps without overflow.
- Form fields and button remain fully visible with keyboard open.
- Role-based redirect after successful sign-in does not flash the wrong shell.

### `/auth/sign-up`

- Name fields stack correctly on phone.
- Password and submit sections do not overflow.

### `/auth/forgot-password`

- Form card stays centered and contained.
- Success and error alerts wrap correctly.

### `/auth/reset-password`

- Unavailable-state messaging and return link fit inside the viewport.

## Applicant routes

### `/applicant/dashboard`

- Top stats collapse to one column.
- Readiness card rows wrap cleanly.
- Recent application actions do not overflow.

### `/applicant/universities`

- Search bar and header actions stack correctly.
- Mobile filters open in sheet mode.
- Result cards remain single-column and tap-friendly.

### `/applicant/universities/:id`

- Hero section stacks.
- CTA buttons wrap or fill width cleanly.
- Tabs remain usable via horizontal scroll without clipping.

### `/applicant/basket`

- Basket items stack vertically.
- Plan selection and proceed actions remain visible.
- Summary blocks do not create side scroll.

### `/applicant/applications`

- List cards stack cleanly.
- Draft and submitted action buttons stay reachable.

### `/applicant/applications/new/:universityId`

- Step header remains readable.
- Form rows collapse to one column.
- Footer navigation and autosave status do not overlap.

### `/applicant/applications/:universityId/:cycle`

- Summary metadata stacks.
- Submitted field sections stay single-column.
- Nested cards do not clip labels or values.

### `/applicant/compare`

- Mobile card comparison layout renders instead of desktop table.
- Remove and compare actions remain reachable.

### `/applicant/settings`

- Tabs stay usable through horizontal scroll.
- Test score form rows stack correctly.
- Save actions remain visible.

## Partner routes

### `/partner/:universityId/dashboard`

- Overview cards collapse cleanly.
- Recent applications use mobile-friendly card layout.

### `/partner/:universityId/profile`

- Form sections stack correctly.
- Save actions wrap cleanly.

### `/partner/:universityId/application-structure`

- Sections list renders above active editor on phone.
- Edit controls remain reachable.
- Drawers and dialogs for field settings and templates remain usable.

### `/partner/:universityId/applications`

- Mobile applicant cards render instead of desktop-only table.
- Filter sheet works and detail drawer remains usable.
- No review or decision actions are shown.

## Staff routes

### `/staff/dashboard`

- Top metrics collapse to one column.
- Secondary grids wrap without overflow.

### `/staff/universities`

- Mobile university cards render cleanly.
- Filters and actions wrap correctly.

### `/staff/service-logs`

- Mobile log cards render cleanly.
- Filters stay inside viewport.

### `/staff/audit-logs`

- Mobile audit cards render cleanly.
- Detail modal stays usable on phone.

### `/staff/settings`

- Settings sections stack correctly.
- Any tab or section navigation stays reachable.

## Forbidden and not-found behavior

Verify these routes fail cleanly on mobile and do not flash protected content:

- `/`
- `/applicant/dashboard` while signed out
- `/partner/any/dashboard` while signed in as `applicant` or `staff`
- `/staff/dashboard` while signed in as `applicant` or `partner`
- any applicant route while signed in as `partner` or `staff`
- any partner route while signed in as `applicant` or `staff`
- any staff route while signed in as `applicant` or `partner`

## Sign-off

- `390x844` pass completed.
- `360x800` spot-check completed for all high-risk routes.
- No remaining horizontal body scroll issues.
- No blocked primary actions on mobile.
