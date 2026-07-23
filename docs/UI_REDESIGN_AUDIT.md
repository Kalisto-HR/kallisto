# Kallisto UI Redesign Audit

## Current Visual Problems

- The product has a solid green brand direction, but the visual language leans too decorative for operational admissions work: radial backgrounds, blur, heavy custom shadows, and repeated rounded cards make screens feel generated rather than designed.
- Functional pages use similar card treatments for everything, so hierarchy is weak. A dashboard metric, a form section, a search result, and a warning often look similarly important.
- Radius and shadows are inconsistent. Shared primitives use `rounded-xl`, while page-level code uses `rounded-2xl`, arbitrary radii, and custom shadows.
- Some functional labels use generic AI language or sparkle icons, especially around discovery and billing. This makes serious admissions tools feel less credible.
- Search filters and university cards show useful information, but the spacing and hierarchy do not strongly support scanning many universities.
- The billing page mixes credits, Premium, order history, and metrics in a way that is technically correct but visually less clear than the business model.
- Landing content is credible but still relies on repeated feature-card grids and decorative product-preview treatment.
- Some legacy style files (`global.css`) contain old color rules and class names that are not imported now, but they create confusion for future maintainers.
- There are visible mojibake characters in billing strings (`Â·`) from earlier encoding issues.

## Repeated Or Inconsistent Components

- `Card` applies a branded panel style globally, causing nearly all surfaces to become elevated panels.
- Buttons use strong shadows for default/destructive states and `transition-all`, making controls more polished than practical.
- Inputs/selects have inset highlights and large radius by default, making dense forms feel soft and less precise.
- Badges are overused for ordinary facts such as availability and metadata.
- Sidebar items use pill-like active states; the active page is clear, but the treatment is heavy for navigation.
- Empty/loading/error states are visually distinct but rely on card-like rounded blocks and heavy shadows.

## Pages With Highest UX Impact

1. Applicant university discovery: search, filters, card hierarchy, compare/basket actions.
2. University detail: application actions, Match Score, admissions facts.
3. Applicant dashboard: profile readiness, credits, draft/submitted status.
4. Applicant billing: application credits vs Premium, current balance, transparent UZS pricing.
5. Compare page: readable matrix and sticky names.
6. University Manager applications and application structure: scanning, builder settings, application review workspace.
7. Landing page: credibility and less generic SaaS composition.

## Proposed Design Direction

- Restrained education-product UI: warm neutral background, green primary action, muted teal accent, semantic status colors.
- Use borders, spacing, and type weight before shadows.
- Reduce radius levels: compact controls use small/medium radius; cards use a consistent medium radius; large radius only for branded landing sections.
- Make operational pages denser and more scannable without becoming cramped.
- Remove unnecessary AI/sparkle presentation from workflow pages.
- Keep product language grounded: "based on your profile" instead of magical or random AI wording.
- Preserve existing routes, backend contracts, authentication, Premium gating, Match Score logic, billing rules, comparison behavior, and application flow.

## Components That Can Be Improved Safely

- Shared primitives: button, card, badge, alert, input, select, textarea, skeleton.
- Shared brand utilities in `brand.css`: shell, sidebar, topbar, icon tile, active nav, info banner.
- Applicant shell spacing and navigation density.
- University search filter panel and result cards.
- Match Score card presentation.
- Billing cards and Premium panel.
- Landing section card/radius/shadow usage.

## Files Expected To Change

- `frontend/src/styles/theme.css`
- `frontend/src/styles/brand.css`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/card.tsx`
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/components/ui/alert.tsx`
- `frontend/src/components/ui/input.tsx`
- `frontend/src/components/ui/select.tsx`
- `frontend/src/components/ui/textarea.tsx`
- `frontend/src/components/common/PageState.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/layout/ApplicantShell.tsx`
- `frontend/src/components/layout/PortalShell.tsx`
- `frontend/src/pages/applicant/UniversitySearchPage.tsx`
- `frontend/src/components/applicant/KallistoMatchScoreCard.tsx`
- `frontend/src/pages/applicant/ApplicantDashboardPage.tsx`
- `frontend/src/pages/applicant/ApplicantBillingPage.tsx`
- `frontend/src/pages/LandingPage.tsx`
- `frontend/src/components/university/PortalApplicantsList.tsx`
- `frontend/src/components/university/ApplicationStructure.tsx`

## Risks And Functionality To Preserve

- Do not change API contracts, route paths, auth/session logic, billing business rules, comparison limits, Match Score gating, application submission, or database models.
- Partner/staff workflows must keep existing controls enabled and connected.
- Responsive tables must keep horizontal scrolling where needed.
- Dynamic university content remains database-owned; design changes must not invent partnerships, rankings, testimonials, or fake metrics.
- Changes must be verified with lint, tests, build, and local Docker frontend rebuild.
