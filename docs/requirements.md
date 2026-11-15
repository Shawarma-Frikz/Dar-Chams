# Requirements register

| Field | Value |
| --- | --- |
| Version | 0.2.0 |
| Date | 2026-11-15 |
| Phase | 00 (task 00.4) |
| Owner | Author (sole developer) |
| Scope | Functional requirements, non-functional requirements, constraints, external dependencies |
| Gate mapping | [Scope brief §6](00-scope-brief.md#6--mvp-boundary), [acceptance checklist](acceptance-checklist.md) |

A requirement is admitted only if it can be verified. Vague ambitions ("make it smart", "look modern") are not requirements. Each row names its priority, verification method, prerequisite and the phase where its evidence is produced.

---

## 0 · How to read this register

**Identity.** Functional requirements use `FR-<AREA>-nn` (area grouping keeps the document navigable); non-functional requirements use `NFR-nn`; constraints use `CON-nn`; external dependencies use `EX-nn`. IDs are stable: once a requirement has been implemented they are never reused or renumbered, and a tightening before implementation is recorded in the [decision log](decision-log.md).

**Priority (MoSCoW).**

| Code | Meaning |
| --- | --- |
| `M` | Must — part of v1. Every `M` requirement is either owned by an MVP row or listed as cross-cutting in [scope brief §6.5](00-scope-brief.md#65-cross-cutting-requirements). |
| `S` | Should — built only after every `M` row is green; never blocks a phase gate. |
| `C` | Could — evaluated only after the experiment protocol is frozen (task 11.1). |

**Verification.** The method is the *kind* of evidence; the phase is where it is produced. A requirement is closed only when that evidence is linked from the phase report.

| Code | Method | Required evidence |
| --- | --- | --- |
| `T` | Automated test (Vitest, fast-check, Playwright, Node script) | Named test case and CI output for the phase |
| `A` | Analysis (benchmark, statistical evaluation, committed notebook) | Script plus output, and the reported table |
| `I` | Inspection or review against code, schema or bundle | Dated review note stating what was inspected |
| `D` | Demonstration of a user-visible flow | Scripted demo step and its capture |

**Dependencies.** `Depends on` lists what must exist or be true before this requirement can be verified: other requirements, `SCN` (the scenario contract), or an `EX-nn` external dependency. `—` means no prerequisite. The column is the project's dependency graph; §12 lists the external services behind it.

**Admission rules.**

1. One requirement states one observable condition. Two conditions are two requirements.
2. Every threshold carries a number and a unit.
3. These terms are banned from requirement text: *smart, modern, robust, user-friendly, intuitive, seamless, powerful, state-of-the-art, various, etc., appropriate, reasonable, as needed, if possible, nice*. If a sentence needs one of them, it is not yet a requirement.
4. A requirement that cannot name its verification method is removed rather than kept as an aspiration.
5. Criterion wording is machine-checked by [`scripts/check-requirements.mjs`](../scripts/check-requirements.mjs), which runs in CI from phase 01.5.

---

## 1 · Simulation engine

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| FR-SIM-01 | The engine must import and run in a bare Node.js process with no DOM, React, Three.js or browser API in its dependency graph; CI must fail if the import pulls one in. | M | T | — | 02.4 |
| FR-SIM-02 | The timestep must be configurable at 5, 15, 30 or 60 min; at 15 min a simulated day must contain exactly 96 steps and every timestamp must carry an explicit UTC offset. | M | T | SCN | 02.1 |
| FR-SIM-03 | Canonical units must be W for power, Wh for interval energy, °C for temperature and a 0–1 fraction for state of charge; conversion may occur only at I/O boundaries. | M | T, I | — | 02.2 |
| FR-SIM-04 | At every step, `abs(PV + import + discharge − load − charge − export − losses) ≤ 1 × 10⁻⁶ kWh`. | M | T | FR-SIM-03 | 02.3 |
| FR-SIM-05 | The same scenario and seed must reproduce identical interval values (relative difference ≤ 1 × 10⁻⁹) and an identical ordered event sequence. | M | T | FR-SIM-02, FR-SIM-04 | 02.5 |
| FR-SIM-06 | Every state transition must emit an event carrying timestamp, source, stable entity identifier, previous state, next state and payload. | M | T | FR-SIM-02 | 02.6 |
| FR-SIM-07 | Invalid configuration and impossible states must be rejected or clamped by documented rules; each rule must have a test case and a code reference, and NaN or Infinity must never reach results. | M | T | SCN, FR-SIM-10 | 02.7 |
| FR-SIM-08 | Controllers and detectors must observe state only through a typed observation interface; hidden world state must be absent from the object they receive and unreachable at the type level. | M | I, T | FR-SIM-04, FR-SIM-06 | 02.4 |
| FR-SIM-09 | Speed must be selectable at 1×, 60× and maximum while preserving fixed-step semantics and identical results for a given seed. | M | T | FR-SIM-02, FR-SIM-05 | 02.5 |
| FR-SIM-10 | A scenario must validate against [`scenarios/scenario.schema.json`](../scenarios/scenario.schema.json) and the relational invariants before a run starts; rejection must name the offending field and must never fall back to a default. | M | T, I | SCN | 01.4 |

## 2 · Photovoltaic model

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| FR-PV-01 | Installation geometry (latitude, longitude, altitude, tilt, azimuth, module count, installed DC capacity) must be scenario configuration; no geometry value may appear as a literal in engine code. | M | T, I | SCN | 03.1 |
| FR-PV-02 | Sunrise, sunset and solar noon must agree with an independent reference within ±2 min for at least three site/date pairs, and noon elevation/azimuth within ±0.5°. | M | T | FR-PV-01 | 03.2 |
| FR-PV-03 | Available irradiance must be converted to plane-of-array irradiance by one named simplified transposition model, labelled an approximation in code and in the report. | M | I | FR-PV-02 | 03.4 |
| FR-PV-04 | Cell temperature must be estimated from ambient temperature and plane-of-array irradiance by a named model using the configured NOCT, and the configured temperature coefficient must reduce output as cell temperature rises. | M | T | FR-PV-03, SCN | 03.5 |
| FR-PV-05 | Soiling, shading windows, mismatch, availability and inverter conversion loss including clipping must each be configurable and separately reported in the loss breakdown. | M | T | FR-PV-03 | 03.6, 03.7 |
| FR-PV-06 | PV AC output must be zero at night, never negative, and never above the configured inverter AC limit. | M | T | FR-PV-04, FR-BAT-05 | 03.6 |
| FR-PV-07 | Daily yield must be compared with PVGIS for at least 12 days spanning seasons; mean absolute daily-energy bias must be ≤ 15% and every larger deviation explained. | M | A | FR-PV-03, FR-PV-04, FR-PV-06, EX-03 | 03.9 |
| FR-PV-08 | A shading or soiling change must produce the same explainable production reduction when replayed with the same scenario and seed. | M | T | FR-PV-05, FR-SIM-05 | 03.7 |
| FR-PV-09 | Tracking must be optional with fixed tilt as the default, must model orientation limits, stow conditions and actuator energy, and must report net gain after actuator consumption. | S | T | FR-PV-01, FR-PV-05 | 03.8 |
| FR-PV-10 | The world model must support injected, labelled PV underproduction faults (soiling step, shading step, partial failure) that the controller cannot observe directly. | S | T | FR-PV-08, FR-SIM-08 | 03.7 |

## 3 · Battery, inverter and grid

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| FR-BAT-01 | Capacity, usable SOC window, initial SOC, charge and discharge limits, round-trip efficiency and chemistry label must be scenario configuration and must be validated for consistency. | M | T | SCN, FR-SIM-10 | 04.1 |
| FR-BAT-02 | SOC must match hand-calculated cases within 1 × 10⁻⁶ kWh, including efficiency and power-limit clamping. | M | T | FR-BAT-01, FR-SIM-03 | 04.2 |
| FR-BAT-03 | The battery must never charge and discharge in the same interval; the v1 model has no topology that permits it. | M | T | FR-BAT-01 | 04.3 |
| FR-BAT-04 | SOC must stay inside the configured window and power inside the configured limits across 50 seeds × 10,000 randomized steps. | M | T | FR-BAT-02, FR-SIM-05 | 04.2, 04.7 |
| FR-BAT-05 | Inverter efficiency, rated AC power, clipping and standby consumption must appear as separate terms in the energy accounting. | M | T | FR-BAT-01 | 04.4 |
| FR-BAT-06 | Ageing must be an optional capacity-fade proxy, disabled by default, labelled an approximation, and never presented as remaining-useful-life. | C | I | FR-BAT-01 | 04.6 |
| FR-GRD-01 | Import limit, export limit, tariff structure and outage windows must be scenario configuration; `grid_connected` and `off_grid` must be explicit modes. | M | T | SCN | 04.5 |
| FR-GRD-02 | During an outage the grid must exchange nothing, restoration must be logged, and the energy balance must still hold. | M | T | FR-GRD-01, FR-SIM-06 | 04.5 |
| FR-GRD-03 | When tariff values are unverified (`null`), economic metrics must be absent or visibly disabled, never computed from an assumed price. | M | T, I | FR-GRD-01, NFR-07 | 04.5 |

## 4 · Household model

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| FR-LOD-01 | Rooms and appliances must use one schema shared by the engine and the visual twin; every mesh identifier must map to an entity identifier. | M | I, T | SCN | 05.1 |
| FR-LOD-02 | Every appliance must declare rated power, profile, priority and controllability, and a derivable cycle duration and energy per cycle from its schedule window or flexibility block. | M | I | FR-LOD-01 | 05.2 |
| FR-LOD-03 | Appliance state machines must reject every transition outside the documented set (off, scheduled, running, paused/deferred, completed, unavailable). | M | T | FR-LOD-02, FR-SIM-06 | 05.4 |
| FR-LOD-04 | Load traces must derive from the single scenario seed; appliance contributions must sum exactly to the household total at every step. | M | T | FR-LOD-02, FR-SIM-05 | 05.5 |
| FR-LOD-05 | Priority must be exactly one of critical, important, flexible or discretionary, and must never be learned or inferred. | M | I, T | FR-LOD-02 | 05.6 |
| FR-LOD-06 | A user action must mutate simulation input, emit a logged event and, if rejected, state the violated constraint. | M | D, T | FR-LOD-03, FR-SIM-06 | 05.7 |
| FR-LOD-07 | Four household presets (economical, typical, high-consumption, high-flexibility) must exist and be comparable under identical weather and seed. | S | D | FR-LOD-01 | 05.8 |

## 5 · Energy management

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| FR-EMS-01 | The dispatch policy must be documented as a deterministic state/decision table before implementation, with each row naming its condition, action and reason code. | M | I | SCN, FR-LOD-05 | 06.1 |
| FR-EMS-02 | The rule-based baseline must run end-to-end from reserve SOC, PV surplus, demand and grid state, and must reproduce identically. | M | T | FR-EMS-01, FR-BAT-04, FR-GRD-01 | 06.2 |
| FR-EMS-03 | The scheduling objective must document every term, unit, weight and hard constraint, with hard constraints listed separately from weighted preferences. | M | I | FR-EMS-01 | 06.3 |
| FR-EMS-04 | The scheduler must emit only feasible plans: deadline, duration, non-interruptible cycle, reserve SOC, inverter power and grid limits respected; an infeasible request must be rejected with the violated constraint named. | M | T | FR-EMS-03, FR-LOD-03, FR-BAT-04, FR-GRD-02 | 06.4 |
| FR-EMS-05 | Reserve SOC must be scenario configuration and must be maintained under sunny, cloudy and islanded scenarios. | M | T | FR-BAT-04, FR-EMS-02 | 06.5 |
| FR-EMS-06 | Load shedding must follow the configured order deterministically; a dropped critical load must appear as unmet demand and must never disappear silently. | M | T | FR-EMS-02, FR-LOD-05 | 06.6 |
| FR-EMS-07 | Every interval's surplus must be fully allocated among charge, flexible load, export and curtailment with a residual ≤ 1 × 10⁻⁶ kWh, and each chosen action must carry a reason code. | M | T | FR-EMS-02, FR-BAT-04 | 06.7 |
| FR-EMS-08 | Every controller action must store trigger, forecast inputs, active constraints, alternatives considered, selected action and expected effect. | M | I, T | FR-EMS-01, FR-SIM-06 | 06.8 |
| FR-EMS-09 | The comparison runner must execute baseline and scheduler on identical scenario, weather, load trace, initial SOC and seed, and must fail if any input differs. | M | T | FR-SIM-05, NFR-03 | 06.9 |
| FR-EMS-10 | A missing, stale or invalid forecast must trigger an automatic fallback to the baseline, logged and visible in the interface. | M | T | FR-EMS-04, FR-FCT-01 | 06.10 |
| FR-EMS-11 | A perfect-foresight oracle must be available as an upper bound on the same scenarios. | S | T | FR-EMS-09 | 06.9 |
| FR-EMS-12 | The scheduler may reserve energy against forecast uncertainty by a documented margin or scenario set rather than optimizing on point forecasts alone. | C | T | FR-EMS-04 | 06.4 |

## 6 · Forecasting and machine learning

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| FR-FCT-01 | PV and load forecasts must be separate targets with a defined unit, horizon and issue interval; forecast values must be a distinct type from simulated truth. | M | I | SCN, FR-SIM-02 | 07.1 |
| FR-FCT-02 | Persistence, time-of-day and weather-driven baselines must exist and be scored before any learned model is trained. | M | T | FR-FCT-01, EX-01 | 07.3 |
| FR-FCT-03 | Evaluation must use time-ordered splits; no observation may inform an earlier or same-origin interval, and shuffling is prohibited. | M | I, T | FR-FCT-01 | 07.4 |
| FR-FCT-04 | A learned model is retained only if it improves on the relevant baseline; its artifact, preprocessing, feature schema, seed and evaluation report must be versioned together. | M | T, A | FR-FCT-02, FR-FCT-03 | 07.4 |
| FR-FCT-05 | Forecast quality must be reported as MAE and RMSE per horizon with sample counts; MAPE is reported only for windows whose observed mean is at least 10% of the series' non-zero mean, and `n/a` otherwise. | M | A | FR-FCT-02 | 07.5 |
| FR-FCT-06 | One pinned browser inference runtime must load the exact artifact used in evaluation; silent substitution of a different model is prohibited. | M | T, I | FR-FCT-04, EX-08 | 07.4 |
| FR-FCT-07 | Every training dataset must ship a manifest naming source, generator version, scenario parameters, split boundaries and synthetic-data proportion. | M | I | FR-FCT-02, FR-SIM-05 | 07.2 |

## 7 · Anomaly detection

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| FR-ANM-01 | The detector must flag PV underproduction against the irradiance and temperature expectation, abnormal load spikes and SOC inconsistencies. | S | T | FR-PV-10, FR-FCT-02 | 07.6 |
| FR-ANM-02 | Detector quality must be reported as precision, recall and detection latency per injected fault type. | S | T, A | FR-ANM-01, FR-PV-10 | 07.6 |
| FR-ANM-03 | Each anomaly record must carry severity, evidence window, expected range and a false-positive caveat. | S | I | FR-ANM-01 | 07.6 |

## 8 · Interface and experience

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| FR-UX-01 | The overview must show current generation, household load, SOC, grid state and the next recommended action within the first viewport at 1366×768 and at 390×844, without navigation or scrolling. | M | D | FR-SIM-04, FR-EMS-08 | 09.2 |
| FR-UX-02 | Every widget on a screen must read the same simulation snapshot; no widget may advance the simulation independently. | M | T | FR-SIM-02 | 09.2 |
| FR-UX-03 | Charts must reconcile with stored interval data: displayed totals equal interval sums within display rounding, with unit, interval and range labelled. | M | T | FR-SIM-04, NFR-03 | 09.3 |
| FR-UX-04 | Selecting an event in the timeline must reveal the same trigger, inputs, constraints, alternatives and effect stored for that action. | M | D | FR-SIM-06, FR-EMS-08 | 09.4 |
| FR-UX-05 | Appliance controls must mutate simulation input and take effect in the next snapshot; a visual-only toggle is a failure. | M | T | FR-SIM-04, FR-LOD-06 | 09.5 |
| FR-UX-06 | The scenario editor must validate input against the scenario schema and create a new run configuration without mutating stored runs. | M | T | FR-SIM-10, SCN | 09.6 |
| FR-UX-07 | Scenarios and run summaries must survive a page refresh through local persistence; no secret may be present in the client bundle. | M | T, I | FR-SIM-05, NFR-04 | 09.7 |
| FR-UX-08 | Runs and comparisons must export to CSV/JSON and a printable view traceable to scenario ID, engine version and seed. | M | T | NFR-03 | 09.8 |
| FR-UX-09 | At 390 px width no critical action or status may require horizontal scrolling, and the 3D scene must collapse to its 2D fallback. | M | D | FR-UX-01 | 09.9 |
| FR-UX-10 | The 2D system map must expose every critical state and control available in 3D. | M | D | FR-UX-02, FR-TWN-01 | 08.10 |

## 9 · Digital twin

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| FR-TWN-01 | 3D objects must bind to simulation entities through a typed view model; no energy logic may live in mesh event handlers. | M | I, T | FR-SIM-04, FR-LOD-01 | 08.5 |
| FR-TWN-02 | Flow width or speed must map to actual power, and flow must be inactive at zero power. | M | T | FR-SIM-04, FR-TWN-01 | 08.6 |
| FR-TWN-03 | Selecting an object in 3D must synchronise the detail panel and vice versa, on desktop and mobile. | M | D | FR-TWN-01, FR-UX-02 | 08.7 |
| FR-TWN-04 | The scene environment must follow the simulation clock and weather; any decorative lighting must be labelled decorative. | M | I | FR-SIM-02, SCN | 08.8 |
| FR-TWN-05 | Rendering must use on-demand frames, a capped pixel ratio, limited dynamic shadows and lazy loading; disabling 3D must leave every non-3D function working. | M | T | FR-TWN-01, NFR-01 | 08.9 |

## 10 · Non-functional requirements

| ID | Requirement | Pri | Verify | Depends on | Phase |
| --- | --- | --- | --- | --- | --- |
| NFR-01 | On the target laptop, measured by the committed benchmark script: engine ≥ 5,000 steps/s; snapshot update < 100 ms; 3D ≥ 24 fps low and ≥ 30 fps medium at 1080p; cold interactive start < 5 s locally. | M | T, D | FR-SIM-01 | 10.6 |
| NFR-02 | The complete demo must run with the network disabled, from cached weather and a precomputed replay. | M | D | NFR-11 | 10.4, 11.5 |
| NFR-03 | Every run must record engine version, scenario hash, seed and data provenance in a manifest that export and interface can read. | M | I, T | FR-SIM-05 | 02.5 |
| NFR-04 | No secret may appear in the repository or the client bundle; any third-party key stays server-side and is absent from build output. | M | I | — | 10.7 |
| NFR-05 | No household-identifying data may be collected or transmitted; outbound requests are limited to weather and static assets, verified from the network log. | M | I | NFR-04 | 10.7 |
| NFR-06 | TypeScript strict mode, lint, format, type-check and tests must pass in CI before merge. | M | T | — | 01.5 |
| NFR-07 | Every displayed numeric value must carry a provenance class and a unit; a simulated value must never be presented as measured. | M | I | FR-SIM-03 | 00.5, 09 |
| NFR-08 | Status must be conveyed by text or icon as well as colour; all controls must be keyboard-operable; reduced-motion preference must be respected. | M | I, D | FR-UX-10 | 08.9, 09.9 |
| NFR-09 | The project must install and run from documented commands on Windows, Linux and macOS without Docker. | M | T | — | 01.2 |
| NFR-10 | Only free tools and free tiers are permitted; a rate-limit response must degrade gracefully with a visible notice. | M | I, D | EX-01, EX-04, EX-05, EX-06, EX-07 | 10.4 |
| NFR-11 | A weather-provider failure must degrade to cached or synthetic input with visible provenance, without corrupting state or interrupting the run. | M | T | FR-PV-03, SCN, EX-01 | 10.4 |

---

## 11 · Constraints

Constraints are binding limits on any acceptable solution. They are not wishes; a design that violates one is rejected in review. Their source is an assumption (AS) in the [scope brief §8](00-scope-brief.md#8--assumptions-and-constraints), a decision, or the claim gate.

| ID | Constraint | Source | Verify | Consequence if violated |
| --- | --- | --- | --- | --- |
| CON-01 | No physical plant is monitored or controlled in v1. | AS-02, claim gate | I | Any hardware path (ESP32, relay, servo) fails review. |
| CON-02 | One developer, part-time around a course load; no parallel workstreams. | AS-01, R-01 | I | Work is strictly sequential; a slipped phase moves later gates. |
| CON-03 | Free tools and free tiers only; no paid API, no paid hosting, no local LLM. | AS-03 | I | A paid-tier dependency is rejected; a free tier must have a fallback. |
| CON-04 | Development and demonstration on Windows 11 with Node 24 LTS and no Docker. | AS-04 | T | A Unix-only or Docker-only install path is a defect. |
| CON-05 | Rendering budget: 2 GB MX330 at 1080p, capped pixel ratio, on-demand frames, 2D fallback. | AS-05, NFR-01 | T, D | A scene above the frame budget is downgraded, never shipped slow. |
| CON-06 | The demonstration must work with the network disabled. | AS-06, NFR-02 | D | Any network-dependent step is excluded from the demo path. |
| CON-07 | One site and one household; no multi-site or multi-tenant aggregation. | AS-07 | I | A second site is a new proposal, not a configuration flag. |
| CON-08 | No economic claim without a cited STEG tariff; unverified values stay `null`. | AS-08, FR-GRD-03 | I | The cost column stays disabled and the report states why. |
| CON-09 | Results are comparative simulation evidence, not field validation. | AS-10, claim gate | I | Wording implying measurement is corrected before submission. |
| CON-10 | English code and engineering documents; report language follows the module. | DEC-020 | I | A non-English report triggers one translation pass in phase 11. |
| CON-11 | Metric units, TND for currency, IANA timezone identifiers, UTC-offset instants. | DEC-004, DEC-005 | T | A non-metric value or naive timestamp is a defect. |
| CON-12 | Public weather data only; no personal or household data leaves the browser. | NFR-05 | I | Any upload of usage data is rejected. |
| CON-13 | Dependency licences must be permissive and compatible with the project licence. | AS-03 | I | A copyleft dependency is rejected unless the project adopts a compatible licence. |

## 12 · External dependencies

These are outside the project's control. Each has a declared fallback, and the report states when a fallback was used. Losing one must degrade a result, never break a run.

| ID | Dependency | Used by | Fallback | Impact if unavailable |
| --- | --- | --- | --- | --- |
| EX-01 | Open-Meteo forecast API (free, no key) | FR-FCT-02, NFR-11 | Cached series, then seeded synthetic series with class `S` | Forecasts become unavailable; the scheduler falls back to the baseline (FR-EMS-10) and the demo still runs |
| EX-02 | Open-Meteo ERA5 archive | Historical experiments | Cached dataset; narrower date range | Historical comparison is reduced and the reduction is reported |
| EX-03 | PVGIS API | FR-PV-07 | Manual export to CSV and replay | AC-06 is reported as not performed, not estimated |
| EX-04 | SunCalc (MIT) | FR-PV-02 | Local implementation of solar position | Solar geometry is re-verified against the same fixtures |
| EX-05 | Google Colab free tier | FR-FCT-04 (training only) | Smaller model trained locally, or drop the learned model | Forecast stays on weather-driven baselines; SH-01 is not claimed |
| EX-06 | GitHub Actions free tier | NFR-06 | Local pre-push script with manually recorded evidence | CI evidence is produced locally and labelled as such |
| EX-07 | Static hosting (Vercel Hobby or equivalent) | Deployment | Static export served locally for the demo | The live URL is unavailable; the offline demo is unaffected |
| EX-08 | onnxruntime-web, pinned version | FR-FCT-06 | None; the learned model is disabled | No learned-model claim is made |

The critical dependency chains are `SCN → FR-SIM → FR-PV/FR-BAT → FR-EMS → FR-FCT → FR-UX → FR-TWN`, and `FR-SIM-08` gates any anomaly claim (`FR-ANM-*`), because a detector that can see ground truth is not a detector.

## 13 · Traceability

| Measure | Value | Checked by |
| --- | --- | --- |
| Functional requirements | 73 | `check-requirements.mjs` |
| Non-functional requirements | 11 | `check-requirements.mjs` |
| Constraints | 13 | `check-requirements.mjs` |
| External dependencies | 8 | `check-requirements.mjs` |
| Priorities | 75 Must, 7 Should, 2 Could | `check-requirements.mjs` |
| Must requirements mapped to an MVP row or cross-cutting table | 75 of 75 | `check-requirements.mjs`, [scope brief §6](00-scope-brief.md#6--mvp-boundary) |
| Project-level gates | 27 criteria (AC-01…AC-27) | [acceptance checklist](acceptance-checklist.md) |

The register is the full requirement set; the acceptance checklist is the subset promoted to project gates. A requirement without a gate is still verified by its own test case in the named phase.

These five requirements make the project's claims defensible and may not be downgraded without a written justification in the report: FR-SIM-08 (observability), FR-PV-07 (PVGIS benchmark), FR-EMS-09 (paired runs), FR-EMS-11 (oracle bound), FR-GRD-03 (unverified tariff disables economics).

## 14 · Change control

- The **Phase** column ties each requirement to the roadmap task that produces its evidence; a phase is not complete until that evidence is recorded.
- Requirements marked `S` or `C` do not block a phase gate; `M` requirements do, through [scope brief §6](00-scope-brief.md#6--mvp-boundary).
- Any added, removed or re-scoped requirement requires a [decision-log](decision-log.md) entry stating the reason and the schedule consequence.
- IDs are never reused. A requirement withdrawn before implementation is marked withdrawn, not deleted, and the reason is recorded.
- Tightening a requirement's wording before implementation is allowed and recorded in the decision log; changing a threshold after results are seen is prohibited (task 11.1).
