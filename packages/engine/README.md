# `@dar-chams/engine` — the simulation boundary

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Phase | 01 (task 01.6); 02.1 adds the time base; 02.2 adds the canonical units; 02.3 adds the energy ledger; physics from 02.4 |
| Boundary | No React, Next.js, DOM or browser API may be imported (DEC-002) |
| Checked by | `npm run test`, `node scripts/check-config.mjs`, `node scripts/check-time.mjs`, `node scripts/check-units.mjs`, `node scripts/check-balance.mjs` |
| API | [`docs/api.md`](../../docs/api.md) §1 |
| Decisions | DEC-002, DEC-003, DEC-004, DEC-005, DEC-021, DEC-033, DEC-037, DEC-038, DEC-039 |

## Purpose

The engine is the single description of what the installation does. It runs headlessly in Node for
tests and batch experiments and in the browser for the live view, and it owns the scenario contract
so that the application, the CI validator and the test suite cannot disagree about what a valid
scenario is. Phase 01 built the boundary the physics runs behind — the types, the Ajv validator, the
relational invariants, the unit audit and the issue model. Phase 02.1 adds the axis: absolute
instants, the site timezone's calendar-day boundaries and a uniform step grid. Phase 02.2 adds the
canonical units: branded watts, watt-hours, degrees Celsius and state of charge, with every scale
change behind a named conversion. Phase 02.3 adds the energy ledger: the nine magnitudes every step
must satisfy, with the direction in the term name and an absolute tolerance on the residual. It is
not a UI, a controller or a persistence layer.

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
- The **canonical units**: `watts`, `wattHours`, `kilowatts` and `kilowattHours` tag a value on the
  scale it was written in; `wattsFromKilowatts`, `kilowattsFromWatts`, `wattHoursFromKilowattHours`
  and `kilowattHoursFromWattHours` are the named scale changes; `intervalWattHours` is the per-step
  conversion; and `addWatts`/`addWattHours` sum one unit only. `celsius` holds °C above absolute
  zero, and `stateOfCharge` holds the 0–1 fraction with `percentFromStateOfCharge` and
  `stateOfChargeFromPercent` as the two display crossings.
- The **energy ledger**: `balanceStep` and `assertBalanced` settle a step's nine magnitudes into
  supply and demand and report a signed residual; `BALANCE_TERMS` and `BALANCE_TOLERANCE_WH` state
  the terms and the ±1e-6 Wh bound; `inverterConversionLoss` derives one loss from a declared
  efficiency; and `StepTerms`, `StepBalance`, `BalanceTerm` and `BalanceError` carry the shape, the
  result and the failure.

The complete list, with signatures, is the first table in [`docs/api.md`](../../docs/api.md).

## Tests

```text
npm run test
node scripts/check-config.mjs
node scripts/check-time.mjs
node scripts/check-units.mjs
node scripts/check-balance.mjs
node scripts/validate-scenarios.mjs
```

`npm run test` runs 55 engine tests and the application's ten, 65 in total:

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
- [`src/units/energy.test.ts`](src/units/energy.test.ts), 6 tests — power over an interval becomes
  watt-hours, the kW/kWh conversions round-trip, powers and interval energies add in their own unit,
  and non-finite, overflowing or negatively timed values are refused.
- [`src/units/quantity.test.ts`](src/units/quantity.test.ts), 5 tests — Celsius holds down to
  absolute zero and refuses a colder or non-finite value; SOC stays a 0–1 fraction, crosses to
  percent and back, and refuses a percentage written as a fraction.
- [`src/balance/balance.test.ts`](src/balance/balance.test.ts), 12 tests — a 1750 Wh step closes on
  both sides; the residual stays signed and the tolerance is inclusive; a negative, missing, unknown
  or non-finite term is refused; `BalanceError` names the step and both totals; conversion loss
  follows the inverter efficiency; and three properties show the residual is supply − demand, a
  derived eighth term closes the step, and interval energy feeds the ledger.
- [`src/lib/config/layers.test.ts`](../../src/lib/config/layers.test.ts), 10 application tests — the
  four layers stay separate and resolution fails closed.

`node scripts/check-config.mjs` proves ten failure classes outside Vitest, audits every numeric
property in the contract, and asserts that no layer is silently merged. `node scripts/check-time.mjs`
is the acceptance proof for 02.1: it checks the shipped runs, a full day at each timestep, four DST
days, the two transition directions, instant storage and the unit scales, then feeds five broken
cases back through the public API. `node scripts/check-units.mjs` is the acceptance proof for 02.2:
it crosses every shipped kW and kWh boundary, holds all eighteen SOC fields to the fraction, compiles
eight deliberately mixed calculations that must each be refused, and feeds nine wrong-scale values
back through the constructors and the schema audit. `node scripts/check-balance.mjs` is the
acceptance proof for 02.3: it settles 1224 steps across the three shipped scenarios, one Tunis day
at all four timesteps and both Paris daylight-saving days, keeps every residual inside ±1e-6 Wh, and
feeds ten broken ledgers back through the public API. `node scripts/validate-scenarios.mjs` runs the validator over every
committed scenario. None of the commands needs a build: Node strips the TypeScript types, and
`erasableSyntaxOnly` keeps the source within what stripping accepts (DEC-033).

**Not covered yet.** There is no physics and no running simulation clock; 02.3 states and proves the
energy ledger, and 02.4–03 fill it with component models. Solar elevation and sunrise/sunset — the
weather model's daylight flag (MET-11) — belong to 03.2, not to this day boundary. The time base and
the ledger are tested; the simulation they will carry is not.

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
| `src/units/energy.ts` | Branded W, Wh, kW and kWh, the named conversions and same-unit addition |
| `src/units/temperature.ts` | Degrees Celsius, with absolute zero as the lower bound |
| `src/units/state-of-charge.ts` | The 0–1 SOC fraction and its two percent crossings |
| `src/units/energy.test.ts` | Six unit and property tests over power and energy |
| `src/units/quantity.test.ts` | Five tests over temperature and state of charge |
| `src/balance/balance.ts` | The nine-term step ledger, its tolerance and the conversion-loss helper |
| `src/balance/balance.test.ts` | Twelve ledger and property tests |
| `package.json` | `@dar-chams/engine`, TypeScript-source exports for the workspace |
