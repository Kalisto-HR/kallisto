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

- Portal cards stack vertically.
- Card CTA buttons stay full-width and readable.
- Footer note wraps cleanly.

### `/auth/sign-in/student`

- Session-expired banner wraps without overflow.
- Form fields and button remain fully visible with keyboard open.

### `/auth/sign-in/management`

- Session-expired banner wraps without overflow.
- Error state and back-link remain visible on narrow screens.

### `/auth/sign-up`

- Name fields stack correctly on phone.
- Password and submit sections do not overflow.

### `/auth/forgot-password`

- Form card stays centered and contained.
- Success and error alerts wrap correctly.

### `/auth/reset-password`

- Reset form and token state messages fit inside the viewport.

## Student routes

### `/student/dashboard`

- Top stats collapse to one column.
- Readiness card rows wrap cleanly.
- Recent application actions do not overflow.

### `/student/universities`

- Search bar and header actions stack correctly.
- Mobile filters open in sheet mode.
- Result cards remain single-column and tap-friendly.

Spot-check at `360x800`.

### `/student/universities/:id`

- Hero section stacks.
- CTA buttons wrap or fill width cleanly.
- Tabs remain usable via horizontal scroll without clipping.

### `/student/basket`

- Basket items stack vertically.
- Plan selection and proceed actions remain visible.
- Summary blocks do not create side scroll.

Spot-check at `360x800`.

### `/student/applications`

- List cards stack cleanly.
- Draft/submitted action buttons stay reachable.

### `/student/applications/new/:universityId`

- Step header remains readable.
- Form rows collapse to one column.
- Footer navigation and autosave status do not overlap.

Spot-check at `360x800`.

### `/student/applications/:universityId/:cycle`

- Summary metadata stacks.
- Submitted field sections stay single-column.
- Nested cards do not clip labels or values.

### `/student/compare`

- Mobile card comparison layout renders instead of desktop table.
- Remove/compare actions remain reachable.

Spot-check at `360x800`.

### `/student/settings`

- Tabs stay usable through horizontal scroll.
- Test score form rows stack correctly.
- Save actions remain visible.

Spot-check at `360x800`.

### `/student/help`

- Help cards and CTA rows stack cleanly.
- Long copy wraps without clipping.

### `/student/billing`

- Billing summary cards stack.
- Invoice history is readable on mobile.

### `/student/checkout`

- Checkout form uses single-column layout.
- Order summary stacks below content on phone.
- CTA remains reachable without side scroll.

## Management routes

### `/management/:universityId/dashboard`

- Overview cards collapse cleanly.
- Recent applications use mobile-friendly card layout.

### `/management/:universityId/profile`

- Form sections stack correctly.
- Save actions wrap cleanly.

### `/management/:universityId/application-structure`

- Sections list renders above active editor on phone.
- Edit controls remain reachable.
- Drawers/dialogs for field settings and templates remain usable.

Spot-check at `360x800`.

### `/management/:universityId/applications`

- Mobile applicant cards render instead of desktop-only table.
- Filter sheet works and detail drawer remains usable.

Spot-check at `360x800`.

### `/management/:universityId/users`

- Staff cards render on phone.
- Invitations render as cards on phone.
- Action menus remain reachable inside viewport.

### `/management/:universityId/billing`

- Package cards stack.
- Invoice history remains readable.
- Purchase modal fits and actions remain visible.

### Access denied state

- Error card and return action stay centered and readable.

## Superuser routes

### `/management/global/overview`

- Top metrics collapse to one column.
- Secondary grids wrap without overflow.

Spot-check at `360x800`.

### `/management/global/universities`

- Mobile university cards render cleanly.
- Filters and actions wrap correctly.

Spot-check at `360x800`.

### `/management/global/drafts`

- Draft list cards stay readable.
- Filter controls stack correctly.

### `/management/global/applications`

- Filters and summary stats stack.
- Detail sections remain readable on phone.

Spot-check at `360x800`.

### `/management/global/users`

- Mobile user cards render instead of relying on a wide table.
- Header actions remain reachable.

Spot-check at `360x800`.

### `/management/global/service-logs`

- Mobile log cards render cleanly.
- Filters stay inside viewport.

Spot-check at `360x800`.

### `/management/global/audit-logs`

- Mobile audit cards render cleanly.
- Detail modal stays usable on phone.

### `/management/global/settings`

- Settings sections stack correctly.
- Any tab or section navigation stays reachable.

## Legacy redirects

Verify these still route correctly on mobile and do not flash broken legacy layouts:

- `/`
- `/signin`
- `/signup`
- `/dashboard`
- `/search`
- `/applications`
- `/applications/:universityId/:cycle`
- `/applications/:universityId/:cycle/edit`
- `/university/:id`
- `/management`
- `/superuser/overview`
- `/superuser/universities`
- `/superuser/drafts`
- `/superuser/applications`
- `/superuser/users`
- `/superuser/service-logs`
- `/superuser/audit-logs`
- `/superuser/settings`

## Sign-off

- `390x844` pass completed.
- `360x800` spot-check completed for all high-risk routes.
- No remaining horizontal body scroll issues.
- No blocked primary actions on mobile.
