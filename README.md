# Helios

**A simulation-first residential solar microgrid and energy-management digital twin.**

> Helios is a simulation-first residential solar microgrid and energy-management digital twin. It models a virtual installation — photovoltaic array, battery storage, grid connection and a configurable household — inside a deterministic TypeScript engine, then compares a transparent rule-based controller against a forecast-aware scheduler that predicts generation and demand, coordinates flexible loads, protects battery reserve and explains every decision. The first release runs entirely in a browser against simulated telemetry and public weather data; no physical plant is monitored or controlled. Physical ESP32 and sensor integration is a later extension that must connect through the same observation and actuation contracts without rewriting the energy-management rules.

This paragraph is canonical. It is repeated verbatim in [`docs/00-scope-brief.md`](docs/00-scope-brief.md) §1 and [`docs/report/01-product-statement.md`](docs/report/01-product-statement.md). It must never claim that a real installation is being controlled.

## Status

- **Phase 00 — project definition: complete.** Scope brief, requirements register, decision log, provenance contract, acceptance checklist and three validated scenarios are in `docs/` and `scenarios/`.
- **Phases 01–11: planned.** See [`Helios_Roadmap_and_Graphic_Charter.html`](Helios_Roadmap_and_Graphic_Charter.html).
- No application code yet. CI and the project scaffold arrive in phase 01.

## What this is

- A configurable virtual installation: PV array, inverter, battery, grid connection and a household of individually modelled appliances.
- A deterministic energy engine whose runs are reproducible from a scenario, a seed and a data set.
- Two controllers compared on identical inputs: a rule-based baseline and a forecast-aware scheduler.
- An inspectable interface: 2D system map, 3D cutaway twin, energy charts, decision and alert timeline.
- A validation harness: PV yield benchmarked against PVGIS, forecasts scored against naïve baselines, policies compared on paired runs and against a perfect-foresight upper bound.

## What this is not

- **Not a controller for a real installation.** No physical plant is monitored or actuated in v1.
- **Not a metered energy audit.** Every value is simulated, estimated, forecast or derived, and is labelled as such.
- **Not a hardware project yet.** ESP32 and sensor integration is a later milestone behind an adapter.
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
│   ├── data-provenance.md
│   ├── decision-log.md
│   ├── requirements.md
│   └── report/
│       └── 01-product-statement.md
├── scenarios/
│   ├── README.md               Scenario contract, conventions, tariff policy
│   ├── scenario.schema.json    JSON Schema for every scenario
│   ├── tunis-typical-v1.json   Default simulation scenario
│   ├── tunis-offgrid-v1.json   Off-grid autonomy variant
│   └── tunis-dust-v1.json      Heavy-soiling variant
├── scripts/
│   └── validate-scenarios.mjs  Schema-independent invariant checks
├── Helios_Roadmap_and_Graphic_Charter.html
└── README.md
```

Scenario files validate with `node scripts/validate-scenarios.mjs`.

## Documentation

| Document | Contents |
| --- | --- |
| [Scope brief](docs/00-scope-brief.md) | Product statement, operating scenario, MVP boundary, non-goals, assumptions, risks |
| [Requirements register](docs/requirements.md) | Functional and non-functional requirements with priority, verification method and phase |
| [Decision log](docs/decision-log.md) | Architecture decisions with rejected alternatives and consequences |
| [Data provenance](docs/data-provenance.md) | Value classes, UI labelling rules, metric register |
| [Acceptance checklist](docs/acceptance-checklist.md) | Success criteria with numeric thresholds, decision gates, sign-off |
| [Report · product statement](docs/report/01-product-statement.md) | Canonical paragraph for the final report |
| [Scenario conventions](scenarios/README.md) | Schema contract, field groups, units, seeds, variants, tariff policy |

## Design

The visual identity (palette, typography, motif, interface rules) is defined in the graphic charter inside the roadmap HTML. Headline colours: Basalt `#202B2A`, Limestone `#E9E3D5`, Oxide `#B86B45`, Sage `#8A9B83`. Typography: Literata for headings and large metrics, DM Sans for interface text, DM Mono for units, timestamps and identifiers.

## License

Not yet chosen; decided in phase 01.1 together with the repository conventions.
