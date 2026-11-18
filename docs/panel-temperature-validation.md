# Panel-temperature and derating validation

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-18 |
| Phase | 03.5 — NOCT temperature estimate and power temperature derate |
| Authority | [Engine model](../packages/engine/src/solar/panel-temperature.ts), [model tests](../packages/engine/src/solar/panel-temperature.test.ts), DEC-050 |
| Thermal reference | [NREL simplified NOCT equation](https://docs.nrel.gov/docs/fy04osti/30481.pdf) |

## Model

`estimatePanelTemperature` uses the documented linear NOCT relation:

```text
cell temperature = ambient temperature + (configured NOCT − 20 °C) × POA / 800 W/m²
```

The NOCT convention is defined at 800 W/m² irradiance, 20 °C ambient and 1 m/s wind. This
simplified v1 model omits wind and mounting corrections because the current scenario provides
10-meter weather wind but no validated module-height conversion or mounting configuration. It is
an estimate, not a measured module temperature.

`calculateTemperatureDerate` applies the configured maximum-power coefficient around the 25 °C
standard-test-condition reference:

```text
temperature factor = max(0, 1 + coefficient × (cell temperature − 25 °C))
combined factor    = temperature factor × system derate
```

The coefficient and system derate are separate. System derate is a required explicit input between
0 and 1 and is kept distinct from downtime availability, soiling, mismatch and scheduled shading.
Temperatures below 25 °C can yield a multiplier above one; very high temperature cannot produce a
negative multiplier. Both results are labeled with their model identifier, approximation flag and
modeled class-S provenance.

## Evidence

`packages/engine/src/solar/panel-temperature.test.ts` covers:

- the NOCT equation at its reference irradiance and ambient condition;
- monotonic ambient-temperature and irradiance effects and zero-irradiance behavior;
- configured coefficient response around 25 °C and a separately applied system derate;
- plausible cold gain and a zero lower bound at extreme high temperature;
- invalid NOCT, negative irradiance, invalid coefficient and out-of-range system derate.

These tests validate the declared formulas and their numerical guards. They are not a module
calibration study and do not prove AC yield accuracy. Wind-aware thermal models and PV output
composition remain separate future work.
