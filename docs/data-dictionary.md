# Scenario data dictionary

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-16 |
| Phase | 01 (task 01.6); contract unchanged from phase 00 |
| Source | [`scenarios/scenario.schema.json`](../scenarios/scenario.schema.json) |
| Checked by | `node scripts/check-docs.mjs`; regenerate with `--write` |
| Related | [Scenario conventions](../scenarios/README.md) · [Configuration](configuration.md) §6 · [API notes](api.md) |

This dictionary lists every path a scenario document may contain. The table under
[Contract paths](#contract-paths) is generated from the JSON Schema by `scripts/check-docs.mjs`, so a
schema change and this document cannot drift: a field that is not in the table is not a field a
scenario may contain, and a table row that the schema no longer declares fails `npm run check`.

## Field groups

| Group | What it answers |
| --- | --- |
| `schema_version` | Which version of the contract the file was written against; currently `0.1.0` |
| `id` | The scenario's stable slug; the file name must equal it |
| `name`, `description`, `created` | What the scenario is for and when it was written |
| `provenance` | Where the numbers come from and which of them are assumptions |
| `site` | Location, altitude and IANA timezone that drive solar position and display |
| `mode` | Grid-connected or off-grid operation |
| `simulation` | Timestep, start instant, horizon, seed and default playback speed |
| `pv` | Array size, geometry, temperature terms, loss factors, shading and tracker |
| `inverter` | AC rating, conversion efficiency, standby draw and clipping behaviour |
| `battery` | Chemistry label, capacity, usable SOC window, power limits and efficiency |
| `grid` | Import and export limits and explicit outage windows |
| `tariff` | Currency, verification status, import bands, fixed charge and export compensation |
| `weather` | Forecast and historical sources, cache, refresh period and fallback order |
| `household` | Preset label, rooms and the individually modelled appliances |
| `policies` | Parameters for the rule baseline and the forecast-aware scheduler |

## Contract paths

<!-- data-dictionary:start -->
_Generated from [`scenario.schema.json`](../scenarios/scenario.schema.json) by `scripts/check-docs.mjs`. Do not edit this table by hand; edit the schema and run `node scripts/check-docs.mjs --write`._

| Path | Type and constraints | Required | Unit |
| --- | --- | --- | --- |
| `schema_version` | const `0.1.0` | Yes | — |
| `id` | string, pattern `^[a-z][a-z0-9-]*$` | Yes | — |
| `name` | string | Yes | — |
| `description` | string | Yes | — |
| `created` | string, format date | Yes | — |
| `provenance` | object | Yes | — |
| `provenance.class` | `synthetic-design` or `dataset-derived` or `measured` | Yes | — |
| `provenance.notes` | string | Yes | — |
| `site` | object | Yes | — |
| `site.label` | string | Yes | — |
| `site.latitude_deg` | number, ≥ -90, ≤ 90 | Yes | ° |
| `site.longitude_deg` | number, ≥ -180, ≤ 180 | Yes | ° |
| `site.altitude_m` | number, ≥ -100, ≤ 5000 | Yes | m |
| `site.timezone` | string, pattern `^[A-Za-z][A-Za-z0-9_+/-]*$` | Yes | — |
| `mode` | `grid_connected` or `off_grid` | Yes | — |
| `simulation` | object | Yes | — |
| `simulation.timestep_minutes` | `5` or `15` or `30` or `60` | Yes | min |
| `simulation.start` | string, format date-time | Yes | — |
| `simulation.horizon_hours` | integer, ≥ 1, ≤ 168 | Yes | h |
| `simulation.seed` | integer, ≥ 0 | Yes | count |
| `simulation.default_speed_multiplier` | number, ≥ 1 | Yes | multiplier |
| `pv` | object | Yes | — |
| `pv.installed_dc_kwp` | number, > 0 | Yes | kWp |
| `pv.panel_count` | integer, ≥ 1 | Yes | count |
| `pv.tilt_deg` | number, ≥ 0, ≤ 90 | Yes | ° |
| `pv.azimuth_deg` | number, ≥ 0, < 360 | Yes | ° |
| `pv.temperature_coefficient_per_degc` | number, ≤ 0 | Yes | per °C |
| `pv.noct_degc` | number, ≥ 30, ≤ 60 | Yes | °C |
| `pv.soiling_loss` | number, ≥ 0, ≤ 0.9 | Yes | fraction [0, 1] |
| `pv.mismatch_loss` | number, ≥ 0, ≤ 0.5 | Yes | fraction [0, 1] |
| `pv.availability` | number, > 0, ≤ 1 | Yes | fraction [0, 1] |
| `pv.shading_windows` | array | Yes | — |
| `pv.shading_windows[]` | object | — | — |
| `pv.shading_windows[].start` | string, pattern `^([01][0-9]\|2[0-3]):[0-5][0-9]$` | Yes | — |
| `pv.shading_windows[].end` | string, pattern `^([01][0-9]\|2[0-3]):[0-5][0-9]$` | Yes | — |
| `pv.tracker` | object | Yes | — |
| `pv.tracker.enabled` | boolean | Yes | — |
| `pv.tracker.axes` | `0` or `1` or `2` | Yes | count |
| `inverter` | object | Yes | — |
| `inverter.rated_ac_kw` | number, > 0 | Yes | kW |
| `inverter.efficiency` | number, > 0, ≤ 1 | Yes | fraction [0, 1] |
| `inverter.standby_w` | number, ≥ 0 | Yes | W |
| `inverter.clipping` | boolean | Yes | — |
| `battery` | object | Yes | — |
| `battery.chemistry` | `lfp` or `nmc` or `lead_acid` | Yes | — |
| `battery.nominal_capacity_kwh` | number, > 0 | Yes | kWh |
| `battery.initial_soc` | number, ≥ 0, ≤ 1 | Yes | fraction [0, 1] |
| `battery.min_soc` | number, ≥ 0, ≤ 1 | Yes | fraction [0, 1] |
| `battery.max_soc` | number, ≥ 0, ≤ 1 | Yes | fraction [0, 1] |
| `battery.max_charge_kw` | number, > 0 | Yes | kW |
| `battery.max_discharge_kw` | number, > 0 | Yes | kW |
| `battery.round_trip_efficiency` | number, > 0, ≤ 1 | Yes | fraction [0, 1] |
| `battery.degradation` | object | Yes | — |
| `battery.degradation.enabled` | boolean | Yes | — |
| `battery.degradation.annual_capacity_fade` | number, ≥ 0, ≤ 1 | Yes | fraction [0, 1] |
| `grid` | object | Yes | — |
| `grid.import_limit_kw` | number, ≥ 0 | Yes | kW |
| `grid.export_limit_kw` | number, ≥ 0 | Yes | kW |
| `grid.outages` | array | Yes | — |
| `grid.outages[]` | object | — | — |
| `grid.outages[].start` | string, format date-time | Yes | — |
| `grid.outages[].end` | string, format date-time | Yes | — |
| `tariff` | object | Yes | — |
| `tariff.currency` | string, pattern `^[A-Z]{3}$` | Yes | — |
| `tariff.verified` | boolean | Yes | — |
| `tariff.source` | string | Yes | — |
| `tariff.import_bands` | array, min 1 item(s) | Yes | — |
| `tariff.import_bands[]` | object | — | — |
| `tariff.import_bands[].up_to_kwh_per_month` | integer or null, ≥ 0 | Yes | kWh/month |
| `tariff.import_bands[].price_tnd_per_kwh` | number or null, ≥ 0 | Yes | TND/kWh |
| `tariff.fixed_monthly_tnd` | number or null, ≥ 0 | Yes | TND |
| `tariff.export_compensation_tnd_per_kwh` | number or null, ≥ 0 | Yes | TND/kWh |
| `weather` | object | Yes | — |
| `weather.primary_source` | `open-meteo-forecast` | Yes | — |
| `weather.historical_source` | `open-meteo-era5` | Yes | — |
| `weather.cache_dir` | string | Yes | — |
| `weather.refresh_hours` | number, > 0 | Yes | h |
| `weather.fallback_order` | array, unique items | Yes | — |
| `weather.fallback_order[]` | `cached` or `synthetic` | — | — |
| `household` | object | Yes | — |
| `household.preset` | `economical` or `typical` or `high-consumption` or `high-flexibility` | Yes | — |
| `household.rooms` | array, min 1 item(s) | Yes | — |
| `household.rooms[]` | object | — | — |
| `household.rooms[].id` | string, pattern `^[a-z][a-z0-9_]*$` | Yes | — |
| `household.rooms[].name` | string | Yes | — |
| `household.rooms[].type` | `living` or `kitchen` or `bedroom` or `wet` or `utility` or `outdoor` or `other` | Yes | — |
| `household.appliances` | array, min 1 item(s) | Yes | — |
| `household.appliances[]` | object | — | — |
| `household.appliances[].id` | string, pattern `^[a-z][a-z0-9_]*$` | Yes | — |
| `household.appliances[].name` | string | Yes | — |
| `household.appliances[].room` | string, pattern `^[a-z][a-z0-9_]*$` | Yes | — |
| `household.appliances[].rated_power_w` | number, > 0 | Yes | W |
| `household.appliances[].priority` | `critical` or `important` or `flexible` or `discretionary` | Yes | — |
| `household.appliances[].controllable` | boolean | Yes | — |
| `household.appliances[].profile` | `always_on` or `duty_cycle` or `schedule` or `flexible_window` | Yes | — |
| `household.appliances[].duty_cycle` | number, > 0, ≤ 1 | No | fraction [0, 1] |
| `household.appliances[].schedule` | object | No | — |
| `household.appliances[].schedule.start` | string, pattern `^([01][0-9]\|2[0-3]):[0-5][0-9]$` | Yes | — |
| `household.appliances[].schedule.end` | string, pattern `^([01][0-9]\|2[0-3]):[0-5][0-9]$` | Yes | — |
| `household.appliances[].flexibility` | object | No | — |
| `household.appliances[].flexibility.earliest` | string, pattern `^([01][0-9]\|2[0-3]):[0-5][0-9]$` | Yes | — |
| `household.appliances[].flexibility.latest` | string, pattern `^([01][0-9]\|2[0-3]):[0-5][0-9]$` | Yes | — |
| `household.appliances[].flexibility.duration_minutes` | integer, ≥ 1, ≤ 1440 | Yes | min |
| `household.appliances[].flexibility.non_interruptible` | boolean | Yes | — |
| `household.appliances[].note` | string | No | — |
| `policies` | object | Yes | — |
| `policies.baseline` | object | Yes | — |
| `policies.baseline.reserve_soc` | number, ≥ 0, ≤ 1 | Yes | fraction [0, 1] |
| `policies.baseline.shed_order` | array, min 1 item(s), unique items | Yes | — |
| `policies.baseline.shed_order[]` | `critical` or `important` or `flexible` or `discretionary` | — | — |
| `policies.baseline.hysteresis_soc` | number, ≥ 0, ≤ 0.5 | Yes | fraction [0, 1] |
| `policies.scheduler` | object | Yes | — |
| `policies.scheduler.reserve_soc` | number, ≥ 0, ≤ 1 | Yes | fraction [0, 1] |
| `policies.scheduler.horizon_hours` | integer, ≥ 1, ≤ 72 | Yes | h |
| `policies.scheduler.forecast_fallback` | `baseline` | Yes | — |
<!-- data-dictionary:end -->

## Conditional rules

JSON Schema expresses these with `if`/`then` branches; the table above cannot show them as a single
row, so they are stated here. They are enforced by the schema on every validation.

| When | Then |
| --- | --- |
| `pv.tracker.enabled` is `true` | `pv.tracker.axes` must be at least 1 |
| `mode` is `off_grid` | `grid.import_limit_kw` and `grid.export_limit_kw` must both be 0 |
| `tariff.verified` is `true` | Every band price, `tariff.fixed_monthly_tnd` and `tariff.export_compensation_tnd_per_kwh` must be numbers |
| `household.appliances[].profile` is `always_on` | `duty_cycle`, `schedule` and `flexibility` must be absent |
| `household.appliances[].profile` is `duty_cycle` | `duty_cycle` is required; `schedule` and `flexibility` must be absent |
| `household.appliances[].profile` is `schedule` | `schedule` is required; `duty_cycle` and `flexibility` must be absent |
| `household.appliances[].profile` is `flexible_window` | `flexibility` is required; `controllable` must be `true`; the other profile blocks must be absent |

Relational rules that JSON Schema cannot express — SOC window ordering, unique ids, room references,
flexibility duration, tariff band order and the file-name-equals-id rule — are listed in
[scenario conventions](../scenarios/README.md#validation) and enforced by `checkScenarioInvariants`.

## Units and fractions

Field names carry their unit where ambiguity is possible: `_kw`, `_kwh`, `_w`, `_deg`, `_degc`,
`_minutes`, `_hours`, `_m`, `_tnd`, `_kwp`, `_multiplier`, `_per_month`, `_per_kwh`, `_per_degc`,
`_tnd_per_kwh` and `_kwh_per_month`. Efficiencies, losses and state of charge are fractions in
`[0, 1]`, never percentages. Counts and indices have no unit and are declared as unitless in the
engine. The audit in `packages/engine/src/config/units.ts` fails the build if a new numeric property
does not follow the rule, and the Unit column above is derived from the same vocabulary.

## Changing the contract

1. Edit the schema, and the `Scenario` interface in `packages/engine/src/config/scenario.ts` with it.
2. If the new field is numeric, give it a unit suffix or add it to `UNITLESS_QUANTITIES` with a reason.
3. Run `node scripts/check-docs.mjs --write` to regenerate the table above.
4. Run `npm run check`. The unit audit, the schema validation, the dictionary comparison and the
   scenario tests all have to pass before the change is reviewable.
5. A change that reinterprets an existing field is a schema version change and a new decision entry,
   not an edit that silently changes what old files mean (DEC-021).
