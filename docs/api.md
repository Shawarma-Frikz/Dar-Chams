# API notes

| Field | Value |
| --- | --- |
| Version | 1.9.0 |
| Date | 2026-11-17 |
| Phase | 01 (task 01.6); v1.1.0 adds the phase-02.1 time base; v1.2.0 adds the phase-02.2 canonical units; v1.3.0 adds the phase-02.3 energy ledger; v1.4.0 records the Dar Chams package and run identity (DEC-041); v1.5.0 defines the phase-02.4 component ports; v1.6.0 implements the phase-02.5 deterministic clock; v1.7.0 adds the phase-02.6 event journal; v1.8.0 adds phase-02.7 numerical guards; v1.9.0 defines phase-03.1 PV geometry |
| Checked by | `node scripts/check-docs.mjs` |
| Related | [Documentation system](documentation.md) §4 · [Data dictionary](data-dictionary.md) · DEC-002, DEC-033, DEC-037–DEC-039, DEC-041–DEC-046 |

This document records the surfaces another module may rely on. It is deliberately narrower than the
source: a helper that is exported for a test is not an API, and an interface that appears here is a
promise that its name and meaning stay stable until a decision-log entry changes them.

## 1 · `@dar-chams/engine`

The engine is a workspace package that exports TypeScript source; Next.js transpiles it and Node 26
strips its types, so there is no build step between the source and either consumer. It may not import
React, Next.js, Three.js, the DOM or the application (DEC-002).

```ts
import { createScenarioValidator, formatIssues } from '@dar-chams/engine';
import type { Scenario } from '@dar-chams/engine';
```

`ENGINE_VERSION` is `0.1.0`. It is the version written into a run manifest (NFR-03), so it changes
with the engine and not only with the application.

<!-- engine-exports:start -->
| Export | Kind | Contract |
| --- | --- | --- |
| `ENGINE_NAME` | const | `'dar-chams-engine'`; the name written into a run manifest |
| `ENGINE_VERSION` | const | `'0.1.0'`; the engine version written into a run manifest |
| `ConfigError` | class | `Error` subclass carrying `source` and the full `issues` list; its message is the formatted report |
| `describeValue` | function | Renders any value as a reader would write it back into a scenario, capped at 80 characters |
| `formatIssues` | function | Renders issues as a numbered block; returns `source: valid` for an empty list |
| `readPath` | function | Resolves an RFC 6901 JSON Pointer against the document that failed |
| `sortIssues` | function | Stable order by path, then by code |
| `checkScenarioInvariants` | function | Runs the relational rules after schema validation and returns every contradiction found |
| `createScenarioValidator` | function | Compiles a schema once and returns `{ check(document) }`; the compiled validator is reusable |
| `auditSchemaUnits` | function | Walks a schema and returns one issue per numeric property whose name carries no unit |
| `hasUnitSuffix` | function | True when a key ends in one of the recognised unit suffixes |
| `UNIT_SUFFIXES` | const | The ordered, longest-first unit suffix list (`_kwh_per_month`, `_kw`, `_w`, …) |
| `UNITLESS_QUANTITIES` | const | Fractions, counts and the seed, exempt from the unit suffix rule |
| `ConfigIssue` | type | Layer, dotted path, stable code, message, and optional received value, expected value and hint |
| `IssueLayer` | type | `'defaults'`, `'scenario'`, `'settings'` or `'runtime'` |
| `ScenarioCheck` | type | `{ ok: true; scenario }` or `{ ok: false; issues }` |
| `ScenarioValidator` | type | `{ check(document): ScenarioCheck }` |
| `Appliance` | type | One load: id, name, room, rated power, priority, controllability and one profile block |
| `ApplianceProfile` | type | `'always_on'`, `'duty_cycle'`, `'schedule'` or `'flexible_window'` |
| `BaselinePolicy` | type | Reserve SOC, shed order and hysteresis for the rule baseline |
| `Battery` | type | Chemistry, capacity, SOC window, power limits, round-trip efficiency and degradation |
| `Degradation` | type | Enable flag and annual capacity fade, an optional proxy |
| `Flexibility` | type | Earliest, latest, duration and non-interruptible flag for a flexible load |
| `Grid` | type | Import and export limits and outage windows |
| `Household` | type | Preset label, rooms and appliances |
| `Inverter` | type | AC rating, efficiency, standby draw and clipping behaviour |
| `OperatingMode` | type | `'grid_connected'` or `'off_grid'` |
| `Outage` | type | Start and end instants of an islanded interval |
| `Policies` | type | Baseline and scheduler policy blocks |
| `Priority` | type | `'critical'`, `'important'`, `'flexible'` or `'discretionary'` |
| `Provenance` | type | Provenance class and the notes that record assumptions |
| `ProvenanceClass` | type | `'synthetic-design'`, `'dataset-derived'` or `'measured'` |
| `Pv` | type | Array nameplate capacity, module count, tilt from horizontal, true-north azimuth, temperature terms, losses, optional shading profile and opt-in tracker |
| `Room` | type | Stable id, name and room type |
| `Scenario` | type | The complete validated document: 17 top-level groups |
| `SchedulerPolicy` | type | Reserve SOC, forecast horizon and the fallback policy |
| `Simulation` | type | Timestep, start instant, horizon, seed and default speed |
| `Site` | type | Label, latitude, longitude, altitude and IANA timezone |
| `Tariff` | type | Currency, verification status, import bands, fixed charge and export compensation |
| `TariffBand` | type | A monthly threshold and its price, both nullable while the tariff is unverified |
| `TimestepMinutes` | type | `5`, `15`, `30` or `60` |
| `TimeWindow` | type | Clock start and end in site time; a window may cross midnight |
| `ShadingProfile` | type | Optional recurring site-local shading windows |
| `ShadingWindow` | type | A site-local time interval with a shading-loss fraction in `[0, 1]` |
| `Tracker` | type | Discriminated fixed (disabled, 0 axes) or tracking (enabled, 1 or 2 axes) configuration |
| `Weather` | type | Primary and historical sources, cache directory, refresh period and fallback order |
| `Instant` | type | Milliseconds since the Unix epoch, tagged; the only internal timestamp form |
| `parseInstant` | function | Reads ISO 8601 with `Z` or `±hh:mm`; refuses a naive time, an impossible date, a leap second or sub-millisecond precision |
| `formatInstant` | function | The canonical UTC form, `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `instantEpochMilliseconds` | function | The underlying millisecond count, for manifests and storage boundaries |
| `instantFromEpochMilliseconds` | function | Rebuilds an instant from a stored millisecond count; refuses a non-integer |
| `addMinutes` | function | Advances by whole minutes; the operation a step uses |
| `minutesBetween` | function | The distance between two instants in minutes |
| `isTimeZone` | function | True when the runtime's IANA zone database knows the identifier |
| `zonedParts` | function | Year, month, day, hour, minute and second of an instant in a zone |
| `zoneOffsetMinutes` | function | The offset east of UTC in effect at that instant, in minutes |
| `instantFromZonedParts` | function | Resolves a wall clock to an instant; a gap shifts forward, an overlap takes the earlier occurrence |
| `formatZonedInstant` | function | ISO 8601 in the site zone with its numeric offset, e.g. `2026-06-21T00:00:00.000+01:00` |
| `siteDate` | function | The `YYYY-MM-DD` site day containing an instant |
| `siteDayBounds` | function | Local midnight to the next local midnight, with the day's real length in minutes |
| `ZonedParts` | type | Year, month, day, hour, minute and second in a zone |
| `SiteDayBounds` | type | Date, start, end and minutes of one site day |
| `TIMESTEP_MINUTES` | const | `[5, 15, 30, 60]`; the timesteps the step grid accepts |
| `createStepGrid` | function | A uniform grid from a start, a timestep and a whole-minute duration; refuses a partial final step |
| `stepAt` | function | The step at an index, with absolute start and end instants |
| `stepsInSiteDay` | function | Whole steps between local midnights; refuses a day whose boundary does not align |
| `siteDayGrid` | function | A full site-day grid, local midnight to local midnight |
| `groupStepsBySiteDay` | function | Splits a run at local midnight; a step belongs to the day its start falls in |
| `StepGrid` | type | Start, end, timestep, duration and step count |
| `Step` | type | Index, start, end and duration of one step |
| `SiteDaySegment` | type | A site day's bounds plus its first and last step index |
| `Watts` | type | Instantaneous power in watts, the internal unit |
| `WattHours` | type | Interval energy in watt-hours, the internal unit |
| `Kilowatts` | type | Instantaneous power in kilowatts, an input and display scale |
| `KilowattHours` | type | Energy in kilowatt-hours, an input and display scale |
| `watts` | function | Tags a value already counted in W; refuses a non-finite number |
| `wattHours` | function | Tags a value already counted in Wh; refuses non-finite or negative energy |
| `kilowatts` | function | Tags a value already counted in kW; the `_kw` scenario boundary |
| `kilowattHours` | function | Tags a value already counted in kWh; refuses non-finite or negative energy |
| `intervalWattHours` | function | Power × minutes ÷ 60 → watt-hours, the per-step conversion |
| `wattsFromKilowatts` | function | kW → W at an input boundary |
| `kilowattsFromWatts` | function | W → kW at a display boundary |
| `wattHoursFromKilowattHours` | function | kWh → Wh at an input boundary |
| `kilowattHoursFromWattHours` | function | Wh → kWh at a display boundary |
| `addWatts` | function | Sums watts only; an energy argument is a compile error |
| `addWattHours` | function | Sums watt-hours only; a power argument is a compile error |
| `Celsius` | type | A temperature in degrees Celsius, the canonical unit |
| `ABSOLUTE_ZERO_CELSIUS` | const | `-273.15`; the lower bound `celsius` enforces |
| `celsius` | function | Tags a value already counted in °C; refuses one below absolute zero |
| `StateOfCharge` | type | A state of charge in the 0–1 fraction |
| `stateOfCharge` | function | Tags a 0–1 fraction; refuses 55 where 0.55 belongs |
| `clampStateOfCharge` | function | Clamps a finite calculated SOC to a validated battery usable window |
| `percentFromStateOfCharge` | function | Fraction → percent at a display boundary |
| `stateOfChargeFromPercent` | function | Percent → fraction at an input boundary |
| `BALANCE_TERMS` | const | The nine term names in supply-then-demand order: `pv`, `gridImport`, `batteryDischarge`, `load`, `batteryCharge`, `gridExport`, `conversionLoss`, `batteryLoss`, `standbyLoss` |
| `BALANCE_TOLERANCE_WH` | const | `1e-6`; the absolute, inclusive bound on the residual in watt-hours |
| `BalanceError` | class | `Error` subclass carrying the step index, supply, demand, residual and tolerance |
| `assertBalanced` | function | Settles a step and throws `BalanceError` when the residual exceeds the tolerance |
| `balanceStep` | function | Sums the nine magnitudes into supply and demand and returns the signed residual and the balance decision |
| `inverterConversionLoss` | function | AC energy × (1 / efficiency − 1); the DC energy an inverter consumed beyond what it delivered |
| `BalanceTerm` | type | One of the nine ledger term names |
| `StepBalance` | type | Supply, demand, signed residual, tolerance and `balanced` |
| `StepTerms` | type | One non-negative watt-hour magnitude per ledger term |
| `ApplianceDispatch` | type | Scheduler decision for one appliance ID |
| `ApplianceInput` | type | Appliance configuration, step and explicit enabled decision |
| `ApplianceModel` | type | `demand(input): ApplianceOutput`; contains no UI dependency |
| `ApplianceOutput` | type | Load power in W and interval energy in Wh |
| `BatteryInput` | type | Battery configuration, step, SOC and separate requested charge/discharge power |
| `BatteryModel` | type | `advance(input): BatteryOutput` |
| `BatteryOutput` | type | Next SOC, charge energy, discharge energy and battery loss in Wh |
| `ClockStatus` | type | `'idle'`, `'running'`, `'paused'` or `'complete'` |
| `GridInput` | type | Grid configuration, step and separate requested import/export power |
| `GridModel` | type | `settle(input): GridOutput` |
| `GridOutput` | type | Grid import and export energy in Wh |
| `InverterInput` | type | Inverter configuration, step and PV DC power |
| `InverterModel` | type | `convert(input): InverterOutput` |
| `InverterOutput` | type | AC power and separately owned conversion and standby losses |
| `PvInput` | type | PV configuration, step and one weather frame |
| `PvModel` | type | `evaluate(input): PvOutput` |
| `PvOutput` | type | DC power at the array terminals in W |
| `Scheduler` | type | `decide(input): SchedulerOutput`; consumes only an explicit observation |
| `SchedulerInput` | type | Scheduler policy, observed state and appliance configurations |
| `SchedulerObservation` | type | Step, SOC, available PV, forecast load, grid availability and import price; no Scenario or UI store |
| `SchedulerOutput` | type | Appliance dispatch and separate requested battery charge/discharge power |
| `SimulationClock` | type | Read lifecycle state, start/pause/resume/reset, advance one fixed step, set playback speed and draw seeded random values |
| `SimulationClockState` | type | Status, step index, current step, selected and maximum playback speed and replay seed |
| `WeatherFrame` | type | Time, ambient temperature, irradiance, wind speed and provenance |
| `WeatherQuery` | type | Site and requested step grid |
| `WeatherSource` | type | `read(query): Promise<WeatherFrame[]>`; external I/O boundary |
| `createSimulationClock` | function | Builds an idle fixed-step clock from a validated scenario; playback speed never changes the step grid |
| `SimulationClockOptions` | type | Optional maximum playback speed, default 1000× |
| `createEventJournal` | function | Creates an append-only, timestamp-ordered event journal with IDs derived from scenario ID, seed and sequence |
| `EventJournal` | type | Append validated events, read immutable snapshots and inspect event count |
| `SimulationEvent` | type | A typed event plus stable event ID and deterministic sequence number |
| `SimulationEventInput` | type | Discriminated event inputs for appliance, SOC, grid, forecast, inverter and optimization transitions |
<!-- engine-exports:end -->

The schema is the authority; the interfaces give the engine a typed view after validation. A change
to one is reviewed with the other in the same commit (DEC-021, DEC-033).

The time functions are the axis every later phase uses (DEC-037): an instant is stored once, in UTC,
and a site day is read from the scenario's IANA zone rather than assumed to be 24 hours.

The unit functions are branded quantities (DEC-038). Power is W, interval energy is Wh, temperature
is °C and state of charge is the 0–1 fraction; kW, kWh and percent exist only behind the named
conversions above. A raw scenario number becomes a quantity only in a constructor — `watts()` for a
`_w` field, `wattsFromKilowatts()` for a `_kw` one — and `addWatts`/`addWattHours` accept one unit
only, so a power-plus-energy expression has to be resolved deliberately rather than compile as a
number. A branded number is still a number, so the guard covers arithmetic and assignment, not a
call to a constructor for another quantity; `scripts/check-units.mjs` compiles a fixture where every
mixed calculation must be refused.

Phase 02.4 adds framework-free component ports. Each model receives only its required configuration,
the current step and typed domain inputs, and returns W, Wh, temperature or SOC using canonical
types. Weather I/O is isolated behind `WeatherSource`; the scheduler sees `SchedulerObservation`
instead of the full scenario or UI state. Task 02.5 implements `createSimulationClock`: it advances
only on explicit step calls and provides a SplitMix64 random stream, versioned by DEC-043; resetting
to a seed rewinds it. Start/pause/resume/reset and playback-rate changes do not read wall time. These
interfaces do not claim that any physical model exists yet.

Task 02.6 adds `createEventJournal`. Its discriminated event types cover appliance start/stop, SOC
threshold crossings, grid outage/return, forecast updates, inverter limits and optimization actions.
Each event carries an absolute timestamp, monotonic step index, source, stable entity ID, previous and
next state, typed payload, deterministic sequence and ID. IDs derive from scenario ID, seed and append
order; the journal rejects invalid transitions and out-of-order timestamps or steps and returns frozen
snapshots. It records domain events without adding a browser store or claiming physical models.

Task 02.7 rejects negative and non-finite Wh/kWh quantities, prevents signed power from becoming
negative interval energy, and detects overflow. `clampStateOfCharge` is explicitly for calculated
battery state: it rejects non-finite candidates and invalid configured bounds, then clamps only to
that battery's validated usable window. External SOC input continues through the strict 0–1
constructor and is rejected when impossible.

The ledger is the conservation law every simulated step is settled against (DEC-039). `pv`,
`gridImport` and `batteryDischarge` are supply; `load`, `batteryCharge`, `gridExport`,
`conversionLoss`, `batteryLoss` and `standbyLoss` are demand. Every term is a non-negative
`WattHours` magnitude and the direction is in the name, so a reversed flow changes its term rather
than its sign; the residual is the only signed number and is a plain `number`, not an energy.
`balanceStep` reports, `assertBalanced` throws with the step index, and `inverterConversionLoss`
computes one of the three losses from a declared efficiency instead of leaving it as a free
parameter. The identity, its tolerance and its limits are in [the energy balance](energy-balance.md).

## 2 · Application configuration surface

These modules are the application-level API: the four layers, the resolved configuration, the
settings boundary, runtime state and the route registry. They are imported by the route shell and by
the tests, never by the engine.

<!-- config-exports:start -->
| Export | Kind | Contract |
| --- | --- | --- |
| `DEFAULT_SCENARIO_ID` | const | `'tunis-typical-v1'`; which scenario boots the application |
| `DEFAULT_SCENARIO_SOURCE` | const | `scenarios/tunis-typical-v1.json`; the source label quoted in errors |
| `DEFAULT_SETTINGS` | const | Frozen initial presentation settings; installation values never default here |
| `SETTINGS_SCHEMA_VERSION` | const | `1`; a settings document from another version is discarded |
| `SETTINGS_STORAGE_KEY` | const | `dar-chams.settings.v1`; the storage key phase 09 will use |
| `MotionPreference` | type | `'system'` or `'reduced'` |
| `UserSettings` | type | Settings schema version and the presentation block |
| `SettingsLoad` | type | The usable settings, the issues found and whether the parser recovered |
| `parseUserSettings` | function | Validates stored settings and never throws; unreadable values fall back with a reason |
| `ResolvedConfiguration` | type | Source, deeply frozen scenario, presentation preference and engine identity |
| `ResolveInput` | type | Scenario document, source label and optional stored settings |
| `resolveConfiguration` | function | Applies precedence without merging; throws `ConfigError` on any issue |
| `RuntimeStatus` | type | `'idle'`, `'running'` or `'paused'` |
| `RuntimeState` | type | Status, step index, simulated instant and speed multiplier |
| `createRuntimeState` | function | Derives the runtime state from a resolved configuration; never an input |
| `CONFIGURATION` | const | The boot scenario, resolved at module load so an invalid one stops the build |
| `SCENARIO_SCHEMA_SOURCE` | const | `scenarios/scenario.schema.json`; the schema the validator compiled |
| `scenarioValidator` | const | The compiled validator shared by startup, tests and check scripts |
| `PRIMARY_ROUTES` | const | The six route descriptors behind navigation and the overview index |
| `PrimaryRoute` | type | Href, label, title, summary, phase and requirement references |
<!-- config-exports:end -->

## 3 · What is not public

- Internal helpers in `packages/engine/src/config/` that are not re-exported by `src/index.ts`:
  their names may change without a decision.
- Test fixtures and `*.test.ts` files.
- The Ajv configuration, the schema file and the exact error vocabulary. The codes are stable
  identifiers for checks, but the wording of a message may improve.
- Anything in `src/app/` or `src/components/`: routes and components are application structure, not
  an API for other code to import.

The engine is pre-1.0, so a breaking change is permitted, but it is a decision-log entry and an API
diff in the same commit, not a silent rename.

## 4 · The check

`scripts/check-docs.mjs` parses `packages/engine/src/index.ts` and every non-test module in
`src/lib/config/` plus `src/lib/routes.ts`, and compares the export sets with the two tables above.
An export without a row, a row without an export and a duplicate row each fail `npm run check`. The
generated data dictionary covers field-level detail; this document covers the callable surface.
