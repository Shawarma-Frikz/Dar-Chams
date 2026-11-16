# `@helios/engine` — the simulation boundary

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Phase | 01 (task 01.6); 02.1 adds the time base; physics from 02.2 |
| Boundary | No React, Next.js, DOM or browser API may be imported (DEC-002) |
| Checked by | `npm run test`, `node scripts/check-config.mjs`, `node scripts/check-time.mjs` |
| API | [`docs/api.md`](../../docs/api.md) §1 |
| Decisions | DEC-002, DEC-003, DEC-004, DEC-005, DEC-021, DEC-033, DEC-037 |

## Purpose

The engine is the single description of what the installation does. It runs headlessly in Node for
tests and batch experiments and in the browser for the live view, and it owns the scenario contract
so that the application, the CI validator and the test suite cannot disagree about what a valid
scenario is. Phase 01 built the boundary the physics runs behind — the types, the Ajv validator, the
relational invariants, the unit audit and the issue model. Phase 02.1 adds the axis: absolute
instants, the site timezone's calendar-day boundaries, a uniform step grid, and the internal watt and
watt-hour units. It is not a UI, a controller or a persistence layer.

## Inputs

- A **scenario document** of unknown shape, supplied by the caller. The engine never reads a file
  from disk, so it has no dependency on the repository layout.
- A **JSON Schema** passed to `createScenarioValidator`, normally
  [`scenarios/scenario.schema.json`](../../scenarios/scenario.schema.json). Compiling happens once
  per schema, not per check.
- The unit conventions the contract is held to: numeric names end in a recognised suffix, fractions
  are written in `[0, 1]`, and the unitless exceptions are declared explicitly
  ([configuration](../../docs/configuration.md) §6).
- The **time axis**: `simulation.start` (an ISO instant with an explicit offset), `timestep_minutes`
  (5, 15, 30 or 60) and `site.timezone` (an IANA identifier). The time functions take these values,
  not paths: the engine still reads no file from disk.

## Outputs

- `ScenarioCheck`: either `{ ok: true, scenario }` with the typed and validated document, or
  `{ ok: false, issues }` with every problem found.
- `ConfigIssue[]`: layer, dotted path, stable code, message, received value, expected value and a
  hint. `ConfigError` renders the same list as a numbered report.
- `Scenario` and its component interfaces: the typed view of the contract, mirrored from the schema.
- `ENGINE_NAME` and `ENGINE_VERSION`, written into every run manifest (NFR-03).
- `auditSchemaUnits`, `hasUnitSuffix`, `UNIT_SUFFIXES` and `UNITLESS_QUANTITIES`: the unit policy as
  code, used by the unit check and available to a schema change.
- The **time base**: `parseInstant` and `formatInstant` (one instant in, one string out),
  `zonedParts`, `zoneOffsetMinutes`, `instantFromZonedParts` and `formatZonedInstant` (the site zone),
  `siteDayBounds` and `siteDate` (the local calendar), and `createStepGrid`, `stepAt`,
  `stepsInSiteDay`, `siteDayGrid` and `groupStepsBySiteDay` (the uniform step grid and its day split).
  A DST day is 23 or 25 hours, or 23.5 or 24.5 in a half-hour zone, so its step count follows the calendar rather than 96.
- `intervalWattHours` and the four scale conversions: the internal W/Wh representation and the named
  kW/kWh boundary.

The complete list, with signatures, is the first table in [`docs/api.md`](../../docs/api.md).

## Tests

```text
npm run test
node scripts/check-config.mjs
node scripts/check-time.mjs
node scripts/validate-scenarios.mjs
```

`npm run test` runs 37 engine tests and the application's ten, 47 in total:

- [`src/config/scenario.test.ts`](src/config/scenario.test.ts), 14 tests — the shipped scenarios
  validate; invalid capacity, negative power, an impossible SOC window, a missing unit, an unknown
  site timezone and a start offset that contradicts that zone are each rejected with the right path,
  code and fix; issues collect instead of aborting; the issue report renders; the unit audit flags a
  synthetic `capacity` field; and properties cover issue rendering and the SOC invariant.
- [`src/time/time.test.ts`](src/time/time.test.ts), 18 tests — instants are stored once and formatted
  back in the site zone; naive, impossible, finer-than-a-millisecond and leap-second stamps are
  refused; a Tunisian day is 96 steps at 15 minutes; Paris gives 92 and 100 steps on its 23- and
  25-hour days; Lord Howe gives 94 and 98 on its half-hour days, and an hourly grid on a 23.5-hour day
  is refused; gap and overlap times resolve in the documented direction; the shipped 48-hour run is
  192 steps over two 96-step days; and two properties tile the grid and assign every step to one day.
- [`src/units/energy.test.ts`](src/units/energy.test.ts), 5 tests — power over an interval becomes
  watt-hours, the kW/kWh conversions round-trip, and non-finite or negative intervals are refused.
- [`src/lib/config/layers.test.ts`](../../src/lib/config/layers.test.ts), 10 application tests — the
  four layers stay separate and resolution fails closed.

`node scripts/check-config.mjs` proves ten failure classes outside Vitest, audits every numeric
property in the contract, and asserts that no layer is silently merged. `node scripts/check-time.mjs`
is the acceptance proof for 02.1: it checks the shipped runs, a full day at each timestep, four DST
days, the two transition directions, instant storage and the unit scales, then feeds five broken
cases back through the public API. `node scripts/validate-scenarios.mjs` runs the validator over every
committed scenario. None of the commands needs a build: Node strips the TypeScript types, and
`erasableSyntaxOnly` keeps the source within what stripping accepts (DEC-033).

**Not covered yet.** There is no physics, no energy balance and no running simulation clock; 02.1
fixes the axis those phases will step along. Solar elevation and sunrise/sunset — the weather model's
daylight flag (MET-11) — belong to 03.2, not to this day boundary. The time base is tested; the
simulation it will carry is not.

## Layout

| Path | Role |
| --- | --- |
| `src/index.ts` | The public surface; every export is documented in the API notes |
| `src/config/scenario.ts` | The typed view of the contract |
| `src/config/schema.ts` | Ajv 8.20.0, error-to-issue translation and unknown-key suggestions |
| `src/config/invariants.ts` | The relational rules JSON Schema cannot express |
| `src/config/units.ts` | Unit suffixes, unitless quantities and the schema audit |
| `src/config/issues.ts` | `ConfigIssue`, `ConfigError`, the formatter and pointer reader |
| `src/config/scenario.test.ts` | Fourteen configuration tests over the shipped scenarios |
| `src/time/instant.ts` | `Instant`, strict ISO parsing, formatting and whole-minute arithmetic |
| `src/time/zone.ts` | IANA offsets, wall-clock resolution, site-date and site-day bounds |
| `src/time/timeline.ts` | The uniform step grid and its split at local midnight |
| `src/time/time.test.ts` | Eighteen instance, day-boundary, DST and grid tests |
| `src/units/energy.ts` | Internal watts and watt-hours, with named kW and kWh conversions |
| `src/units/energy.test.ts` | Five unit and property tests over the conversions |
| `package.json` | `@helios/engine`, TypeScript-source exports for the workspace |
