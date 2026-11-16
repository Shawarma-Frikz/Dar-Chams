# Application configuration

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Phase | 01 (task 01.6); settings and runtime stores from phases 02 and 09 |
| Checked by | `npm run test`, `node scripts/check-config.mjs` |
| Design | [`docs/configuration.md`](../../docs/configuration.md) |
| Decisions | DEC-021, DEC-033 |

## Purpose

`src/lib/config` keeps the four configuration layers apart: defaults, the scenario, user settings
and runtime state. The layering exists so a value that changes a simulation result can only come
from the scenario file someone wrote, and so a presentation preference can never alter the plant.
This module is the application half; the contract and its validation live in the engine because the
engine is the contract's only consumer.

## Inputs

- A **scenario document** and its source label, passed to `resolveConfiguration`. `startup.ts`
  supplies the boot file, `scenarios/tunis-typical-v1.json`.
- The **compiled schema validator** from `validator.ts`, built from
  `scenarios/scenario.schema.json` at module load.
- **Stored user settings** of unknown shape, when phase 09 supplies them; today `resolveConfiguration`
  takes the default settings.
- `DEFAULT_SETTINGS` and `DEFAULT_SCENARIO_ID` — the only two values allowed to default.

## Outputs

- `ResolvedConfiguration`: the source label, the deeply frozen scenario, the presentation preference
  and the engine name and version.
- `ConfigError`: thrown by `resolveConfiguration` with every issue formatted as a numbered block.
- `SettingsLoad`: a usable `UserSettings`, the issues found and whether the parser recovered. The
  parser never throws.
- `RuntimeState`: status, step index, simulated instant and speed, derived from the resolved
  configuration and never written back.
- `CONFIGURATION`: the boot configuration, resolved at module load so a bad scenario stops the build.

The public list is the second table in [`docs/api.md`](../../docs/api.md).

## Tests

```text
npm run test
node scripts/check-config.mjs
```

`npm run test` runs [`layers.test.ts`](layers.test.ts) — ten tests and one property. They prove that
the shipped settings validate and are frozen; that a settings document carrying a scenario field is
reported as a layer violation with the presentation value kept; that settings from another schema
version are discarded with a reason; that unreadable shapes fall back; that `parseUserSettings` never
throws for arbitrary `JSON.parse` output (300 runs); that runtime state derives from the scenario and
cannot mutate it; that the resolved scenario is frozen at every depth; and that resolution throws
`ConfigError` for a contradictory scenario and for stale settings.

`node scripts/check-config.mjs` carries the four failure classes task 01.4 names, the unit audit,
the layer boundaries and a negative test of the harness itself. Both commands run in `npm run check`
and in `npm run verify`.

**Not covered yet.** Nothing persists settings until phase 09 and nothing advances runtime state
until phase 02; those modules fix the direction of the dependency, not the store.

## Layout

| Path | Role |
| --- | --- |
| `defaults.ts` | The boot scenario id and the initial settings |
| `settings.ts` | The settings contract and the recovering parser |
| `runtime.ts` | Runtime state and its one-way derivation |
| `resolve.ts` | Precedence, freezing and the strict throw |
| `validator.ts` | The compiled scenario validator |
| `startup.ts` | Resolution at module load |
| `layers.test.ts` | Ten unit and property tests over the layers |
