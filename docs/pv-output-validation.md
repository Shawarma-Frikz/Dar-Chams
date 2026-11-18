# PV output and inverter validation

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-18 |
| Phase | 03.6 — DC output, interval energy and inverter conversion |
| Authority | [PV/inverter models](../packages/engine/src/solar/pv-output.ts), [model tests](../packages/engine/src/solar/pv-output.test.ts), DEC-051 |
| Related | [Energy balance](energy-balance.md), [provenance register](data-provenance.md), FR-PV-05, FR-PV-06 |

## Model

At the array's DC terminals, `calculatePvOutput` applies the completed POA and temperature models:

```text
DC W = installed DC kWp × POA W/m²
       × temperature factor × system derate
       × (1 − soiling loss) × (1 − mismatch loss)
       × (1 − active site-local shading loss) × availability
DC Wh = DC W × step minutes / 60
```

System derate remains a required explicit input from phase 03.5. `availability` represents
planned/unplanned uptime, and shading uses the site-local clock at the step start; the factors are
not conflated. If the apparent Sun is at or below the horizon, PV DC power and interval energy are
forced to zero even if an inconsistent provider sample claims irradiance. DC nameplate is an STC
reference scale rather than a hard instantaneous ceiling; higher irradiance or cold temperature can
produce output above the DC nameplate. The downstream AC rating is the hard output ceiling.

`calculateInverterOutput` converts DC power using configured efficiency. AC power cannot exceed the
inverter rating. When clipping is enabled, excess DC input is reported as `clippingLoss`; conversion
efficiency loss is reported separately as `conversionLoss`; standby consumption is reported as its
own AC-bus `standbyLoss`. If the AC rating would be exceeded while clipping is disabled, the model
throws rather than emit impossible power. The gross AC output and each interval energy use the exact
simulation step duration.

DEC-051 adds `clippingLoss` as a tenth energy-ledger term because clipped DC energy never enters the
conversion path. For a clipped PV-only step, `DC input energy = gross AC energy + conversion loss +
clipping loss`; standby is an AC-bus demand accounted separately in the complete site ledger.

## Evidence

`packages/engine/src/solar/pv-output.test.ts` covers every configured multiplier, a site-local
shading window, zero output at night, DC interval integration, AC efficiency, the rated AC bound,
clipping/efficiency energy identity, standby energy, disabled-clipping refusal and invalid inputs.
The balance suite rejects negative clipping loss and continues to close the shipped reference
dispatch under the expanded ledger.

These models are deterministic and headless. There is not yet a run coordinator that calls POA,
temperature, PV and inverter in sequence, nor an application UI that displays the loss breakdown.
The tests prove component behavior, not complete PVGIS daily-yield calibration (FR-PV-07).
