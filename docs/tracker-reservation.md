# Solar tracking reservation

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-19 |
| Phase | 03.8 (FR-PV-09, Should) |
| Decision | DEC-053 |
| Status | Fixed-tilt benchmark meets numeric threshold; AC-06 checklist sign-off pending |
| Related | [Requirements](requirements.md) FR-PV-09 · [Scope](00-scope-brief.md) SH-04 · [Acceptance checklist](acceptance-checklist.md) AC-06 · [PV output validation](pv-output-validation.md) · [Roadmap adoption](roadmap-adoption.md) |

## Selected fixed-tilt benchmark configuration

Use the existing `tunis-typical-v1` scenario as the primary AC-06 case. It is the project's
default grid-connected installation, represents the stated Tunis site, and provides a moderate
3 kWp array with a matching 3 kW inverter. This avoids creating a new, unreviewed system design
just for the benchmark. The existing dust and off-grid variants are not the primary case because
they deliberately change loss or system-sizing conditions.

| Input | Frozen benchmark value | Source |
| --- | --- | --- |
| Site | Tunis, Tunisia; 36.8065° N, 10.1815° E; altitude 10 m | `scenarios/tunis-typical-v1.json` |
| Timezone | `Africa/Tunis` | `scenarios/tunis-typical-v1.json` |
| Array | 3.0 kWp DC at STC; 12 panels | `scenarios/tunis-typical-v1.json` |
| Mounting | Fixed tilt; tracker disabled, 0 axes | `scenarios/tunis-typical-v1.json` |
| Tilt | 30° from horizontal | `scenarios/tunis-typical-v1.json` |
| Azimuth | 180° clockwise from true north (south-facing) | `scenarios/tunis-typical-v1.json`; convention in DEC-046 |
| Inverter | 3.0 kW AC, 0.96 efficiency, 5 W standby, clipping enabled | `scenarios/tunis-typical-v1.json` |
| PV factors | NOCT 45°C; temperature coefficient −0.0035/°C; soiling 2%; mismatch 2%; availability 99% | `scenarios/tunis-typical-v1.json` |

Use the PV array's daily AC energy as the comparison quantity; household load, battery dispatch,
grid exchange and tariff economics are outside this yield benchmark. Keep all listed configuration
values fixed across the seasonal sample. The modelled and PVGIS series must use matching location,
capacity, tilt, azimuth, dates and clearly documented loss/inverter assumptions. Do not change
scenario defaults merely to make the benchmark agree. The completed comparison and its retained
hourly inputs are documented in [`pvgis-ac-06-validation.md`](pvgis-ac-06-validation.md).

## Current boundary

Version 1 uses fixed-tilt arrays. Scenario array tilt and azimuth are explicit inputs, so a future
orientation model can use declared geometry. Every shipped scenario keeps its tracker configuration
disabled with zero axes. The engine does not calculate tracker geometry, movement, stow behavior,
actuator energy, or tracking net gain. Tracker-only metrics MET-25 and MET-26 are unavailable; a
configuration flag by itself cannot enable or imply those calculations.

This boundary satisfies the reservation part of task 03.8. The 12-day comparison now meets the
fixed-tilt numerical yield criterion; the signed AC-06 checklist still reads Pending until the
author reviews the evidence and renews sign-off. See the [PVGIS comparison report](pvgis-ac-06-validation.md).

## Gate to tracker implementation

AC-06 must first be accepted using the unchanged signed criterion: compare fixed-tilt daily energy
against PVGIS on at least 12 days spanning seasons, with mean absolute daily-energy bias at or below
15%, and explain any larger individual deviations. The evidence must identify sites and dates,
scenario and model inputs, data sources, and reproducible outputs. Component fixtures and the
synthetic shading/soiling experiment are not substitutes for this yield validation.

After AC-06 is green, a separate decision must admit tracker implementation before code is written.
That work must define bounded tracker geometry and stow behavior, charge movement and idle actuator
energy to the energy ledger, and compare net tracking yield against fixed tilt on identical inputs.
The example geometry and motor values in the reference roadmap are candidate assumptions, not
accepted defaults.

## Evidence and status

- Fixed-tilt component output and limitations: [PV output validation](pv-output-validation.md).
- Existing fixed-input shading/soiling response: [EXP-001 validation](shading-soiling-validation.md).
- AC-06 status and authoritative threshold: [acceptance checklist](acceptance-checklist.md).
- 12-day comparison, method, table, and replay: [PVGIS AC-06 report](pvgis-ac-06-validation.md).
- Current decision and alternatives: [DEC-053](decision-log.md#dec-053--reserve-tracking-behind-the-fixed-tilt-ac-06-gate).

