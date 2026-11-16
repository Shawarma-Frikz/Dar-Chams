# Acceptance checklist

| Field | Value |
| --- | --- |
| Version | 1.1.0 (signed) |
| Date | 2026-11-16 |
| Phase | 00 (task 00.6); B.5 added by the embedded-track decision DEC-026 |
| Owner | Author (sole developer) |
| Content digest (sha256) | b0049722998ee867cf0da398a9bb16c3629c59635f776db1965f3971fa010176 |

A phase is complete when its acceptance evidence exists, not when its screen exists. This checklist is the agreed definition of success; evidence is recorded next to each row as phases finish. `scripts/check-acceptance.mjs` verifies its structure, the six task-00.6 headline targets, every cross-document AC reference and the content digest below; an edit after signing invalidates the digest until the sign-off is renewed.

**Threshold rules.** Targets marked *provisional* are initial engineering estimates. Per task 11.1 they are frozen before the final experiment and never tuned after results are seen.

---

## A · Phase 00 completion

| Task | Criterion | Artifact | Status |
| --- | --- | --- | --- |
| 00.1 | One paragraph in README and report; no claim of controlling a real installation | [`README.md`](../README.md), [`report/01`](report/01-product-statement.md) | **Met** |
| 00.2 | A scenario file describes the complete installation without hard-coded values | [`scenarios/tunis-typical-v1.json`](../scenarios/tunis-typical-v1.json), [`scenario.schema.json`](../scenarios/scenario.schema.json), [`scenarios/README.md`](../scenarios/README.md) | **Met** (three validated scenarios; tariff intentionally unverified) |
| 00.3 | Every MVP item has an owner, test and acceptance criterion; optional features separated | [Scope brief §6](00-scope-brief.md#6--mvp-boundary) | **Met** — 10 items, 2 supporting items and the embedded track, each with domain owner, test and `AC` reference; Should/Could/Won't separated with admission rules |
| 00.4 | No requirement is a vague phrase; each is testable with a verification method | [Requirements register](requirements.md) | **Met** — 85 FR, 11 NFR, 14 constraints and 10 external dependencies, each with priority, verification method, dependency and phase; wording and structure machine-checked |
| 00.5 | Every displayed metric has a source type and unit | [Simulation truth and provenance](data-provenance.md), [metric register](metric-register.json), [`check-provenance.mjs`](../scripts/check-provenance.mjs) | **Met** — 97 metrics, each with class, unit, source, inputs and gate; class M restricted to bench channels behind `hardware.*` gates; register, generated tables and declared counts machine-checked. Enforcement in the build verified in phases 09–10 (AC-20, AC-28) |
| 00.6 | A signed acceptance checklist exists before implementation | This document | **Met** |
| 00.7 | A new contributor can understand why each major choice was made | [Decision log](decision-log.md) | **Met** |

---

## B · MVP success criteria

These are the measurable targets from task 00.6. "Evidence" names the artifact that must exist before a row can be ticked. IDs are stable references grouped by category, not a sequence: a criterion added later is appended to its category rather than renumbering the set. The [MVP register](00-scope-brief.md#6--mvp-boundary) names which criteria each MVP item must satisfy.

### B.1 Simulation integrity

| ID | Criterion | Threshold | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-01 | Energy-balance closure | \|residual\| ≤ 1 × 10⁻⁶ kWh per step; daily \|Σ\| ≤ 1 × 10⁻⁴ kWh | Vitest report | Pending (phase 02) |
| AC-02 | Deterministic replay | 3 runs × 3 scenarios identical within 1 × 10⁻⁹ relative, including event sequence | Test log + manifests | Pending (phase 02) |
| AC-03 | Physical invariants | 0 violations across 50 seeds × 10,000 steps (SOC bounds, power limits, non-negative energy, legal transitions) | Property-test report | Pending (phase 04) |
| AC-04 | Observability contract | Static inspection + test proving controllers cannot read hidden world state | Interface test | Pending (phase 02) |
| AC-21 | Scenario validity | Every committed scenario passes schema validation and invariant checks in CI; a deliberately corrupted scenario is rejected with a field-level message | CI log + negative test | Pending (phase 01.4) |
| AC-22 | Weather degradation | Provider unreachable, cache empty and cache corrupt each yield a cached (`X`) or synthetic (`S`) series, emit a visible fallback event, and still close the step balance of AC-01 | Adapter test | Pending (phase 03) |
| AC-23 | Appliance state legality | 0 invalid transitions across ≥ 10,000 randomized transitions; every accepted transition emits an event carrying timestamp, entity ID, from-state and to-state; component energy sums exactly to the household total | Property-test report | Pending (phase 05) |

### B.2 Model credibility

| ID | Criterion | Threshold | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-05 | Solar position accuracy | Sunrise/sunset/solar noon within ±2 min; noon elevation/azimuth within ±0.5° | Fixture comparison | Pending (phase 03) |
| AC-06 | PV yield consistency with PVGIS | Mean absolute daily-energy bias ≤ 15% over ≥ 12 days spanning seasons; larger deviations explained | Validation notebook/report | Pending (phase 03, 10) |
| AC-07 | Forecast skill vs baselines | MAE and RMSE per horizon (1–24 h) with skill score; a learned model is retained only if median improvement > 0 with no horizon regressing by more than 5% | Forecast report | Pending (phase 07) |
| AC-08 | Anomaly detection (if built) | Per fault type: precision ≥ 0.7, recall ≥ 0.8, median detection latency ≤ 2 h simulated — *provisional* | Fault-injection report | Pending (phase 07) |

### B.3 Policy comparison

| ID | Criterion | Threshold | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-09 | Paired comparison integrity | ≥ 12 pairs (4 seasonal weather profiles × 3 household presets); manifest hash proves identical inputs | Experiment manifest | Pending (phase 06) |
| AC-10 | Metric completeness | Critical-load uptime, unmet demand, curtailment, self-consumption, import cost (if enabled), battery throughput, schedule disruption reported per scenario | Comparison CSV + report table | Pending (phase 06, 11) |
| AC-11 | Upper bound | Scheduler result reported as a percentage of the perfect-foresight oracle for the same scenarios | Comparison CSV | Pending (phase 06) |
| AC-12 | Fallback behaviour | Missing/stale forecast reverts to baseline, logged and visible, with a valid energy balance | Test + demo | Pending (phase 06) |
| AC-24 | Baseline conformance | On scripted SOC trajectories, shedding follows the configured order exactly, restoration requires the threshold plus hysteresis, and no critical load is dropped without an unmet-demand record; 0 deviations | Unit test | Pending (phase 06) |
| AC-25 | Scheduler feasibility | 0 infeasible plans emitted across ≥ 200 randomized scenarios; every rejected request names the violated constraint; every emitted plan respects deadline, duration, non-interruptible cycle, reserve SOC, inverter and grid limits | Property-test report | Pending (phase 06) |

### B.4 Application and operation

| ID | Criterion | Threshold | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-13 | Snapshot consistency | All widgets on a screen render from one snapshot | Test + inspection | Pending (phase 09) |
| AC-14 | Chart reconciliation | Displayed totals equal stored interval sums within display rounding | Test | Pending (phase 09) |
| AC-15 | Persistence | Refresh preserves scenarios and run summaries; no secret in the client bundle | Test + bundle scan | Pending (phase 09) |
| AC-16 | Export traceability | CSV/JSON/print output resolves to scenario ID, engine version and seed | Exported artifact | Pending (phase 09) |
| AC-17 | Accessibility parity | All critical state and controls available in 2D; status not colour-only; keyboard operable | Inspection + demo | Pending (phase 08–09) |
| AC-18 | Performance on target laptop | Engine ≥ 5,000 steps/s; UI update < 100 ms; 3D ≥ 24 fps low / ≥ 30 fps medium at 1080p; cold interactive < 5 s — *provisional* | Benchmark log | Pending (phase 10) |
| AC-19 | Offline demo | Full demonstration runs with network disabled, from cache and precomputed replay | Demo recording/checklist | Pending (phase 11) |
| AC-20 | Honest labelling | Every displayed metric carries a provenance badge and unit; no simulated value presented as measured | Inspection of the register and rendered labels | Pending (phase 09–10) |
| AC-26 | Decision traceability | 100% of controller actions and alerts resolve to trigger, forecast inputs, active constraints, alternatives, chosen action and expected effect; the timeline shows the same record; 0 orphan records | Test + inspection | Pending (phase 09) |
| AC-27 | Twin binding integrity | 100% of 3D objects map to an existing simulation entity; disabling 3D changes no simulation value; selection stays synchronised both ways on desktop and mobile | Test + demo | Pending (phase 08) |
| AC-28 | Metric register conformance | 100% of numeric and state widgets resolve to a `MET-nn` entry; rendered class, unit and source equal the register; 0 disabled metric computed or displayed as a value; 0 value rendered outside the register (raw-number lint clean) | UI contract test + bundle scan | Pending (phase 09) |

### B.5 Embedded node and telemetry

The module requires a simulated ESP32 with sensors that read data. These criteria gate the embedded track (scope brief §6.7, DEC-026 – DEC-028). They change the evidence available, not the project's claim: Wokwi values stay simulated, and a bench measurement of a room is not a measurement of a plant.

| ID | Criterion | Threshold | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-29 | Telemetry schema conformance | 100% of published messages validate against the committed schema version; a non-conforming message is quarantined with a named reason; 0 non-conforming value reaches the interface | Schema suite + adapter log | Pending (phase 14) |
| AC-30 | Ingestion integrity | 100% of duplicates by device and sequence dropped; out-of-order messages reordered or rejected with a logged reason; staleness surfaced after 3 missed intervals; the append-only store is unchanged by redelivery | Adapter test | Pending (phase 14) |
| AC-31 | Source-mode isolation | Each of the four source modes runs the same pipeline; switching mode mutates no stored run; 100% of manifests record `source_mode`; AC-02 determinism is evaluated in Scenario and Replay modes only | Test + manifest inspection | Pending (phase 14) |
| AC-32 | Sensor-mapping honesty | 100% of sensor channels resolve to a `MET-nn` entry with unit, class and quality; the light proxy is shown as a relative level with unit `unitless`; 0 values labelled W/m² from an uncalibrated channel | Register-conformance test + inspection | Pending (phase 14) |
| AC-33 | Offline replay fidelity | Three committed fixtures (nominal, daytime peak, sensor failure) replay with the network disabled; two replays of one fixture agree within 1 × 10⁻⁹ relative; the failure fixture shows a quality flag, not a value | Test + demo recording | Pending (phase 14) |
| AC-34 | Wokwi and bench parity | At least 3 test profiles; per channel within declared tolerance (temperature ±1.0 °C, humidity ±5 %RH, light proxy ±10% of full scale); every larger divergence reported with its cause | Measurement table | Pending (phase 15) |
| AC-35 | Node resilience | Broker stop shows the last-will offline state within 10 s; 0 corrupted or duplicated measurements after 20 reconnects; backoff bounded at ≤ 30 s; stale warning visible after 3 missed intervals | Failure-injection test | Pending (phase 15) |
| AC-36 | Actuator safety | Every output low at boot and after reset; 0 actuation without an explicit enable; 0 messages applied that would alter a scheduled plan; only a low-voltage indicator is driven | Inspection + test | Pending (phase 12, 15) |
| AC-37 | Free-path compliance | Every embedded step — build, simulate, publish, connect, replay — runs on free tools; no gate or demo step requires a paid Wokwi licence, a private gateway or a paid broker | Dependency and account audit | Pending (phase 14) |

---

## C · Decision gates

These gates from the roadmap are binding. A gate that fails stops the dependent work; it is not waived for schedule reasons.

| Gate | Rule |
| --- | --- |
| Physics gate | No optimisation or ML is built on an engine that fails AC-01 to AC-04. |
| Data gate | No ML trained on synthetic traces is presented as validated real-world performance; synthetic and external observations stay labelled. |
| Optimizer gate | No improvement is claimed unless baseline and scheduler ran on identical scenario, seed, weather, load trace and initial SOC (AC-09). |
| 3D gate | No detailed models before the semantic object map and state binding work; the scene is a client of the simulation. |
| Hardware gate | The embedded node is admitted only as a sensing path: units, timestamps, schema and missing-data behaviour are validated (AC-29, AC-30) before the Wokwi circuit is wired or a physical DevKit is used. |
| Claim gate | Helios is described as a simulation-based twin until it is connected to a real installation with validated telemetry. A bench sensor reading of a room is not plant telemetry and does not open the claim. |
| Embedded gate | No embedded phase passes on a paid path: AC-37 must stay green, and the replay path (AC-33) must work before the physical bench is touched. |

---

## D · Sign-off

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| Author | Shawarma-Frikz | 2026-11-16 | digital sign-off, bound to the content digest in the header |
| Supervisor (if required by the module) |  |  |  |

By signing, the author confirms that the Must items, thresholds and gates above — exactly as covered by the content digest in the header — are the definition of done for v1, including the embedded criteria AC-29 – AC-37, and that any later change requires a decision-log entry and a renewed digest and signature.

---

## E · Open items before phase 01

| Item | Owner | Needed by |
| --- | --- | --- |
| Confirm deadline and realistic weekly hours | Author | Phase 01 |
| Confirm report language, format and page limit | Author / supervisor | Phase 01 |
| Confirm that simulation-only is accepted for the module | Author / supervisor | Phase 01 |
| Confirm the embedded deliverable: a simulated ESP32 with reading sensors, no real-load switching | Author / supervisor | Phase 12 |
| Create the free Wokwi account and decide whether a physical DevKit is bought | Author | Phase 13 |
| Verify STEG tariff values with a dated citation (enables AC-10 cost column) | Author | Phase 04 |
| Select and cite a grid emission factor (enables CO₂ metric) | Author | Phase 04 |
| Decide licence and branch/commit conventions | Author | Phase 01.1 |
