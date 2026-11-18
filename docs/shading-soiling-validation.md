# Shading and soiling scenario validation

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-18 |
| Phase | 03.7 — explicit shading/soiling controls and repeatable production comparison |
| Authority | [scenario fields](../scenarios/scenario.schema.json), [PV model](../packages/engine/src/solar/pv-output.ts), [experiment runner](../scripts/run-pv-loss-experiment.mjs), DEC-052 |
| Related | [Experiment log](experiment-log.md) EXP-001 · [PV output validation](pv-output-validation.md) · FR-PV-05, FR-PV-08 |

## Controls

The scenario owns `pv.soiling_loss` and optional `pv.shading_profile.windows`. A soiling value is a
fraction in `[0, 0.9]`; each shading window has site-local start/end times and a `shading_loss`
fraction in `[0, 1]`. Invalid empty or overlapping windows are refused by scenario invariants.
Windows repeat on the local clock, may cross midnight, and apply to the interval whose start is
inside the window. Absence of a profile means no scheduled shading. No RNG or implicit penalty
modifies either configured control.

The PV model exposes the applied `soilingFactor` and `shadingFactor` with its DC power and interval
energy. That makes an experiment explainable without inferring an unnamed aggregate efficiency.

## Controlled experiment

Run from the repository root with:

```text
node scripts/run-pv-loss-experiment.mjs
```

The runner reads and hashes `tunis-typical-v1.json`, then creates a paired in-memory variant that
changes only soiling from 2% to 12% and adds a 50% shading window from 12:00–13:00 Africa/Tunis
time. Both runs use the same fixed four-hour, one-hour-step irradiance and temperature fixture,
scenario seed and other PV settings. The weather is synthetic and fixed; no provider or random
draw is involved. It writes the replayable summary to the ignored path `runs/exp-001/summary.json`.

| Output | Baseline | Soiling + shading | Change |
| --- | ---: | ---: | ---: |
| PV DC interval energy | 7,912.524 Wh | 6,216.983 Wh | −21.429% |
| Gross inverter AC interval energy | 7,596.023 Wh | 5,968.304 Wh | −21.429% |

The expected ratio is `(0.88 / 0.98) × (3 + 0.5) / 4 = 0.785714…`: the soil factor applies to all
four intervals, and the shade factor halves one of them. The conversion loss follows inverter
efficiency; clipping is zero for this fixture. Replaying the same configuration and inputs produces
identical per-step output. The Vitest integration test asserts this ratio and replay equality.

## Limits

This is a controlled response experiment, not a weather-driven week, an annual-yield estimate or
PVGIS calibration. The constant POA input intentionally isolates the configured losses. Scenario
fields and the deterministic component model are implemented; the application coordinator, visual
loss display, dynamic soiling growth/cleaning and measured shadow geometry remain outside this task.
