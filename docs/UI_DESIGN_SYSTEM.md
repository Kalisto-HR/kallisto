# Kallisto UI Design System

## Principles

- Kallisto should feel calm, practical, and credible for students, parents, university staff, and administrators.
- Operational pages prioritize scanning and completion over visual spectacle.
- The brand color is green. Supporting colors are neutral and semantic, not decorative.
- Use text, spacing, and clear grouping before badges, shadows, or animation.

## Color Tokens

- Page background: warm neutral, not pure white.
- Surface: slightly warmer card background for panels and tables.
- Elevated surface: used sparingly for modal-like or priority panels.
- Primary action: Kallisto green.
- Supporting accent: muted green/teal only for selected state and gentle highlights.
- Success, warning, error, and info are used only for meaningful state.
- Focus ring: visible green ring with enough contrast.

## Shape

- Compact controls: small-to-medium radius.
- Cards and panels: medium radius.
- Major branded landing panels: larger radius when helpful.
- Avoid repeated `rounded-2xl`/`rounded-3xl` on every block.

## Shadows

- Default cards should rely on border and background.
- Shadows are reserved for top-level floating surfaces, dropdowns, dialogs, and major landing preview panels.
- Avoid glow effects and deep arbitrary shadows on routine controls.

## Typography

- Use the existing sans-serif stack; it supports English, Russian Cyrillic, and Uzbek Latin.
- Page titles: clear and medium weight.
- Section titles: smaller and restrained.
- Card titles: compact, not hero-sized.
- Metadata: readable muted text; avoid excessive uppercase.

## Motion

- Use short transitions for hover/focus feedback.
- Avoid continuous animations on operational pages.
- Respect `prefers-reduced-motion`.

## Component Direction

- Buttons: clear focus/hover/disabled states, fewer shadows, stable heights.
- Cards: consistent medium radius, border-first structure.
- Badges: compact semantic indicators, not decoration for every fact.
- Forms: readable labels, concise helper text, visible disabled dependencies.
- Tables: sticky headers or first columns where practical, horizontal scroll on small screens.
- Empty/error/loading states: helpful and calm, no visual drama.

## Page Patterns

- Applicant search: filter panel plus scannable result cards with high-value facts only.
- Compare: matrix layout, sticky criteria/university names, subtle difference highlights.
- Match Score: trustworthy score explanation, Premium gate preserved.
- Billing: separate application credits from Premium entitlement and use UZS formatting.
- University Manager: structured tables/lists for application scanning.
