# Scope brief

| Field | Value |
| --- | --- |
| Phase | 00 — project definition and engineering decisions |
| Status | Complete (2026-11-15) |
| Owner | Author (sole developer) |
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

The default scenario is [`scenarios/tunis-typical.json`](../scenarios/tunis-typical.json):

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

All values live in the scenario file, not in engine code. Assumptions are design choices, not measurements — see [data provenance](data-provenance.md).

---

## 5 · Scope

### In scope (v1)

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

- Monitoring or actuating physical equipment; ESP32, sensors, relays, servos.
- Certified metering, tariff billing, or financial advice.
- Multi-user accounts, authentication, cloud synchronisation.
- Native mobile applications (the web app is responsive; PWA packaging is optional polish).
- Electrochemical battery models, remaining-useful-life prediction.
- Reinforcement learning, MPC/MILP optimisation, or any LLM-driven control.
- Real-time grid services, demand-response markets, net-metering settlement.

---

## 6 · MVP boundary

Owner of every item: the author. A phase is not complete because a screen exists; it is complete when its acceptance evidence is recorded in the [acceptance checklist](acceptance-checklist.md).

### 6.1 Must — the MVP

| ID | Item | Evidence | Acceptance summary |
| --- | --- | --- | --- |
| MVP-01 | Deterministic engine: PV, inverter, battery, grid, loads, energy balance | Unit + property tests | Balance residual and physical bounds hold on every step; replay identical |
| MVP-02 | Weather adapter with cache and synthetic fallback | Adapter tests | Runs offline; degraded source visible in provenance |
| MVP-03 | Household model: rooms, appliances, state machines, priorities | Fixtures + tests | No invalid transitions; component energy sums to total |
| MVP-04 | Rule-based baseline controller | Deterministic run | Reproducible end-to-end; policy table documented |
| MVP-05 | Forecast-aware scheduler with explanations | Feasibility tests | Every plan respects deadlines, durations, reserve and power limits; each action explained |
| MVP-06 | Decision/alert log and timeline | Demo | Every action traceable to inputs and state transition |
| MVP-07 | Weather-driven forecast with naïve baselines | Evaluation report | MAE/RMSE by horizon vs persistence and time-of-day baselines |
| MVP-08 | Dashboard: overview, charts, controls, scenario editor, persistence, export | Playwright flows | Widgets share one snapshot; charts reconcile; refresh keeps runs; export traceable |
| MVP-09 | 2D system map with parity to 3D information and controls | Demo + inspection | All critical state and controls available without 3D |
| MVP-10 | Basic 3D cutaway twin (timeboxed) | Demo | Binds to simulation IDs, flows map to power, cannot block the dashboard |
| MVP-11 | Paired experiment runner + exportable comparison table | Manifest + CSV | Baseline and scheduler use identical scenario, seed, weather and initial SOC |
| MVP-12 | PV validation vs PVGIS | Validation report | Mean absolute daily-energy bias ≤ 15% over ≥ 12 days spanning seasons |

### 6.2 Should — included if the Must list is green

| ID | Item | Why it can wait |
| --- | --- | --- |
| SH-01 | Learned PV/load forecast model (retained only if it beats baselines) | A negative result is publishable; the scheduler works on weather-driven forecasts |
| SH-02 | Anomaly detection with labelled fault injection | Valuable result, but depends on stable engine + forecast residuals |
| SH-03 | Perfect-foresight oracle policy | Cheap, high report value; not needed for the live demo |
| SH-04 | Solar tracker comparison (optional scenario) | Secondary contribution; must model actuator overhead honestly |
| SH-05 | Model cards and model-health panel | Required only once a learned model is retained |

### 6.3 Could — only after the final experiment protocol is frozen

Seasonal manual-tilt baseline · PDF report export · PWA installation · Telegram alerts · Wokwi firmware sketch · hardware adapter interface.

### 6.4 Won't — explicitly excluded

LLM chat assistant · cloud accounts and sync · native mobile app · real-time hardware control · electrochemical battery model · MPC/MILP/RL controllers.

---

## 7 · Non-goals

- Proving that Helios saves a specific household a specific amount of money.
- Reproducing a real installation's measured behaviour (there is no installation).
- Replacing engineering design tools (PVsyst, PVGIS, Homer).
- Making "intelligence" the selling point; the selling point is a fair, inspectable comparison.

---

## 8 · Assumptions and constraints

| ID | Assumption / constraint |
| --- | --- |
| AS-01 | Single developer; work happens in the hours left by a full course load. |
| AS-02 | No hardware in v1; ESP32, sensors, relays and servos are future work. |
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
| R-01 | Schedule: 12 phases of work against an unknown deadline | Project delivered partially | Must/Should/Could split; vertical slice by phase 04; weekly checkpoint; freeze scope before phase 11 |
| R-02 | 3D consumes the time budget | No complete dashboard | 2D map first and authoritative; 3D timeboxed to phases 08.1–08.3 + 08.5–08.6; detailed assets are Could |
| R-03 | No hardware means weak validation | Jury discounts all numbers | PVGIS benchmark, ERA5 reanalysis weather, labelled fault injection, explicit limitations section |
| R-04 | Learned model fails to beat baselines | Wasted phase | Decide by skill score, report the negative result, keep the weather-driven forecast |
| R-05 | Performance on the target laptop | Unusable demo | Worker-based fixed-step engine, snapshots ≤ 4 Hz, demand-driven 3D, quality toggle |
| R-06 | Demo depends on free tiers or connectivity | Demo failure | Offline mode, cached weather, precomputed replay, no secrets client-side |
| R-07 | Scope creep (chat, tracker, PDF, alerts) | Core unfinished | Won't/Could lists above; any addition requires a decision-log entry and a Must item removed or a date moved |

---

## 10 · Phase 00 deliverables

| Task | Artifact | Status |
| --- | --- | --- |
| 00.1 Product statement | [`README.md`](../README.md), [`report/01`](report/01-product-statement.md) | Done |
| 00.2 Operating scenario | [`scenarios/tunis-typical.json`](../scenarios/tunis-typical.json), [`scenarios/README.md`](../scenarios/README.md) | Done |
| 00.3 MVP boundary | §6 of this document | Done |
| 00.4 Requirements register | [`requirements.md`](requirements.md) | Done |
| 00.5 Simulation truth and limits | [`data-provenance.md`](data-provenance.md) | Done at contract level; UI enforcement verified in phases 09–10 |
| 00.6 Success criteria | [`acceptance-checklist.md`](acceptance-checklist.md) | Done; provisional thresholds frozen before the final experiment |
| 00.7 Decision log | [`decision-log.md`](decision-log.md) | Done |

---

## 11 · Change control

- Any change to the product statement updates the three canonical copies in one commit.
- Any change to scope is recorded as a decision in the [decision log](decision-log.md) with the reason and the consequence for the schedule.
- Requirements are changed by editing the register and adding a decision entry; no requirement is silently dropped.
- The experiment protocol in the [acceptance checklist](acceptance-checklist.md) is frozen before final runs and not tuned after results are seen.
