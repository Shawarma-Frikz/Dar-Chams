# API notes

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-16 |
| Phase | 01 (task 01.6) |
| Checked by | `node scripts/check-docs.mjs` |
| Related | [Documentation system](documentation.md) §4 · [Data dictionary](data-dictionary.md) · DEC-002, DEC-033 |

This document records the surfaces another module may rely on. It is deliberately narrower than the
source: a helper that is exported for a test is not an API, and an interface that appears here is a
promise that its name and meaning stay stable until a decision-log entry changes them.

## 1 · `@helios/engine`

The engine is a workspace package that exports TypeScript source; Next.js transpiles it and Node 26
strips its types, so there is no build step between the source and either consumer. It may not import
React, Next.js, the DOM or the application (DEC-002).

```ts
import { createScenarioValidator, formatIssues } from '@helios/engine';
import type { Scenario } from '@helios/engine';
```

`ENGINE_VERSION` is `0.1.0`. It is the version written into a run manifest (NFR-03), so it changes
with the engine and not only with the application.

<!-- engine-exports:start -->
| Export | Kind | Contract |
| --- | --- | --- |
| `ENGINE_NAME` | const | `'helios-engine'`; the name written into a run manifest |
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
| `Pv` | type | Array capacity, module count, tilt, azimuth, temperature terms, losses, shading and tracker |
| `Room` | type | Stable id, name and room type |
| `Scenario` | type | The complete validated document: 17 top-level groups |
| `SchedulerPolicy` | type | Reserve SOC, forecast horizon and the fallback policy |
| `Simulation` | type | Timestep, start instant, horizon, seed and default speed |
| `Site` | type | Label, latitude, longitude, altitude and IANA timezone |
| `Tariff` | type | Currency, verification status, import bands, fixed charge and export compensation |
| `TariffBand` | type | A monthly threshold and its price, both nullable while the tariff is unverified |
| `TimestepMinutes` | type | `5`, `15`, `30` or `60` |
| `TimeWindow` | type | Clock start and end in site time; a window may cross midnight |
| `Tracker` | type | Enable flag and 0, 1 or 2 axes |
| `Weather` | type | Primary and historical sources, cache directory, refresh period and fallback order |
<!-- engine-exports:end -->

The schema is the authority; the interfaces give the engine a typed view after validation. A change
to one is reviewed with the other in the same commit (DEC-021, DEC-033).

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
| `SETTINGS_STORAGE_KEY` | const | `helios.settings.v1`; the storage key phase 09 will use |
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
