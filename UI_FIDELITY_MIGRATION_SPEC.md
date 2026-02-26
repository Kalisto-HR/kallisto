# UI Fidelity Migration Spec

## Purpose
This document is the source of truth for migrating UI/UX from this repository (`kallisto_design_v60/src`) into another project that already has backend and middleware.

Goal: preserve the same UI structure and behavior while replacing demo data and mock navigation with real backend integration.

## Scope
- Source UI donor: `src/`
- Target: existing backend-enabled project (router, auth, API already present or planned)
- Required outcome: visual and interaction parity for migrated pages

## Non-Negotiable Rules
1. Do not redesign layouts, spacing, typography, colors, or component hierarchy.
2. Reuse source components and class names where possible. Prefer adapter logic over JSX rewrites.
3. Keep UI and data integration separate:
- UI components stay presentational.
- Hooks/services connect to backend.
4. Do not use `src/app/data/sampleData.ts` at runtime.
5. Do not use `src/app/App.tsx` state-based navigation in production. Map UI into target router.
6. Any visual deviation requires explicit approval.

## UI Source of Truth (Must Reuse)
- Design tokens and global styles:
  - `src/styles/index.css`
  - `src/styles/tailwind.css`
  - `src/styles/theme.css`
- Core student shell:
  - `src/app/components/Header.tsx`
  - `src/app/components/Sidebar.tsx`
  - `src/app/components/student/StudentDashboardDefault.tsx`
- Shared primitives:
  - `src/app/components/ui/*`
- App/page contracts:
  - `src/app/types/index.ts`

## What To Replace (Backend Integration Only)
- Replace all sample/mock data reads with API-backed hooks/services.
- Replace local role/session stubs with real auth/session state.
- Replace mock onClick navigation with router navigation.
- Keep rendered markup and styling behavior equivalent.

## Migration Sequence (Required Order)
1. Foundation
- Install and configure dependencies required by source UI primitives.
- Wire Tailwind and token CSS exactly.
- Verify base visual theme matches source.

2. Shell Parity
- Implement top header + left sidebar shell for student routes to match source.
- Match spacing, card radius, borders, typography scale, and icon usage.

3. Page Porting
- Port page JSX from source first, then connect data via hooks.
- Do not refactor page layout while wiring backend data.

4. Data Adapters
- Add mapper layer for backend response normalization.
- Keep UI-facing data shape stable to avoid component churn.

5. Access and Routing
- Use target router/auth guards.
- Preserve page-level affordances and CTA destinations from source UX.

6. QA and Sign-off
- Run visual and behavior checks below.
- Fix diffs before merge.

## Visual Fidelity Acceptance Gates
A migration PR fails if any of the following are true:
1. Header/sidebar layout differs from source shell.
2. Dashboard composition differs from source (card grid, sections, order, spacing).
3. Color tokens differ from `theme.css`.
4. Typography scale/weights differ materially.
5. Primary/secondary button styles differ materially.

## Required Visual QA (Per Migrated Page)
1. Capture baseline screenshot from source UI.
2. Capture screenshot from target UI at same viewport.
3. Compare:
- Desktop: 1440x900
- Mobile: 390x844
4. Accept only if visual diff is within agreed threshold (recommended <= 2%).
5. Manually verify:
- hover/focus/active states
- loading/empty/error states
- sidebar active item styling
- card spacing and border consistency

## Functional QA (Minimum)
1. All CTAs navigate to intended route.
2. No runtime dependency on `sampleData.ts`.
3. Loading and error states are shown for API-backed screens.
4. Role-restricted pages are guarded by real auth logic.

## Explicit Do/Do-Not List
Do:
- Copy source JSX and styles first, then connect real data.
- Use adapter/mappers to fit backend contract.
- Preserve component boundaries.

Do not:
- Rebuild pages from scratch.
- Swap shell pattern (for example, replacing sidebar layout with top-nav-only layout).
- Introduce a new design system for migrated pages.
- Change naming, hierarchy, or spacing without approval.

## PR Checklist (Must Include)
1. Source files used for each migrated page.
2. Route mapping (source view -> target route).
3. API mapping (source mock field -> backend field).
4. Before/after screenshots for desktop and mobile.
5. List of any approved deviations.

## Suggested Handoff Prompt for Another Agent
```txt
Migrate UI from `kallisto_design_v60/src` into the target project with 1:1 visual fidelity.
Follow `UI_FIDELITY_MIGRATION_SPEC.md` as binding requirements.

Hard rules:
- No redesign. Reuse source shell/components/classNames.
- Replace only data/auth/navigation wiring with backend-aware adapters.
- Do not use sampleData at runtime.
- PR must include screenshot parity evidence and pass visual acceptance gates.
```

