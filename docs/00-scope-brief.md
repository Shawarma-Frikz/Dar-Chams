# Scope brief

| Field | Value |
| --- | --- |
| Phase | 00 — project definition and engineering decisions |
| Status | Complete (2026-11-15); boundary extended 2026-11-16 with the embedded sensing track (DEC-026) |
| Owner | Foudhaili Idris (sole developer) |
| Related | [Requirements](requirements.md) · [Decision log](decision-log.md) · [Provenance](data-provenance.md) · [Acceptance checklist](acceptance-checklist.md) |

---

## 1 · Product statement

> Helios is a simulation-first residential solar microgrid and energy-management digital twin. It models a virtual installation — photovoltaic array, battery storage, grid connection and a configurable household — inside a deterministic TypeScript engine, then compares a transparent rule-based controller against a forecast-aware scheduler that predicts generation and demand, coordinates flexible loads, protects battery reserve and explains every decision. The first release runs entirely in a browser against simulated telemetry and public weather data; no physical plant is monitored or controlled. Physical ESP32 and sensor integration is a later extension that must connect through the same observation and actuation contracts without rewriting the energy-management rules.

Canonical text. Mirrored in [`README.md`](../README.md) and [`docs/report/01-product-statement.md`](report/01-product-statement.md).

**One-sentence version for slides:** a virtual solar-powered house whose energy brain forecasts the sun, schedules household loads, protects the battery, and shows every decision in an inspectable digital twin.

---

## 2 · Problem and purpose

A residential solar installation is a control problem under uncertainty: production depends on weather that is only forecast, consumption depends on people, storage is finite, and every scheduling decision has a cost. Evaluating a management policy normally requires hardware, months of weather, and a real household — none of which are available to this project.

Helios replaces the installation with a configurable model so that policies can be compared **under identical conditions, on demand, and reproducibly**. The deliverable is therefore not "a dashboard" but an experimental apparatus: a simulation whose assumptions are written down, a baseline any reader can reproduce, and a forecast-aware policy measured against that baseline and against a perfect-foresight upper bound.

The honest claim is comparative, not absolute: *policy A serves critical load better than threshold rules under the same synthetic weather and household, with the gain quantified.* Everything else — 3D, charts, alerts — exists to make that claim inspectable.

---

## 3 · Intended users

| User | What they need from Helios |
| --- | --- |
| Author and jury | A reproducible experiment, explicit assumptions, inspectable decisions, an honest limitations section |
| Instructor / evaluator | A runnable demo that does not depend on hardware or live internet |
| Student or hobbyist planning an installation | A configurable testbed to explore array size, battery size and load priorities before buying parts |
| Reader of the report | Enough provenance to judge which numbers are simulated, forecast, derived or external |

Helios is **not** aimed at utilities, installers, or control-room operators; it has no certified metering, no grid-code compliance claims, and no multi-user operation.

---

## 4 · Operating scenario

The default scenario is [`scenarios/tunis-typical-v1.json`](../scenarios/tunis-typical-v1.json):

| Parameter | Value | Note |
| --- | --- | --- |
| Site | Tunis, 36.8065° N, 10.1815° E, UTC+1 | High-irradiance, hot, dusty context; no DST |
| Mode | Grid-connected, islanded behaviour via outage windows | Import/export limits configured |
| PV | 3.0 kWp, 12 modules, 30° tilt, south-facing | Fixed-tilt default; tracker optional |
| Inverter | 3.0 kW AC, 96% efficiency, clipping enforced | Standby consumption modelled |
| Battery | 5.12 kWh LFP, SOC window 10–95%, 2.5 kW charge / 3.0 kW discharge, 92% round-trip | Energy-bucket model, no electrochemistry |
| Household | 14 appliances across 6 rooms, four priority classes | ~15.6 kWh/day summer design load |
| Timestep | 15 min, 48 h horizon | 96 steps/day, 192 per horizon |
| Weather | Open-Meteo forecast, ERA5 archive, cached, synthetic fallback | Deterministic when seeded |
| Tariff | Structure defined, values unverified (`null`) | Economic metrics stay disabled until cited |

All values live in the scenario file, not in engine code. Each file validates against [`scenarios/scenario.schema.json`](../scenarios/scenario.schema.json) and the relational checks in `scripts/validate-scenarios.mjs`. Two controlled variants exist beside the default: `tunis-offgrid-v1` (off-grid sizing and no grid exchange) and `tunis-dust-v1` (12% soiling, one variable changed) — see [scenario conventions](../scenarios/README.md). Assumptions are design choices, not measurements — see [data provenance](data-provenance.md).

---

## 5 · Scope

### In scope (v1)

This is the whole v1 scope. The Must subset of it is the MVP, defined item by item in §6; a Should item is in scope but not in the MVP gate, and a Could item is not promised.

- Deterministic simulation of PV generation, inverter conversion, battery storage, grid exchange and household loads at a configurable timestep.
- Solar geometry, plane-of-array irradiance, temperature derating, soiling and shading as configurable scenario inputs.
- A household of individually modelled appliances with schedules, duty cycles, minimum run times, flexibility windows and priority classes.
- A documented rule-based baseline controller, a forecast-aware scheduler with an explanation record, and a paired comparison runner.
- Weather-driven forecasting with naïve baselines; a learned model only if it demonstrably beats them.
- Anomaly detection on PV underproduction, load spikes and SOC inconsistency, evaluated on injected, labelled faults.
- Dashboard (overview, charts, decision timeline, appliance control, scenario editor), local persistence, exportable reports.
- 2D system map (authoritative) and a low-poly 3D cutaway twin (a view of the same state).
- Validation harness: PV yield vs PVGIS, forecast skill vs baselines, policy vs baseline and vs perfect-foresight oracle.

### Out of scope (v1)

- Monitoring or actuating a real installation: no plant telemetry, no relay, no servo, no load switching. A bench-only ESP32 node may publish simulated or physically measured sensor channels into the application (§6.7).
- Certified metering, tariff billing, or financial advice.
- Multi-user accounts, authentication, cloud synchronisation.
- Native mobile applications (the web app is responsive; PWA packaging is optional polish).
- Electrochemical battery models, remaining-useful-life prediction.
- Reinforcement learning, MPC/MILP optimisation, or any LLM-driven control.
- Real-time grid services, demand-response markets, net-metering settlement.

---

## 6 · MVP boundary

The MVP is the smallest build that can produce the report's central comparison — baseline versus forecast-aware scheduler on identical inputs — and demonstrate it without hardware, paid services or a network connection. It is fixed at the **ten items named in roadmap task 00.3**, in the same order, plus the two supporting items in §6.2 and the embedded sensing track in §6.7. Anything else is Should, Could or Won't.

**Owner.** With one developer, ownership is by domain, not by person: `engine`, `data`, `automation`, `ui`, `twin`. The owner is accountable for the item's evidence appearing in the [acceptance checklist](acceptance-checklist.md); the sign-off in section D of that document is the accountability record.

**Acceptance references.** `AC-nn` refers to a measurable criterion in the [acceptance checklist](acceptance-checklist.md). `FR-*` refers to the [requirements register](requirements.md). An item is Met only when every referenced AC row is green; a summary sentence is not evidence.

### 6.1 The ten MVP items

| ID | Capability (roadmap 00.3 wording) | Owner | Requirements | Test | Acceptance criterion | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| MVP-01 | **Solar generation** | engine | FR-PV-01–08 | Solar-position fixtures against an independent reference; PV property tests; PVGIS cross-check notebook | AC-05 (±2 min, ±0.5°), AC-06 (bias ≤ 15% over ≥ 12 days), AC-01, AC-03 | 03 |
| MVP-02 | **Weather / daylight input** | data | NFR-11, FR-PV-03; scenario `weather` block | Adapter tests: provider reachable, unreachable, cache empty, cache corrupt; offline replay | AC-22 (degrade to cached/synthetic with correct class, logged, balance still closes) | 03, 10 |
| MVP-03 | **Battery** (with inverter conversion) | engine | FR-BAT-01–05, FR-GRD-01 | Hand-calculated SOC cases; randomized property test; clipping and outage fixtures | AC-01, AC-03, AC-02; SOC within 1 × 10⁻⁶ kWh of the hand calculation | 04 |
| MVP-04 | **Household appliances** | engine | FR-LOD-01–06 | State-transition matrix test; cross-midnight fixture; seeded load-trace sum test | AC-23 (0 invalid transitions, every transition logged); component energy sums exactly to the household total | 05 |
| MVP-05 | **Energy balance** (with grid exchange) | engine | FR-SIM-04, FR-GRD-01–03 | Step-level residual assertion over 50 seeds; islanded-outage scenario; unverified-tariff run | AC-01 (residual ≤ 1 × 10⁻⁶ kWh/step), AC-03; economic metrics absent when `verified: false` | 02, 04 |
| MVP-06 | **Rule-based baseline** | automation | FR-EMS-01, FR-EMS-02, FR-EMS-05, FR-EMS-06, FR-EMS-07 | Decision-table conformance against scripted SOC trajectories; deterministic replay | AC-24 (exact shed order, hysteresis honoured, no silent critical drop), AC-02 | 06 |
| MVP-07 | **Forecast-aware scheduler** | automation | FR-EMS-03, FR-EMS-04, FR-EMS-08, FR-EMS-10, FR-FCT-01–05 | Feasibility property test; explanation-record test; stale-forecast injection; paired evaluation | AC-25 (0 infeasible plans), AC-07 (skill vs baselines), AC-12 (fallback) | 06, 07 |
| MVP-08 | **Event log** (with timeline drill-down) | ui | FR-SIM-06, FR-EMS-08, FR-UX-04 | Event-emission test; timeline drill-down end-to-end; export traceability test | AC-26 (100% of actions and alerts fully resolved), AC-16 | 09 |
| MVP-09 | **Dashboard** (with authoritative 2D map) | ui | FR-UX-01–10; NFR-07, NFR-08 | Playwright flows at desktop and 390 px; chart reconciliation test; keyboard pass; register-conformance test | AC-13, AC-14, AC-15, AC-16, AC-17, AC-20, AC-28 | 08, 09 |
| MVP-10 | **Basic 3D twin** (timeboxed) | twin | FR-TWN-01–05 | Binding test (mesh → entity ID); flow-to-power test; disable-3D test; frame-rate benchmark | AC-27 (100% bound objects, no simulation value changes), AC-18, AC-17 | 08 |

### 6.2 Supporting items the gate cannot omit

The roadmap schedules these outside the ten, but without them the MVP's claims would be unfalsifiable, so they are inside the MVP gate and outside the ten-item list. They are not optional extras.

| ID | Item | Owner | Requirements | Test | Acceptance criterion | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| MVP-S1 | Weather-driven forecast with naïve baselines | data | FR-FCT-01–07 | Time-aware split; MAE/RMSE per horizon vs persistence and time-of-day; artifact pinning test | AC-07 (skill score; a learned model retained only if it improves) | 07 |
| MVP-S2 | Paired experiment runner and comparison export | automation | FR-EMS-09, NFR-03 | Manifest-hash equality test; deliberate input-mismatch test must fail | AC-09 (≥ 12 pairs, identical inputs proven), AC-10 (metric completeness), AC-11 (oracle upper bound) | 06 |

PVGIS validation is not listed separately because it is the acceptance method inside MVP-01 (AC-06), even though it is delivered in phase 03 and reported in phase 10.

### 6.3 Optional features, explicitly separated

Optional means **not required for the MVP gate**, not "we will see". Each class has a different admission rule.

**Should — built only after every Must row is green.**

| ID | Item | Why it can wait | What unlocks it |
| --- | --- | --- | --- |
| SH-01 | Learned PV/load forecast model | A negative result is publishable; the scheduler runs on weather-driven forecasts | MVP-S1 baselines exist and are scored (FR-FCT-02/04) |
| SH-02 | Anomaly detection on labelled faults | Depends on a stable engine and calibrated forecast residuals | AC-01 to AC-04 and AC-07 green |
| SH-03 | Perfect-foresight oracle policy | Cheap, high report value; not needed for the live demo | MVP-S2 runner exists |
| SH-04 | Solar tracker comparison | Secondary contribution; must charge actuator energy honestly | Fixed-tilt PV validation closed (AC-06) |
| SH-05 | Model cards and health panel | Meaningful only once a learned model is retained | SH-01 retained |

**Could — evaluated only after the experiment protocol is frozen (task 11.1).** Seasonal manual-tilt baseline · PDF report export · PWA installation · Telegram alerts.

**Won't — excluded for a structural reason, not for lack of time.** LLM chat assistant (free-tier dependency, not a control contribution, and a claim-gate risk) · cloud accounts and sync (multi-user is out of scope) · native mobile app (the responsive PWA covers the requirement) · control of a real installation (claim gate: the bench node measures and displays, it does not switch plant or load) · electrochemical battery model (cannot be validated without laboratory data) · MPC/MILP/RL controllers (not provable within the budget; the oracle bounds the achievable gain instead).

### 6.4 Boundary rules

- A Should item enters the MVP only by removing a Must item or moving the delivery date, recorded in the [decision log](decision-log.md). A boundary change that only adds is a scope increase, not a decision (risk R-07).
- A Must item may not be demoted after it has been demonstrated, and may not be dropped without naming in the log which report claim it weakens.
- A Won't item requires a new project proposal, not a phase change. The claim gate in the acceptance checklist remains binding regardless.
- "Working on screen" is not completion. Completion is the referenced AC rows being green with their evidence recorded.

### 6.5 Cross-cutting requirements

These `M` requirements bind every MVP item rather than one row, so they are verified once, at the level named here. Without this table the gate would silently ignore them.

| Group | Requirements | Verified by | Evidence |
| --- | --- | --- | --- |
| Engine contract | FR-SIM-01, FR-SIM-02, FR-SIM-03, FR-SIM-05, FR-SIM-07, FR-SIM-08, FR-SIM-09, FR-SIM-10 | MVP-05 test suite plus the phase 01–02 CI harness | Headless run, replay log, property report, scenario CI |
| Display integrity | NFR-04, NFR-05, NFR-07 | MVP-09 test and bundle scan | AC-15, AC-20, AC-28 |
| Build and portability | NFR-06, NFR-09 | Phase 01 CI | CI log |
| Cost constraint | NFR-10 | Inspection of dependencies and providers | Report appendix |
| Performance | NFR-01 | Benchmarks taken from MVP-01, MVP-09, MVP-10 | AC-18 |
| Offline operation | NFR-02 | Gate condition below | AC-19 |

### 6.6 MVP completion gate

The gate is binary. It passes only when all of the following hold:

1. All ten MVP rows have every referenced AC green.
2. MVP-S1 and MVP-S2 are green.
3. AC-02 (deterministic replay) and AC-19 (offline demonstration) are green.
4. Every `M` requirement in the register is verified by an MVP row or by §6.5, with evidence recorded.
5. The demonstration script runs end-to-end with the network disabled.
6. No Won't item is present in the build under another name.
7. The embedded track of §6.7 has AC-29…AC-37 green before the phase 16 handoff.

A partially green MVP is a failed gate and is reported as failed, naming the rows that did not pass. The MVP also carries no claim that hardware validation, measured savings or real installation behaviour occurred — those remain outside the boundary by design, not by omission. The embedded track changes the evidence available, not the claim: bench measurements of ambient conditions are not plant measurements, and Wokwi values remain simulated.

### 6.7 Embedded sensing track (added 2026-11-16)

The module requires a simulated ESP32 with sensors that read data. The track is admitted as a bounded addition under the rule in §6.4 and recorded in DEC-026. It is a **sensing and telemetry** node: firmware, circuit and transport exist to demonstrate an embedded data path into the same application, never to control plant or load.

| ID | Item | Owner | Requirements | Test | Acceptance criterion | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| EMB-01 | Firmware project and Wokwi harness | hardware | FR-EMB-01, FR-EMB-02 | Two-profile PlatformIO build; `wokwi.toml` artifact wiring; GPIO map compared with `diagram.json` | AC-37 (every embedded step runs on the free path) | 13, 14 |
| EMB-02 | Telemetry contract, adapter and replay | data | FR-EMB-03, FR-EMB-04, FR-EMB-09 | Schema-conformance suite; malformed, duplicate and out-of-order fixtures; replay determinism | AC-29, AC-30, AC-33 | 12, 14 |
| EMB-03 | Source modes and sensor honesty | data, ui | FR-EMB-05, FR-EMB-06 | Mode-switch test; manifest `source_mode` inspection; register-conformance test for the light proxy | AC-31, AC-32 | 14 |
| EMB-04 | Bench-node safety and health | hardware | FR-EMB-07, FR-EMB-08, FR-EMB-11, FR-EMB-12 | Boot-state test; rejected-command test; broker-drop and reconnect test | AC-35, AC-36 | 12, 15 |
| EMB-05 | Bench parity with the simulator | hardware | FR-EMB-10 | Three test profiles measured in Wokwi and on the DevKit, compared per channel against declared tolerances | AC-34 | 15 |

The track is inside the MVP gate but outside the ten items, exactly like §6.2: the ten items define the report's comparison, while §6.7 supplies the embedded evidence the module asks for. Its cost is zero on the free path (CON-14), and the replay fixtures keep every demonstration runnable with the network disabled (NFR-02).

---

## 7 · Non-goals

- Proving that Helios saves a specific household a specific amount of money.
- Reproducing a real installation's measured behaviour (there is no installation).
- Replacing engineering design tools (PVsyst, PVGIS, Homer).
- Making "intelligence" the selling point; the selling point is a fair, inspectable comparison.

---

## 8 · Assumptions and constraints

These are assumptions, not obligations. The binding constraints derived from them are registered as `CON-01…CON-14` in the [requirements register](requirements.md#12--constraints), with a verification method and the consequence of violation for each.

| ID | Assumption / constraint |
| --- | --- |
| AS-01 | Single developer; work happens in the hours left by a full course load. |
| AS-02 | No plant hardware: an ESP32 bench node with sensors is simulated in Wokwi and may later be built on a DevKit, but no relay, servo or real load is ever driven (DEC-026). |
| AS-03 | Only free tools and free tiers; no paid APIs, no cloud compute beyond free Colab. |
| AS-04 | Development on Windows 11 + VS Code; Node 24 LTS; no Docker; MATLAB/Python available but no local LLM. |
| AS-05 | Target machine has a 2 GB MX330 GPU: 3D must run with capped DPR, one shadow-casting light, on-demand rendering, and a 2D fallback. |
| AS-06 | Demo must work with the network disabled, from cached weather and precomputed runs. |
| AS-07 | One household, one site, one timestep family (5–15 min); no multi-site aggregation. |
| AS-08 | Tariff values must be verified against a cited STEG source before any economic claim. |
| AS-09 | Report language and format are not yet confirmed with the module supervisor. |
| AS-10 | Simulation results are comparative evidence, not field validation. |

---

## 9 · Known risks

| ID | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| R-01 | Schedule: 16 phases of work against an unknown deadline | Project delivered partially | Must/Should/Could split; vertical slice by phase 04; weekly checkpoint; freeze scope before phase 11 |
| R-02 | 3D consumes the time budget | No complete dashboard | 2D map first and authoritative; 3D timeboxed to phases 08.1–08.3 + 08.5–08.6; detailed assets are Could |
| R-03 | No plant hardware means weak validation | Jury discounts all numbers | PVGIS benchmark, ERA5 reanalysis weather, labelled fault injection, bench parity evidence (FR-EMB-10), explicit limitations section |
| R-04 | Learned model fails to beat baselines | Wasted phase | Decide by skill score, report the negative result, keep the weather-driven forecast |
| R-05 | Performance on the target laptop | Unusable demo | Worker-based fixed-step engine, snapshots ≤ 4 Hz, demand-driven 3D, quality toggle |
| R-06 | Demo depends on free tiers or connectivity | Demo failure | Offline mode, cached weather, precomputed replay, no secrets client-side |
| R-07 | Scope creep (chat, tracker, PDF, alerts) | Core unfinished | Won't/Could lists above; any addition requires a decision-log entry and a Must item removed or a date moved |
| R-08 | Free embedded path changes or disappears: Wokwi tier, public broker, board supply | Embedded evidence unavailable at the wrong moment | Committed fixtures and the Replay source mode (AC-33), local Mosquitto, and a physical DevKit bought only if the demo date cannot be met |

---

## 10 · Phase 00 deliverables

| Task | Artifact | Status |
| --- | --- | --- |
| 00.1 Product statement | [`README.md`](../README.md), [`report/01`](report/01-product-statement.md) | Done |
| 00.2 Operating scenario | [`scenarios/`](../scenarios/README.md) — schema plus three validated scenarios | Done |
| 00.3 MVP boundary | §6 of this document | Done |
| 00.4 Requirements register | [`requirements.md`](requirements.md) | Done |
| 00.5 Simulation truth and limits | [`data-provenance.md`](data-provenance.md), [`metric-register.json`](metric-register.json) — 97 registered metrics, generated tables, machine check | Done; class M activated for bench channels only (DEC-027); UI enforcement verified in phases 09–10 |
| 00.6 Success criteria | [`acceptance-checklist.md`](acceptance-checklist.md) | Done; provisional thresholds frozen before the final experiment |
| 00.7 Decision log | [`decision-log.md`](decision-log.md) | Done |
| Addendum 2026-11-16 | Embedded sensing track: §6.7, §10 of the requirements register, DEC-026 – DEC-028, AC-29 – AC-37, register v1.1.0 | Done; phases 12–16 deliver the evidence |

---

## 11 · Change control

- Any change to the product statement updates the three canonical copies in one commit.
- Any change to scope is recorded as a decision in the [decision log](decision-log.md) with the reason and the consequence for the schedule.
- Requirements are changed by editing the register and adding a decision entry; no requirement is silently dropped.
- The experiment protocol in the [acceptance checklist](acceptance-checklist.md) is frozen before final runs and not tuned after results are seen.
