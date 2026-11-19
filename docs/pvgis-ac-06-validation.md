# PVGIS fixed-tilt yield comparison (AC-06)

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Run date | 2026-11-19 |
| Scenario | [`tunis-typical-v1`](../scenarios/tunis-typical-v1.json) |
| Sample | 12 local days in 2023, three around each seasonal equinox/solstice |
| Reference | PVGIS 5.3, PVGIS-SARAH3 radiation and ERA5 meteorology |
| Result | Mean absolute daily bias 4.9919%; numeric AC-06 threshold met |
| Formal status | AC-06 remains Pending in the signed checklist until evidence is reviewed and the record is re-signed |
| Reproduce | `node validation/ac-06/run.mjs` |

## Frozen comparison

The primary case is the existing 3.0 kWp, 12-panel, fixed 30° south-facing array in Tunis (36.8065° N,
10.1815° E; Africa/Tunis), with its 3.0 kW inverter. The model and PVGIS reference use the same
fixed plane and 2023 hourly weather/radiation source. Site horizon obstruction is disabled for both
series because the scenario has no horizon profile. The 12 dates were chosen around the four
northern-hemisphere seasonal transitions before inspecting the daily comparison results.

Dar Chams replays the PVGIS horizontal beam/diffuse irradiance and air temperature through its own
solar-position, isotropic POA, NOCT temperature, PV-output and inverter components. For the
horizontal-plane series, GHI is `Gb(i) + Gd(i)` and DNI is recovered from horizontal beam irradiance
and Dar Chams solar elevation. Each hourly sample is evaluated as a one-hour model step. The
timestamps are interpreted as UTC and then grouped by Africa/Tunis local calendar day; the greatest
daylight sun-height difference from the PVGIS `H_sun` value in the selected sample is 0.377°.

The PVGIS fixed-system `loss` input is 8.723584%, the exact combined equivalent of the scenario's
2% soiling, 2% mismatch, 99% availability and 96% inverter efficiency. Dar Chams applies these
factors separately. Both series report gross PV AC production; inverter standby is excluded because
PVGIS `P` is PV system output rather than a household-bus net-energy measure. The PVGIS hourly
reference is PVGIS's own modeled output; it is not a meter reading.

## Daily results

Bias is `(Dar Chams AC energy − PVGIS AC energy) / PVGIS AC energy × 100`. The acceptance statistic
is the arithmetic mean of the 12 absolute daily percentage biases. All 12 absolute daily biases are
below 15%, so there is no individual over-threshold day requiring a deviation explanation.

| Season | Local date | Dar Chams AC (kWh) | PVGIS AC (kWh) | Signed bias |
| --- | --- | ---: | ---: | ---: |
| Spring | 2023-03-20 | 13.8689 | 13.2438 | +4.72% |
| Spring | 2023-03-21 | 13.1996 | 13.1569 | +0.32% |
| Spring | 2023-03-22 | 11.9465 | 11.5125 | +3.77% |
| Summer | 2023-06-20 | 18.5276 | 17.3928 | +6.52% |
| Summer | 2023-06-21 | 18.4784 | 17.2880 | +6.89% |
| Summer | 2023-06-22 | 18.6191 | 16.9346 | +9.95% |
| Autumn | 2023-09-22 | 15.4121 | 14.7380 | +4.57% |
| Autumn | 2023-09-23 | 10.1598 | 9.7579 | +4.12% |
| Autumn | 2023-09-24 | 14.1488 | 14.1175 | +0.22% |
| Winter | 2023-12-20 | 10.3728 | 10.9220 | −5.03% |
| Winter | 2023-12-21 | 3.2829 | 2.8978 | +13.29% |
| Winter | 2023-12-22 | 5.7387 | 5.7676 | −0.50% |

Mean absolute daily bias is **4.9919%** against the **≤15%** criterion. Mean absolute energy error is
**0.5985 kWh/day**. Aggregate signed bias across all 12 days is **+4.08%**. The maximum absolute
daily bias is **13.29%** (2023-12-21).

## Reproducibility and limits

Run `node validation/ac-06/run.mjs`. It checks the scenario/reference geometry and equivalent
system-loss input, requires 24 hourly samples for each date, refuses reconstructed PVGIS hours,
computes both bias measures and writes `validation/ac-06/results-2023.json`. The two retained source
responses contain the PVGIS metadata and hourly values; their SHA-256 hashes and the scenario hash
are recorded in the result JSON.

Reference API calls used PVGIS 5.3 `seriescalc` with `lat=36.8065`, `lon=10.1815`,
`raddatabase=PVGIS-SARAH3`, `startyear=endyear=2023`, `usehorizon=0`, and JSON output. The reference
request additionally used `pvcalculation=1`, `peakpower=3`, `loss=8.723584`, `angle=30`, `aspect=0`,
`mountingplace=building`, `pvtechchoice=crystSi`, `trackingtype=0`, and `components=1`. The weather
request used `angle=0`, `aspect=0`, `trackingtype=0`, and `components=1`. PVGIS documentation:
[API non-interactive service](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en).

This is a reproducible model-to-model comparison using PVGIS weather inputs and PVGIS's own modeled
power as the reference. It meets the numerical daily-bias criterion for the selected 12-day sample,
but does not establish field accuracy, validate other sites/configurations, or replace author review
of the signed AC-06 checklist. The checklist remains Pending until its signed record is updated.

