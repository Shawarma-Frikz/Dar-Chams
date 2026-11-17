# Configuration layers

| Field | Value |
| --- | --- |
| Version | 1.3.0 |
| Date | 2026-11-17 |
| Phase | 01 (task 01.4), 02.1, 02.2, 03.1; v1.1.0 adds the two site-time invariants; v1.2.0 adds the SOC, percent and temperature scale rules; v1.3.0 records complete PV geometry and optional shading profiles |
| Decided by | DEC-033; the site time contract by DEC-037; the canonical units by DEC-038; PV geometry by DEC-046 |
| Checked by | `node scripts/check-config.mjs`, or `npm run check` for all checks |
| Related | FR-SIM-10 · FR-SIM-07 · [Scenario conventions](../scenarios/README.md) · [Requirements](requirements.md) · [Decision log](decision-log.md) |

Task 01.4 asks for two things: defaults, scenario configuration, user settings and runtime state kept apart, and validation at startup that fails early with actionable messages. This document records where each layer lives, what may be merged and what may not, and the four failure classes the task names — with the message each one produces.

---

## 1 · The four layers

| Layer | Holds | Written by | How long it lives | Failure policy |
| --- | --- | --- | --- | --- |
| **Defaults** | Which scenario boots, and the initial value of every user setting | Code (`src/lib/config/defaults.ts`) | Until a scenario or the user replaces it | A bad default is a bug: it throws at startup and stops the build |
| **Scenario** | The complete installation and run: site, array, inverter, battery, grid, tariff, weather, household, policies | A file in [`scenarios/`](../scenarios/README.md), validated against the schema | One run; copied whole and frozen at load | Fatal: a `ConfigError` naming the field, the value and the fix |
| **User settings** | Presentation only — today, the motion preference | The user, through whatever phase 09 persists | Per browser, across sessions | Recoverable: an unreadable preference falls back to the default and reports why |
| **Runtime state** | What is happening now: status, step index, simulated instant, speed | The session | One page load or run | Discarded; never written back into the other three |

## 2 · Precedence, and the merge that must not happen

The layers are ordered — defaults, then scenario, then settings, then runtime — but "precedence" here does **not** mean merging. A scenario is complete by contract:

> no inheritance, no partial override layer, no defaults merged at runtime. A scenario must be readable in isolation.
> — [`scenarios/README.md`](../scenarios/README.md) §Conventions

That rule is what makes a run reproducible from its file: if a default silently filled a missing field, the effective value would not appear anywhere the reader can point at. So the defaults layer is allowed to supply values only where a layer is permitted to start empty:

| Defaults may supply | Defaults may not supply |
| --- | --- |
| `DEFAULT_SCENARIO_ID`: which file boots the application | Any field of a loaded scenario |
| `DEFAULT_SETTINGS`: the initial presentation values | Any installation, tariff, policy or household value |
| Nothing at all in runtime state, which is derived | A "close enough" value for a missing field, ever |

`scripts/check-config.mjs` asserts this rather than trusting the prose: it resolves the off-grid scenario and fails if its 6 kWp array comes back as the default scenario's 3 kWp.

## 3 · Where each layer lives

| Path | Role |
| --- | --- |
| `src/lib/config/defaults.ts` | The two values that may default: boot scenario id and initial settings |
| `src/lib/config/settings.ts` | The settings contract and the recovering parser |
| `src/lib/config/runtime.ts` | The runtime shape and its one-way derivation from the resolved configuration |
| `src/lib/config/resolve.ts` | The precedence rule in one function, freezing what it returns |
| `src/lib/config/validator.ts` | Compiles the shipped schema into a validator |
| `src/lib/config/startup.ts` | Runs resolution at module load, so an invalid boot scenario stops the build |
| `packages/engine/src/config/issues.ts` | The `ConfigIssue` shape and the shared formatter |
| `packages/engine/src/config/schema.ts` | Ajv, and the translation of Ajv errors into readable issues |
| `packages/engine/src/config/invariants.ts` | The relational rules JSON Schema cannot express |
| `packages/engine/src/config/units.ts` | The unit vocabulary and the audit of the contract itself |
| `packages/engine/src/config/scenario.ts` | The typed view of the contract, mirrored from the schema |

The engine owns the scenario contract and its validation because the engine is its only consumer; the application owns settings because presentation is not the engine's business. Both run in plain Node: the configuration modules use explicit `.ts` import specifiers, the root package declares `"type": "module"`, and the TypeScript is erasable (`erasableSyntaxOnly`), so the check script imports the very modules the build imports instead of a copy.

## 4 · Validation at startup

`src/app/layout.tsx` imports `startup.ts`, which resolves the boot scenario at module load. In the static export that happens at build time; in development it happens on the first request. Resolution is strict: it either returns a frozen configuration or throws.

```text
scenarios/tunis-typical-v1.json: 1 problem in the scenario configuration layer

1. battery.nominal_capacity_kwh  ·  schema.range
   must be greater than 0
   received  0
   expected  a number greater than 0
   fix       set the nameplate capacity in kWh; the default scenario uses 5.12 for a 5.12 kWh battery
```

That output is from a real build, with `nominal_capacity_kwh` temporarily set to `0`: `next build` stopped, exit code 1, instead of exporting a page that would have misreported storage. The scenario file was restored byte-for-byte afterwards (same SHA-256 as the committed blob).

**What the validator is allowed to cost the client.** Ajv and the validator run only where resolution runs — in Node, at build time. The exported client chunks contain none of it; the 01.4 build was checked for that, and the setting the application actually consumes reaches the page as a single attribute: `<html data-motion="system">`.

**Why `strictTypes` is relaxed.** The phase-00 contract omits `type: "object"` inside its `if`/`then` branches. That is valid JSON Schema with the same meaning, and rewriting a frozen artefact to satisfy a validator would be the wrong fix; every other strict check stays on.

## 5 · The four failure classes

Each class is injected by `scripts/check-config.mjs` on every run, and the script asserts the code, the path, and the words in the message.

| Class | Injected | Caught by | The message tells you |
| --- | --- | --- | --- |
| **Invalid capacity** | `battery.nominal_capacity_kwh: 0` | Schema range | Expected greater than 0, and that the unit is kWh — with a working example |
| **Negative power** | `grid.export_limit_kw: -1` | Schema range | Expected at least 0, and that direction is carried by the field, not by the sign |
| **Impossible SOC** | `initial_soc: 1.4` | Schema range | That fractions are written in `[0, 1]`, not percentages |
| **Impossible SOC** | `min_soc: 0.9`, `max_soc: 0.4` | Relational invariant | That the usable window is empty, because JSON Schema cannot compare two fields |
| **Impossible SOC** | `initial_soc` above `max_soc` | Relational invariant | Which window the value has to lie in |
| **Missing units** | `pv.tilt: 30` | Unknown key + suggestion | `did you mean "tilt_deg"?` and that field names carry their unit |
| **Missing room** | an appliance pointing at `garage` | Relational invariant | The rooms that do exist |
| **Unschedulable load** | a 900-minute task in a 9-hour window | Relational invariant | That the task cannot finish inside its window |
| **Unknown timezone** | `site.timezone: Mars/Olympus` | Site-time invariant (DEC-037) | That the zone must be an IANA name the runtime knows, with `Africa/Tunis` as the example |
| **Contradictory offset** | a start at `+02:00` where the site zone was at `+01:00` | Site-time invariant (DEC-037) | The offset the zone actually had at that instant, and the corrected start |

## 6 · Units and scales

Field names carry their unit where ambiguity is possible (`_kwh`, `_kw`, `_w`, `_deg`, `_minutes`, `_tnd_per_kwh`, …). At load time, an unknown key is rejected with a suggestion drawn from the schema's own vocabulary, so `tilt` is answered with `tilt_deg` rather than "additional property not allowed".

At check time, `auditSchemaUnits` walks the schema and enforces four rules:

- a numeric property's name ends in a recognised suffix, or the key is on the explicit unitless list (fractions, counts, seed);
- every `_soc` field is bounded by 0 and 1, because SOC is a fraction and 55 % is written `0.55`;
- a `_percent` field is refused outright: a percentage is a display form, converted with `percentFromStateOfCharge` or `stateOfChargeFromPercent`, never stored;
- a `_degc` bound does not start below absolute zero, although `celsius()` would refuse the value anyway.

The audit is self-tested against a synthetic `capacity` field, so it cannot pass by being vacuous, and `scripts/check-units.mjs` injects a widened SOC bound, a percent field and a sub-absolute-zero minimum to prove the three scale rules fire (DEC-038). The engine types themselves are branded, so a calculation that adds power to energy, or watt-hours to kilowatt-hours, does not compile; the same check compiles a fixture where eight such calculations must each produce the expected diagnostic.

Adding a numeric field therefore requires a decision: give it a unit, or add it to `UNITLESS_QUANTITIES` because it is a fraction or a count. A scale decision — percent, kWh, °C — is a boundary conversion in the engine, not a second representation in the contract.

## 7 · Why the policies differ

A scenario error is fatal and a settings error is not, and that asymmetry is deliberate.

- A scenario that cannot be understood must never run: the alternative is a simulation whose parameters the reader cannot reconstruct. Failing is the honest outcome.
- A preference that cannot be read must never stop the interface from opening. An old build's storage is not the user's fault, and the cost of discarding it is one attribute on `<html>`.
- A default that cannot be read is neither: it is a programming error, and it belongs in the build log, not in a silent fallback.

Runtime state has no policy to state because it is never an input: `createRuntimeState` reads the resolved configuration, and nothing writes back.

## 8 · What the check proves

```text
config: OK
  scenarios: 3 of 3 valid through the runtime validator (schema + relations)
  failures: 10 injected, each rejected with a path, a value and a fix
  units: every numeric property in the contract names its unit (audit self-tested)
  layers: defaults valid, settings refuse scenario fields, scenario frozen, runtime derived
```

`scripts/check-units.mjs` is the companion proof: it crosses every shipped kW and kWh boundary, holds all eighteen SOC fields to the fraction, compiles the mixed-unit fixture, and feeds nine wrong-scale values through the constructors and the audit. Beyond the ten injections in `check-config` it asserts that: the shipped defaults validate; a settings document carrying `battery` is reported as a layer violation; a settings document from another schema version is discarded with a reason; a presentation preference leaves the scenario byte-identical; the resolved scenario is frozen at every depth; and the runtime state starts from the scenario's own instant and speed. The harness itself was verified by corrupting one expected path and observing exit code 1 — a check that cannot fail proves nothing.

## 9 · What this does not cover yet

- **No settings store.** Nothing persists a preference until phase 09; the contract and its recovery rule exist so that phase cannot invent a second mechanism.
- **No runtime store.** Advancing a run is the simulation clock's work in 02.5; `runtime.ts` only fixes the direction of the dependency.
- **No clamping.** FR-SIM-07's documented clamp rules for numerically extreme but structurally valid input belong to phase 02.7, and are a different problem from a configuration that contradicts itself.
- **No editor.** FR-UX-06's scenario editor consumes this validator in phase 09.6; it will render the same `ConfigIssue` objects rather than new messages.
