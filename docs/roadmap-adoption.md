# Dar Chams roadmap adoption

| Field | Value |
| --- | --- |
| Version | 1.6.0 |
| Date | 2026-11-18 |
| Phase | 02 complete; phases 03.1–03.6 complete; adoption crosswalk for the Dar Chams roadmap |
| Authority | [Dar Chams Roadmap](../Dar_Chams_Roadmap.html), [accepted engineering roadmap](../Dar_Chams_Roadmap_and_Graphic_Charter_v2_Embedded.html), [requirements](requirements.md), [acceptance checklist](acceptance-checklist.md) |
| Decision | DEC-041, DEC-042, DEC-043, DEC-044, DEC-045, DEC-046, DEC-047, DEC-048, DEC-049, DEC-050, DEC-051 |

The Dar Chams roadmap adds useful specificity to the existing project: physical PV geometry and plane-of-array irradiance, weather inputs and uncertainty, battery voltage and aging, tracker energy cost, explicit load priority thresholds, and a clearer evidence package. This crosswalk admits those ideas at the existing phase gates. It does not mark planned features as implemented or silently change the signed acceptance targets. The checklist and its author-bound digest remain untouched; its earlier use of Helios in the claim-gate wording refers to this same project and prohibition.

## Keep from the existing project

- The deterministic, offline-capable TypeScript engine remains the source of truth. The root package and repository, `@dar-chams/engine`, static export, IndexedDB direction, scenario schema, provenance register, append-only decision log, signed acceptance checklist and machine checks remain in place.
- The app remains simulation-first. No real plant is monitored or controlled, weather services remain optional, and sensor or Wokwi observations never become measurements of PV or battery state by implication.
- The existing task IDs and phase gates remain the schedule. The Dar Chams roadmap enriches their definitions; it does not replace evidence already recorded for phases 00, 01, 02.1–02.7 or 03.1–03.6. Task 02.4 establishes UI-free typed component ports; task 02.5 adds a deterministic fixed-step clock and seeded random stream; task 02.6 adds deterministic, typed state-transition events; task 02.7 guards finite/non-negative energy and keeps calculated battery SOC inside its usable window; task 03.1 makes PV geometry explicit in validated scenarios; task 03.2 calculates site-local solar position and events; task 03.3 provides optional external weather and visible offline fallback; task 03.4 estimates panel-plane irradiance with a named approximation; task 03.5 estimates cell temperature and applies an explicit linear temperature and system derate; task 03.6 calculates PV DC and inverter AC output, interval energy and clipping losses. Production-run coordination and the event timeline UI remain future integration work.

## Adopt into the existing gates

Tasks 03.1–03.6 are complete. Task 03.1 uses scenario geometry as the authority: site latitude/longitude/altitude, total array
nameplate DC capacity at STC, module count, panel tilt from horizontal and compass azimuth clockwise
from true north. An absent shading profile means no scheduled shading; when present its daily
recurring, non-overlapping windows use the site timezone and declare their own loss fraction.
Tracking is a discriminated opt-in: fixed arrays require
`enabled: false, axes: 0`; enabled tracking requires one or two axes. No geometry is hardcoded in
the physics engine, and these inputs do not claim the later irradiance or production models exist.

Task 03.2 adds SunCalc 2.1.4 to the engine and exposes apparent sun elevation/azimuth plus
site-local sunrise, solar noon and sunset as absolute instants. Real IANA-zone day bounds and the
offsets on each side of a DST transition determine event membership. Polar day/night return an
explicit status and null rise/set times. Three independent published city/date fixtures, both Paris
DST transitions and Tromsø solstices pass in [`solar-validation.md`](solar-validation.md). This
implements sun geometry only; irradiance conversion and PV yield remain later tasks.

Task 03.3 exposes Open-Meteo as an optional, injectable forecast source. It requests UTC hourly air
temperature, shortwave radiation, direct/diffuse irradiance and wind, validates all values before
mapping them to the simulation grid, and saves only complete snapshots through a caller-owned cache
port. If the provider fails, a complete cache match is used; otherwise a seed-and-site deterministic
synthetic series is returned. The result includes a visible fallback record with the failure reason.
Scenario validation requires synthetic fallback to remain available. The adapter is headless and
offline-safe; application-level persistent cache wiring and a full simulation coordinator remain
future integration work, as recorded in [`weather-validation.md`](weather-validation.md).

Task 03.4 implements the isotropic-sky transposition equation from the accepted proposal: beam
irradiance is projected by the sun-to-panel incidence angle, diffuse irradiance uses the isotropic
sky view factor, and ground reflection uses albedo 0.2 by default. Callers can override the explicit
albedo assumption. Cloud influence is represented in weather GHI/DNI/DHI and is not multiplied a
second time. The API returns component terms and labels this simplified result as approximation
class S. Tests cover orientation, cloudier irradiance, horizontal and back-facing planes, night and
invalid numeric inputs. The formula and its limitations are recorded in
[`irradiance-validation.md`](irradiance-validation.md).

Task 03.5 uses configured NOCT in the linear model `Tcell = Tair + (NOCT−20)·POA/800` and applies
the configured power temperature coefficient around the 25 °C STC reference. A separate, explicit
system-derate input multiplies that temperature factor; it is not hidden inside availability,
soiling, mismatch or shading. Both outputs are labeled as class-S estimates. The simple thermal
model omits wind and mounting corrections because scenarios do not yet declare module-height wind
or mounting data. Formula, tests and limitations are recorded in
[`panel-temperature-validation.md`](panel-temperature-validation.md).

Task 03.6 now composes the modeled POA irradiance, configured NOCT and temperature coefficient,
explicit system derate, soiling, mismatch, optional site-local shading and availability into DC power
and step energy. The inverter stage applies efficiency, enforces the AC rating, and separates
conversion loss, DC-side clipping loss and standby energy. A clip-disabled over-rating input fails
closed instead of exceeding the hardware rating. The energy ledger has a separate clipping term
(DEC-051). These headless models are ready for a later run coordinator; no completed PV production
simulation or UI loss breakdown is claimed yet. Details and limits are in
[`pv-output-validation.md`](pv-output-validation.md).

| Dar Chams addition | Existing home | Admission rule |
| --- | --- | --- |
| POA irradiance, IAM, NOCT cell temperature, soiling growth and rain reset | Phase 03; FR-PV-03–08 and AC-05 | Task 03.4 implements simplified isotropic POA transposition; task 03.5 implements `Tcell = Tair + (NOCT−20)·POA/800` and the configured linear Pmax coefficient about 25 °C, with an explicit separate system-derate input. Albedo 0.2 is an explicit overrideable candidate default. The charter's NOCT 45 °C, temperature coefficient −0.004/°C, IAM `clamp(1−0.05·(1/cos θ−1), 0, 1)`, and 3% wiring/mismatch loss are not universally assumed; each must remain configured or separately validated. Guard grazing incidence and distinguish implemented formulas from calibrated model choices; benchmark daily AC yield against PVGIS within the existing acceptance tolerance. Daily soiling growth and a 2 mm rain reset remain adjustable scenario assumptions, not universal constants. |
| Battery voltage curve, charge/discharge efficiency, cutoff and aging | Phase 04; FR-BAT-01–07 and the energy ledger | Keep the energy-bucket state as the accounting authority. The reference's 0.005% capacity fade per equivalent full cycle and 8% off / 15% recovery thresholds are candidate assumptions only. Add a voltage curve or cutoff only as an explicit derived/observed state with configured chemistry data, bounded behavior and tests; capacity fade must not create or destroy energy inside a step. |
| Tracker geometry, fixed/one-axis/two-axis comparison and motor energy | Phase 03 geometry and phase 06 policy; FR-PV-09 | Candidate geometry is 30° south fixed, one-axis rotation clamped to ±60°, and two-axis tilt from 0° to 80°. The reference assumes 0.5°/s travel, 30 W per moving axis and 2 W idle. Make these configurable assumptions, include idle and movement energy in the household ledger, and compare net gain against the fixed-array baseline on paired inputs before claiming benefit. |
| Priority tiers, 40/30/15/8% example thresholds, hysteresis and reason codes | Phase 05 appliance states and phase 06 controller | Treat the percentages as candidate values from the reference, not accepted defaults. The reference adds 10 percentage points of hysteresis and minimum on/off times; those values also need review against battery reserve, load continuity and acceptance targets. Preserve FR-SIM-06 transitions and log the reason for each action. |
| Forecast shift, selective shedding and policy comparison | Phase 06; DEC-009 and DEC-013 | Preserve the rule baseline, forecast-aware scheduler and perfect-foresight bound on identical inputs. Forecast changes may influence actions only through explicit, replayable policy inputs. |
| Coursework targets, evidence E1–E9, risk table, glossary and defense deck | Phase 10–11 and final report | Add as report artefacts after the underlying experiment has passed its acceptance gate; do not substitute presentation material for raw run evidence. |
| PWA, chat, Telegram and expanded what-if features | Existing scope tiers and phases 09–16 | Keep outside the core gate unless an explicit scope decision admits them. The current local-first, offline and no-paid-service constraints remain binding. |

## What is not adopted as a project fact

The reference roadmap is a proposal, so its example thresholds, component formulae, hardware behaviors, performance targets and feature list are not evidence that those behaviors exist. The signed acceptance checklist and requirements register stay authoritative. A proposed addition that changes a threshold, requirement, scope boundary, provenance class or energy-balance term needs a new decision and the corresponding checker updates before it can become a gate.

The two source HTML files are kept at the repository root for review: [charter](../Dar_Chams_Charter.html) and [roadmap](../Dar_Chams_Roadmap.html). The existing expanded roadmap remains the authoritative task-by-task engineering schedule.
