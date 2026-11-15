# Decision log

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Date | 2026-11-15 |
| Phase | 00 (task 00.7) |
| Owner | Author (sole developer) |

A decision is recorded when it constrains later work, when a reasonable alternative was rejected, or when undoing it would be expensive. Entries are append-only; a changed decision is superseded by a new entry rather than edited.

| ID | Decision | Status | Date |
| --- | --- | --- | --- |
| DEC-001 | Simulation-first release, no physical I/O | Accepted | 2026-11-15 |
| DEC-002 | One TypeScript engine as the single source of truth | Accepted | 2026-11-15 |
| DEC-003 | 15-minute default timestep | Accepted | 2026-11-15 |
| DEC-004 | Canonical units and conversion boundaries | Accepted | 2026-11-15 |
| DEC-005 | UTC instants, site-timezone display | Accepted | 2026-11-15 |
| DEC-006 | Open-Meteo with cache and synthetic fallback | Accepted | 2026-11-15 |
| DEC-007 | Energy-bucket battery model | Accepted | 2026-11-15 |
| DEC-008 | Grid-connected default, islanded by outage | Accepted | 2026-11-15 |
| DEC-009 | Rule baseline + heuristic forecast-aware scheduler | Accepted | 2026-11-15 |
| DEC-010 | scikit-learn → ONNX → onnxruntime-web | Accepted | 2026-11-15 |
| DEC-011 | Separation of world, twin and controller | Accepted | 2026-11-15 |
| DEC-012 | Seeded determinism and run manifests | Accepted | 2026-11-15 |
| DEC-013 | Paired experiments with a perfect-foresight bound | Accepted | 2026-11-15 |
| DEC-014 | Local-first persistence, no backend in v1 | Accepted | 2026-11-15 |
| DEC-015 | Low-poly code-built 3D scene with a 2D fallback | Accepted | 2026-11-15 |
| DEC-016 | Engine in a Web Worker, throttled snapshots | Accepted | 2026-11-15 |
| DEC-017 | Vitest + fast-check + Playwright | Accepted | 2026-11-15 |
| DEC-018 | Node 24 LTS + npm | Accepted | 2026-11-15 |
| DEC-019 | Provenance labels and the claim gate | Accepted | 2026-11-15 |
| DEC-020 | English code and docs; report language pending | Accepted | 2026-11-15 |

---

## DEC-001 · Simulation-first release

**Context.** No hardware is available, and the module work must produce a defensible result without waiting for parts.

**Decision.** Version 1 simulates the entire plant. No sensor input, no relay or servo output, no claim of controlling a real installation.

**Alternatives rejected.** Hardware-first — cost, lead time, and the risk of demonstrating a half-working physical build. Wokwi as the primary environment — firmware fidelity is not the deliverable and the browser simulation covers the physics.

**Consequences.** No measured values exist in v1; provenance classes (DEC-019) carry the honesty burden. A hardware adapter remains possible behind the observation/actuation interface.

**Revisit if** physical parts arrive before the final experiment is frozen.

## DEC-002 · One TypeScript engine as the single source of truth

**Context.** The engine is consumed by tests, the browser dashboard and the batch experiment runner, while ML training happens in Python.

**Decision.** The energy engine is written once, in TypeScript. It runs headlessly in Node for tests and dataset generation, and in the browser for the live view. Python only consumes exported datasets and produces model artifacts.

**Alternatives rejected.** Python core behind FastAPI — hosting cost, latency, and a second runtime on a low-power machine. Parallel TS and Python implementations — guaranteed drift between two physics models.

**Consequences.** Dataset generation uses a headless Node script; the model interchange is fixed by DEC-010. The physics lives in one place, which also makes the PVGIS benchmark meaningful.

## DEC-003 · 15-minute default timestep

**Context.** Battery dynamics and load scheduling need finer resolution than an hour; appliance transients need finer still, but are rare.

**Decision.** Default 15 minutes, configurable in the scenario. A day is 96 steps; a 48-hour horizon is 192 steps.

**Alternatives rejected.** 1 minute — four times the data for no decision-relevant gain at this scale. 60 minutes — misses evening peaks and inverter clipping.

**Consequences.** Fast tests and fast experiment batches. Appliance surges are modelled analytically, not by shrinking the timestep.

## DEC-004 · Canonical units and conversion boundaries

**Decision.** W, Wh, °C, SOC as a 0–1 fraction, TND, kg CO₂. Timestamps are ISO-8601 instants. Conversion to kW/kWh/percent happens only at display or input boundaries.

**Alternatives rejected.** kWh everywhere — fractional values in the engine invite rounding errors. Implicit units — the most common source of silent simulation bugs.

**Consequences.** The engine never adds power to energy; the interface layer owns human-facing formatting.

## DEC-005 · UTC instants, site-timezone display

**Decision.** Store instants in UTC, display in the site timezone (`Africa/Tunis`, UTC+1, no DST). The scenario declares the timezone.

**Alternatives rejected.** Naive local times — off-by-one-hour bugs that are invisible in short tests.

**Consequences.** Sunrise/sunset and schedule windows are converted at the boundary; cross-midnight appliance windows are tested explicitly.

## DEC-006 · Open-Meteo with cache and synthetic fallback

**Context.** Forecast and historical irradiance are needed, for free, without an API key.

**Decision.** Open-Meteo forecast for forward horizons, Open-Meteo ERA5 archive for historical days, cached snapshots committed as fixtures, and a seeded synthetic generator as the final fallback.

**Alternatives rejected.** NASA POWER — excellent history, no forecast. Paid weather APIs — excluded by the cost constraint.

**Consequences.** Resolution order is explicit in every run's provenance; the offline demo depends on cached fixtures, not on connectivity.

## DEC-007 · Energy-bucket battery model

**Decision.** Capacity, SOC window, charge/discharge power limits and one-way efficiency derived from round-trip efficiency. No thermal or electrochemical dynamics.

**Alternatives rejected.** Equivalent-circuit model — no calibration data, therefore false precision. Pure percentage model — hides efficiency and power limits, which materially change scheduling results.

**Consequences.** Aging is an optional capacity-fade proxy and is labelled as such; the report may not claim remaining-useful-life prediction.

## DEC-008 · Grid-connected default, islanded by outage

**Decision.** The default scenario is grid-connected with import and export limits. Islanded operation is represented by configurable outage windows.

**Alternatives rejected.** Off-grid only — less representative of the Tunisian residential case and removes the import-cost metric.

**Consequences.** Dispatch must handle both modes; outage tests are mandatory in phase 04.

## DEC-009 · Rule baseline + heuristic forecast-aware scheduler

**Decision.** A deterministic threshold baseline with hysteresis, and a forecast-aware scheduler that places flexible loads into forecast surplus windows while respecting hard constraints. Objective terms are explicit and weighted.

**Alternatives rejected.** MILP/MPC — solver dependency, tuning effort, and harder explanation for the same demonstration. Reinforcement learning — data-hungry, non-reproducible, and no defensible baseline in the time available.

**Consequences.** The scheduler is explainable by construction; the perfect-foresight oracle supplies the upper bound that makes the comparison meaningful. MILP may return as a `C` requirement only after the Must list is green.

## DEC-010 · scikit-learn → ONNX → onnxruntime-web

**Decision.** Train in Colab with scikit-learn, export with skl2onnx, pin the runtime version, and load the identical artifact in evaluation and in the browser.

**Alternatives rejected.** TensorFlow.js — extra conversion friction from a scikit-learn pipeline. A Python inference service — hosting, latency, offline risk. Reimplementing the model in TypeScript — drift and unverifiable equivalence.

**Consequences.** The artifact, feature schema and seed are versioned; the app cannot silently substitute another model (FR-FCT-06). If the model does not beat the baseline, the weather-driven forecast stands and the negative result is reported.

## DEC-011 · Separation of world, twin and controller

**Context.** In a pure simulation, one model could generate the data, interpret it, and judge the outcome — making anomaly detection and gain claims circular.

**Decision.** Three explicit layers: the **world** (ground truth with hidden state — soiling, faults, future weather, true SOC), the **twin/estimator** (only observations plus its own models), and the **controller** (forecast, scheduling, shedding). Controllers and detectors reach state only through a typed observation interface.

**Alternatives rejected.** One shared state object — leaks ground truth and makes every "detection" a lookup.

**Consequences.** Anomaly detection becomes measurable, calibration claims become falsifiable, and the tracker/net-gain experiment is judged against a world that does not know the strategy. This is the single most important architectural constraint in the project (FR-SIM-08).

## DEC-012 · Seeded determinism and run manifests

**Decision.** One documented PRNG algorithm, no wall-clock reads inside the engine, and a manifest per run: engine version, scenario hash, seed, data provenance.

**Alternatives rejected.** Unseeded randomness — makes experiments unrepeatable and the report unfalsifiable.

**Consequences.** Event identifiers are derived deterministically; the experiment runner is safe to parallelize.

## DEC-013 · Paired experiments with a perfect-foresight bound

**Decision.** Baseline and scheduler run on identical scenario, weather, load trace, initial SOC and seed. Results are reported per scenario with spread, not as a single headline number. A perfect-foresight oracle provides the upper bound.

**Alternatives rejected.** Single-run comparison — indefensible in front of a jury and statistically meaningless.

**Consequences.** The comparison runner refuses mismatched inputs (FR-EMS-09). The protocol is frozen before final runs (11.1) and not tuned after seeing results.

## DEC-014 · Local-first persistence, no backend in v1

**Decision.** IndexedDB for scenarios and run summaries, with CSV/JSON export. No accounts, no server database, no message broker.

**Alternatives rejected.** Supabase/Firebase — accounts, free-tier cold starts and quota risk for a single-user demo. Download-only — poor usability for the what-if workflow.

**Consequences.** No multi-device sync; secrets never enter the client; the demo works on a plane.

## DEC-015 · Low-poly code-built 3D scene with a 2D fallback

**Decision.** React Three Fiber + Drei, geometry built from primitives, semantic identifiers bound to simulation entities, on-demand rendering, capped pixel ratio, one shadow-casting light. The 2D system map is authoritative and must carry the same state and controls.

**Alternatives rejected.** Downloaded GLTF packs at the start — style drift, weight, and time lost to asset cleanup. A game engine — splits the stack and the deployment target.

**Consequences.** 3D is a consumer of simulation state, never a second source of truth, and cannot block the dashboard (3D gate).

## DEC-016 · Engine in a Web Worker, throttled snapshots

**Decision.** The engine ticks in a Web Worker with a fixed timestep; the UI receives snapshots at 2–4 Hz; the engine core remains pure and synchronous for tests.

**Alternatives rejected.** Main-thread loop — frame drops at 60× on the target laptop. Server-side simulation — breaks offline operation.

**Consequences.** Performance budget in NFR-01; state synchronisation is snapshot-based, not per-tick.

## DEC-017 · Vitest + fast-check + Playwright

**Decision.** Vitest for unit and property tests, fast-check for invariants, Playwright for user flows, and a Node script for batch experiments.

**Alternatives rejected.** Jest — slower ESM setup for the same coverage. Example-only tests — the project's core risk is invariant violation, which property tests address directly.

**Consequences.** CI (phase 01.5) runs type-check, lint, unit/property tests and build; Playwright runs before the demo.

## DEC-018 · Node 24 LTS + npm

**Decision.** Node 24 LTS (verified locally: 24.18.0) with npm and a committed lockfile. On this Windows machine, npm is invoked as `npm.cmd` and no workflow depends on PowerShell `.ps1` execution.

**Alternatives rejected.** pnpm — not preinstalled and adds a toolchain variable. Bun — unfamiliar release cadence for a graded project.

**Consequences.** Commands in the README are PowerShell-safe; the same lockfile must install on a clean machine (01.2).

## DEC-019 · Provenance labels and the claim gate

**Decision.** Every displayed number carries a provenance class and a unit. Simulated results are labelled as simulated. Unverified tariffs disable economic metrics (FR-GRD-03). The claim gate forbids describing Helios as a validated twin of a real installation.

**Alternatives rejected.** Presenting simulation results as field data — the fastest way to lose a jury's trust.

**Consequences.** Some features stay visibly disabled until data is verified; the report gains a limitations section that states exactly what only hardware could validate.

## DEC-020 · English code and docs; report language pending

**Decision.** Code, comments, commit messages and engineering documents are in English. The final report's language and format follow the module's requirements, to be confirmed with the supervisor.

**Alternatives rejected.** Mixing languages in code and docs — inconsistent terminology across artifacts.

**Consequences.** If the report must be in French, a translation pass is scheduled in phase 11 and the canonical product statement is translated once, then kept in sync.

## DEC-021 · Scenario format: JSON + JSON Schema, validated in CI

**Decision.** A scenario is one JSON file validated against `scenarios/scenario.schema.json` (JSON Schema 2020-12, strict at every level). Whole-file composition only: no inheritance, no partial overrides, no runtime default merging. Relational invariants that JSON Schema cannot express are checked by `scripts/validate-scenarios.mjs` now and by the runtime validator from phase 01.4. The file name must equal the scenario `id`, and changing a meaningful value creates a new versioned file.

**Alternatives rejected.** YAML — indentation ambiguity for hand-edited numbers. TypeScript scenario objects — the configuration would compile into the bundle and could not be diffed or cited as evidence. A defaults layer — a value that is not in the file is a hidden assumption, which defeats the task 00.2 acceptance condition. Optional fields with defaults were rejected for the same reason: `additionalProperties: false` plus explicit requirements means every number in a run is visible in one file.

**Consequences.** Scenarios are diffable evidence and hash cleanly into a run manifest. Adding a field is a schema version change, not an edit that silently reinterprets old files. The dependency-free validator runs before the toolchain exists and stays useful as a pre-commit and CI check.

## DEC-022 · MVP frozen at ten items plus two supporting items

**Decision.** The MVP is exactly the ten capabilities named in roadmap task 00.3, in that order, plus two supporting items that the gate cannot omit: the weather-driven forecast with naïve baselines (MVP-S1) and the paired experiment runner (MVP-S2). Every item names an owner by domain, a test type, and at least one measurable `AC` criterion. Should, Could and Won't are separated with admission rules rather than time estimates.

**Alternatives rejected.** A feature-count MVP ("as many screens as possible") — the report's claim is a comparison, and extra screens do not make it falsifiable. Treating the forecast as optional — a forecast-aware scheduler without a scored forecast is a name, not a claim. Treating the paired runner as a Should — AC-09 and AC-11 cannot be evaluated without it, and an unpaired comparison is exactly what risk R-07's scope creep produces.

**Consequences.** The gate is binary and can fail visibly. Adding a Should item requires removing a Must or moving the date. Anomaly detection moves to Should because its evaluation depends on a validated engine and calibrated residuals; the boundary is re-checked after every phase gate. `Won't` items are excluded structurally (claim gate, single-user scope, no measured data), not parked for later.

## DEC-023 · Requirements register v0.2: constraints, dependencies, machine check

**Decision.** The register is organised into four ID classes — `FR-<AREA>-nn`, `NFR-nn`, `CON-nn` (constraints), `EX-nn` (external dependencies) — and every requirement names a priority, a verification method, a dependency and a phase. Constraints and external dependencies become first-class rows with a verification method, a consequence and a declared fallback. A dependency-free script checks identity, vocabulary, dependency resolution, cycles, vague wording, Must-to-MVP coverage and the declared counts; it runs in CI from phase 01.5.

**Alternatives rejected.** Leaving dependencies in prose — the graph is what shows that the scheduler cannot be verified before the battery model, and cycles stay invisible. Keeping constraints only in the scope brief — there they are context, not obligations. A style guide without a check — it would not survive contact with 105 rows.

**Consequences.** The register can fail its own check, which is the point. Several wordings were tightened before implementation: FR-BAT-03 lost its topology escape hatch, FR-FCT-05 gained a MAPE reporting rule, FR-UX-01 gained viewport sizes, FR-EMS-07 gained a residual bound, FR-LOD-02 now derives duration from the schedule or flexibility block, NFR-05 and NFR-10 were made observable. No threshold was relaxed and no requirement was removed. Changing a threshold after results are seen remains prohibited (task 11.1).

## DEC-024 · Seven provenance classes and a machine-readable metric register

**Decision.** Every value Helios displays is one of seven classes: **M** measured (none in v1), **X** external, **S** simulated, **F** forecast, **E** inferred, **D** derived, **C** configured. The class is shown as a word, not only a colour or letter. Simulated means produced by a Helios model of the virtual installation; derived means computed from other registered metrics and therefore lists its inputs; configured covers scenario limits, thresholds and the seed, which are inputs to the run and are never summed into results. The full set of displayable values lives in `docs/metric-register.json` (88 entries at v1.0.0), each with a unit, display unit, precision, source and availability gate. The register tables in `docs/data-provenance.md` are generated from that file, and `scripts/check-provenance.mjs` enforces identity, units, class rules, derived-input resolution, acyclicity, availability propagation (a metric cannot be more available than its inputs), no class M before hardware, the declared counts and table freshness. The roadmap's four terms map as: estimated energy → S/D, forecast → F, measured → M, derived → D; X, E and C are the three additional classes the four terms do not cover.

**Alternatives rejected.** A prose-only metric list — it drifts the first time a widget is added, and nothing fails. A JSON Schema for the register — it cannot express cross-references, cycles or availability propagation, so it would give a false sense of validation; one dependency-free checker is authoritative instead. Per-widget labels invented in components — the interface would decide provenance after the fact, which is how a simulated number becomes "live". Treating configured limits as simulated values — a reserve SOC is not a model output, and drawing it as data invites misreading. Removing the economics instead of gating them — deletion hides the missing evidence, while a disabled metric with a visible reason states exactly what is unverified.

**Consequences.** A new screen cannot introduce a number without a register entry, so UI work starts with a register change. The UI contract test (AC-28) and the raw-number lint run from phase 09, and the checker runs in CI from 01.5. The register is the whitelist behind the claim gate: a value not in it cannot be shown, and a claim not in §7 of the provenance document cannot be made. Adding a metric that changes a claim, a gate or a unit requires a decision-log entry. The metric IDs `MET-01…MET-79` are stable and never reused.

