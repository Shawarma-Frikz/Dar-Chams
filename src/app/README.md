# Application routes

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Phase | 01 (task 01.6); real screens from phase 08 |
| Framework | Next.js 16 App Router, React 19, static export (DEC-032) |
| Checked by | `npm run typecheck`, `npm run lint`, `npm run build` |
| Decisions | DEC-025, DEC-032 |

## Purpose

`src/app` is the route shell: one layout, six addresses and a not-found page, exported as static
files. It exists so the structure, the requirement mapping and the visual charter can be reviewed
before the engine has physics. It is not a dashboard yet: every screen names its planned contents and
displays no value, because a number without a provenance class and a source would be decoration
(NFR-07).

## Inputs

- [`src/lib/routes.ts`](../lib/routes.ts) — `PRIMARY_ROUTES`, the single list behind both the header
  navigation and the overview index.
- [`src/lib/config/startup.ts`](../lib/config/startup.ts) — `CONFIGURATION`, resolved at module load
  in `layout.tsx`, so an invalid boot scenario stops the build rather than rendering a page.
- `src/app/globals.css` — the Tailwind CSS 4 `@theme` tokens carrying the graphic-charter palette and
  type scale.
- `layout.tsx` — metadata, self-hosted Literata and DM Sans through `next/font`, and the
  `data-motion` attribute taken from the resolved presentation setting.

The routes do not read the scenario, the engine or any storage directly; anything they will display
arrives from the modules built in later phases.

## Outputs

| Output | Where it comes from |
| --- | --- |
| `/` overview | `page.tsx` — build state, route index, non-goals, provenance note |
| `/twin`, `/energy`, `/forecasts`, `/analytics`, `/scenarios` | One `page.tsx` each, rendering `PlannedScreen` |
| 404 page | `not-found.tsx` |
| Static export in `out/` | `next.config.ts` with `output: 'export'`, `trailingSlash` and unoptimised images |
| `<html data-motion="system">` | The only configuration value the client receives; Ajv does not enter the bundle |

The build writes seven static pages — six routes plus the not-found document — with fonts included,
so the export opens with the network disabled (NFR-02).

## Tests

```text
npm run typecheck
npm run lint
npm run build
npm run preview
```

- `npm run typecheck` compiles every route under the strict base configuration.
- `npm run lint` applies the Next.js flat config and the engine-boundary rule.
- `npm run build` is the structural test: a route that fails to compile, imports the engine's
  browser-forbidden surface or breaks the static export fails here. The 01.5 chain also runs the
  production build last, so a red gate never produces an artefact.
- `npm run preview` serves the real export on port 4173; `scripts/serve-static.mjs` resolves paths
  inside `out/` and refuses traversal. It is a manual check, not a gate.

**Not covered yet.** There is no browser automation and no interaction test. Playwright arrives in
phase 08 with the screens that have behaviour (DEC-017); today the only client component is the
navigation, which changes an `aria-current` attribute.

## Layout

| Path | Role |
| --- | --- |
| `layout.tsx` | Metadata, fonts, header, main landmark, footer, startup resolution |
| `page.tsx` | Overview: status cards, six-route index, non-goals, provenance note |
| `twin/page.tsx`, `energy/page.tsx`, `forecasts/page.tsx`, `analytics/page.tsx`, `scenarios/page.tsx` | Planned screens |
| `not-found.tsx` | Static 404 |
| `globals.css` | Tailwind import, palette and type tokens, base styles |
| `icon.svg` | Application icon |
