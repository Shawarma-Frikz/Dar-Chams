# Runtime, browser and hardware support

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-16 |
| Phase | 01 (task 01.2) |
| Decided by | DEC-031 (supersedes the Node version pin in DEC-018) |
| Checked by | `node scripts/check-runtime.mjs`, or `npm run check` for all checks |
| Related | [Conventions](conventions.md) §7 · [Acceptance checklist](acceptance-checklist.md) AC-18, AC-17 · [Scope brief](00-scope-brief.md) |

Task 01.2 asks for three things: a supported Node LTS with a pinned package manager, dependencies pinned by a lockfile, and a recorded browser and hardware baseline. This document records all three and names the check that enforces the first two, so the baseline is not merely a sentence in a README.

---

## 1 · What is pinned

| Item | Value | Where | Enforced by |
| --- | --- | --- | --- |
| Node | 26.2.0, the Active LTS line (even-numbered, LTS since October) | [`.nvmrc`](../.nvmrc) | `.nvmrc` must equal the declared line and satisfy `engines` |
| Node range | `>=26.0.0 <27` | [`package.json`](../package.json) `engines.node` | `engine-strict=true` refuses any other major line |
| npm | 11.15.0 exactly | `package.json` `packageManager` | check fails on any other installed version |
| npm range | `>=11.15.0 <12` | `engines.npm` | `engine-strict=true` |
| Dependency policy | exact versions only, no `^`, `~`, `*`, `latest`, `workspace:` or URL specs | `.npmrc` `save-exact=true` | the checker rejects a floating spec in any dependency block |
| Install path | `npm ci` from the committed lockfile | [`package-lock.json`](../package-lock.json), lockfile v3 | `npm ci` refuses a lockfile that disagrees with the manifest |
| Lockfile hygiene | committed, reviewed like code | `.gitignore` keeps the rest of `node_modules/` out | check fails if the lockfile is missing, old, or out of sync |

**Rules that follow from the pin.**

- A clean clone installs with `npm ci` and never with a bare `npm install`; `npm install` is used only when deliberately adding or upgrading a dependency.
- Adding a dependency writes an exact version and updates the lockfile in the same commit, with the reason in the commit body.
- Changing a Node line is a decision-log entry plus a re-tested clean install. It is never an edit to `engines` alone.
- `npm` warns on peer-dependency conflicts rather than failing; the engine check is the hard gate, and a warning that matters is resolved by pinning, not ignored.

**Verified on 2026-11-16, Windows 11.** A directory containing only `package.json`, `package-lock.json`, `.npmrc` and `.nvmrc` installed with `npm ci` and exit code 0. The same directory with `engines.node` raised to `>=99.0.0 <100` was refused with `EBADENGINE` and exit code 1 — the pin fails closed, as intended.

The application dependencies (Next.js, React, TypeScript, Tailwind, Recharts, React Three Fiber, Vitest, fast-check, Playwright) arrive in 01.3–01.5. This phase pins the mechanism; each later addition is exact and lands with its lockfile entry.

## 2 · Install commands

```powershell
git clone https://github.com/Shawarma-Frikz/Helios.git
cd Helios
npm ci
npm run check
```

- On Windows, `npm` may be blocked by PowerShell execution policy (DEC-018); use `npm.cmd`, or run the same commands in Git Bash.
- `npm run check` runs the runtime check and the five document checks. It is the single command a fresh clone needs before any work, and it becomes the CI entry point in 01.5.
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

**Required capabilities.** ES2022 modules and module Web Workers, IndexedDB, WebGL2 (3D only), `structuredClone`, `ResizeObserver`, CSS Grid, `Intl.NumberFormat` for TND and dates, and `prefers-reduced-motion`. A browser missing a capability from the 2D path is unsupported; a browser missing only WebGL2 falls to Tier 3.

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
| Wrong npm version | `npm run check` fails before any other check | `npm: packageManager declares 11.15.0 but x.y.z is installed` |
| `.nvmrc` drifts from `engines` | Check fails | `.nvmrc: … does not satisfy engines.node` |
| Lockfile missing or stale | Check fails, and `npm ci` refuses to resolve | `lockfile: … regenerate the lockfile` |
| A floating version appears | Check fails | `must be an exact version, found "^1.2.3"` |
| Someone runs `npm install` on a clean clone | Works, but rewrites the lockfile — review the diff before committing | none; the diff is the signal |

The last row is deliberate: the tool cannot distinguish an intentional dependency change from an accidental one, so the lockfile diff is what a reviewer checks.
