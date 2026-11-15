# Requirements register

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Date | 2026-11-15 |
| Phase | 00 (task 00.4) |
| Owner | Author (sole developer) |

A requirement is admitted only if it can be verified. Vague ambitions ("make it smart", "look modern") are not requirements. Each row names the phase task where it is built and the method used to verify it.

**Priority (MoSCoW):** `M` must · `S` should · `C` could.
**Verification:** `T` test · `A` analysis · `I` inspection · `D` demonstration.

---

## 1 · Simulation engine

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-SIM-01 | The engine must run headless in Node.js with no DOM, React or Three.js dependency. | M | T | 02.4 |
| FR-SIM-02 | The timestep must be configurable; at 15 min a simulated day must contain exactly 96 steps, and every timestamp must be timezone-aware. | M | T | 02.1 |
| FR-SIM-03 | Canonical units must be W for power, Wh for interval energy, °C for temperature and a 0–1 fraction for state of charge; conversions may occur only at I/O boundaries. | M | T, I | 02.2 |
| FR-SIM-04 | Supply and demand must balance at every step: \|PV + grid import + battery discharge − load − battery charge − grid export − losses\| ≤ 1 × 10⁻⁶ kWh. | M | T | 02.3 |
| FR-SIM-05 | The same scenario and seed must reproduce identical interval values (relative difference ≤ 1 × 10⁻⁹) and identical event sequences. | M | T | 02.5 |
| FR-SIM-06 | Every state transition must emit an event carrying timestamp, source, stable identifier and payload. | M | T | 02.6 |
| FR-SIM-07 | Invalid configuration and impossible states must be rejected or clamped according to documented rules; NaN must never propagate into results. | M | T | 02.7 |
| FR-SIM-08 | Controllers and detectors must observe simulated state only through a typed observation interface; hidden world state (soiling, injected faults, future weather, ground-truth SOC) must be inaccessible to them. | M | I, T | 02.4 |
| FR-SIM-09 | Simulation speed must be selectable (1×, 60×, maximum) while preserving fixed-step semantics and determinism. | M | T | 02.5 |
| FR-SIM-10 | A scenario must be validated against `scenarios/scenario.schema.json` and the relational invariants (SOC ordering, unique IDs, room references, profile consistency, off-grid limits, verified-tariff completeness) before a run starts; an invalid scenario must be rejected with a message naming the offending field, never silently defaulted. | M | T, I | 01.4 |

## 2 · Photovoltaic model

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-PV-01 | Installation geometry (latitude, longitude, tilt, azimuth, module count, installed DC capacity) must be configuration, not code. | M | T, I | 03.1 |
| FR-PV-02 | Sunrise, sunset and solar noon must agree with an independent reference within ±2 min for at least three site/date pairs, and elevation/azimuth at solar noon within ±0.5°. | M | T | 03.2 |
| FR-PV-03 | Conversion from available irradiance to plane-of-array irradiance must use a documented simplified transposition and must be labelled as an approximation in code and report. | M | I | 03.4 |
| FR-PV-04 | Cell temperature must be estimated from ambient temperature and irradiance with a documented model, and a configurable temperature coefficient must reduce output as temperature rises. | M | T | 03.5 |
| FR-PV-05 | Soiling, shading windows, mismatch, availability, inverter efficiency and clipping must each be configurable and individually attributable in the loss breakdown. | M | T | 03.6, 03.7 |
| FR-PV-06 | PV AC output must be zero at night, never negative, and never above the configured inverter AC limit. | M | T | 03.6 |
| FR-PV-07 | Simulated daily yield must be benchmarked against PVGIS for at least 12 days spanning seasons; mean absolute daily-energy bias must be ≤ 15% and every larger deviation must be explained. | M | A | 03.9 |
| FR-PV-08 | A shading or soiling experiment must produce an identical, explainable production reduction when replayed with the same scenario and seed. | M | T | 03.7 |
| FR-PV-09 | Solar tracking must be an optional scenario feature (fixed-tilt is the default) that models orientation limits, stow conditions and actuator energy, and reports net gain after actuator consumption. | S | T | 03.8 |
| FR-PV-10 | The world model must support injected and labelled PV underproduction faults (soiling step, shading step, partial failure) for anomaly-detector evaluation. | S | T | 03.7 |

## 3 · Battery, inverter and grid

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-BAT-01 | Nominal capacity, usable SOC window, initial SOC, charge/discharge power limits and round-trip efficiency must be configurable and validated for consistency. | M | T | 04.1 |
| FR-BAT-02 | SOC updates must match hand-calculated cases within 1 × 10⁻⁶ kWh, including efficiency and power limits. | M | T | 04.2 |
| FR-BAT-03 | The battery must never charge and discharge in the same interval unless a documented topology explicitly permits it. | M | T | 04.3 |
| FR-BAT-04 | SOC must stay inside the configured window and power inside the configured limits across 50 seeds × 10,000 steps of randomized scenarios. | M | T | 04.2, 04.7 |
| FR-BAT-05 | Inverter efficiency, rated AC power, clipping and standby consumption must be represented in the energy accounting. | M | T | 04.4 |
| FR-BAT-06 | Battery aging must be an optional capacity-fade proxy, disabled by default and labelled an approximation; it must not be presented as a remaining-useful-life prediction. | C | I | 04.6 |

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-GRD-01 | Import limit, export limit, tariff structure and outage windows must be configurable; grid-connected and islanded modes must be explicit. | M | T | 04.5 |
| FR-GRD-02 | During an outage the grid must supply nothing, restoration must be logged, and the energy balance must remain valid. | M | T | 04.5 |
| FR-GRD-03 | When tariff values are unverified (null), economic metrics must be disabled and visibly labelled rather than computed from assumed prices. | M | T, I | 04.5 |

## 4 · Household model

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-LOD-01 | Rooms and appliances must use one schema shared by the simulation and the visual twin; mesh identifiers map to entity identifiers. | M | I, T | 05.1 |
| FR-LOD-02 | Every appliance must declare rated power, profile, priority, controllability, minimum run time or duration, and estimated energy per cycle where applicable. | M | I | 05.2 |
| FR-LOD-03 | Appliance state machines (off, scheduled, running, paused/deferred, completed, unavailable) must reject invalid transitions. | M | T | 05.4 |
| FR-LOD-04 | Load profiles must be generated from a seeded random source; appliance contributions must sum exactly to the household total. | M | T | 05.5 |
| FR-LOD-05 | Priority must use exactly four classes — critical, important, flexible, discretionary — as policy metadata, never as a learned score. | M | I, T | 05.6 |
| FR-LOD-06 | User actions (switch, reschedule, reprioritise, add appliance) must mutate simulation input, emit a logged event, and explain any rejection. | M | D, T | 05.7 |
| FR-LOD-07 | At least four household presets (economical, typical, high-consumption, high-flexibility) must be available and comparable under identical weather. | S | D | 05.8 |

## 5 · Energy management

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-EMS-01 | The dispatch policy must be documented as a deterministic state/decision table before implementation. | M | I | 06.1 |
| FR-EMS-02 | A rule-based baseline controller using reserve SOC, PV surplus, demand and grid state must run end-to-end and reproduce identically. | M | T | 06.2 |
| FR-EMS-03 | The scheduling objective must document every term, unit, weight and hard constraint, with hard constraints separated from weighted preferences. | M | I | 06.3 |
| FR-EMS-04 | The forecast-aware scheduler must emit only feasible plans: deadlines, durations, non-interruptible cycles, reserve SOC, inverter power and grid limits respected; infeasible cases must state why. | M | T | 06.4 |
| FR-EMS-05 | Reserve SOC must be configurable and maintained under sunny, cloudy and outage scenarios. | M | T | 06.5 |
| FR-EMS-06 | Load shedding order must be deterministic and visible; critical demand must never be dropped silently — unmet demand is reported. | M | T | 06.6 |
| FR-EMS-07 | Surplus must be fully accounted for (charge, flexible load, export, curtailment) and every chosen action must carry a reason code. | M | T | 06.7 |
| FR-EMS-08 | Every controller action must store trigger, forecast inputs, active constraints, alternatives considered, selected action and expected effect. | M | I, T | 06.8 |
| FR-EMS-09 | The comparison runner must execute baseline and scheduler against identical scenario, weather, load trace, initial SOC and seed, and must fail if those inputs differ. | M | T | 06.9 |
| FR-EMS-10 | Missing, stale or invalid forecasts must trigger an automatic, logged and visible fallback to the baseline policy. | M | T | 06.10 |
| FR-EMS-11 | A perfect-foresight oracle policy must be available as an upper bound for the same scenarios. | S | T | 06.9 |
| FR-EMS-12 | The scheduler may reserve energy against forecast uncertainty (scenario-based or margin-based) rather than optimizing on point forecasts alone. | C | T | 06.4 |

## 6 · Forecasting and machine learning

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-FCT-01 | PV forecast and load forecast must be separate targets, each with defined unit, horizon and issue interval; forecasts must never be mixed with ground truth. | M | I | 07.1 |
| FR-FCT-02 | Naïve baselines (persistence, time-of-day average, weather-driven) must exist before any learned model. | M | T | 07.3 |
| FR-FCT-03 | Evaluation must use time-aware splits; random row shuffling is prohibited. | M | I, T | 07.4 |
| FR-FCT-04 | A learned model is retained only if it improves on the relevant baseline; its artifact, preprocessing, feature schema, seed and evaluation report must be versioned. | M | T, A | 07.4 |
| FR-FCT-05 | Forecast quality must be reported as MAE and RMSE per horizon with sample counts; MAPE only where the denominator behaviour is sensible. | M | A | 07.5 |
| FR-FCT-06 | One pinned browser inference runtime (ONNX Runtime Web) must load exactly the artifact used in evaluation; the app must not silently substitute a different model. | M | T, I | 07.4 |
| FR-FCT-07 | Every training dataset must ship a manifest: source, generator version, scenario parameters, split boundaries and synthetic-data proportion. | M | I | 07.2 |

## 7 · Anomaly detection

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-ANM-01 | The detector must flag PV underproduction relative to irradiance/temperature expectation, abnormal load spikes and SOC inconsistencies. | S | T | 07.6 |
| FR-ANM-02 | Detector quality must be evaluated on injected, labelled faults and reported as precision, recall and detection latency per fault type. | S | T, A | 07.6 |
| FR-ANM-03 | Each anomaly record must carry severity, evidence window, expected range and a false-positive caveat. | S | I | 07.6 |

## 8 · Interface and experience

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-UX-01 | The overview must answer, without navigation: current generation, household load, SOC, grid state and next recommended action. | M | D | 09.2 |
| FR-UX-02 | Every widget on a screen must read the same simulation snapshot. | M | T | 09.2 |
| FR-UX-03 | Charts must reconcile with stored interval data and totals, with units, interval and range labelled. | M | T | 09.3 |
| FR-UX-04 | Selecting an event in the decision/alert timeline must reveal the inputs and state transition that produced it. | M | D | 09.4 |
| FR-UX-05 | Appliance controls must mutate simulator state, not only visual state. | M | T | 09.5 |
| FR-UX-06 | The scenario editor must validate input and create a new run configuration without mutating historical runs. | M | T | 09.6 |
| FR-UX-07 | Scenarios and run summaries must survive a page refresh through local persistence; no secret may ship to the browser. | M | T, I | 09.7 |
| FR-UX-08 | Runs and comparisons must export to CSV/JSON and a printable view traceable to scenario ID, engine version and seed. | M | T | 09.8 |
| FR-UX-09 | No critical action may require horizontal scrolling on a phone; the 3D scene must collapse gracefully. | M | D | 09.9 |
| FR-UX-10 | A 2D system map must expose all critical state and controls available in 3D (accessibility parity). | M | D | 08.10 |

## 9 · Digital twin

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| FR-TWN-01 | 3D objects must bind to simulation entities through a typed view model; energy logic must not live in mesh event handlers. | M | I, T | 08.5 |
| FR-TWN-02 | Flow visualisation width or speed must map to actual power values and become inactive at zero power. | M | T | 08.6 |
| FR-TWN-03 | Selecting an object in 3D must synchronise the detail panel, and vice versa, on desktop and mobile. | M | D | 08.7 |
| FR-TWN-04 | The scene environment must follow the simulation clock and weather; decorative lighting must be labelled as decorative. | M | I | 08.8 |
| FR-TWN-05 | Rendering must use on-demand frames, capped pixel ratio, limited dynamic shadows and lazy loading, and must be disable-able without breaking the application. | M | T | 08.9 |

---

## 10 · Non-functional requirements

| ID | Requirement | Pri | Verify | Phase |
| --- | --- | --- | --- | --- |
| NFR-01 | Performance targets on the target laptop: headless engine ≥ 5,000 steps/s; UI snapshot update < 100 ms; 3D ≥ 24 fps low / ≥ 30 fps medium at 1080p; cold interactive start < 5 s locally. | M | T, D | 10.6 |
| NFR-02 | The complete demo sequence must run with the network disabled, using cached weather and a precomputed replay. | M | D | 10.4, 11.5 |
| NFR-03 | Every run must record engine version, scenario hash, seed and data provenance in a manifest. | M | I, T | 02.5 |
| NFR-04 | No secret may appear in the repository or the client bundle; third-party keys, if introduced, stay server-side. | M | I | 10.7 |
| NFR-05 | No personal household data may be collected or transmitted by default. | M | I | 10.7 |
| NFR-06 | TypeScript strict mode, lint, format, type-check and tests must pass in CI before merge. | M | T | 01.5 |
| NFR-07 | Every displayed numeric value must carry a provenance label and a unit; simulated values must never be presented as measured. | M | I | 00.5, 09 |
| NFR-08 | Status must be conveyed by text or icon as well as colour; controls must be keyboard-operable; reduced-motion preferences respected. | M | I, D | 08.9, 09.9 |
| NFR-09 | The project must install and run on Windows, Linux and macOS from documented commands, without Docker. | M | T | 01.2 |
| NFR-10 | Only free tools and free tiers are permitted; rate limits must degrade gracefully. | M | I, D | 10.4 |
| NFR-11 | A weather-provider failure must degrade to cached or synthetic input with visible provenance and without corrupting state. | M | T | 10.4 |

---

## 11 · Traceability and change control

- The **Phase** column ties each requirement to the roadmap task that satisfies it. A phase is not complete until its requirements have recorded evidence in the [acceptance checklist](acceptance-checklist.md).
- The execution order is the roadmap order; requirements marked `S` or `C` do not block a phase gate.
- Any added, removed or re-scoped requirement requires a [decision-log](decision-log.md) entry stating the reason and the schedule consequence.
- Requirements FR-SIM-08, FR-PV-07, FR-EMS-09, FR-EMS-11 and FR-GRD-03 are the five that make the project's claims defensible; they may not be downgraded without a written justification in the report.
