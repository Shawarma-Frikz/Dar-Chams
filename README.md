# Helios

**A simulation-first residential solar microgrid and energy-management digital twin.**

> Helios is a simulation-first residential solar microgrid and energy-management digital twin. It models a virtual installation — photovoltaic array, battery storage, grid connection and a configurable household — inside a deterministic TypeScript engine, then compares a transparent rule-based controller against a forecast-aware scheduler that predicts generation and demand, coordinates flexible loads, protects battery reserve and explains every decision. The first release runs entirely in a browser against simulated telemetry and public weather data; no physical plant is monitored or controlled. Physical ESP32 and sensor integration is a later extension that must connect through the same observation and actuation contracts without rewriting the energy-management rules.

This paragraph is canonical. It is repeated verbatim in [`docs/00-scope-brief.md`](docs/00-scope-brief.md) §1 and [`docs/report/01-product-statement.md`](docs/report/01-product-statement.md). It must never claim that a real installation is being controlled.

## Status

- **Phase 00 — project definition: complete.** Scope brief, requirements register (85 FR, 11 NFR, 14 constraints, 10 external dependencies), decision log, simulation-truth contract with a 97-metric register, signed acceptance checklist (37 criteria) and three validated scenarios are in `docs/` and `scenarios/`.
- **Embedded track admitted 2026-11-16** (DEC-026): a simulated ESP32 with reading sensors, Wokwi circuit and MQTT telemetry into the same application, scheduled as phases 12–16.
- **Phases 01–16: planned.** See [`Helios_Roadmap_and_Graphic_Charter_v2_Embedded.html`](Helios_Roadmap_and_Graphic_Charter_v2_Embedded.html); the original 12-phase chart is kept for history.
- No application code yet. CI and the project scaffold arrive in phase 01.

## What this is

- A configurable virtual installation: PV array, inverter, battery, grid connection and a household of individually modelled appliances.
- A deterministic energy engine whose runs are reproducible from a scenario, a seed and a data set.
- Two controllers compared on identical inputs: a rule-based baseline and a forecast-aware scheduler.
- An inspectable interface: 2D system map, 3D cutaway twin, energy charts, decision and alert timeline.
- An embedded sensing node: ESP32 firmware simulated in Wokwi, publishing schematised telemetry through MQTT, with four explicit source modes (Scenario, Wokwi, Physical, Replay).
- A validation harness: PV yield benchmarked against PVGIS, forecasts scored against naïve baselines, policies compared on paired runs and against a perfect-foresight upper bound.

## What this is not

- **Not a controller for a real installation.** No plant is monitored or actuated, and no real load is switched; the embedded node senses and displays.
- **Not a metered energy audit.** Every value describing the installation is simulated, forecast or derived, and is labelled as such. Only three bench channels can ever carry class M, and they describe the room, not the plant.
- **Not a hardware project first.** The ESP32 is simulated before it is built, and the build is a bench node with sensors and an indicator, never plant wiring.
- **Not an "AI dashboard".** Rules are called rules; learned models are kept only if they beat a named baseline.

## Stack

| Layer | Choice |
| --- | --- |
| Application | Next.js + React + TypeScript |
| Styling | Tailwind CSS, shadcn/ui used selectively |
| Simulation engine | TypeScript, headless-capable, runs in a Web Worker in the browser |
| 3D twin | Three.js via React Three Fiber + Drei; 2D map as the authoritative fallback |
| Charts | Recharts, fed from stored run records |
| Solar position | SunCalc (or a validated equivalent) |
| Weather | Open-Meteo forecast + ERA5 archive, cached, synthetic fallback |
| ML experiments | Python + scikit-learn (Colab), exported to ONNX, run with onnxruntime-web |
| Embedded node | ESP32 DevKit v1 firmware built with PlatformIO, simulated in Wokwi for VS Code |
| Telemetry | MQTT over a free public broker for synthetic data, local Mosquitto for the bench, validated by a Node adapter |
| Persistence | IndexedDB, local-first |
| Tests | Vitest + fast-check (property tests) + Playwright |
| Hosting | Vercel Hobby or static-compatible hosting |

Rationale and rejected alternatives: [`docs/decision-log.md`](docs/decision-log.md).

## Repository layout

```text
.
├── docs/                       Phase 00 deliverables and the report seed
│   ├── 00-scope-brief.md
│   ├── acceptance-checklist.md
│   ├── data-provenance.md      Simulation truth, labelling rules, generated register
│   ├── decision-log.md
│   ├── metric-register.json    Every displayable value: class, unit, source, gate
│   ├── requirements.md
│   └── report/
│       └── 01-product-statement.md
├── embedded/                   Planned: ESP32 firmware, Wokwi circuit, telemetry schema (phases 12–15)
├── scenarios/
│   ├── README.md               Scenario contract, conventions, tariff policy
│   ├── scenario.schema.json    JSON Schema for every scenario
│   ├── tunis-typical-v1.json   Default simulation scenario
│   ├── tunis-offgrid-v1.json   Off-grid autonomy variant
│   └── tunis-dust-v1.json      Heavy-soiling variant
├── scripts/
│   ├── check-acceptance.mjs    Signed checklist: targets, references, digest
│   ├── check-decisions.mjs     Decision log: index/body sync, topics, references
│   ├── check-provenance.mjs    Metric register, class rules, generated tables
│   ├── check-requirements.mjs  Register structure, dependencies, wording
│   └── validate-scenarios.mjs  Scenario invariant checks
├── Helios_Roadmap_and_Graphic_Charter_v2_Embedded.html
├── Helios_Roadmap_and_Graphic_Charter.html   Superseded 12-phase chart
└── README.md
```

Scenarios validate with `node scripts/validate-scenarios.mjs`. The metric register and its generated tables are checked with `node scripts/check-provenance.mjs`; `--write` regenerates the tables after a register edit. The signed acceptance checklist — its six task-00.6 targets, cross-document AC references and content digest — is checked with `node scripts/check-acceptance.mjs`. The decision log — index/body sync, rejected alternatives on every entry, the eight task-00.7 topics and DEC/AS/FR reference resolution — is checked with `node scripts/check-decisions.mjs`.

## Documentation

| Document | Contents |
| --- | --- |
| [Scope brief](docs/00-scope-brief.md) | Product statement, operating scenario, MVP boundary, non-goals, assumptions, risks |
| [Requirements register](docs/requirements.md) | Requirements with priority, verification, dependency and phase; constraints; external dependencies |
| [Decision log](docs/decision-log.md) | Architecture decisions with rejected alternatives and consequences |
| [Simulation truth and provenance](docs/data-provenance.md) | Value classes, labelling and claim rules, generated 97-metric register, limits |
| [Acceptance checklist](docs/acceptance-checklist.md) | Success criteria with numeric thresholds, decision gates, sign-off |
| [Report · product statement](docs/report/01-product-statement.md) | Canonical paragraph for the final report |
| [Scenario conventions](scenarios/README.md) | Schema contract, field groups, units, seeds, variants, tariff policy |

## Design

The visual identity (palette, typography, motif, interface rules) is defined in the graphic charter inside the roadmap HTML. Headline colours: Basalt `#202B2A`, Limestone `#E9E3D5`, Oxide `#B86B45`, Sage `#8A9B83`. Typography: Literata for headings and large metrics, DM Sans for interface text, DM Mono for units, timestamps and identifiers.

## License

Not yet chosen; decided in phase 01.1 together with the repository conventions.
