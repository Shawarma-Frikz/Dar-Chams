# Runtime, browser and hardware support

| Field | Value |
| --- | --- |
| Version | 1.12.0 |
| Date | 2026-11-16 |
| Phase | 01 (tasks 01.2–01.6), 02.1–02.7; v1.5.0 corrects the pin after the first CI run (DEC-036); v1.6.0 records the tenth check; v1.7.0 records the unit check and 53 tests; v1.8.0 records the balance check and 65 tests; v1.9.0 records the 02.4 ports and 67 tests; v1.10.0 records the deterministic clock and 74 tests; v1.11.0 records the event journal and 82 tests; v1.12.0 records numerical guards and 85 tests |
| Decided by | DEC-031 (supersedes the Node version pin in DEC-018), version numbers superseded by DEC-036; the installed stack by DEC-032; the validator and module policy by DEC-033; the gates and CI matrix by DEC-034; the documentation check by DEC-035 |
| Checked by | `node scripts/check-runtime.mjs`, or `npm run check` for all checks |
| Related | [Conventions](conventions.md) §7 · [Acceptance checklist](acceptance-checklist.md) AC-18, AC-17 · [Scope brief](00-scope-brief.md) |

Task 01.2 asks for three things: a supported Node LTS with a pinned package manager, dependencies pinned by a lockfile, and a recorded browser and hardware baseline. This document records all three and names the check that enforces the first two, so the baseline is not merely a sentence in a README.

---

## 1 · What is pinned

| Item | Value | Where | Enforced by |
| --- | --- | --- | --- |
| Node | 26.13.1, the Active LTS "Lithium" patch (released 2026-11-10) | [`.nvmrc`](../.nvmrc) | `.nvmrc` must equal the declared line and satisfy `engines` |
| Node range | `>=26.0.0 <27` | [`package.json`](../package.json) `engines.node` | `engine-strict=true` refuses any other major line |
| npm | 11.20.0 exactly, the npm bundled with that Node release | `package.json` `packageManager` | check fails on any other installed version |
| npm range | `>=11.20.0 <12` | `engines.npm` | `engine-strict=true` |
| Dependency policy | exact versions only, no `^`, `~`, `*`, `latest`, `workspace:` or URL specs | `.npmrc` `save-exact=true` | the checker rejects a floating spec in any dependency block |
| Install path | `npm ci` from the committed lockfile | [`package-lock.json`](../package-lock.json), lockfile v3 | `npm ci` refuses a lockfile that disagrees with the manifest |
| Lockfile hygiene | committed, reviewed like code | `.gitignore` keeps the rest of `node_modules/` out | check fails if the lockfile is missing, old, or out of sync |
| Workspace pin | `packages/engine` repeats `engines.node` and the exact-version policy | [`packages/engine/package.json`](../packages/engine/package.json) | check fails on a different pin, a public workspace package or a missing lockfile entry |
| Override | `minimatch` 11.0.8 under `@typescript-eslint/typescript-estree` | `package.json` `overrides` | check fails on a floating override or one the lockfile does not contain |

**Rules that follow from the pin.**

- A clean clone installs with `npm ci` and never with a bare `npm install`; `npm install` is used only when deliberately adding or upgrading a dependency.
- Adding a dependency writes an exact version and updates the lockfile in the same commit, with the reason in the commit body.
- Changing a Node line is a decision-log entry plus a re-tested clean install. It is never an edit to `engines` alone.
- `npm` warns on peer-dependency conflicts rather than failing; the engine check is the hard gate, and a warning that matters is resolved by pinning, not ignored.

**Verified on 2026-11-16, Windows 11.** A directory containing only `package.json`, `package-lock.json`, `.npmrc` and `.nvmrc` installed with `npm ci` and exit code 0. The same directory with `engines.node` raised to `>=99.0.0 <100` was refused with `EBADENGINE` and exit code 1 — the pin fails closed, as intended.

Repeated once the full 01.3 stack was in place: `npm ci` installed 366 packages with 0 vulnerabilities, then `npm run verify` (six checks, type-check, lint, format) and a from-scratch `npm run build` both exited 0. The built export served all six routes with 200, a missing path with 404, and carried its eight self-hosted font files. Re-run after 01.4 with the validator installed and the seventh check added: `npm run verify` and `npm run build` again exit 0, and the export still serves every route. Re-run after 01.5 with tests and the eighth check: `npm ci` installs 398 packages and audits 406 with 0 vulnerabilities, `npm run verify` runs eight checks, four code gates, 22 tests and the production build, and exits 0. Re-run after 01.6 with the documentation check: `npm run verify` runs nine checks, four code gates, 22 tests and the production build, and exits 0. Re-verified at the corrected pin on 2026-11-16: `npm ci` with npm 11.20.0 installs 398 packages and audits 406 with 0 vulnerabilities, the lockfile diff being the root `engines` entry alone, and `npm run verify` again runs nine checks, four code gates, 22 tests and the build, exiting 0 with `runtime: OK` reporting npm 11.20.0 against `packageManager "npm@11.20.0"`. The first CI run had failed at `npm ci` because Node 26.2.0 bundles npm 11.13.0 and `engine-strict` refused it before any gate; DEC-036 moves the pin to the LTS patch that ships the declared npm. Re-run after 02.1 with the time base and the tenth check: under npm 11.20.0, `npm run check` passes ten checks, and type-check, lint, format check, 47 tests and the production build each exit 0; the overview was captured at 1366 px and in a 390 px iframe with no horizontal overflow. Re-run after 02.2 with the canonical units and the eleventh check: `npm run check` passes eleven checks, including the type guard that compiles `scripts/fixtures/unit-guard.ts` with the installed TypeScript, and type-check, lint, format check, 53 tests and the production build each exit 0; the overview was captured again at 1366 px and in a 390 px iframe with no horizontal overflow. Re-run after 02.3 with the energy ledger and the twelfth check: `npm run check` passes twelve checks, and type-check, lint, format check, 65 tests and the production build each exit 0; the overview was captured again at 1366 px and in a 390 px iframe with no horizontal overflow.

**Where the gates run.** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs the same six steps on `ubuntu-latest` and `windows-latest`, with Node taken from `.nvmrc` and dependencies installed with `npm ci`. The workflow is part of the repository and is itself checked: `scripts/check-ci.mjs` parses it and fails if a gate disappears, an action is referenced by tag instead of commit, or a command swallows its failure. The design and its limits are recorded in [quality gates](quality-gates.md) and DEC-034.

The application dependencies arrive with the phases that need them. Installed at 01.3–01.5, all exact and recorded in the lockfile: Next.js 16.4.6, React 19.3.1 and React DOM 19.3.1; TypeScript 5.9.3, `@types/node` 26.6.6 and the React type packages; ESLint 9.39.5 with `eslint-config-next` 16.4.6 and `eslint-config-prettier` 10.1.8; Prettier 3.10.1 with `prettier-plugin-tailwindcss` 0.8.1; Tailwind CSS 4.3.5 with `@tailwindcss/postcss` 4.3.5; Ajv 8.20.0 with `ajv-formats` 3.0.1 for the scenario contract; Vitest 5.1.0 and fast-check 4.10.2 for the unit and property tests (DEC-017). Recharts, React Three Fiber and Playwright arrive in phases 04–08, each pinned the same way.

**Why Node runs the TypeScript source.** The scenario validator lives in the engine so that the app, `scripts/validate-scenarios.mjs` and `scripts/check-config.mjs` execute one implementation. Node 26 strips types natively, which requires three settings rather than a build step: the root `package.json` declares `"type": "module"`, `tsconfig.base.json` sets `allowImportingTsExtensions` and `erasableSyntaxOnly`, and intra-workspace imports name the `.ts` file. Enums, namespaces and parameter properties are therefore unavailable in the engine — `erasableSyntaxOnly` rejects them at type-check time instead of letting a runtime failure appear first. Next.js transpiles the same sources for the browser, so the app needs no separate package build.

**Why Ajv 8.20.0.** Ajv is the reference draft 2020-12 implementation and consumes `scenario.schema.json` unchanged, so the frozen contract (DEC-021) stays the single definition. Version 8.17.1 carries GHSA-2g4f-4pwh-qvx6, a ReDoS through `$data`; 8.20.0 is the first line that resolves it, and `npm audit` is clean on the full tree. The validator is imported only by startup and by Node scripts, so neither Ajv nor the schema reaches the client bundle.

**Why TypeScript 5.9 and not 7.** `typescript-eslint`, which carries the Next.js lint rules, peers on `typescript >=4.8.4 <6.1.0` at the versions installed. A TypeScript 7 compiler would leave lint unsupported. **Why ESLint 9 and not 10.** `eslint-plugin-react` and `eslint-plugin-jsx-a11y`, pulled in by `eslint-config-next`, peer on `eslint ^9`. Both gaps are recorded in DEC-032 and close when the plugins widen their ranges; until then the newest supported pair is the pinned one. npm prints a deprecation notice for ESLint 9.39.5 as the older line, which is expected rather than an error.

**Why the override exists.** `@typescript-eslint/typescript-estree` 8.72.2 depends on `minimatch` 10.2.6, which carries seven moderate advisories. `npm audit` reports them as dev-only; `npm audit --omit=dev` is clean. The override moves only that chain to `minimatch` 11.0.8, and the lockfile proves the resolved version. Remove the override when the dependency itself moves to 11.

## 2 · Install commands

```powershell
git clone https://github.com/Shawarma-Frikz/Dar-Chams.git
cd Dar-Chams
npm ci
npm run check
```

- On Windows, `npm` may be blocked by PowerShell execution policy (DEC-018); use `npm.cmd`, or run the same commands in Git Bash.
- `npm run check` runs the runtime check plus eleven document, configuration, time, unit, balance and documentation checks. It is the single command a fresh clone needs before any work, and it is the first step CI runs.
- `npm run verify` runs the twelve checks, then type-check, lint, format check, the unit and property tests, and the production build. It is the one command to run before a commit; CI runs the same six steps separately.
- `npm run test` runs Vitest once; `npm run test:watch` keeps it open. Both run against the TypeScript sources, not a build output.
- `npm run dev` serves the application with hot reload on `http://localhost:3000`. `npm run build` writes the static export to `out/`, and `npm run preview` serves that exact directory on `http://localhost:4173` through `scripts/serve-static.mjs`, which resolves paths inside `out/` only and refuses traversal attempts.
- `.nvmrc` is read by `nvm-windows`, `fnm` and `nvm`; none of them is required, because `engines` plus `engine-strict` already refuse the wrong line.
- Linux and macOS use the same three commands. The clean install is verified on Windows 11 only, which is the platform this project is graded on; NFR-09 names all three, and the setup deliberately contains no Windows-only dependency — LF endings, no `.ps1` requirement, and npm scripts that run through whichever shell npm is using.

## 3 · Browser support

The application is a static client-side bundle with a Web Worker, WebGL2 and IndexedDB. Support is stated in tiers, and only Tier 1 is gated by the acceptance checklist.

| Tier | Browsers | Status |
| --- | --- | --- |
| **1 — gated** | Chrome and Edge, latest two stable, on Windows 11 at 1920×1080 | Every acceptance criterion runs here (AC-18, AC-17) |
| **2 — supported** | Firefox, latest two stable; Safari 17.4+ on macOS; Safari on iOS/iPadOS 17.4+ | Expected to work; defects are fixed but no criterion is evaluated here |
| **3 — degraded** | Tier 1 browsers without WebGL2, or with reduced motion requested | 2D system map only; no 3D, no state lost (FR-UX-10, FR-TWN-05) |
| **Not supported** | Internet Explorer, browsers without ES2022 module workers or IndexedDB | Out of scope; no polyfill is planned |

**Required capabilities.** ES2022 modules and module Web Workers, IndexedDB, WebGL2 (3D only), `structuredClone`, `ResizeObserver`, CSS Grid, `Intl.NumberFormat` for TND and `Intl.DateTimeFormat` with IANA time zones for site-day walls and daylight-saving transitions, and `prefers-reduced-motion`. A browser missing a capability from the 2D path is unsupported; a browser missing only WebGL2 falls to Tier 3.

**How this is checked.** Phase 08 and phase 09 record screenshots and a manual matrix for the four interface views; AC-17 verifies that every critical state and control exists in the 2D map, that status is not conveyed by colour alone, and that the interface is keyboard operable. A capability probe runs at start-up and selects 2D automatically when WebGL2 is absent; it reports why in the interface rather than failing silently.

## 4 · Hardware expectations

| Role | Expectation |
| --- | --- |
| **Development and grading (reference)** | Windows 11 x64, 4-core CPU, 8 GB RAM, 1920×1080, a 2 GB discrete GPU or any WebGL2-capable integrated GPU, about 1 GB free disk for `node_modules` and build output |
| **Minimum interactive** | 2 cores, 4 GB RAM, 1366×768, WebGL2 for 3D; below the frame-rate floor, the 3D view disables itself and the 2D map remains |
| **Mobile** | A 2022-or-later mid-range phone; the 2D map and charts are the supported experience, 3D is optional |
| **Not required** | A GPU for model training (training runs in Colab per DEC-010), a local LLM, a dedicated server, Docker (CON-04) |

**Performance budgets** are AC-18 and are evaluated on the reference machine: engine ≥ 5,000 steps/s, UI update < 100 ms, 3D ≥ 24 fps in low quality and ≥ 30 fps in medium at 1080p, cold interactive start < 5 s. They are initial engineering estimates, frozen before the final experiment per task 11.1.

## 5 · Embedded toolchain

The pins above govern the Node adapter and the web application. The embedded path is pinned separately, in the phases that install it:

- PlatformIO Core version and the ESP32 Arduino core version are recorded in `platformio.ini` and the embedded README when phase 13.2 creates the project (board `esp32dev`, DevKit v1 profile).
- The Wokwi for VS Code extension is the Community edition; no paid licence is on any required path (CON-14, DEC-028).
- Mosquitto is installed natively on Windows for the bench (CON-04 excludes Docker).
- Firmware build output lives in `.pio/` and is never committed; the Wokwi project reads the compiled binary, so building is the first documented step (see [conventions](conventions.md) §8).

## 6 · Failure modes and their messages

| Situation | What happens | Message |
| --- | --- | --- |
| Wrong Node line installed | Install is refused | `EBADENGINE … Required: {"node":">=26.0.0 <27"}` |
| Wrong npm version | `npm run check` fails before any other check | `npm: packageManager declares 11.20.0 but x.y.z is installed` |
| CI's Node bundles an older npm than `packageManager` | `npm ci` fails before any gate, on every runner at once | `EBADENGINE … Required: {"npm":">=11.20.0 <12"}` — move the pin to a Node release that ships the declared npm (DEC-036) |
| `.nvmrc` drifts from `engines` | Check fails | `.nvmrc: … does not satisfy engines.node` |
| Lockfile missing or stale | Check fails, and `npm ci` refuses to resolve | `lockfile: … regenerate the lockfile` |
| A floating version appears | Check fails | `must be an exact version, found "^1.2.3"` |
| A workspace manifest drifts from the pin | Check fails | `packages/engine/package.json: engines.node must match the root pin` |
| An override is floating or unresolved | Check fails | `overrides.… must be an exact version` or `lockfile: no "…" entry for the override` |
| Someone runs `npm install` on a clean clone | Works, but rewrites the lockfile — review the diff before committing | none; the diff is the signal |
| `npm ci` runs while `npm run dev` or `next build` is open | Install aborts before touching the lockfile | `EPERM … unlink node_modules/lightningcss-win32-x64-msvc/…` — stop the server and re-run |
| The boot scenario violates the contract | `npm run build`, `npm run dev` and `npm run check` fail before any page renders | `tunis-typical-v1.json: 1 problem in the scenario layer` followed by the field path, the received value and a fix |
| The site timezone is unknown or the start offset contradicts it | Same three commands fail at load | `site.timezone  ·  relation.timezone` with an IANA example, or `simulation.start  ·  relation.start-offset` naming the offset that zone had at that instant (DEC-037) |
| A scenario field is misspelt | The unknown key is rejected with the nearest valid name | `grid.feed_in_limt_kw  ·  schema.unknown-key` … `did you mean feed_in_limit_kw?` |
| A numeric field has no unit suffix | `npm run check` fails on the schema audit, not at run time | `contract.unit-missing: grid.feed_in_limit → rename to feed_in_limit_kw` |
| A test fails | `npm run verify` stops at the test gate; the build never starts | `FAIL  packages/…/x.test.ts > …` followed by a non-zero test exit |
| A lint or format error | `npm run verify` stops before the tests | `eslint .` exits 1, or `prettier --check .` names the file |
| A gate is removed from the workflow | `npm run check` fails at the CI contract | `job 1: gates must be npm run check, … , build last` |
| A workflow action is referenced by tag | Same gate | `"actions/checkout@v4" must be pinned to a commit SHA, not a tag` |

The `npm install` row is deliberate: the tool cannot distinguish an intentional dependency change from an accidental one, so the lockfile diff is what a reviewer checks. The `EPERM` row is Windows file locking on the Tailwind CSS native binary, not a permissions fault, and it leaves `node_modules` untouched apart from stopping mid-way; a re-run after stopping the server succeeds.


Re-run after task 02.4: the public engine entry imports and advances in a headless Node test with no `window` or `document`, and typed inert implementations satisfy the PV, inverter, battery, appliance, grid, weather, scheduler and clock ports. All twelve register checks, strict type-check, lint, formatting and 67 tests pass. In this Windows environment, Turbopack panicked while starting its PostCSS helper during the default production build; `npm run build -- --webpack` then compiled and generated all seven routes successfully. No UI framework was added to the engine dependency graph.


Re-run after task 02.5: scripts/check-config.mjs rejects an unsafe scenario seed, the public clock tests cover lifecycle state changes and completion, and the versioned SplitMix64 test vector is frozen. Across the same grid, seed 123456 produces identical ordered step timestamps and seeded event values at 1×, 60× and 1000×; reset rewinds the stream. All 12 register checks, type-check, lint, format check and 74 tests pass. The production app build is also confirmed with npm run build -- --webpack, which compiles and prerenders all seven routes. The default Turbopack build panicked while starting its PostCSS helper in this Windows execution environment.
After task 02.6, all eight roadmap event kinds emit records with timestamp, source, entity ID, previous and next state, payload, deterministic sequence and stable ID. The journal rejects backward timestamps and step indices, malformed state transitions, invalid SOC crossings, reversed forecast horizons and impossible inverter payloads. Replaying the same event inputs for the same scenario and seed produces identical records and IDs. The full verification chain passes on Node 26.13.1 and npm 11.20.0 with 82 tests.

After task 02.7, energy constructors and sums reject negative or non-finite Wh/kWh, interval conversion rejects negative power and overflow, and the calculated-SOC clamp validates the configured window before constraining the result. Property-based tests cover 500 wide-range energy cases and 500 SOC windows/candidates, including extrema; external SOC still fails closed. Full verification passes on Node 26.13.1 and npm 11.20.0 with 85 tests.

After task 03.2, a clean `npm ci` installs SunCalc 2.1.4 from the workspace lockfile. The twelve
register checks, type-check, lint, format check and all 90 tests pass on Node 26.13.1/npm 11.20.0.
In this Windows execution environment, the default `npm run verify` production build panicked when
Turbopack tried to start its PostCSS worker; `npm run build -- --webpack` then compiled and
prerendered all eight app routes. Solar reference fixtures, DST transitions and polar cases are
recorded in [`solar-validation.md`](solar-validation.md).
