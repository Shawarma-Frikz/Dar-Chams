# Decision log

| Field | Value |
| --- | --- |
| Version | 0.18.0 |
| Date | 2026-11-16 |
| Phase | 00 (task 00.7); v0.3.0 amends Phase 00 for the embedded track; v0.4.0–v0.5.0 record phase 01.1–01.2; v0.6.0 records phase 01.3; v0.7.0 records phase 01.4; v0.8.0 records phase 01.5; v0.9.0 records phase 01.6; v0.10.0 corrects the runtime pin after the first CI run (DEC-036); v0.11.0 records the phase-02.1 time base (DEC-037); v0.12.0 records the phase-02.2 canonical units (DEC-038); v0.13.0 records the phase-02.3 energy ledger (DEC-039); v0.14.0 adopts the Dar Chams identity (DEC-040); v0.15.0 renames the repository, npm packages and current project identifiers (DEC-041); v0.16.0 records phase-02.4 component ports (DEC-042); v0.17.0 records phase-02.5 deterministic clock behavior (DEC-043); v0.18.0 records phase-02.6 deterministic event records (DEC-044) |
| Owner | Author (sole developer) |

A decision is recorded when it constrains later work, when a reasonable alternative was rejected, or when undoing it would be expensive. Entries are append-only; a changed decision is superseded by a new entry rather than edited.

**Change history.** 0.1.0 recorded DEC-001–020. 0.2.0 adds DEC-021–025, brings the index in sync with the body, and adds the machine check (`scripts/check-decisions.mjs`). 0.3.0 adds DEC-026–028: the embedded sensing track admitted by the module requirement, its telemetry contract and source modes, and its free-path transport rule. 0.4.0 adds DEC-029–030: the MIT licence and the repository conventions asked for by task 01.1. 0.5.0 adds DEC-031: the pinned Node 26 LTS runtime, the exact-version policy with a committed lockfile, and the recorded browser and hardware baseline; it supersedes DEC-018's version pin. 0.6.0 adds DEC-032: the application shell, its exact stack, the engine workspace and the static-export workarounds. 0.7.0 adds DEC-033: the four configuration layers, Ajv-validated scenarios shared by app and CI, and the erasable-TypeScript policy that lets Node run the engine source directly. 0.8.0 adds DEC-034: the six quality gates, the 22 tests that exercise the configuration layers, and a CI workflow that is itself machine-checked. 0.9.0 adds DEC-035: the documentation system — decision-record conventions, six module READMEs, API notes, a generated data dictionary, an experiment log, a changelog and the ninth check that holds them together. 0.10.0 adds DEC-036: the runtime pin moves to Node 26.13.1 and npm 11.20.0, because Node 26.2.0 bundles npm 11.13.0 and the first CI run refused the install before any gate. 0.11.0 adds DEC-037: the time base — stored instants, the site timezone's day boundaries, a whole-minute step grid and the internal watt and watt-hour units. 0.12.0 adds DEC-038: the canonical units — branded W, Wh, °C and SOC, the named scale conversions, and a type guard that proves a mixed-unit calculation cannot compile. 0.13.0 adds DEC-039: the nine-term energy ledger, magnitudes with the direction in the name, and an absolute tolerance on the residual. 0.14.0 adds DEC-040: the Dar Chams identity. 0.15.0 adds DEC-041: `Dar-Chams` on GitHub, the `dar-chams` root and `@dar-chams/engine` workspace packages, `dar-chams-engine` manifests, the new settings key, telemetry topic prefix and matching links and paths. 0.16.0 adds DEC-042: typed, UI-free ports between the engine and all simulation components. 0.17.0 adds DEC-043: the deterministic fixed-step clock lifecycle, playback-speed contract and SplitMix64 seeded stream. 0.18.0 adds DEC-044: a deterministic, typed event journal for state transitions.

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
| DEC-018 | Node 24 LTS + npm | Superseded | 2026-11-15 |
| DEC-019 | Provenance labels and the claim gate | Accepted | 2026-11-15 |
| DEC-020 | English code and docs; report language pending | Accepted | 2026-11-15 |
| DEC-021 | Scenario format: JSON + JSON Schema, validated in CI | Accepted | 2026-11-15 |
| DEC-022 | MVP frozen at ten items plus two supporting items | Accepted | 2026-11-15 |
| DEC-023 | Requirements register v0.2: constraints, dependencies, machine check | Accepted | 2026-11-15 |
| DEC-024 | Seven provenance classes and a machine-readable metric register | Accepted | 2026-11-15 |
| DEC-025 | Application shell: Next.js + React + TypeScript | Accepted | 2026-11-15 |
| DEC-026 | Embedded sensing track admitted as phases 12–16 | Accepted | 2026-11-16 |
| DEC-027 | Telemetry contract, source modes and class-M activation | Accepted | 2026-11-16 |
| DEC-028 | Free-path transport for the embedded lab | Accepted | 2026-11-16 |
| DEC-029 | MIT licence | Accepted | 2026-11-16 |
| DEC-030 | Repository conventions: Conventional Commits, short-lived branches, evidence-aware ignores | Accepted | 2026-11-16 |
| DEC-031 | Pinned Node 26 LTS, exact versions, recorded support baseline | Superseded | 2026-11-16 |
| DEC-032 | Application shell: Next.js 16 static export, React 19, TypeScript 5.9, ESLint 9 | Accepted | 2026-11-16 |
| DEC-033 | Configuration layers: four layers, one validator, failures that name a fix | Accepted | 2026-11-16 |
| DEC-034 | Quality gates: Vitest, one gate list, and a CI workflow that is checked | Accepted | 2026-11-16 |
| DEC-035 | Documentation system: module contracts, generated dictionary, checked changelog | Accepted | 2026-11-16 |
| DEC-036 | Runtime pin to Node 26.13.1 / npm 11.20.0 after the first CI run | Accepted | 2026-11-16 |
| DEC-037 | Time base: stored instants, site-day boundaries, whole-minute step grid | Accepted | 2026-11-16 |
| DEC-038 | Canonical units: branded quantities and named boundary conversions | Accepted | 2026-11-16 |
| DEC-039 | Energy ledger: nine magnitudes, direction in the name, absolute tolerance | Accepted | 2026-11-16 |
| DEC-040 | Dar Chams product name and adopted visual identity | Superseded | 2026-11-16 |
| DEC-041 | Rename the repository and all current project identifiers to Dar Chams | Accepted | 2026-11-16 |
| DEC-042 | Typed UI-free ports between the engine and simulation components | Accepted | 2026-11-16 |
| DEC-043 | Fixed-step simulation clock and versioned seeded random stream | Accepted | 2026-11-16 |
| DEC-044 | Typed simulation events with deterministic IDs and ordered append-only journal | Accepted | 2026-11-16 |

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

## DEC-025 · Application shell: Next.js + React + TypeScript

**Context.** The dashboard, the authoritative 2D map, the 3D twin and the charts are one client-side application served from static hosting. The engine already runs headlessly in Node and in a Web Worker (DEC-002, DEC-016), and v1 has no backend (DEC-014).

**Decision.** The application shell is Next.js with static export, React and TypeScript, styled with Tailwind CSS, with shadcn/ui used selectively. Charts render with Recharts from stored run records, never from live engine ticks. Solar position comes from SunCalc, or from a replacement library only after it passes the same AC-05 fixtures.

**Alternatives rejected.** Vite SPA — a sound runtime, but it gives up file-based routing and framework-integrated tooling for no benefit at this scale, since static export already meets the hosting constraint. SvelteKit — the chosen charting, 3D and component libraries (Recharts, React Three Fiber, shadcn/ui) all assume React; adopting Svelte would force weaker substitutes in three layers at once. Server rendering with server functions — v1 has no backend and the demo must run with the network disabled (DEC-014, AS-06), so anything that needs a server at request time is excluded.

**Consequences.** The app builds to static files for Vercel Hobby or any static-compatible host; the engine and Worker boundaries are unchanged. If SunCalc fails the AC-05 fixture comparison, adoption of a replacement is recorded in a new entry that supersedes this one.


## DEC-026 · Embedded sensing track admitted as phases 12–16

**Context.** The module requires a simulated ESP32 with sensors, not only a software twin. The earlier boundary (DEC-001, DEC-022) admitted Wokwi and a hardware adapter only as a payable *Could* item after task 11.1. A graded requirement cannot live in a Could row.

**Decision.** A sensor-only embedded track is admitted as roadmap phases 12–16: an ESP32 node built with PlatformIO, simulated in Wokwi, publishing telemetry through MQTT into the **same** observation boundary the energy engine already defines. The energy engine remains the sole authority for installation physics; the node supplies observations and nothing else. No real electrical load is switched. This is a scope extension under DEC-022's admission rule: the schedule is extended (core handoff moved to phase 16), no Must item is removed, and the embedded evidence becomes part of the graded deliverable. The boundary changes from "ten MVP items plus two supporting items" to "ten MVP items, two supporting items and one embedded track".

**Alternatives rejected.** A standalone Wokwi sketch with no ingestion — it would satisfy the letter of the requirement while adding no evidence to the twin, and the ingestion path is the part worth defending. Making firmware the plant — the engine's invariants (AC-01 to AC-04) and DEC-002 would collapse into an Arduino sketch. Real-load actuation — fails the claim gate and the electrical safety gate.

**Consequences.** New requirements FR-EMB-01–12, constraints CON-14 and EX-09/EX-10, and acceptance criteria AC-29–AC-37; the scope brief, requirements, register and signed checklist are amended in the same change. Phase 11 narrows to the core freeze and paired runs; a new phase 16 restores demonstration, report and handoff after the embedded track, so report claims can cite embedded evidence. The MVP completion gate stays unchanged for the simulation; the delivery gate adds AC-29–AC-37.

## DEC-027 · Telemetry contract, source modes and class-M activation

**Decision.** One versioned JSON schema carries every device message: `device_id`, `schema_version`, `sequence`, `timestamp_ms` (UTC epoch), `source_mode` (wokwi, physical, replay), `measurements` with a unit, provenance mark and quality flag per field, `firmware_version` and `uptime_s`. The ingestion adapter validates against the schema, normalizes units, timestamps receipt, deduplicates by (device, sequence), tracks liveness and writes an append-only record. The interface offers four explicit source modes — Scenario, Wokwi node, Physical node, Recorded replay — and live modes never mutate the deterministic scenario. The run manifest records `source_mode`, so AC-02 determinism is scoped to Scenario and Replay modes. Class **M** is activated only for physically measured bench channels (ambient temperature, humidity, light-level proxy after calibration) and only behind `hardware.*` availability gates; every installation quantity stays S/D/F/X/C. `docs/metric-register.json` moves to v1.1.0 with nine embedded metrics, and the checker's "no M before hardware" rule becomes "M only behind a hardware gate".

**Alternatives rejected.** A payload per source — three contracts means three drift points and a parity test that proves nothing. Treating Wokwi readings as measured — the claim gate exists for exactly this. One shared mutable buffer where live values overwrite scenario fields — reproducibility (AC-02) would silently depend on whether a node was connected.

**Consequences.** The dashboard must show the active source and per-field provenance (AC-31, AC-32); stale values render as stale (AC-30); the register and `data-provenance.md` are amended; DEC-024's "no class M" clause is superseded for bench channels only, and its register version reference remains historically accurate.

## DEC-028 · Free-path transport for the embedded lab

**Decision.** Every graded embedded path runs on free tiers. Three paths are supported: (1) Wokwi simulation → public Wokwi gateway → free public MQTT broker, carrying only synthetic, non-sensitive telemetry; (2) physical ESP32 → Mosquitto on the local LAN, which needs no Wokwi gateway and no Docker; (3) Recorded Replay fixtures for the offline demonstration and for CI. Paid Wokwi licences and the private IoT gateway are optional developer conveniences; no acceptance criterion may depend on them (CON-14, AC-37).

**Alternatives rejected.** The private gateway as the primary Wokwi path — it is a paid capability and would violate CON-03. Public broker for anything sensitive — excluded by construction: only synthetic telemetry is published, under a unique topic prefix. A serial-only bridge — platform-specific fragility with no standard Wokwi path.

**Consequences.** Task 14.9 is rewritten around the free default; EX-09/EX-10 declare replay and local-broker fallbacks; replay fixtures become mandatory evidence (AC-33) rather than optional polish.

## DEC-029 · MIT licence

**Context.** Task 01.1 requires a licence decision before the repository is published, and the README recorded none. Helios is a graded coursework deliverable in a public repository, with no patentable invention and no commercial distribution.

**Decision.** MIT, declared in [`LICENSE`](../LICENSE) with SPDX identifier `MIT`. No CLA and no DCO requirement. The grant covers code, documentation and the machine-checked artefacts; third-party data and libraries keep their own terms.

**Alternatives rejected.** Apache-2.0 — an explicit patent grant and `NOTICE` choreography for a project with no patent to protect, and extra paperwork for a single author. GPL-3.0 — copyleft discourages reuse of a sample project and would complicate any later embedding of the engine in closed tooling. No licence — default all-rights-reserved contradicts a public repository and blocks exactly the reuse a portfolio project is meant to demonstrate.

**Consequences.** Dependencies must stay permissive; a copyleft dependency needs a new entry before it is added. Open-Meteo data, PVGIS reference values and the Wokwi simulator keep their own attribution terms, so the MIT grant is not a blanket relicensing of the whole tree. The README states the licence and the report cites it.

## DEC-030 · Repository conventions: Conventional Commits, short-lived branches, evidence-aware ignores

**Context.** Task 01.1 asks for `.gitignore`, editor settings and branch/commit conventions, and task 01.5 makes CI the gate. The tree already mixes code-to-come with evidence that is checked now: a signed checklist whose digest covers exact bytes, scripts that parse tables, and registers where a formatter's reflow counts as a content change.

**Decision.** Conventional Commits from phase 01 onward, with a fixed type and scope vocabulary, `Refs:` footers citing `FR`/`NFR`/`CON`/`EX`, `AC` and `DEC` identifiers, and one logical change per commit. Branches are short-lived and named `<type>/<phase>-<slug>`; `main` is never force-pushed and published history is never rewritten; annotated tags mark phase gates. `.gitattributes` fixes LF, and `.gitignore` separates regenerable output from evidence, so runs, datasets and `.pio/` stay out while scenarios, weather fixtures and replay sessions stay in. Format-on-save is enabled for code and disabled for Markdown and JSON, because those files are evidence.

**Alternatives rejected.** Keeping the existing sentence style — readable, but no machine-parseable type, so filtering by kind or generating a changelog is impossible. GitFlow with release branches — ceremony one developer cannot use, and long-lived branches that drift away from the checks. Rewriting the six phase-00 commits into Conventional Commits — destroys the record of how phase 00 actually closed for no gain. Committing generated runs — repository bloat, when AC-02 already makes a run reproducible from scenario, seed and engine version. Running Prettier over `docs/` — a reflow breaks the checklist digest and buries a real change in formatting noise.

**Consequences.** History before 2026-11-16 keeps its sentence-style subjects and is not retro-fitted. A `CHANGELOG.md` can be generated from the types and tags in 01.6. Signed artefacts are edited by hand and re-signed; the check fails if that is forgotten, which is the intended failure mode.

## DEC-031 · Pinned Node 26 LTS, exact versions, recorded support baseline

**Context.** Task 01.2 requires a supported Node LTS pinned with a lockfile, plus a recorded browser and hardware baseline. DEC-018 chose Node 24 LTS when 24.18.0 was the installed line; the development machine now runs 26.2.0, the current Active LTS, so the recorded pin and the machine have drifted apart before a single line of application code exists. Correcting the pin now costs minutes; correcting it after phase 03 costs a re-verified toolchain.

**Decision.** Pin the Active LTS line: Node 26 (`>=26.0.0 <27` in `engines`, `26.2.0` in `.nvmrc`), npm 11.15.0 declared in `packageManager`, `.npmrc` setting `engine-strict=true`, `save-exact=true` and `package-lock=true`, and a committed `package-lock.json` at lockfile version 3 as the only supported install path (`npm ci`). No dependency block may declare a floating spec. The browser and hardware baselines are recorded in `docs/runtime-support.md`, and `scripts/check-runtime.mjs` verifies that the running toolchain, the two pins, the npm settings, the licence and the lockfile agree — including a negative test showing that a wrong Node line is refused with `EBADENGINE`.

**Alternatives rejected.** Staying on Node 24 — it has moved to maintenance, and pinning `engines` to a line the grading machine cannot satisfy would make `engine-strict` block every install exactly where the project is evaluated. A range policy with a lockfile — the lockfile pins the tree, but a range still lets a regeneration move versions silently, which is what the pin exists to prevent. Corepack with pnpm or yarn — a second toolchain for no benefit, already rejected in DEC-018. A prose version note with no `.nvmrc` — the pin would not survive a fresh clone. Docker — excluded by CON-04.

**Consequences.** DEC-018's version pin is superseded; its npm choice and its Windows `npm.cmd` note remain in force and are restated in `docs/runtime-support.md` §2. Node 26 is the Active LTS line until October 2027, so an upgrade needs a new entry and a re-tested clean install. The lockfile is empty of dependencies at this phase because 01.2 pins the mechanism; 01.3–01.5 add the stack with exact versions. A floating spec or an uncommitted lockfile now fails `npm run check`, which becomes the CI entry point in 01.5.

## DEC-032 · Application shell: Next.js 16 static export, React 19, TypeScript 5.9, ESLint 9

**Context.** Task 01.3 asks for a shell that starts, type-checks, lints and formats, with simulation kept out of the interface. The versions cannot be chosen one at a time: the lint plugins narrow which TypeScript and ESLint majors are supported, the export mode rules out a request-time server, and the design charter fixes the palette and the three typefaces. The shell must also display no fabricated value, because no engine exists yet.

**Decision.** Next.js 16.4.6 App Router with React 19.3.1, TypeScript 5.9.3 in strict mode, ESLint 9.39.5 on the flat config exported by `eslint-config-next`, Prettier 3.10.1 with `prettier-plugin-tailwindcss` 0.8.1, and Tailwind CSS 4.3.5 configured through `@theme` tokens that carry the graphic-charter palette. The build is a static export (`output: 'export'`, `images.unoptimized`, `trailingSlash`), fonts are self-hosted at build time by `next/font`, and six routes share one layout. The engine is an npm workspace package, `packages/engine` (`@helios/engine`), exporting TypeScript source through `exports` and transpiled by Next; ESLint forbids it from importing React, Next or the application. `npm run verify` runs the six document checks, type-check, lint and format check. A scoped override pins `minimatch` 11.0.8 under `@typescript-eslint/typescript-estree`.

**Alternatives rejected.** TypeScript 7.0.2 — `typescript-eslint` peers on `<6.1.0`, so the newest compiler would ship with unsupported lint. ESLint 10.15.0 — `eslint-plugin-react` and `eslint-plugin-jsx-a11y` still peer on `^9`; npm warns, and an untested lint is worse than a pinned one. Tailwind 3 with a content-glob config — v4 maps the charter tokens once in `@theme` and needs no scan configuration. A second app package or a task runner — one application and one package do not justify a monorepo orchestrator; npm workspaces are enough. `next start` — unavailable with `output: 'export'`, so the preview script serves the real artifact instead. A global minimatch override — wider blast radius for a dev-only advisory; the scoped override changes only the offending chain. Accepting the seven moderate advisories — `npm audit` would stay noisy on the one chain CI runs.

**Consequences.** Every version is exact and checked by `scripts/check-runtime.mjs`, including workspace manifests and the override, so a TypeScript 6 or ESLint 10 upgrade is a recorded decision, not an accident. Link prefetch is disabled: this Next version requests a page payload at a dotted path that the export writes as a directory, producing five harmless 404s per load; navigation still fetches the exported `index.txt` payload, and prefetch returns when the two paths agree. `trailingSlash: true` makes `/twin/` canonical, which static hosts serve through directory indexes. The engine entry point is TypeScript source, so the app cannot import a stale build; the boundary is enforced by lint rather than by convention. No route displays a metric: each one names its planned contents and requirement references, so a screenshot cannot be read as a result. The override is removed when `@typescript-eslint/typescript-estree` depends on minimatch 11 or later.

## DEC-033 · Configuration layers: four layers, one validator, failures that name a fix

**Context.** Task 01.4 requires defaults, scenario configuration, user settings and runtime state to be separate, and requires invalid capacity, negative power, an impossible SOC window or a missing unit to fail at startup with a message a reader can act on. DEC-021 already froze the scenario format as JSON plus a JSON Schema, and the schema is complete by contract, so the layers cannot be a chain of overrides without contradicting it. The same validation has to serve three callers — the app at startup, `scripts/validate-scenarios.mjs` in CI, and the harness that proves the failures — or the rules drift apart.

**Decision.** Four layers with different failure policies. Defaults are code (`src/lib/config/defaults.ts`): a defect there is a build failure. The scenario is a file validated against [`scenarios/scenario.schema.json`](../scenarios/scenario.schema.json) and is complete, so defaults never fill a scenario field and no layer is merged at runtime. User settings (`src/lib/config/settings.ts`) hold presentation only, are parsed by a function that never throws, and fall back to defaults with recorded issues. Runtime state (`src/lib/config/runtime.ts`) is derived from a resolved configuration and is mutable for the session; it is never an input. Validation lives in the engine (`packages/engine/src/config/`) as `createScenarioValidator`: Ajv 8.20.0 in draft 2020-12 mode with `allErrors`, mapping every error to a `ConfigIssue` carrying layer, dotted path, stable code, message, received value, expected value and a hint, plus a second pass for relational invariants the schema cannot express (SOC window ordering, initial SOC inside the window, unique and resolvable room and appliance ids, flexibility duration fitting a midnight-wrapping window, tariff band ordering with `null` only last). Unknown keys get a nearest-name suggestion, so `tilt` reports `tilt_deg`. An `auditSchemaUnits` walk checks that every numeric property in the contract names its unit, and the audit is self-tested so it cannot pass vacuously. `resolveConfiguration` throws a `ConfigError` that renders numbered, readable blocks; `src/lib/config/startup.ts` resolves at module load, so a bad scenario stops the build and the page rather than a dashboard. The engine is loaded by Node through type stripping, which is why the root manifest sets `"type": "module"`, `tsconfig.base.json` sets `allowImportingTsExtensions` and `erasableSyntaxOnly`, and every intra-package import carries a `.ts` specifier: app, CI script and proof harness run one implementation. `scripts/check-config.mjs` injects the four required failure classes, audits the units, asserts the layer boundaries and exits non-zero on any regression.

**Alternatives rejected.** A merge chain — defaults under scenario under settings — silently substitutes the 3 kWp default into a 6 kWp off-grid scenario, which is exactly the "never fall back to a default" clause of FR-SIM-10. Zod or a TypeScript-native schema — a second contract beside the frozen JSON Schema, and two definitions of a valid scenario will disagree. Validating in the layout component — the validator and Ajv would ship in the client bundle, and the engine may not import the app (DEC-002). Hand-written rules duplicated in `validate-scenarios.mjs` — the duplication that this task deleted, where CI could pass a file the app rejects. Warnings instead of a thrown error — a warning leaves a dashboard showing numbers from a configuration nobody accepted. `ts-node` or `tsx` to run the validator — a second toolchain for a Node line that strips types natively. Ajv 8.17.1 — carries GHSA-2g4f-4pwh-qvx6 (ReDoS via `$data`) on the one chain every check depends on.

**Consequences.** Adding a scenario field now means editing the schema, the `Scenario` interface and — if it is numeric — a unit suffix; the audit fails if the third is forgotten. A startup failure is proven, not asserted: corrupting the boot scenario makes `npm run build` exit with a `ConfigError` naming the field, and the file was restored byte-for-byte afterwards. The schema's validation rules are unchanged from phase 00 — only its `$comment` was brought up to date — so Ajv runs with `strictTypes: false` to tolerate the omitted `type: "object"` in the frozen `if/then` branches; this is a compatibility setting, not a loosening of unknown-key rejection. FR-SIM-07 clamping and the scenario editor (FR-UX-06) remain future work at 02.7 and 09.6. `npm run check` is now seven commands, and `docs/configuration.md` records what the check proves and what it does not.

## DEC-034 · Quality gates: Vitest, one gate list, and a CI workflow that is checked

**Context.** Task 01.5 asks for formatting, lint, type-check, unit-test and production-build commands, and for CI on pushes and pull requests. Its acceptance condition is that a failing check blocks a green build — a claim about behaviour, not about files existing. The tree had four code gates but no tests, and `verify` stopped before the build, so the artefact CI exists to protect was never built locally. The environment has no `gh`, no Docker (CON-04) and no network path to trigger a workflow, so the pipeline has to be verifiable from the repository alone.

**Decision.** Vitest 5.1.0 runs the tests in a Node environment against the TypeScript sources, with fast-check 4.10.2 for properties; `npm run test` and `npm run test:watch` are the commands, and 22 tests cover the configuration layers built in 01.4 — the shipped scenarios, the four failure classes, the issue report, the unit audit, the SOC invariant, settings recovery and runtime derivation. `npm run verify` now runs the eight register checks, then type-check, lint, format check, tests and finally `npm run build`, so a failure anywhere stops the chain before the artefact is produced. [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs the same six steps separately on `ubuntu-latest` and `windows-latest`, on pushes to `main`, pull requests and manual dispatch, with Node taken from `.nvmrc`, `npm ci` from the lockfile, `permissions: contents: read`, a concurrency group that cancels superseded runs, a 25-minute timeout, and `actions/checkout` and `actions/setup-node` pinned to commit SHAs. `scripts/check-ci.mjs` is the eighth check: it parses the workflow, asserts the structure above and the equality of the workflow, `verify` and `package.json` gate lists, then requires six deliberately broken variants — a removed gate, a tag-pinned action, a swallowed failure, a missing trigger, a floating Node version, a dropped test gate — to be reported. `docs/quality-gates.md` records the contract and what it does not cover.

**Alternatives rejected.** Jest with `ts-jest` — a second transform chain beside the one Next already runs, where Vitest consumes the same TypeScript sources the application imports (DEC-017). A single CI step running `npm run verify` — fewer lines, but six gates collapse into one red cross and the failing gate has to be found in the log. Docker or `act` to rehearse the workflow locally — excluded by CON-04 and heavier than the contract it would test. Referencing actions by tag — a tag can be moved, and the workflow would then run code nobody reviewed. `|| true` or `continue-on-error` on a slow step — a gate that cannot fail is decoration. Coverage thresholds — no meaningful denominator before the engine has physics (phase 02). A macOS runner at 01.5 — Linux already covers case-sensitive paths and Windows covers the grading OS; macOS adds minutes for no failure class present in this stack. A third-party workflow linter — a network-dependent tool to validate a 50-line file, where the repository's own reader is auditable and is itself tested.

**Consequences.** Adding a gate now means changing `package.json`, the workflow and the gate list in `check-ci.mjs`; forgetting one fails `npm run check`, and the failure names the missing gate. `verify` takes about 25 seconds because it ends in a production build, which is the price of testing the artefact rather than the sources alone. The failure path is recorded, not assumed: a deliberately red test made `verify` exit 1 at the test gate and the build never started. NFR-06 also says the checks must pass *before merge*; requiring the status check is a repository setting, recorded in [quality gates](quality-gates.md) §3 rather than enforceable from the tree. The Windows job doubles the minutes of every run, which is free on a public repository and bounded by the concurrency group. Node 26 must be available to `setup-node`; `.nvmrc` is the single place that changes if it is not.

## DEC-035 · Documentation system: module contracts, generated dictionary, checked changelog

**Context.** Task 01.6 asks for architecture decision records, module READMEs, API notes, a data dictionary, an experiment log and a changelog. The six are uneven in the tree: the decision log exists and is already checked, while the module documentation, the callable surface, the field-level dictionary, the experiment record and the change history do not exist at all. The documents that do exist are already partly machine-read — the metric tables are generated, the checklist is signed — because prose alone had begun to drift from the code it described. The environment adds two constraints: CI has no documentation host and no network dependency to install one, and the check has to run from a clean clone with the dependencies the project already has.

**Decision.** One documentation system, recorded in [`documentation.md`](documentation.md). Every document has one job and one authority, listed in a map the checker reads. The decision log is the ADR register, append-only, with a fixed entry shape; it is not split into one file per decision. Six major modules — `packages/engine`, `src/app`, `src/components`, `src/lib/config`, `scripts` and `scenarios` — carry a README with required `Purpose`, `Inputs`, `Outputs` and `Tests` sections, at least one accepted decision citation, and only test commands that exist. [`api.md`](api.md) documents every export of the engine entry point and of the application configuration surface, and the checker compares the tables with the sources in both directions. [`data-dictionary.md`](data-dictionary.md) is generated from `scenario.schema.json` by `scripts/check-docs.mjs --write`, so a schema edit without a dictionary refresh fails the build. [`experiment-log.md`](experiment-log.md) fixes a ten-field record and a template, with run output staying untracked. [`CHANGELOG.md`](../CHANGELOG.md) follows Keep a Changelog and SemVer, with `0.<phase>` as the phase gate. `scripts/check-docs.mjs` is the ninth register check: it verifies all of the above, proves its parser on seven deliberately broken copies — a removed section, a removed export row, a stale dictionary row, a removed package version, a record without a seed, an unresolved decision and an orphaned document — and reports the counts it checked.

**Alternatives rejected.** A documentation site generator (Docusaurus, VitePress) — a second toolchain and a build step to publish files that are already readable in the repository, and no new invariant. One ADR file per decision — it duplicates the index, status and reference machinery `check-decisions.mjs` already enforces, and an index of thirty-five files is harder to scan than one log. A generated TypeScript reference (TypeDoc) — a large surface that lists every internal helper and says nothing about which exports a caller may rely on; the API table's set comparison answers that question directly. A hand-written data dictionary — it drifts on the first schema edit, while generation makes drift impossible and leaves the narrative to review. A changelog generated from commit subjects — history before 2026-11-16 is not in Conventional Commits, and a file-change list is not the decision-level record a reader needs. A wiki or a hosted knowledge base — outside the repository, outside review, outside the offline demo (NFR-02). A prose linter — no mechanical definition of a true sentence, so the checker enforces structure and references and leaves judgement to review.

**Consequences.** `npm run check` is now nine commands and `verify` runs them before the four code gates and the build; CI needs no change because its first step is `npm run check`. Adding a module means a README, an entry in `MODULES`, and a row in the document map; adding an export means an API row; changing the schema means `--write` and a reviewed dictionary diff. A document without a map row fails, so an orphaned file is visible rather than forgotten. The checker does not decide whether a sentence is true, and external links are not tested; both remain review responsibilities. No dependency was added: the checker uses only `node:fs`, `node:path` and `node:url`. The changelog's `0.1.0` includes phase 01.6, because the phase-01 tag is the phase gate, not a per-task tag.

**Revisit if** the document set outgrows a single map — roughly forty documents — or a publication requirement appears; then split the map into an index while keeping the same checker and the same module contract.

## DEC-036 · Runtime pin to Node 26.13.1 / npm 11.20.0 after the first CI run

**Context.** The first pushed phase-01 commit made both CI jobs fail at `npm ci`, before any gate ran. The workflow itself was correct: setup-node installed the Node line from `.nvmrc`, 26.2.0, and that release bundles npm 11.13.0, while DEC-031 declared npm 11.15.0 exactly in `packageManager` and `engines.npm` and `.npmrc` sets `engine-strict=true`. The local machine has 11.15.0 installed, so every local check passed and the mismatch only existed on the runners. Node's release index also lists v26.2.0 as `lts: false`; the 26 line became Active LTS under the name Lithium, and 26.13.1 (2026-11-10) is the current patch on it. A pin the pipeline cannot install is not a pin.

**Decision.** Pin Node 26.13.1 in `.nvmrc`, the current Lithium LTS patch, and raise the npm pin to the version that release bundles: `>=11.20.0 <12` in `engines.npm` and `npm@11.20.0` in `packageManager`. `engines.node` stays `>=26.0.0 <27`. The lockfile's root `engines` entry is regenerated with npm 11.20.0 rather than hand-edited. Everything else in DEC-031 remains in force unchanged: exact dependency versions, the committed lockfile at version 3 as the only install path, `engine-strict`, the workspace pin, the override policy and the recorded browser and hardware baseline.

**Alternatives rejected.** Keep 26.2.0 and add `npm install -g npm@11.15.0` to the workflow — pins a pre-LTS patch and adds an install step whose failure mode the contract check would have to learn, to run a tool the runner was not built with. Lower `packageManager` to 11.13.0 — describes the runner's bundled default instead of a chosen version, and validates a tool nobody installs deliberately. Relax `engine-strict` or drop the npm pin — turns a hard drift into a warning, which is the failure DEC-031 was written to prevent. Use `nvm use` or a second version manager in the job — setup-node already reads `.nvmrc`, and two mechanisms that can disagree are worse than one. Install npm from the workflow with `npm install -g npm@…` at the new version — redundant, because 26.13.1 already ships it.

**Consequences.** CI now installs exactly the npm the manifest declares, so the install gate and the local command agree; `scripts/check-runtime.mjs` still enforces equality between the running npm and `packageManager`, so a developer on an older npm gets a named failure rather than a silent difference. The lockfile gains no dependency changes, only the root `engines` field, and a clean `npm ci` with 11.20.0 is the evidence the pin is installable, not merely declared. The browser and hardware baseline is untouched. The phase-01 tag follows a green run on both runners; until that run exists, the phase is complete locally but not proven in CI.

**Revisit if** Node 26 leaves Active LTS (October 2027), the 26.13.x line ships a different npm, or a dependency begins to require a newer npm than the pinned one.

## DEC-037 · Time base: stored instants, site-day boundaries, whole-minute step grid

**Context.** Task 02.1 fixes the axis the simulation runs on: a configurable 5- or 15-minute timestep, timestamps that are timezone-aware instants, and internal energy in Wh/kWh and power in W/kW. The decisions already declare the intent — 15 minutes by default with 96 steps a day (DEC-003), W and Wh internally with conversion only at boundaries (DEC-004), UTC storage and display in the site zone (DEC-005), 5/15/30/60 minutes and 96 steps at 15 with an explicit offset on every timestamp (FR-SIM-02), daily energy from local midnight to local midnight (MET-15) — but no engine code read `timestep_minutes`, `start` or `site.timezone`; runtime state copied the start string. The environment decides two constraints: the offline demo cannot fetch a timezone database (NFR-02, CON-03), and Node and every target browser already ship one through `Intl`. The three shipped scenarios are all in `Africa/Tunis`, which has no daylight saving, so a naive implementation would pass every fixture unless the tests deliberately leave that zone.

**Decision.** One time base in `packages/engine/src/time`, built from four rules.

*Whole-minute steps.* The grid is uniform: `stepCount = durationMinutes / timestepMinutes`, with no partial final step and no drift. A Tunisian day is 288 steps at 5 minutes, 96 at 15, 48 at 30 and 24 at 60; the shipped 48-hour run is 192 steps. A duration that does not divide by the timestep is refused rather than rounded. Power over one step becomes energy through `intervalWattHours` (W × minutes ÷ 60 → Wh).

*Stored instants.* An instant is a millisecond count since the Unix epoch, tagged `Instant`, constructed only by `parseInstant` or `instantFromEpochMilliseconds`. The parser accepts ISO 8601 with `Z` or a numeric offset and refuses a timestamp without one, a date the calendar does not have, a leap second, and precision finer than a millisecond; it does not truncate or reinterpret in the host machine's zone. Arithmetic is in whole minutes. `formatInstant` gives the canonical UTC form and `formatZonedInstant` the site form with its offset; ISO strings are a boundary format, never internal state.

*Site timezone.* The zone is the IANA identifier in `site.timezone`, read through `Intl.DateTimeFormat`; every offset is looked up at the instant, not assumed from the date. `instantFromZonedParts` resolves a wall clock with the `compatible` convention — a time inside a spring gap shifts forward by the gap, an ambiguous autumn time takes the earlier occurrence — and both directions are fixtures. A site day runs from local midnight to the next local midnight and carries its real length: 23 or 25 hours around a one-hour transition, 23.5 or 24.5 in a half-hour zone, and 24 otherwise. `stepsInSiteDay` therefore gives Paris 92 or 100 steps at 15 minutes and Lord Howe 94 or 98, and it refuses a day whose boundary does not fall on the grid (an hourly grid on a 23.5-hour day) instead of placing midnight at the nearest step. `groupStepsBySiteDay` assigns a step to the day its start falls in, so a day's intervals sum to that day's energy.

*Units.* Power is W and interval energy is Wh internally. kW and kWh exist only behind named conversions (`wattsFromKilowatts`, `kilowattsFromWatts`, `wattHoursFromKilowattHours`, `kilowattHoursFromWattHours`); a calculation never mixes the scales silently. The full dimensional guard across temperature, state of charge and every boundary is task 02.2, which this module deliberately does not pre-empt with branded watt and watt-hour types.

*Contract enforcement.* Two relational invariants join the configuration contract: `site.timezone` must be an IANA identifier the runtime knows, and the offset written in `simulation.start` must equal that zone's offset at that instant. Either failure stops the load with a path, a value and a fix, like every other configuration contradiction.

*Acceptance.* The task's "daylight/timezone boundary" is read as the site-day boundary that MET-15 defines, not as solar daylight: sun elevation and sunrise/sunset are MET-11 and task 03.2, with AC-05 defining their accuracy. `scripts/check-time.mjs` is the tenth register check; it checks the shipped runs, a full day at each timestep, the four DST days, both transition directions, instant storage and the unit scales, then feeds five broken cases through the public API. The unit and property tests repeat the proofs inside Vitest, because CI must fail on the count, not only on the script.

**Alternatives rejected.** UTC day boundaries — daily energy would roll over at 01:00 or 02:00 local, contradicting MET-15 and every configured schedule. A fixed `+01:00` offset — correct for Tunis and wrong for every other site, and DEC-005 already chose IANA identifiers. A timezone library (Luxon, date-fns-tz) — a dependency and its own tzdb update path to replace a database the runtime already ships, against the offline constraint. ISO strings as internal state — lexical comparison and arithmetic drift as soon as offsets differ; a branded epoch millisecond is unambiguous and fast. Floating-point hours or days — accumulated drift and an unclear step boundary; whole minutes are exact integers. Assuming 96 steps a day — false in any DST zone, and precisely the boundary this task must get right. Snapping a non-aligned boundary to the nearest step — silently moves midnight and misstates a day's energy; refusing makes the limitation visible. Solar sunrise/sunset now — 03.2 and AC-05 own solar position and its tolerance. A full branded W/Wh type system now — it would pre-empt 02.2's dimensional guard and force constructors through scenario fields before that task defines the boundary policy. Relying on Vitest alone for acceptance — the register checks are the commands a reader can run against a clean clone, and this one also exercises four zones Vitest would otherwise have to duplicate; the tests remain the second, independent proof.

**Consequences.** `npm run check` is now ten commands, with `check-time` between the configuration proof and the documentation check; CI needs no workflow change because it runs `npm run check` first. `check-config` injects ten failures instead of eight, and `check-docs` reports 32 additional engine exports. The shipped scenarios and the schema are unchanged, so the generated data dictionary is byte-identical and no scenario needs a new field. Phase 02.3 can convert step power to interval energy through `intervalWattHours`, and 02.5 can advance a deterministic clock through `stepAt` without re-deriving the calendar. DST correctness depends on the runtime's IANA database; the fixtures use 2026 dates whose rules were settled years earlier, and Node 26.13.1 and the target browsers ship a current database. A 60-minute timestep remains legal for a run in a half-hour DST zone; only a daily aggregation on a 23.5-hour day is refused, and the shipped Tunis zone is unaffected. The engine still performs no physics, so AC-01 and the step rate of AC-18 remain open.

**Revisit if** the interface needs sub-minute resolution, a supported zone requires an offset finer than a minute, the gap/overlap convention must change for a scenario editor, or a target browser stops shipping a current IANA database. In the last case the fallback would be a pinned tzdb artefact, not hand-written rules.

## DEC-038 · Canonical units: branded quantities and named boundary conversions

**Context.** Task 02.2 fixes the unit vocabulary: W for instantaneous power, Wh for interval energy, kW and kWh for larger display values, °C for temperature, and percent or a 0–1 fraction consistently for state of charge, with every conversion explicit at a boundary. DEC-004 declared W and Wh internal, and 02.1 implemented the four energy scale conversions, but temperature, state of charge and the possibility of mixing quantities were untouched. FR-SIM-03 states the same rule and names 02.2 as its phase. The contract already mixes scales by design — inverter ratings and battery capacity are kW/kWh, appliance loads are W, SOC is a fraction — so a crossing is routine rather than exceptional. The task's DONE WHEN is a property of calculations that do not exist yet: the engine still has no physics. A naming convention alone cannot prove it, because `power + energy` is valid JavaScript and TypeScript, and a future schema could write `maximum: 100` on `max_soc` without any check noticing.

**Decision.** One unit vocabulary, enforced in three places.

*Canonical scales.* Power is W (`Watts`), interval energy is Wh (`WattHours`), temperature is °C (`Celsius`) and state of charge is the fraction `[0, 1]` (`StateOfCharge`). kW (`Kilowatts`), kWh (`KilowattHours`) and percent exist only behind a named conversion: `wattsFromKilowatts`, `kilowattsFromWatts`, `wattHoursFromKilowattHours`, `kilowattHoursFromWattHours`, `percentFromStateOfCharge` and `stateOfChargeFromPercent`. Every quantity is a branded number with its own unique symbol, built only by a constructor that validates the value: `watts`, `wattHours`, `kilowatts`, `kilowattHours`, `celsius` and `stateOfCharge` refuse a non-finite number, `celsius` refuses anything below absolute zero, and `stateOfCharge` refuses 55 where 0.55 belongs. `addWatts` and `addWattHours` accept one unit only. Temperatures have no adder, because absolute temperatures are not summed.

*The scenario boundary.* The `Scenario` interface keeps plain numbers, because it mirrors the JSON document and the validator reads JSON. A scenario value becomes a quantity where it is consumed: a `_w` field through `watts()`, a `_kw` field through `wattsFromKilowatts(kilowatts(…))`, a `_kwh` field through `wattHoursFromKilowattHours(kilowattHours(…))`. Branding the interface itself would force casts in the validator and misdescribe the parsed document.

*The proof.* `scripts/check-units.mjs` crosses every shipped kW and kWh boundary, reads all 42 appliance powers in watts, holds all 18 SOC fields to `[0, 1]`, and converts each NOCT through `celsius`. It compiles [`scripts/fixtures/unit-guard.ts`](../scripts/fixtures/unit-guard.ts) with `tsc`, where eight calculations are marked with the diagnostic they must produce: `addWatts(power, energy)`, `addWattHours(energy, power)`, an energy passed to a power conversion, a power passed to `intervalWattHours`, and four assignments where `power + energy` or a raw literal tries to become a quantity. The check requires the compiler's diagnostics to match the marked lines exactly, so removing a brand removes an error and fails the check. It then feeds nine wrong-scale values through the constructors and the schema audit. The audit gains three rules: every `_soc` field is bounded by 0 and 1, a `_percent` field is refused, and a `_degc` bound below absolute zero is refused.

*Acceptance.* The task measures no calculation that exists yet, so the acceptance is the type guard plus the boundary conversions on the shipped data. `scripts/check-units.mjs` is the eleventh register check, placed after the time proof. A branded number remains assignable to a `number` parameter, so a deliberate call such as `celsius(power)` compiles; the guard covers arithmetic and assignment, which is where a unit is silently lost, and the constructor name makes a deliberate crossing visible in review.

**Alternatives rejected.** Naming conventions alone — the status quo before this task; nothing stops a new field or a new expression from mixing units, and the DONE WHEN would remain an assertion. Boxed quantities (`{ unit: 'W', value }`) — they would catch a deliberate wrong-unit constructor call at runtime, but every arithmetic site, JSON boundary and test would allocate and unwrap an object, and the inner simulation loop would pay for a failure the compiler already catches. A general units library — a dependency, object-based arithmetic and a large surface for six fixed quantities, against the offline and supply-chain constraints (CON-03, NFR-04). Storing SOC as percent — two scales in one contract, with the 55-versus-0.55 error moving rather than disappearing; the fraction matches the battery model and the schema bounds. Storing temperature in kelvin — no data source uses it, and datasheets, weather and the scenario all speak °C. Adding temperatures — an absolute temperature is not additive; a temperature difference would be its own type if a later phase needs one. Branding the `Scenario` interface — the parsed document is JSON, so branded fields would be a lie at the boundary and require casts in Ajv's output. Vitest-only type assertions — `@ts-expect-error` is checked by `tsc`, not by the test runner, so a green test suite would say nothing about the guard; the explicit fixture makes it a standalone command with an exact-diagnostic comparison.

**Consequences.** The engine exports 91 names, 15 more than after 02.1; `docs/api.md` records each one. The suite runs 53 tests, six of them over power and energy and five over temperature and state of charge. `npm run check` is eleven commands, with `check-units` between `check-time` and `check-docs`; CI needs no workflow change because its first step is `npm run check`, and the type guard adds about two seconds. `npm run typecheck` excludes `scripts/fixtures`, so the deliberately broken fixture can never turn the ordinary type-check red. Phase 02.3 can compute PV power in W, convert once with `intervalWattHours`, and add interval energies without a scale decision at every line. A future schema that stores a percentage or widens a SOC bound now fails the configuration audit, not a review. The engine still has no physics, so AC-01 and the step rate of AC-18 remain open.

**Revisit if** the physics needs a quantity algebra that multiplies units — W × W, or a temperature difference — rather than conversion plus same-unit addition, if a second temperature scale or a percentage-valued storage format enters the contract, or if the subtype-to-number limitation causes a real defect that a boxed representation would have caught.

## DEC-039 · Energy ledger: nine magnitudes, direction in the name, absolute tolerance

**Context.** Task 02.3 fixes the conservation law every step will be held to and asks for a sign convention. The engine has no physics yet — component interfaces arrive in 02.4 and the PV, battery, household and grid models from phase 03 — so the law has to be stated and proven against the scenarios before any component reports a term. The roadmap's six flows plus "conversion/loss terms" hide three losses that happen in three different components: the inverter converts on every path that crosses it, the battery loses energy between its terminals and its cells, and the inverter draws standby power from the bus. A single signed equation is also a weak proof, because a phantom export and a missing load can cancel, and the residual then says nothing about which term is wrong.

**Decision.** One ledger, in `packages/engine/src/balance`, and one convention.

*The identity.* In watt-hours per step:

```text
pv + gridImport + batteryDischarge =
    load + batteryCharge + gridExport + conversionLoss + batteryLoss + standbyLoss
```

Three supply terms and six demand terms. The three losses stay separate because each has one owner and one measurement point: `conversionLoss` is the DC energy the inverter consumed beyond what it delivered, `batteryLoss` is the energy lost inside the battery, and `standbyLoss` is the inverter's own draw from the bus. Folding them into one number would let a battery's inefficiency be reported as the inverter's, which is exactly the attribution an energy study exists to get right.

*The sign convention.* Every term is a non-negative magnitude and the direction is in the name. Supply terms enter the site; demand terms leave it. A reversed flow changes its term, not its sign: there is no `-gridExport`, there is `gridImport`. The residual is the only signed number — `balanceStep` returns it as a plain `number`, positive for a surplus — and it is deliberately not a `WattHours`, because it is not an energy magnitude. The ledger refuses a negative magnitude, a missing or unknown term and a non-finite value; the message for a negative magnitude says that a reversed flow changes the term, not the sign.

*The tolerance.* `BALANCE_TOLERANCE_WH = 1e-6` Wh, absolute and inclusive. Nine double-precision sums at magnitudes up to 1e5 Wh carry a rounding error near 1e-10 Wh, so the tolerance leaves four orders of headroom; it is also four orders below the smallest term a shipped scenario can produce — 1 W over a 5-minute step is 0.083 Wh — so a real leak cannot hide inside it. AC-01 allows 1e-6 kWh (1e-3 Wh) per step and 1e-4 kWh per day, so this bound is a thousand times tighter and a 288-step day at 1e-6 Wh sums to 2.88e-7 kWh, clearing both thresholds with margin. `assertBalanced` throws a `BalanceError` carrying the step index, both totals, the residual and the tolerance, and the caller names the instant from its own grid.

*The proof.* `scripts/check-balance.mjs` settles 1224 steps — the three shipped scenarios (576), one Tunis day at 5, 15, 30 and 60 minutes (456) and both Paris daylight-saving days (192) — under eight distinct reference shapes, six grid-connected and three off-grid, with one shape name shared. Every magnitude is a fraction of the scenario's own declared limits and every conversion and battery loss is computed from the shipped efficiencies, so the residual measures arithmetic rather than a chosen correction; the largest observed is 2.27e-13 Wh. Ten broken ledgers — one watt-hour short, one long, a negative magnitude, a non-finite value, a missing term, an unknown term, a residual beyond the tolerance, two impossible inverter efficiencies and a fractional step index — are each refused. `packages/engine/src/balance/balance.test.ts` repeats the proof in Vitest, including three properties, one of which derives the eighth term of a randomly generated step.

**Alternatives rejected.** One signed equation with inflows positive and outflows negative — two errors of opposite sign cancel, and the residual cannot say which side is wrong. A single net-energy number per step — it cannot be attributed to a component, and the report's energy study needs the split. Folding all losses into one term — the inverter, the battery and the standby draw are owned by different phases and checked by different tests; one term would let any of them absorb another's error. Deriving a loss as the residual — that makes the identity true by construction and proves nothing, so every loss is computed from a declared efficiency instead. A relative tolerance — every input is arithmetic on values the scenario already fixed, so a relative bound claims a precision the inputs do not have, and it collapses towards zero on a quiet step where the absolute error does not. Zero tolerance — nine floating-point sums do not close exactly, and a check that fails on 1e-16 would be turned off rather than fixed. Reusing `WattHours` for the residual — a signed difference is not a magnitude, and the brand would invite it into an addition. Checking only the hand-computed step — it proves the function, not the time grid, the scenario limits or the daylight-saving days. One signed grid term — the meter reports a direction, and the import and export limits are configured separately.

**Consequences.** The engine exports 100 names, nine more than after 02.2; `docs/api.md` records each one. The suite runs 65 tests, twelve of them over the ledger. `npm run check` is twelve commands, with `check-balance` between `check-units` and `check-docs`. Checks are numbered in this log by the size of the set they produce, so this one is the twelfth, while the documents that list the chain number the twelve by position. [The energy balance](energy-balance.md) carries the convention, the term table and the worked steps. From 02.4 each component reports its own terms and the same `assertBalanced` call runs on their output; the ledger does not change when the physics arrives. Curtailment is deliberately absent, so an off-grid PV model that over-produces fails the balance instead of silently dumping energy; adding it is a new term and a new decision. The engine still performs no physics, so AC-01 and the step rate of AC-18 remain open.

**Revisit if** a component needs a flow the nine terms cannot express — curtailment, a second inverter, thermal losses — if a scenario's magnitudes make an absolute tolerance too coarse or too fine, or if a loss can no longer be computed from a declared efficiency and would have to be measured.

## DEC-040 · Dar Chams product name and adopted visual identity

**Context.** The product's working name and first visual system were Helios. The supplied Dar Chams charter and roadmap offer a culturally grounded Tunisian name, a consistent doorway-and-sun mark, a role-based 24-token palette with light and dark values, Arabic support, clearer energy semantics, and additional modeling and coursework detail. The comparison supplied with them explicitly calls for keeping the tested engineering spine and architecture while adopting the stronger identity and grafting useful model content into the existing phases.

**Decision.** The product is named **Dar Chams** (دار شمس) in the interface and current product statements. The supplied charter is authoritative for the name, mark, visual tokens, typography and interface rules. The brand is rendered in Latin letters with the Arabic form as a secondary line where space allows. Saffron denotes production only; energy types, statuses and data sources keep their defined non-colour cues. Preserve the repository name, `@helios/engine`, engine identity, internal storage keys, version history, prior decision records, requirements and signed acceptance structure. Retain the existing expanded, task-by-task engineering roadmap as the schedule; keep the supplied Dar Chams roadmap and charter as reviewed source material, and map their useful additions through `docs/roadmap-adoption.md` into the existing phase gates. Candidate numbers and formulae in those references are proposals until accepted through the existing requirements and decision process.

**Alternatives rejected.** Rename the repository, npm workspace and engine package — these are established technical interfaces with imports, lockfile entries and documentation, and the reference explicitly says to keep the engineering spine. Replace the detailed signed project plan wholesale with the shorter supplied roadmap — it would discard validated requirements, evidence, task IDs and gates. Treat every candidate threshold or model formula as already approved — a reference proposal is not acceptance evidence. Keep Helios as the visible product name — it would fail to adopt the requested identity and make the charter internally contradictory.

**Consequences.** The header, metadata, favicon, overview, product statements and active identity documentation use Dar Chams; the brand mark and palette are implemented in the application and `check-docs` audits their correspondence. The existing package scope, repository URL, engine manifest, scenario data, signed acceptance checklist and digest, acceptance thresholds, physics claim gate, static/offline architecture, and historical decision wording remain intact. The signed checklist retains the former working name in its claim-gate row; the same prohibition applies to Dar Chams. Phase 02.3 remains complete; new physical-model detail remains planned until its phase evidence exists.

**Revisit if** a repository/package rename becomes a deliberate migration, if an adopted model addition changes a requirement or acceptance threshold, or if measured accessibility work shows the charter's token pairings need revision.

## DEC-041 · Rename the repository and all current project identifiers to Dar Chams

**Context.** DEC-040 adopted Dar Chams for the visible product while retaining the Helios repository, package names, engine identifier and settings key. The owner has since renamed the GitHub repository to Dar Chams and asked for the same name throughout the project. The old identifiers now disagree with the repository users clone and the active product identity.

**Decision.** Use `Dar-Chams` as the GitHub repository slug and URL, `dar-chams` as the root npm package name, `@dar-chams/engine` as the workspace package, `dar-chams-engine` as the engine identity in new run manifests, `dar-chams.settings.v1` as the settings storage key, and `dar-chams/{site_id}/{device_id}/...` as the example telemetry namespace. Rename the two older roadmap files to `Dar_Chams_Roadmap_and_Graphic_Charter*.html`. Update current docs, scripts, configuration, imports, lockfile and links to these identifiers. Keep the existing architecture, data contracts, requirements, acceptance thresholds, and provenance policy. Preserve prior decision bodies and the signed checklist as historical records; the checklist's Helios claim-gate wording continues to mean this project and its simulation-only constraint.

**Alternatives rejected.** Keep the old technical identifiers while only renaming the GitHub repository — it leaves fresh clones with inconsistent workspace imports, run metadata and storage keys. Rewrite earlier decision entries or the signed acceptance document — both are append-only or author-bound records; a new decision and this note preserve their meaning without falsifying their history. Change scenario IDs or metric identifiers — these describe stable domain data, not the repository brand, and changing them would break reproducibility without benefit.

**Consequences.** A fresh `npm ci` links the renamed workspace and uses the renamed root package. New engine manifests, settings records and telemetry examples use Dar Chams identifiers; the signed checklist and earlier decisions retain their original text. The public repository links point to `https://github.com/Shawarma-Frikz/Dar-Chams`. Historical experiments are identified by the recorded engine version, while the current engine reports `dar-chams-engine`. Existing stored preferences under the old key are not used by the current application; if persisted settings ship before this rename, a one-time migration should be added before releasing the new key.

**Revisit if** the GitHub owner or repository slug changes, if a persisted user-settings release introduces data under the old key, or if an external telemetry consumer has already depended on the former topic prefix.

## DEC-042 · Typed UI-free ports between the engine and simulation components

**Context.** Task 02.4 requires typed inputs and outputs for PV, inverter, battery, appliance, grid, weather, scheduler and simulation clock, and its completion condition is a headless engine test. The engine is shared by Node tests, browser execution and batch experiments (DEC-002). Giving components the whole application store would couple model code to presentation state and let a controller inspect world state it should only observe through a declared boundary (FR-SIM-08).

**Decision.** Define separate input/output ports for the seven simulation models and an explicit lifecycle interface for the clock. Physical and policy models are synchronous typed transformations over one step and canonical quantities; weather I/O is isolated behind an asynchronous `WeatherSource`. The scheduler receives a limited `SchedulerObservation`, not `Scenario` or UI state. The clock contract is declared in 02.4; its lifecycle, speed control and deterministic replay behavior are implemented in 02.5. Port definitions do not imply that physical models exist.

**Alternatives rejected.** Pass the full `Scenario` and application state to every component — this exposes unrelated and hidden state and makes UI coupling easy. Use generic records of `number` — this discards the W, Wh, Celsius and SOC distinctions established in 02.2. Implement clock behavior as part of 02.4 — it folds the next roadmap task into this boundary task before the contracts are reviewed. Import React or Three.js types for future visualization needs — the engine must remain executable in plain Node.

**Consequences.** `packages/engine/src/simulation/interfaces.ts` and the public barrel define the ports; `docs/api.md` records their contract. ESLint blocks React, Next.js, Three.js and application imports from the engine. A Node test imports and advances the public entry without browser globals and compiles inert implementations of all eight component groups. The canonical ledger remains the conservation gate for future model outputs. No new physics, clock implementation, metric claim or acceptance threshold is introduced.

**Revisit if** a physical model demonstrates that a required input or diagnostic is missing, or a component contract needs to cross a persistence or worker boundary.

## DEC-043 · Fixed-step simulation clock and versioned seeded random stream

**Context.** Task 02.5 requires start, pause, resume, reset, speed multiplier, step-forward and deterministic replay from a scenario seed. FR-SIM-05 requires identical interval values and ordered events for the same scenario and seed; FR-SIM-09 requires 1×, 60× and maximum speed to preserve fixed-step results. The engine must remain usable in Node, in a browser worker and in batch runs without wall-clock dependence (DEC-002, DEC-012).

**Decision.** Implement an explicit lifecycle clock over the scenario's existing `StepGrid`. It advances only when asked for a step; start, pause and resume change status but do not consult timers or mutate the grid. Manual step-forward is allowed while idle or paused and leaves the clock paused; finishing the last step sets `complete`. Reset rewinds the cursor, restores the scenario's default rate and initializes the seeded stream. Playback rates are finite values from 1× through a configurable maximum, defaulting to 1000×; they are host pacing hints and never alter step duration, ordering or random draws. Use SplitMix64 with the scenario seed, emitting the high 53 bits as a `[0,1)` number; this algorithm and its test vector are part of the engine contract. Seeds must be non-negative safe integers.

**Alternatives rejected.** Drive advancement from `setInterval` inside the engine — wall-clock delays and tab throttling would make tests and replay platform-dependent. Change the timestep at high speed — it changes outputs and violates fixed-step semantics. Use `Math.random()` — it has hidden global state and cannot be replayed. Use a browser-only crypto source — it cannot run headlessly and is intentionally nondeterministic. Permit ambiguous seed numbers beyond the safe integer range — distinct JSON seeds could already have rounded to the same JavaScript number.

**Consequences.** `createSimulationClock` provides the lifecycle, fixed-step cursor, playback-speed validation and resettable SplitMix64 stream. Tests freeze a seed-42 vector, verify reset, exercise invalid transitions, and compare identical ordered steps and random events at 1×, 60× and 1000×. The clock does not yet produce physical interval metrics; those require the models in later phases. Simulation coordinators must consume random draws in a stable order, and future component-specific streams may be introduced by a new decision if order-independent parallelism becomes necessary.

**Revisit if** requirements choose a different playback maximum, simulations need deterministic parallel streams per component, or a clock consumer requires asynchronous scheduling inside the engine.

## DEC-044 · Typed simulation events with deterministic IDs and ordered append-only journal

**Context.** Task 02.6 defines event records for appliance start/stop, state-of-charge threshold crossings, grid outage/return, forecast updates, inverter limits and optimization actions. FR-SIM-06 requires every transition event to include a timestamp, source, stable entity identifier, previous state, next state and payload. FR-SIM-05 makes the event sequence part of deterministic replay, so IDs and ordering cannot depend on wall time, random draws or a UI store.

**Decision.** Use a discriminated `SimulationEventInput` union with a typed payload and literal source family for each event kind. `createEventJournal(scenarioId, seed)` appends in causal order, validates non-empty entity IDs, actual state changes, monotonic timestamps and step indices, and domain constraints for threshold crossings, forecast horizons and inverter values. It adds a zero-based sequence and an ID of the form `dc-event-v1:<encoded-scenario-id>:<seed>:<padded-sequence>`. It clones and deep-freezes each record and returns immutable append-order snapshots. The run key and append order are the complete ID inputs; same scenario, seed and event order therefore replay to the same IDs.

**Alternatives rejected.** Generate IDs from wall-clock timestamps or random UUIDs — both differ on replay. Hash arbitrary payload JSON — key order, numeric formatting and payload evolution would become accidental identity rules. Store only free-form event names and records — consumers could omit state fields or mislabel their source, and a documentation-only contract would not enforce the acceptance shape. Sort events after creation — this would hide a causal ordering error and could change event sequences across consumers.

**Consequences.** `SimulationEvent` records have stable IDs, explicit sequence numbers and all FR-SIM-06 fields. The journal rejects out-of-order timestamps/steps rather than reordering them, and cloned records cannot be mutated after append. Headless tests cover all eight roadmap event variants, deterministic IDs across replays, differing run identities, payload immutability and malformed transitions. The journal is an engine boundary; no persistence, UI timeline or physical-model event producer is implied yet.

**Revisit if** parallel simulation requires deterministic event merging, a persisted event format needs schema versioning, or an accepted event kind needs to span multiple state machines.

