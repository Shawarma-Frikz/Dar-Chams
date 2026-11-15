# Acceptance checklist

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Date | 2026-11-15 |
| Phase | 00 (task 00.6) |
| Owner | Author (sole developer) |

A phase is complete when its acceptance evidence exists, not when its screen exists. This checklist is the agreed definition of success; evidence is recorded next to each row as phases finish.

**Threshold rules.** Targets marked *provisional* are initial engineering estimates. Per task 11.1 they are frozen before the final experiment and never tuned after results are seen.

---

## A · Phase 00 completion

| Task | Criterion | Artifact | Status |
| --- | --- | --- | --- |
| 00.1 | One paragraph in README and report; no claim of controlling a real installation | [`README.md`](../README.md), [`report/01`](report/01-product-statement.md) | **Met** |
| 00.2 | A scenario file describes the complete installation without hard-coded values | [`scenarios/tunis-typical-v1.json`](../scenarios/tunis-typical-v1.json), [`scenario.schema.json`](../scenarios/scenario.schema.json), [`scenarios/README.md`](../scenarios/README.md) | **Met** (three validated scenarios; tariff intentionally unverified) |
| 00.3 | Every MVP item has an owner, test and acceptance criterion; optional features separated | [Scope brief §6](00-scope-brief.md#6--mvp-boundary) | **Met** |
| 00.4 | No requirement is a vague phrase; each is testable with a verification method | [Requirements register](requirements.md) | **Met** |
| 00.5 | Every displayed metric has a source type and unit | [Data provenance](data-provenance.md) | **Met at contract level**; enforcement verified in phases 09–10 |
| 00.6 | A signed acceptance checklist exists before implementation | This document | **Met** |
| 00.7 | A new contributor can understand why each major choice was made | [Decision log](decision-log.md) | **Met** |

---

## B · MVP success criteria

These are the measurable targets from task 00.6. "Evidence" names the artifact that must exist before a row can be ticked.

### B.1 Simulation integrity

| ID | Criterion | Threshold | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-01 | Energy-balance closure | \|residual\| ≤ 1 × 10⁻⁶ kWh per step; daily \|Σ\| ≤ 1 × 10⁻⁴ kWh | Vitest report | Pending (phase 02) |
| AC-02 | Deterministic replay | 3 runs × 3 scenarios identical within 1 × 10⁻⁹ relative, including event sequence | Test log + manifests | Pending (phase 02) |
| AC-03 | Physical invariants | 0 violations across 50 seeds × 10,000 steps (SOC bounds, power limits, non-negative energy, legal transitions) | Property-test report | Pending (phase 04) |
| AC-04 | Observability contract | Static inspection + test proving controllers cannot read hidden world state | Interface test | Pending (phase 02) |
| AC-21 | Scenario validity | Every committed scenario passes schema validation and invariant checks in CI; a deliberately corrupted scenario is rejected with a field-level message | CI log + negative test | Pending (phase 01.4) |

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
| AC-20 | Honest labelling | Every displayed metric carries a provenance badge and unit; no simulated value presented as measured | Inspection | Pending (phase 09–10) |

---

## C · Decision gates

These gates from the roadmap are binding. A gate that fails stops the dependent work; it is not waived for schedule reasons.

| Gate | Rule |
| --- | --- |
| Physics gate | No optimisation or ML is built on an engine that fails AC-01 to AC-04. |
| Data gate | No ML trained on synthetic traces is presented as validated real-world performance; synthetic and external observations stay labelled. |
| Optimizer gate | No improvement is claimed unless baseline and scheduler ran on identical scenario, seed, weather, load trace and initial SOC (AC-09). |
| 3D gate | No detailed models before the semantic object map and state binding work; the scene is a client of the simulation. |
| Hardware gate | Physical ESP32/sensor integration is a later milestone, added through an adapter, with units, timestamps and missing-data behaviour validated first. |
| Claim gate | Helios is described as a simulation-based twin until it is connected to a real installation with validated telemetry. |

---

## D · Sign-off

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| Author | Shawarma-Frikz | 2026-11-15 | digital sign-off |
| Supervisor (if required by the module) |  |  |  |

By signing, the author confirms that the Must items, thresholds and gates above are the definition of done for v1, and that any later change requires a decision-log entry.

---

## E · Open items before phase 01

| Item | Owner | Needed by |
| --- | --- | --- |
| Confirm deadline and realistic weekly hours | Author | Phase 01 |
| Confirm report language, format and page limit | Author / supervisor | Phase 01 |
| Confirm that simulation-only is accepted for the module | Author / supervisor | Phase 01 |
| Verify STEG tariff values with a dated citation (enables AC-10 cost column) | Author | Phase 04 |
| Select and cite a grid emission factor (enables CO₂ metric) | Author | Phase 04 |
| Decide licence and branch/commit conventions | Author | Phase 01.1 |
