# Scenario conventions

A scenario file is a complete, self-contained description of one virtual installation. Nothing that changes a result may live in engine code; if a number can influence a run, it belongs here (or in the committed data the scenario points to).

Default scenario: [`tunis-typical.json`](tunis-typical.json).

## Conventions

- **Format:** JSON, UTF-8, two-space indentation. One file per scenario; no inheritance or partial overrides in v1.
- **Units in names:** field names carry their unit where ambiguity is possible — `_kw`, `_kwh`, `_w`, `_degc`, `_deg`, `_minutes`, `_hours`, `_kwp`.
- **Fractions:** efficiencies, losses and state of charge are fractions in `[0, 1]`, not percentages.
- **Time:** timestamps are ISO-8601 with an explicit UTC offset. Local clock times inside schedules are `HH:MM` in the site timezone. A schedule window may cross midnight (e.g. `22:00`–`06:00`); the engine must handle that case explicitly.
- **Seeds:** every stochastic process (weather fallback, load variation) derives from the single `simulation.seed` so a run is reproducible from the file alone.
- **Ordering:** rooms and appliances have stable `id` values. Display order is the array order; identity is the `id`.
- **Priority vocabulary is fixed:** `critical`, `important`, `flexible`, `discretionary`. Priority is policy metadata, never a learned score.

## Field groups

| Group | Contents |
| --- | --- |
| `site` | Coordinates, altitude, timezone |
| `simulation` | Timestep, start instant, horizon, seed, default speed |
| `pv` | Capacity, module count, tilt, azimuth, temperature coefficient, loss factors, shading windows, tracker |
| `inverter` | AC rating, efficiency, standby draw, clipping behaviour |
| `battery` | Chemistry label, capacity, SOC window, power limits, round-trip efficiency, optional degradation |
| `grid` | Import/export limits, outage windows |
| `tariff` | Currency, import bands, export compensation, verification status |
| `weather` | Primary and historical sources, cache location, refresh period, fallback order |
| `household` | Rooms and appliances |
| `policies` | Baseline thresholds and scheduler configuration |

## Appliance schema

Every appliance has `id` (stable, lowercase), `name`, `room`, `rated_power_w`, `priority`, `controllable` and a `profile`. The profile selects which additional block is required:

| `profile` | Extra fields | Meaning |
| --- | --- | --- |
| `always_on` | — | Runs at rated power whenever the simulation runs |
| `duty_cycle` | `duty_cycle` (0–1) | Cycles on and off over the day with the given average duty ratio |
| `schedule` | `schedule.start`, `schedule.end` (`HH:MM`) | Runs inside a fixed daily window; windows may cross midnight |
| `flexible_window` | `flexibility.earliest`, `flexibility.latest`, `flexibility.duration_minutes`, `flexibility.non_interruptible` | Runnable anywhere inside the window for the required duration; the scheduler places it |

`note` is free-text metadata for the reader; it never affects the engine. Only `controllable: true` appliances may be shed or deferred.

## Tariff policy

Tariff prices are `null` and `verified` is `false` in the default scenario. This is deliberate:

- Economic metrics (grid import cost, savings) stay **disabled** and visibly labelled until real, cited values are entered.
- A zero or invented price would silently produce confident wrong numbers; `null` makes the gap explicit.
- Verification means: the value traces to a dated STEG source, recorded next to the data in the report.

## Provenance

`provenance.class` describes where the scenario's numbers come from. Permitted values: `synthetic-design` (chosen by the author), `dataset-derived`, `measured`. No v1 scenario may claim `measured`.

## Validation

Structural validation (types, ranges, cross-field consistency, e.g. `min_soc < max_soc`, positive capacities, non-empty appliance IDs) is implemented in phase 01.4. Until then this file is both documentation and the fixture that validation must accept.
