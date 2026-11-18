# Plane-of-array irradiance validation

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-18 |
| Phase | 03.4 — simplified plane-of-array transposition |
| Authority | [Engine model](../packages/engine/src/solar/plane-of-array.ts), [model tests](../packages/engine/src/solar/plane-of-array.test.ts), DEC-049 |
| Reference formulation | [pvlib total irradiance, isotropic sky model](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.irradiance.get_total_irradiance.html) |

## Model

`calculatePlaneOfArrayIrradiance` implements `isotropic-sky-transposition-v1`:

```text
POA beam     = DNI × max(0, cos(incidence angle))
POA sky      = DHI × (1 + cos(panel tilt)) / 2
POA ground   = GHI × albedo × (1 - cos(panel tilt)) / 2
POA total    = beam + sky + ground
```

The sun-to-panel incidence angle uses SunCalc apparent elevation and its true-north clockwise
azimuth together with the scenario array tilt and azimuth. Direct beam is zero when the Sun is at or
below the horizon or the beam falls on the panel's back face. The default ground albedo is 0.2, an
explicit candidate assumption that callers can override; it is not a site measurement. Input cloud
effects are already represented in GHI, DNI and DHI, so the model does not multiply by cloud cover
again. The result is derived/modelled class S, including when its weather inputs came from provider
class X.

This model is intentionally isotropic and approximate. It does not model horizon brightening,
circumsolar diffuse irradiance, incidence-angle optical losses, row shading, tracker movement,
module temperature or electrical output. Those are separate assumptions and later tasks.

## Evidence

`packages/engine/src/solar/plane-of-array.test.ts` exercises:

- the three irradiance components and their total against the formula;
- direct-beam incidence and changing panel azimuth, including a lower back-facing result;
- lower GHI/DNI/DHI values for a cloudier input;
- zero nighttime beam, zero irradiance and a finite incidence angle;
- invalid tilt, azimuth, albedo and negative irradiance;
- overflow rejection rather than an infinite output.

The tests validate the implementation and physical edge rules; they are not a field calibration or a
PV-yield benchmark. Benchmarking remains scheduled in later PV model tasks.
