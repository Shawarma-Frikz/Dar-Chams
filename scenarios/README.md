# Scenario files

A scenario is the complete, self-contained description of one virtual installation. If a value can change a simulation result, it belongs in a scenario file — never in engine code. This is the rule that makes task 00.2's acceptance condition checkable: the engine receives a scenario, and there is no second place where a capacity, a limit or a priority is written down.

## Purpose

The folder is the installation input to every run: the demo boots `tunis-typical-v1.json`, the
experiments pair scenarios, and the tests read the shipped files rather than copies. One file
describes one installation; a meaningful change creates a new versioned file, so a result can always
be traced back to the exact document that produced it. The folder is not a place for defaults,
overrides or generated output. The whole-file contract is DEC-021; the validator that enforces it is
DEC-033.

## Inputs

- [`scenario.schema.json`](scenario.schema.json) — the contract every file must satisfy, including
  the conditional rules for tracker axes, off-grid limits, verified tariffs and appliance profiles.
- The author's design decisions for site, array, inverter, battery, grid, tariff, weather, household
  and policies, recorded in the file itself with a provenance class and notes.
- For phase 03.1, site latitude/longitude/altitude and array capacity/count/tilt/azimuth are explicit.
  Capacity is the total array nameplate DC rating at STC; tilt is measured from horizontal; azimuth
  is a compass bearing clockwise from true north (0° north, 90° east, 180° south, 270° west).
  `pv.shading_profile` is optional and, when present, its daily recurring, non-overlapping windows
  use site-local clock time and each declares a shading-loss fraction in `[0, 1]`. Windows may
  cross midnight; equal start/end and overlapping intervals are rejected. Fixed arrays are explicit
  as `tracker: { enabled: false, axes: 0 }`; tracking must be
  enabled and declare one or two axes before a scenario can use it.
- The conventions below: units in names, fractions in `[0, 1]`, UTC instants, one seed, stable ids.

## Outputs

- A validated scenario document whose file name equals its `id`.
- The scenario hash that enters a run manifest (NFR-03), and the fixtures the engine and application
  tests read.
- Controlled pairs — `tunis-offgrid-v1` and `tunis-dust-v1` against the default or against a
  same-date copy — in which one variable changes and the rest is held constant.

## Tests

```text
node scripts/validate-scenarios.mjs
npm run check:config
npm run test
```

`validate-scenarios.mjs` runs the engine validator over every file and exits non-zero on the first
failure. `check:config` proves the four required failure classes and the unit audit, and `npm run test`
reads these files as fixtures, so a scenario that stops validating fails the test suite and the check
together. The two validation passes and the invariants they enforce are described under
[Validation](#validation) below.

## Files

| File | Role | What it is for |
| --- | --- | --- |
| [`scenario.schema.json`](scenario.schema.json) | Contract | JSON Schema 2020-12 that every scenario must satisfy; strict (`additionalProperties: false`) at every level |
| [`tunis-typical-v1.json`](tunis-typical-v1.json) | Default | Grid-connected 3 kWp household; the scenario the demo, tests and report use unless stated otherwise |
| [`tunis-offgrid-v1.json`](tunis-offgrid-v1.json) | Variant | Off-grid villa sized for autonomy; identical household, no grid exchange |
| [`tunis-dust-v1.json`](tunis-dust-v1.json) | Variant | Heavy soiling (12%) in the spring dust season; used to exercise underproduction detection and attribution |

The default scenario is `tunis-typical-v1.json`. File name equals `id`, and `id` carries a version suffix: a scenario is a fixture, so changing a meaningful value means creating a new file, not silently editing the one a previous run referenced.

## Variants isolate one variable

The two variants are controlled comparisons, not alternative configurations offered for taste. Each changes one thing and keeps everything else identical to `tunis-typical-v1.json`:

| Variant | Changed | Held constant | Why |
| --- | --- | --- | --- |
| `tunis-offgrid-v1` | Operating mode, array size, battery capacity and SOC window, inverter rating, grid limits, reserve policies, tariff placeholder text | Site, timestep, load profile, appliance list, seed, loss factors | Off-grid is a different installation, not a switch: a 3 kWp/5.12 kWh system cannot be meaningfully assessed off-grid, so sizing and mode change together. The household stays fixed so the storage and mode effect is not confounded by a different load. |
| `tunis-dust-v1` | `pv.soiling_loss` 0.02 → 0.12, and the start moved to 2026-03-20 (spring dust season) | Capacity, inverter, battery, tariff, weather sources, seed, availability, mismatch, household | The dust scenario needs a date inside the dust season to be plausible, so its comparison baseline is a same-date copy at 2% soiling produced by the phase 03.7 experiment — not `tunis-typical-v1`, which starts in June. Soiling must be the difference the detector reacts to; season must not be a second explanation in the same pair. |

Both variants declare `synthetic-design` provenance and state in `provenance.notes` that the event is injected, not measured. Because `tunis-dust-v1` also changes the date, it is a same-date pair, not a pair against the default; the report must not present it as a season-controlled comparison.

## Conventions

- **Format.** JSON, UTF-8, two-space indentation. One file per scenario; no inheritance, no partial override layer, no defaults merged at runtime. A scenario must be readable in isolation.
- **Units in names.** Field names carry the unit where ambiguity is possible: `_kw`, `_kwh`, `_w`, `_degc`, `_deg`, `_minutes`, `_hours`, `_kwp`, `_m`, `_tnd`.
- **Fractions.** Efficiencies, losses and state of charge are fractions in `[0, 1]`, not percentages.
- **Time.** Instants are ISO-8601 with an explicit UTC offset. Clock times inside schedules are `HH:MM` in `site.timezone` (`Africa/Tunis`, UTC+1, no DST). A window may cross midnight — `fan` runs 22:00→06:00 — and the engine must wrap it explicitly rather than treating the end as later than the start.
- **Seeds.** `simulation.seed` is the only randomness source. Weather fallback, load variation and any stochastic term derive from it, so a run is reproducible from the file alone.
- **Identity.** Rooms and appliances have stable snake_case `id` values. Array order is display order; `id` is identity and is what events, annotations and the 3D twin reference.
- **Priority vocabulary is fixed.** `critical`, `important`, `flexible`, `discretionary`. Priority is policy metadata; no controller may infer or learn it.

## Field groups

| Group | Contents |
| --- | --- |
| `site` | Coordinates, altitude, IANA timezone |
| `mode` | `grid_connected` or `off_grid` |
| `simulation` | Timestep, start instant, horizon, seed, default speed |
| `pv` | Capacity, module count, tilt, azimuth, temperature coefficient, NOCT, loss factors, shading windows, tracker |
| `inverter` | AC rating, efficiency, standby draw, clipping behaviour |
| `battery` | Chemistry label, capacity, SOC window, power limits, round-trip efficiency, optional degradation |
| `grid` | Import/export limits, outage windows |
| `tariff` | Currency, import bands, fixed charge, export compensation, verification status |
| `weather` | Forecast and historical sources, cache directory, refresh period, fallback order |
| `household` | Preset label, rooms, appliances |
| `policies` | Baseline thresholds and scheduler configuration |

## Appliance schema

Every appliance declares `id`, `name`, `room`, `rated_power_w`, `priority`, `controllable` and one `profile`. The profile selects the additional block that becomes mandatory:

| `profile` | Extra fields | Meaning |
| --- | --- | --- |
| `always_on` | — | Runs at rated power for the whole run |
| `duty_cycle` | `duty_cycle` (0–1) | Cycles with the given average duty ratio (refrigerator, 0.35) |
| `schedule` | `schedule.start`, `schedule.end` | Runs inside a fixed daily window; may cross midnight |
| `flexible_window` | `flexibility.earliest`, `.latest`, `.duration_minutes`, `.non_interruptible` | Runnable anywhere inside the window for the required duration; the scheduler places it |

`note` is free-text for the reader and never affects the engine. Only `controllable: true` appliances may be shed or deferred; `flexible_window` implies it and the schema rejects the contradiction.

Two schema rules worth calling out, because they prevent whole classes of silent bug:

- A profile's block is **required but not interchangeable** — an `always_on` appliance carrying a `schedule` is rejected rather than one being ignored.
- `flexible_window` always requires `controllable: true`, so a "flexible" load can never be immovable.

## Tariff policy

`tariff.verified` is `false` and every price is `null` in the default scenario. This is deliberate:

- Grid import cost, savings and payback stay **disabled and visibly labelled** until real, cited values exist (FR-GRD-03).
- A zero or invented price would silently produce confident wrong numbers; `null` makes the gap explicit and forces the report to state it.
- Verification means the value traces to a dated STEG source recorded next to the data.
- The schema enforces the pairing: if `verified` is `true`, all prices must be numeric. It cannot enforce that a citation is correct — that is a review step, not a schema step.

The off-grid scenario keeps a tariff block with `null` values for schema completeness and future hybridisation; no economic metric applies there.

## Provenance

`provenance.class` states where the scenario's numbers come from: `synthetic-design` (chosen by the author), `dataset-derived`, or `measured`. No v1 scenario may claim `measured`, and none does. `provenance.notes` must say which values are assumptions and which are fetched at run time. Values read from a scenario and displayed in the interface — limits, reserves, seed, speed — carry class `C · Configured` and are never summed into results. See [simulation truth and provenance](../docs/data-provenance.md) for the value classes, the metric register and the labelling rules.

## Validation

Two passes, because they catch different mistakes. Both live in `packages/engine/src/config/` and run through one validator, so the application at startup, `scripts/validate-scenarios.mjs` and `scripts/check-config.mjs` cannot disagree about what a valid scenario is.

**1 · Schema.** `scenario.schema.json` enforces structure: required keys, allowed enums, numeric ranges, `null` handling, per-profile field rules, off-grid zero limits, tracker axes when enabled, and tariff verification pairing. It rejects unknown keys, so a typo surfaces as an error instead of a silently ignored setting, and the error names the closest valid key (`tilt` → `tilt_deg`). Every numeric property must carry its unit in its name; `auditSchemaUnits` walks the contract and fails `npm run check` if one does not.

**2 · Relational invariants.** JSON Schema cannot express these; `checkScenarioInvariants` runs after the schema passes and reports the same issue shape, with an expected value and a fix:

| Invariant | Why it matters |
| --- | --- |
| `min_soc < initial_soc < max_soc` | A run cannot start outside the usable window |
| Unique room and appliance `id`s | Events and 3D bindings need unambiguous targets |
| Every `appliance.room` exists in `household.rooms` | No orphan loads |
| `flexibility.earliest` → `latest` is long enough for `duration_minutes` | A task that cannot finish inside its window is unschedulable, not flexible |
| Tariff bands are ordered, and only the last one may be open-ended | An unordered band table makes the price ambiguous |
| File name equals `id` | The manifest hash and the file you edited stay tied together |

Timestep, horizon arithmetic, off-grid limits, profile/block matching and tariff verification pairing are schema rules and are rejected in the first pass.

Every failure is a `ConfigIssue` — layer, dotted path, stable code, message, received value, expected value and a hint — collected and rendered together, never a first-error abort. A scenario that fails is never silently repaired: there is no fallback to the default scenario and no clamping of configuration at load time. Phase 02.7's bounded SOC clamp applies only to calculated battery state; invalid scenario and external values remain errors.

Run the same validator the app starts with:

```text
node scripts/validate-scenarios.mjs
```

It imports the engine validator and exits non-zero on the first failing scenario. The app resolves the default scenario at module load, so a bad file also fails `npm run dev` and `npm run build` with the same numbered message. See [configuration](../docs/configuration.md) for the four layers and what each failure class is allowed to do.

## Adding a scenario

1. Copy the closest existing file; keep the `seed` only if you intend the same stochastic stream.
2. Change `id` to a new versioned slug and rename the file to match.
3. Update `name`, `description` and `provenance.notes` to say what is varied and what is assumed.
4. Change one variable group if the file is meant to be a comparison; say so explicitly if it is not.
5. Run `npm run check`, or `node scripts/validate-scenarios.mjs` alone.
6. Reference the file in the report only after it has produced a stored run manifest.
