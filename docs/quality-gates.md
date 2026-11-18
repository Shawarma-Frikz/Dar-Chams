# Quality gates

| Field | Value |
| --- | --- |
| Version | 2.2.0 |
| Date | 2026-11-18 |
| Phase | 01 (tasks 01.5, 01.6), 02.1–02.7, 03.1–03.7; v1.1.0 records the ninth check; v1.1.1 tracks the corrected Node line; v1.2.0 records the time check and 47 tests; v1.3.0 records the unit check and 53 tests; v1.4.0 records the balance check and 65 tests; v1.5.0 records component ports and 67 tests; v1.6.0 records the clock and 74 tests; v1.7.0 records the event journal and 82 tests; v1.8.0 records numerical guards and 85 tests; v1.9.0 records PV geometry and 86 tests; v2.0.0 records solar geometry and 90 tests; v2.1.0 records weather, irradiance, temperature, PV output and inverter; v2.2.0 records controlled shading/soiling experiment tests (113 total) |
| Decided by | DEC-034; tests chosen by DEC-017; the toolchain pin by DEC-031; the documentation check by DEC-035; the time base by DEC-037; the canonical units by DEC-038; the energy ledger by DEC-039 and DEC-051; PV geometry by DEC-046; solar geometry by DEC-047; controlled PV loss experiments by DEC-052 |
| Checked by | `node scripts/check-ci.mjs`, or `npm run check` for all twelve checks |
| Related | [Conventions](conventions.md) §7 · [Runtime support](runtime-support.md) · NFR-06, NFR-09, EX-06 |

Task 01.5 asks for formatting, lint, type-check, unit-test and production-build commands, and for CI to run them on pushes and pull requests. Its acceptance condition is not "the commands exist" but "a failing check blocks a green build", so this document records the gate list, the order, the CI job and the two ways the failure path is demonstrated.

---

## 1 · The six gates

| Gate | Command | What it proves |
| --- | --- | --- |
| Registers | `npm run check` | The twelve document, configuration, time, unit, balance and documentation checks in [conventions](conventions.md) §7 pass against the tree as committed |
| Type-check | `npm run typecheck` | `tsc --noEmit` under the strict base config, including the test files and `vitest.config.ts` |
| Lint | `npm run lint` | ESLint 9 on the flat config, including the engine boundary that forbids React, Next, Three.js and `@/` imports (DEC-002) |
| Format | `npm run format:check` | Prettier 3 over code, config and scripts; Markdown and JSON evidence are excluded by [`.prettierignore`](../.prettierignore) |
| Unit tests | `npm run test` | Vitest 5.1.0 runs every `*.test.ts` in `packages/` and `src/` against the TypeScript sources; fast-check 4.10.2 adds property tests |
| Production build | `npm run build` | Next.js 16 compiles the six routes and writes the static export to `out/` |

`npm run test:watch` is the same runner in watch mode, for the edit-test loop.

The order is deliberate. The cheap, broad checks come first — a formatting error costs a second, a failing build costs twenty — and the build is last, because it is both the slowest gate and the artefact the others exist to protect. A failure at any point stops the chain:

```text
npm run verify
  → npm run check        twelve checks
  → npm run typecheck
  → npm run lint
  → npm run format:check
  → npm run test         unit and property tests
  → npm run build        static export
```

`verify` is the single command a contributor runs before a commit, and the same list the workflow runs. CI does not call `verify`, because one combined step would report six gates as one red cross; it runs the same six commands as separate steps so a failing gate is named on the pull request.

The register gate is itself twelve checks. The seventh, `scripts/check-time.mjs`, holds the step grid to its arithmetic: each shipped run tiles its horizon, a site day yields the step count its real length allows at 5, 15, 30 or 60 minutes, and five broken cases — a naive instant, a partial final step, an hourly grid on a 23.5-hour day, a contradictory start offset and an unknown zone — are refused (DEC-037). The eighth, `scripts/check-units.mjs`, holds the unit vocabulary to its scales: every shipped kW and kWh boundary converts exactly, 0.55 stays a fraction and 55 is refused, °C stops at absolute zero, the schema audit refuses a percent field or a widened SOC bound, and `tsc` must reject the eight marked mixed-unit calculations in `scripts/fixtures/unit-guard.ts` and nothing else (DEC-038). The ninth, `scripts/check-balance.mjs`, holds the step ledger to its identity: 1224 settlements across the three shipped scenarios, one Tunis day at all four timesteps and both Paris daylight-saving days close within ±1e-6 Wh, every magnitude stays a non-negative fraction of a declared limit, every loss follows a shipped efficiency, and eleven broken ledgers are refused (DEC-039, DEC-051). The tenth, `scripts/check-docs.mjs`, holds six module READMEs (purpose, inputs, outputs, runnable tests), the API tables in both directions, the generated data dictionary, the experiment record format, the changelog and the document map to their contracts (DEC-035).

## 2 · What the tests cover

All 113 tests run against the modules the application imports — the configuration contract from 01.4, the time, unit, balance, component-port, clock, event journal and numerical guards from 02.1–02.7, and the PV geometry, solar, weather, irradiance, panel-temperature, PV-output and inverter calculations plus the 03.7 scenario experiment:

| File | Tests | Subject |
| --- | --- | --- |
| [`packages/engine/src/config/scenario.test.ts`](../packages/engine/src/config/scenario.test.ts) | 16 | The shipped scenarios validate and fully describe site/array geometry; profile absence/presence and fixed-versus-tracking axis combinations validate correctly; the configuration failure classes, unit audit and SOC invariants hold |
| [`packages/engine/src/time/time.test.ts`](../packages/engine/src/time/time.test.ts) | 18 | Instants store as one absolute value and format with an explicit offset; a naive, impossible or sub-millisecond stamp is refused; Tunis yields 1440 minutes and 288/96/48/24 steps; Paris and Lord Howe keep their 23-, 25-, 23.5- and 24.5-hour days; a gap shifts forward and an overlap takes the earlier instant; a run tiles its horizon and splits at site midnight |
| [`packages/engine/src/solar/solar.test.ts`](../packages/engine/src/solar/solar.test.ts) | 4 | Three independent city/date fixtures check sunrise, solar noon, sunset, elevation and azimuth; Paris DST transitions, Tromsø polar day/night and invalid inputs are covered |
| [`packages/engine/src/units/energy.test.ts`](../packages/engine/src/units/energy.test.ts) | 7 | Interval energy is power × minutes ÷ 60 in Wh; kW and kWh are display conversions only; energy magnitudes reject negatives; non-finite input and overflow are refused; properties cover wide non-negative power and interval boundaries |
| [`packages/engine/src/units/quantity.test.ts`](../packages/engine/src/units/quantity.test.ts) | 7 | Celsius holds down to absolute zero; SOC stays a 0–1 fraction; calculated SOC clamps to and remains inside each battery's usable window, with property coverage of boundaries and extreme finite states |
| [`packages/engine/src/balance/balance.test.ts`](../packages/engine/src/balance/balance.test.ts) | 12 | Ten non-negative magnitudes close a 1750 Wh step on both sides; the residual stays signed and the tolerance is inclusive; a negative, missing, unknown or non-finite term is refused; `BalanceError` names the step and both totals; conversion loss follows inverter efficiency; properties cover supply − demand, a derived term and interval conversion |
| [`packages/engine/src/simulation/interfaces.test.ts`](../packages/engine/src/simulation/interfaces.test.ts) | 2 | The public engine entry loads and advances in Node without browser globals; typed contracts compile for all eight simulation component groups |
| [`packages/engine/src/simulation/clock.test.ts`](../packages/engine/src/simulation/clock.test.ts) | 6 | Clock lifecycle and invalid transitions; fixed-step completion; speed limits; seeded SplitMix64 replay at 1×, 60× and maximum; deterministic reset and distinct seed streams |
| [`packages/engine/src/simulation/events.test.ts`](../packages/engine/src/simulation/events.test.ts) | 8 | All roadmap event families carry required fields; IDs and ordered records replay deterministically; payloads are immutable; malformed transitions, timestamps, steps and event-specific values are rejected |
| [`src/lib/config/layers.test.ts`](../src/lib/config/layers.test.ts) | 10 | Settings recover without throwing, refuse scenario fields and never change the scenario; runtime state derives from a frozen configuration; resolution fails closed |

Eleven of them are properties rather than examples, run 50–300 times each:

- the SOC invariant flags a start outside the window, and only then, for arbitrary fractions;
- `formatIssues` renders any list of issues without throwing;
- `parseUserSettings` never throws on anything `JSON.parse` can return, and always yields a usable preference;
- a site day at any supported timestep yields exactly minutes ÷ timestep steps;
- every step belongs to exactly one site day, and the days stay in order;
- interval energy equals power × minutes ÷ 60 for arbitrary finite power and duration;
- the kW/kWh and W/Wh conversions round-trip without losing value;
- any state of charge survives the fraction → percent → fraction round-trip;
- the residual is supply minus demand for arbitrary magnitudes, and `balanced` agrees with the tolerance;
- a step closes when its eighth term is derived from the random other seven;
- power converted to interval energy at any supported timestep settles without a residual.

The tests import the same modules the application imports — the engine entry point and the `src/lib/config` files — with no mocks, so a test cannot pass against behaviour the app does not have. Fixtures are the shipped scenario files, read from `scenarios/`, not copies; a scenario that stops being valid fails the tests and the configuration check together.

## 3 · The CI job

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push to `main`, every pull request and manual dispatch.

| Setting | Value | Why |
| --- | --- | --- |
| Runners | `ubuntu-latest` and `windows-latest`, `fail-fast: false` | Linux is the case-sensitive path check; Windows is the OS the project is graded on, and where CRLF and file locking appear |
| Node | `node-version-file: .nvmrc` | The workflow cannot drift from the pinned Node line (26.13.1), whose bundled npm is the one `packageManager` declares (DEC-031, DEC-036) |
| Install | `npm ci` with `cache: npm` | The only supported install path; a stale lockfile fails here |
| Actions | `actions/checkout` and `actions/setup-node` pinned to commit SHAs | A tag can be moved; a commit cannot |
| Permissions | `contents: read` | The job needs to read the repository and nothing else |
| Concurrency | `ci-${{ github.ref }}`, cancel in progress | A superseded push stops consuming minutes |
| Timeout | 25 minutes | A hung job fails instead of burning the monthly budget |

The job does not deploy, publish or upload artefacts. It exists to answer one question: does this commit pass the gates on both operating systems.

**Before merge.** NFR-06 says the checks must pass *in CI before merge*. The workflow makes a failing run red; requiring that run before merging is a repository setting — Settings → Branches → require status checks to pass — not a file in the tree. It is recorded here so the step is deliberate rather than forgotten. Without it, a maintainer can still merge a red pull request.

## 4 · The check on the check

`scripts/check-ci.mjs` is the eleventh register check. It parses the workflow (a small reader for the YAML subset the file uses, not a regular expression), then asserts:

- triggers: `push` on `main`, `pull_request`, and a manual dispatch;
- `permissions.contents: read`, concurrency with cancellation, a job timeout of 1–60 minutes;
- a matrix that includes both runners;
- `npm ci`, never `npm install`, and no `|| true`, `continue-on-error: true` or `--no-verify`;
- both actions pinned to 40-character commit SHAs, `setup-node` reading `.nvmrc` and caching npm;
- each job runs exactly `npm run check`, `typecheck`, `lint`, `format:check`, `test`, `build`, in that order, build last;
- `package.json` defines every gate, `npm run check` chains every `check:*` script and does not recurse, and `npm run verify` is the same six steps in the same order.

It then breaks copies of the parsed workflow and manifest and requires each break to be reported: a removed gate, an action referenced by tag, a command ending in `|| true`, a missing pull-request trigger, `setup-node` without the `.nvmrc` line, and `verify` without the test gate. A check that cannot fail proves nothing.

## 5 · The failure path, demonstrated

The DONE WHEN condition was not asserted, it was run at phase 01. A deliberately red test was added to `packages/engine/src/config/`, and `npm run verify` produced:

```text
FAIL  packages/engine/src/config/failing-gate.test.ts > blocks the production build
AssertionError: expected 2 to be 3
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 22 passed (23)
npm error Lifecycle script `verify` failed with error
```

Exit code 1, and the build step never started — the log contains no "Compiled successfully". Removing the file and re-running the same command restored the green chain, ending with the seven static routes in `out/`.

In CI the same mechanism is structural: a step's non-zero exit fails the job, and a failed job cannot satisfy a required status check.

## 6 · What is not covered

- **Coverage thresholds.** Measured coverage has no meaningful denominator until the engine has physics to test (phase 02); a threshold now would guard almost nothing.
- **Browser and component tests.** Playwright arrives in phase 08 with the interface it has to drive (DEC-017). The shell is currently static and carries no interactive behaviour beyond navigation.
- **macOS.** Linux and Windows cover the failure classes that exist in this stack. A third runner doubles the minutes for no new class; it returns to the matrix if a Safari- or macOS-specific defect appears.
- **Branch protection.** A repository setting, recorded in §3 rather than enforced by a file.
- **Dependency update automation.** Dependabot is not configured; an exact-version policy (DEC-031) makes upgrades deliberate, and automating the pull requests is a later convenience.
