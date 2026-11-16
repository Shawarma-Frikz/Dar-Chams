# Presentational components

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Phase | 01 (task 01.6) |
| Runtime | React 19 server components, except the navigation |
| Checked by | `npm run typecheck`, `npm run lint`, `npm run build` |
| Decisions | DEC-025, DEC-032 |

## Purpose

`src/components` holds the small, shared building blocks used by the route shell: the Dar Chams
wordmark and doorway-and-sun mark, the header, the
primary navigation, the page intro, the planned-item list and the reference list. They render what
they are given and own no application state. They are not a design system: a component earns its
place here only when two routes need it, and a component that needs the engine belongs to the module
that has the engine.

## Inputs

- **Props only**, declared next to each component. `PageIntro` takes an eyebrow, title, lede, phase
  and references; `PlannedItems` takes a list of `{ title, detail, refs? }`; `RefList` takes the
  identifier strings to render.
- `PRIMARY_ROUTES` is the one context-like input: `SiteNav` reads it to build the navigation, and
  `usePathname()` supplies the current route. It is the only client component (`'use client'`).
- Tailwind theme tokens and utility classes; no inline palette values. The mark and colour palette
  follow [the identity charter](../../docs/identity.md) (DEC-041).

No component fetches data, reads storage or imports `@dar-chams/engine`.

## Outputs

- Semantic markup: a `header` with an accessible name, a `nav` with `aria-label="Primary"`, one `h1`
  per page, lists rather than styled `div`s where the content is a list.
- `aria-current="page"` on the active navigation entry, so state is conveyed by more than colour
  (NFR-08).
- Non-breaking requirement identifiers: `RefList` keeps `FR-TWN-03` whole and puts the only break
  opportunity between references, so a narrow viewport cannot split an identifier.

## Tests

```text
npm run typecheck
npm run lint
npm run build
```

These are the gates available at phase 01: the components must compile under strict TypeScript, pass
the Next.js lint configuration, and build into the static export. There is no component test yet —
no React Testing Library was adopted, because the components are static and a test would assert the
markup against itself.

**Not covered yet.** The first behavioural tests arrive with Playwright in phase 08, together with
the interactive twin and the controls that need testing (DEC-017). At that point the navigation's
active state and the reduced-motion behaviour become testable requirements rather than review
notes.

## Layout

| Path | Role |
| --- | --- |
| `site-header.tsx` | Brand mark, product label and navigation |
| `site-nav.tsx` | The only client component: active route and `aria-current` |
| `page-intro.tsx` | Eyebrow, title, lede, phase and requirement references |
| `planned-items.tsx` | Numbered list of planned contents |
| `planned-screen.tsx` | Page intro plus the planned-contents section, shared by five routes |
| `ref-list.tsx` | Non-breaking identifier list |
