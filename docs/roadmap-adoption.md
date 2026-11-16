# Dar Chams roadmap adoption

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-16 |
| Phase | 02; adoption crosswalk for the Dar Chams roadmap; tasks 02.4–02.7 complete |
| Authority | [Dar Chams Roadmap](../Dar_Chams_Roadmap.html), [accepted engineering roadmap](../Dar_Chams_Roadmap_and_Graphic_Charter_v2_Embedded.html), [requirements](requirements.md), [acceptance checklist](acceptance-checklist.md) |
| Decision | DEC-041, DEC-042, DEC-043, DEC-044, DEC-045 |

The Dar Chams roadmap adds useful specificity to the existing project: physical PV geometry and plane-of-array irradiance, weather inputs and uncertainty, battery voltage and aging, tracker energy cost, explicit load priority thresholds, and a clearer evidence package. This crosswalk admits those ideas at the existing phase gates. It does not mark planned features as implemented or silently change the signed acceptance targets. The checklist and its author-bound digest remain untouched; its earlier use of Helios in the claim-gate wording refers to this same project and prohibition.

## Keep from the existing project

- The deterministic, offline-capable TypeScript engine remains the source of truth. The root package and repository, `@dar-chams/engine`, static export, IndexedDB direction, scenario schema, provenance register, append-only decision log, signed acceptance checklist and machine checks remain in place.
- The app remains simulation-first. No real plant is monitored or controlled, weather services remain optional, and sensor or Wokwi observations never become measurements of PV or battery state by implication.
- The existing task IDs and phase gates remain the schedule. The Dar Chams roadmap enriches their definitions; it does not replace evidence already recorded for phases 00, 01 or 02.1–02.7. Task 02.4 establishes UI-free typed component ports; task 02.5 adds a deterministic fixed-step clock and seeded random stream; task 02.6 adds deterministic, typed state-transition events; task 02.7 guards finite/non-negative energy and keeps calculated battery SOC inside its usable window. These tasks do not implement physical models or the event timeline UI.

## Adopt into the existing gates

| Dar Chams addition | Existing home | Admission rule |
| --- | --- | --- |
| POA irradiance, IAM, NOCT cell temperature, soiling growth and rain reset | Phase 03; FR-PV-03–08 and AC-05 | Evaluate the supplied isotropic POA candidate `DNI·max(0,cos θ) + DHI·(1+cos β)/2 + GHI·albedo·(1−cos β)/2`, with albedo 0.2 as a cited scenario assumption. The charter proposes `Tcell = Tair + (NOCT−20)·POA/800`, NOCT 45 °C, temperature coefficient −0.004/°C, IAM `clamp(1−0.05·(1/cos θ−1), 0, 1)`, and 3% wiring/mismatch loss. Guard grazing incidence and distinguish the proposal from validated model choices; calibrate and benchmark daily AC yield against PVGIS within the existing acceptance tolerance. Daily soiling growth and a 2 mm rain reset remain adjustable scenario assumptions, not universal constants. |
| Battery voltage curve, charge/discharge efficiency, cutoff and aging | Phase 04; FR-BAT-01–07 and the energy ledger | Keep the energy-bucket state as the accounting authority. The reference's 0.005% capacity fade per equivalent full cycle and 8% off / 15% recovery thresholds are candidate assumptions only. Add a voltage curve or cutoff only as an explicit derived/observed state with configured chemistry data, bounded behavior and tests; capacity fade must not create or destroy energy inside a step. |
| Tracker geometry, fixed/one-axis/two-axis comparison and motor energy | Phase 03 geometry and phase 06 policy; FR-PV-09 | Candidate geometry is 30° south fixed, one-axis rotation clamped to ±60°, and two-axis tilt from 0° to 80°. The reference assumes 0.5°/s travel, 30 W per moving axis and 2 W idle. Make these configurable assumptions, include idle and movement energy in the household ledger, and compare net gain against the fixed-array baseline on paired inputs before claiming benefit. |
| Priority tiers, 40/30/15/8% example thresholds, hysteresis and reason codes | Phase 05 appliance states and phase 06 controller | Treat the percentages as candidate values from the reference, not accepted defaults. The reference adds 10 percentage points of hysteresis and minimum on/off times; those values also need review against battery reserve, load continuity and acceptance targets. Preserve FR-SIM-06 transitions and log the reason for each action. |
| Forecast shift, selective shedding and policy comparison | Phase 06; DEC-009 and DEC-013 | Preserve the rule baseline, forecast-aware scheduler and perfect-foresight bound on identical inputs. Forecast changes may influence actions only through explicit, replayable policy inputs. |
| Coursework targets, evidence E1–E9, risk table, glossary and defense deck | Phase 10–11 and final report | Add as report artefacts after the underlying experiment has passed its acceptance gate; do not substitute presentation material for raw run evidence. |
| PWA, chat, Telegram and expanded what-if features | Existing scope tiers and phases 09–16 | Keep outside the core gate unless an explicit scope decision admits them. The current local-first, offline and no-paid-service constraints remain binding. |

## What is not adopted as a project fact

The reference roadmap is a proposal, so its example thresholds, component formulae, hardware behaviors, performance targets and feature list are not evidence that those behaviors exist. The signed acceptance checklist and requirements register stay authoritative. A proposed addition that changes a threshold, requirement, scope boundary, provenance class or energy-balance term needs a new decision and the corresponding checker updates before it can become a gate.

The two source HTML files are kept at the repository root for review: [charter](../Dar_Chams_Charter.html) and [roadmap](../Dar_Chams_Roadmap.html). The existing expanded roadmap remains the authoritative task-by-task engineering schedule.
