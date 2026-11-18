# `@dar-chams/engine` — the simulation boundary

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Phase | 01–03.6: component ports, deterministic clock/events, numerical guards, PV/weather geometry, irradiance, panel thermal derating and DC/AC output models |
| Boundary | No React, Next.js, Three.js, DOM or browser API may be imported (DEC-002) |
| Checked by | `npm run test`, `node scripts/check-config.mjs`, `node scripts/check-time.mjs`, `node scripts/check-units.mjs`, `node scripts/check-balance.mjs` |
| API | [`docs/api.md`](../../docs/api.md) §1 |
| Decisions | DEC-002, DEC-003, DEC-004, DEC-005, DEC-006, DEC-012, DEC-021, DEC-033, DEC-037, DEC-038, DEC-039, DEC-042, DEC-043, DEC-044, DEC-045, DEC-046, DEC-047, DEC-048, DEC-049, DEC-050, DEC-051 |

## Purpose

The engine is the single description of what the installation does. It runs headlessly in Node for
tests and batch experiments and in the browser for the live view, and it owns the scenario contract
so that the application, the CI validator and the test suite cannot disagree about what a valid
scenario is. Phase 01 built the boundary the physics runs behind — the types, the Ajv validator, the
relational invariants, the unit audit and the issue model. Phase 02.1 adds the axis: absolute
instants, the site timezone's calendar-day boundaries and a uniform step grid. Phase 02.2 adds the
canonical units: branded watts, watt-hours, degrees Celsius and state of charge, with every scale
change behind a named conversion. Phase 02.3 adds the energy ledger: the ledger magnitudes every step
must satisfy, with the direction in the term name and an absolute tolerance on the residual. Phase
02.4 adds pure, typed ports for weather, PV, inverter, battery, appliance, grid, scheduler and clock;
these specify the dependency boundary without claiming a physical model exists. The scheduler sees
only an explicit observation, never a UI store or the full scenario. Task 02.5 implements the
fixed-step clock lifecycle and a versioned SplitMix64 stream seeded by the scenario; speed changes
playback pacing only and replay resets both the step cursor and random stream. It is not a UI or
persistence layer. Task 02.6 adds typed events for the roadmap transition families and an append-only
journal whose stable IDs derive from scenario, seed and deterministic append order.
Task 02.7 makes energy quantities non-negative and finite, rejects negative interval energy and
overflow, and provides an explicitly named SOC clamp for calculated battery state using validated
minimum and maximum SOC bounds. Raw external SOC continues to fail closed.
Task 03.1 makes site and array geometry scenario-owned and unambiguous, makes shading profiles
optional, and enforces fixed-by-default tracking in both the schema and TypeScript union.

Task 03.2 adds SunCalc-backed apparent solar elevation and true-north azimuth at an instant, plus
sunrise, solar noon and sunset for an IANA-zone site date. Event instants follow the real site-day
boundaries across DST; polar day and night are explicit. Task 03.4 consumes that position for its
plane-of-array transposition model.

Task 03.3 implements an optional Open-Meteo forecast adapter for temperature, irradiance and wind.
It validates complete UTC hourly responses and maps them onto the fixed-step grid. A caller-owned
cache stores complete provider snapshots; an unavailable provider uses the matching snapshot and
then repeatable seed-based synthetic weather. Provider failures return a typed, visible fallback
record. The engine imports no storage API and still produces a complete offline weather series.
Cache persistence is supplied by the application; this engine package includes a memory cache for
headless use and tests. Validation details and limits are in [`docs/weather-validation.md`](../../docs/weather-validation.md).

Task 03.4 adds `isotropic-sky-transposition-v1`. It combines beam incidence, isotropic sky diffuse
and ground-reflected irradiance using the configured panel orientation and SunCalc position. Albedo
defaults to the documented candidate assumption 0.2 and can be overridden. The output labels its
approximation and class-S modeled provenance. This calculates POA irradiance; applying losses to
PV electrical output is a later task. See [`docs/irradiance-validation.md`](../../docs/irradiance-validation.md).

Task 03.5 implements `noct-linear-v1` for modeled cell temperature and
`linear-power-temperature-coefficient-v1` for the 25 °C-relative power factor. The caller supplies
the coefficient from PV configuration and an explicit system derate; the result keeps those
factors separate and labels both estimates class S. The thermal model omits mounting and wind
corrections because the current scenario has no module-height wind or mounting inputs. Validation
and limits are in [`docs/panel-temperature-validation.md`](../../docs/panel-temperature-validation.md).

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
- The **solar geometry**: `solarPositionAt` calculates apparent elevation and azimuth from an
  absolute instant and coordinates; `solarDayForSiteDate` returns site-local sunrise, solar noon,
  sunset, real day length and explicit polar status. Dates are supported from 1900 through 2150.
  Reference fixtures and scope limits are recorded in
  [`docs/solar-validation.md`](../../docs/solar-validation.md).
- The **canonical units**: `watts`, `wattHours`, `kilowatts` and `kilowattHours` tag a value on the
  scale it was written in; `wattsFromKilowatts`, `kilowattsFromWatts`, `wattHoursFromKilowattHours`
  and `kilowattHoursFromWattHours` are the named scale changes; `intervalWattHours` is the per-step
  conversion; and `addWatts`/`addWattHours` sum one unit only. `celsius` holds °C above absolute
  zero, and `stateOfCharge` holds the 0–1 fraction with `percentFromStateOfCharge` and
  `stateOfChargeFromPercent` as the two display crossings.
- The **energy ledger**: `balanceStep` and `assertBalanced` settle a step's ten magnitudes into
  supply and demand and report a signed residual; `BALANCE_TERMS` and `BALANCE_TOLERANCE_WH` state
  the terms and the ±1e-6 Wh bound; `inverterConversionLoss` derives one loss from a declared
  efficiency; and `StepTerms`, `StepBalance`, `BalanceTerm` and `BalanceError` carry the shape, the
  result and the failure.
- The **component ports**: each model interface has one typed input and output, uses canonical unit
  types, receives only the configuration it needs and contains no UI or framework type. The weather
  source is an explicit async data boundary; the scheduler receives a limited observation; the clock
  lifecycle contract is implemented in 02.5.
- The **simulation clock**: `createSimulationClock` creates the fixed step grid from a validated
  scenario, implements explicit lifecycle transitions, advances one step at a time, validates the
  configured playback rate and maximum, and provides a resettable deterministic random stream.
- The **event journal**: `createEventJournal` records typed appliance, SOC, grid, forecast, inverter
  and optimization events with timestamp, step order, source, entity, previous/next state, payload,
  deterministic sequence and stable replay ID. Records and snapshots are immutable.

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

`npm run test` runs 102 engine tests and the application's ten, 112 in total:

- [`src/config/scenario.test.ts`](src/config/scenario.test.ts), 16 tests — the shipped scenarios
  validate and describe their geometry; optional shading profiles and tracking combinations are
  checked; invalid capacity, negative power, an impossible SOC window, a missing unit, an unknown
  site timezone and a start offset that contradicts that zone are each rejected with the right path,
  code and fix; issues collect instead of aborting; the issue report renders; the unit audit flags a
  synthetic `capacity` field; and properties cover issue rendering and the SOC invariant.
- [`src/time/time.test.ts`](src/time/time.test.ts), 18 tests — instants are stored once and formatted
  back in the site zone; naive, impossible, finer-than-a-millisecond and leap-second stamps are
  refused; a Tunisian day is 96 steps at 15 minutes; Paris gives 92 and 100 steps on its 23- and
  25-hour days; Lord Howe gives 94 and 98 on its half-hour days, and an hourly grid on a 23.5-hour day
  is refused; gap and overlap times resolve in the documented direction; the shipped 48-hour run is
  192 steps over two 96-step days; and two properties tile the grid and assign every step to one day.
- [`src/weather.test.ts`](src/weather.test.ts), 4 tests — provider validation and fixed-step interpolation,
  complete cache reuse while offline, deterministic synthetic replay, and visible HTTP/malformed-data fallback.
- [`src/solar/solar.test.ts`](src/solar/solar.test.ts), 4 tests — three independent city/date fixtures
  check sunrise, solar noon, sunset and noon position; DST start/end, polar day/night and invalid
  numerical/date inputs are covered.
- [`src/solar/plane-of-array.test.ts`](src/solar/plane-of-array.test.ts), 6 tests — formula components,
  panel orientation and sun incidence, cloudier inputs, night behavior, input guards and overflow.
- [`src/solar/panel-temperature.test.ts`](src/solar/panel-temperature.test.ts), 5 tests — NOCT equation,
  thermal monotonicity, coefficient direction, separate system derate, cold gain and guards.
- [`src/solar/pv-output.test.ts`](src/solar/pv-output.test.ts), 6 tests — PV loss factors, local shading,
  night zero, interval energy, inverter efficiency/clipping/standby and physical bounds.
- [`src/units/energy.test.ts`](src/units/energy.test.ts), 7 tests — power over an interval becomes
  non-negative watt-hours, the kW/kWh conversions round-trip, negative energy is rejected,
  non-finite and overflow values are refused, and properties cover wide power and interval ranges.
- [`src/units/quantity.test.ts`](src/units/quantity.test.ts), 7 tests — Celsius holds down to
  absolute zero; SOC stays a 0–1 fraction and crosses to percent; calculated SOC clamps within valid
  battery windows while properties exercise boundaries and extreme finite states.
- [`src/balance/balance.test.ts`](src/balance/balance.test.ts), 12 tests — a 1750 Wh step closes on
  both sides; the residual stays signed and the tolerance is inclusive; a negative, missing, unknown
  or non-finite term is refused; `BalanceError` names the step and both totals; conversion loss
  follows the inverter efficiency; and three properties show the residual is supply − demand, a
  derived eighth term closes the step, and interval energy feeds the ledger.
- [`src/simulation/interfaces.test.ts`](src/simulation/interfaces.test.ts), 2 tests — the public
  engine entry runs in plain Node with no browser globals, and typed ports exist for all eight
  component groups.
- [`src/simulation/clock.test.ts`](src/simulation/clock.test.ts), 6 tests — lifecycle transitions,
  invalid commands and seeds, fixed-step completion, playback-rate bounds, a frozen SplitMix64
  sequence, seed reset, and identical ordered replay at 1×, 60× and maximum speed.
- [`src/simulation/events.test.ts`](src/simulation/events.test.ts), 8 tests — all roadmap event types,
  event fields and stable IDs, identical replay, immutable payloads, transition semantics, monotonic
  timestamp/step ordering, and event-specific payload validation.
- [`src/lib/config/layers.test.ts`](../../src/lib/config/layers.test.ts), 10 application tests — the
  four layers stay separate and resolution fails closed.

`node scripts/check-config.mjs` proves eleven failure classes outside Vitest, audits every numeric
property in the contract, and asserts that no layer is silently merged. `node scripts/check-time.mjs`
is the acceptance proof for 02.1: it checks the shipped runs, a full day at each timestep, four DST
days, the two transition directions, instant storage and the unit scales, then feeds five broken
cases back through the public API. `node scripts/check-units.mjs` is the acceptance proof for 02.2:
it crosses every shipped kW and kWh boundary, holds all eighteen SOC fields to the fraction, compiles
eight deliberately mixed calculations that must each be refused, and feeds nine wrong-scale values
back through the constructors and the schema audit. `node scripts/check-balance.mjs` is the
acceptance proof for 02.3: it settles 1224 steps across the three shipped scenarios, one Tunis day
at all four timesteps and both Paris daylight-saving days, keeps every residual inside ±1e-6 Wh, and
feeds eleven broken ledgers back through the public API. `node scripts/validate-scenarios.mjs` runs the validator over every
committed scenario. None of the commands needs a build: Node strips the TypeScript types, and
`erasableSyntaxOnly` keeps the source within what stripping accepts (DEC-033).

**Not covered yet.** Weather, POA, panel temperature, PV DC and inverter AC components are available
through the engine, but the app does not yet persist the injected weather cache or call them from a
complete simulation coordinator. Battery/controller and household-dispatch models, full run outputs,
frontend visualizations and loss-breakdown UI remain future integration work. PVGIS yield calibration
also remains outstanding; these component calculations are modeled, not measured production.

## Layout

| Path | Role |
| --- | --- |
| `src/index.ts` | The public surface; every export is documented in the API notes |
| `src/config/scenario.ts` | The typed view of the contract |
| `src/simulation/interfaces.ts` | UI-free component inputs, outputs and ports for phase 02.4 |
| `src/simulation/clock.ts` | Fixed-step clock lifecycle, playback speed and seeded PRNG for phase 02.5 |
| `src/simulation/events.ts` | Typed state-transition events and deterministic append-only journal for phase 02.6 |
| `src/config/scenario.ts` | Scenario types, including full PV geometry and opt-in tracking for phase 03.1 |
| `src/units/state-of-charge.ts` | SOC fraction, percent crossings and battery-window clamp for calculated state |
| `src/config/schema.ts` | Ajv 8.20.0, error-to-issue translation and unknown-key suggestions |
| `src/config/invariants.ts` | The relational rules JSON Schema cannot express |
| `src/config/units.ts` | Unit suffixes, unitless quantities and the schema audit |
| `src/config/issues.ts` | `ConfigIssue`, `ConfigError`, the formatter and pointer reader |
| `src/config/scenario.test.ts` | Fifteen configuration tests over the shipped scenarios |
| `src/time/instant.ts` | `Instant`, strict ISO parsing, formatting and whole-minute arithmetic |
| `src/time/zone.ts` | IANA offsets, wall-clock resolution, site-date and site-day bounds |
| `src/solar/solar.ts` | SunCalc-backed position and site-local sun events for phase 03.2 |
| `src/solar/solar.test.ts` | Reference, DST, polar and input-boundary checks |
| `src/solar/plane-of-array.ts` | Isotropic-sky plane-of-array irradiance model for phase 03.4 |
| `src/solar/plane-of-array.test.ts` | Plane transposition, orientation and numerical-boundary checks |
| `src/solar/panel-temperature.ts` | NOCT cell-temperature and linear power-derating models for phase 03.5 |
| `src/solar/panel-temperature.test.ts` | Temperature, derating, provenance and invalid-input checks |
| `src/weather.ts` | Open-Meteo source, weather cache boundary and deterministic fallback for phase 03.3 |
| `src/weather.test.ts` | Provider, cache, offline repeatability and failure-path checks |
| `src/time/timeline.ts` | The uniform step grid and its split at local midnight |
| `src/time/time.test.ts` | Eighteen instance, day-boundary, DST and grid tests |
| `src/units/energy.ts` | Branded W, Wh, kW and kWh, the named conversions and same-unit addition |
| `src/units/temperature.ts` | Degrees Celsius, with absolute zero as the lower bound |
| `src/units/state-of-charge.ts` | The 0–1 SOC fraction and its two percent crossings |
| `src/units/energy.test.ts` | Six unit and property tests over power and energy |
| `src/units/quantity.test.ts` | Five tests over temperature and state of charge |
| `src/balance/balance.ts` | The ten-term step ledger, its tolerance and the conversion-loss helper |
| `src/balance/balance.test.ts` | Twelve ledger and property tests |
| `package.json` | `@dar-chams/engine`, TypeScript-source exports for the workspace |
