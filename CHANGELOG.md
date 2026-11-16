# Changelog

All notable changes to Dar Chams are recorded here. DEC-040 adopted the identity; DEC-041 aligns the repository and current code identifiers.

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). A version number is a phase gate:
`0.<phase>` is tagged after a phase is accepted ([conventions](docs/conventions.md) §2), so `0.0.0`
is phase 00, `0.1.0` is phase 01 and `v1.0.0` is the phase-16 release. Pre-1.0, the minor number
names the phase and the patch number is reserved for a fix between phases.

## [Unreleased]

Phase 02 — the simulation time base, canonical units, energy ledger, component ports and Dar Chams identity.

### Added

- Dar Chams product identity (DEC-040): the name and Arabic form, doorway-and-sun mark, audited
  day/night colour tokens, self-hosted type and the identity charter.
- Repository and code identity (DEC-041): GitHub links, npm package names, engine identity, settings
  key, schema URL and current roadmap filenames now use Dar Chams identifiers.
- The supplied Dar Chams charter and roadmap, plus an adoption crosswalk that routes new model
  detail through the existing acceptance gates without treating proposals as completed work.
- Engine time base (DEC-037): timestamps stored as epoch instants and rendered in the site's IANA
  zone, site-day boundaries that keep daylight-saving days at their real 23–25 hours, a configurable
  whole-minute step grid of 5, 15, 30 or 60 minutes, and power and energy kept in W and Wh with
  kW and kWh as display conversions.
- `scripts/check-time.mjs`, the tenth register check, proving the step count for Tunis, both Paris
  transitions and both Lord Howe half-hour transitions, and rejecting five broken cases.
- Canonical units (DEC-038): branded W, Wh, kW, kWh, °C and SOC quantities, with `addWatts` and
  `addWattHours` accepting one unit only, so a power-plus-energy expression cannot compile.
- `scripts/check-units.mjs`, the eleventh register check, crossing every shipped kW and kWh boundary,
  holding all eighteen SOC fields to `[0, 1]`, refusing nine wrong-scale values, and compiling a
  fixture whose eight mixed-unit calculations must each fail with a named diagnostic.
- The schema audit refuses a `_percent` field, a SOC bound outside 0–1 and a temperature bound below
  absolute zero.
- Energy ledger (DEC-039): nine non-negative watt-hour magnitudes per step — PV, grid import and
  battery discharge as supply; load, battery charge, grid export, conversion loss, battery loss and
  standby loss as demand — with the direction in the name, a signed residual bounded at ±1e-6 Wh,
  and `assertBalanced` naming the step that fails.
- `scripts/check-balance.mjs`, the twelfth register check, settling 1224 steps across the three
  shipped scenarios, one Tunis day at all four timesteps and both Paris daylight-saving days, and
  refusing ten broken ledgers; the largest residual observed is 2.27e-13 Wh.
- Task 02.4 component ports (DEC-042): typed inputs and outputs for weather, PV, inverter, battery, appliance,
  grid, scheduler and simulation clock. The scheduler sees an explicit domain observation, and the
  clock interface is defined without implementing the 02.5 lifecycle or claiming physical models.
- A headless engine contract test that imports the public engine entry in Node without browser globals
  and compiles inert implementations for all eight component ports.

### Changed

- `npm run check` retains its twelve register checks, and the suite runs 67 tests.
- Scenario validation refuses a site timezone the runtime does not know and a start offset that
  contradicts the zone at that instant.

## [0.1.0] — 2026-11-16

Phase 01 — toolchain and scaffold.

### Added

- MIT licence, editor settings, a committed ignore policy and the branch and commit conventions
  (DEC-029, DEC-030).
- Node 26.13.1 and npm 11.20.0 pinned with `engine-strict`, exact dependency versions, a committed
  lockfile and a recorded browser and hardware baseline (DEC-031, DEC-036).
- Next.js 16 shell: six routes, a static export, strict TypeScript, ESLint, Prettier and the
  `@dar-chams/engine` workspace boundary (DEC-032).
- Four configuration layers with an Ajv-validated scenario contract, relational invariants and a unit
  audit that stops an invalid boot scenario with a field, a value and a fix (DEC-033).
- Six quality gates, 22 Vitest and fast-check tests, an aggregate `verify` that ends in the
  production build, and a CI workflow on Linux and Windows that is itself machine-checked (DEC-034).
- Documentation system: decision-record conventions, six module READMEs, API notes, a generated data
  dictionary, an experiment log and this changelog, all held by a ninth check (DEC-035).

### Changed

- `npm run check` now runs nine register checks; `npm run verify` runs them before the four code
  gates and the production build.

### Fixed

- CI failed at `npm ci` on both runners because Node 26.2.0 bundles npm 11.13.0 and `engine-strict`
  refuses it; the pin moved to the Lithium LTS patch 26.13.1 with npm 11.20.0 before the phase tag
  (DEC-036).

## [0.0.0] — 2026-11-15

Phase 00 — project definition.

### Added

- Scope brief, requirements register, decision log, simulation-truth contract and signed acceptance
  checklist.
- Three validated scenarios and the JSON Schema they share, with a dependency-free validator.

[Unreleased]: https://github.com/Shawarma-Frikz/Dar-Chams/compare/v0.1...HEAD
[0.1.0]: https://github.com/Shawarma-Frikz/Dar-Chams/releases/tag/v0.1
[0.0.0]: https://github.com/Shawarma-Frikz/Dar-Chams/releases/tag/v0.0
