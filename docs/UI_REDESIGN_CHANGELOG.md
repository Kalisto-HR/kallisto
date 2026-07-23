# Kallisto UI Redesign Changelog

## Changed Pages

- Applicant university search: removed the decorative AI-match action, softened result cards, normalized filter controls, and aligned price slider styling with Kallisto tokens.
- Applicant billing: replaced decorative premium iconography with entitlement-oriented lock/check visuals and cleaned payment metadata separators.
- Partner application structure: replaced sparkle publish actions with explicit publish/check actions and reduced floating action button decoration.
- Staff universities: normalized university type badges and container radii to the shared product UI style.

## Changed Shared Components

- Global theme tokens: tightened heading line heights, reduced default radius, and aligned input border tokens.
- Brand shell utilities: reduced radial gradients, blur, heavy panel shadows, and oversized radii.
- UI primitives: refined button, card, badge, input, textarea, alert, loading, empty, error, unavailable, and success states.
- Match Score card: kept the real score logic while reducing decorative gradients and shadows.

## Design Decisions

- Use a restrained admissions-product direction instead of a decorative SaaS template.
- Keep the green brand identity but reduce gradients, shadows, blur, and excessive radius.
- Preserve all route paths, API contracts, Premium gating, Match Score logic, comparison limits, application flow, and billing business rules.

## Functionality Intentionally Preserved

- Authentication/session handling.
- Applicant profile gating and application draft flow.
- University search filters and comparison behavior.
- Match Score calculation and Premium locked state.
- Billing product prices and entitlement logic.
- Partner and staff route structure.

## Verification Commands And Results

- `npm.cmd run lint`: passed. ESLint reported only the existing `baseline-browser-mapping` freshness notice.
- `npm.cmd run build`: passed. Vite reported the existing large chunk warning.
- `npm.cmd run test`: passed. 43 test files and 126 tests passed. Existing React Router future-flag/chart/test `act(...)` warnings remain.
- Docker frontend rebuild: passed. `kallisto-ver2-frontend-1`, `kallisto-ver2-backend-1`, and `kallisto-ver2-postgres-1` are running and healthy.

## Remaining Recommendations

- Continue replacing legacy one-off hex color surfaces in staff pages with shared tokens.
- Localize remaining hardcoded partner builder labels in a separate translation-only pass.
- Consider deleting `frontend/src/styles/global.css` after a dedicated dead-code check, because it is not imported and contains outdated visual rules.
