# Helios

**A simulation-first residential solar microgrid and energy-management digital twin.**

> Helios is a simulation-first residential solar microgrid and energy-management digital twin. It models a virtual installation — photovoltaic array, battery storage, grid connection and a configurable household — inside a deterministic TypeScript engine, then compares a transparent rule-based controller against a forecast-aware scheduler that predicts generation and demand, coordinates flexible loads, protects battery reserve and explains every decision. The first release runs entirely in a browser against simulated telemetry and public weather data; no physical plant is monitored or controlled. Physical ESP32 and sensor integration is a later extension that must connect through the same observation and actuation contracts without rewriting the energy-management rules.

This paragraph is canonical. It is repeated verbatim in [`docs/00-scope-brief.md`](docs/00-scope-brief.md) §1 and [`docs/report/01-product-statement.md`](docs/report/01-product-statement.md). It must never claim that a real installation is being controlled.

## Status

- **Phase 00 — project definition: complete.** Scope brief, requirements register (85 FR, 11 NFR, 14 constraints, 10 external dependencies), decision log, simulation-truth contract with a 97-metric register, signed acceptance checklist (37 criteria) and three validated scenarios are in `docs/` and `scenarios/`.
- **Embedded track admitted 2026-11-16** (DEC-026): a simulated ESP32 with reading sensors, Wokwi circuit and MQTT telemetry into the same application, scheduled as phases 12–16.
- **Phases 02–16: planned.** See [`Helios_Roadmap_and_Graphic_Charter_v2_Embedded.html`](Helios_Roadmap_and_Graphic_Charter_v2_Embedded.html); the original 12-phase chart is kept for history.
- **Phase 01 — toolchain and scaffold: complete.** Task 01.1 is complete: MIT licence (DEC-029), ignore and editor rules, and branch and commit conventions (DEC-030). Task 01.2 is complete: Node 26.13.1 and npm 11.20.0 pinned with `engine-strict`, exact versions, a committed lockfile and a recorded browser/hardware baseline (DEC-031; the version line corrected by DEC-036 after Node 26.2.0 was found to bundle npm 11.13.0). Task 01.3 is complete: a six-route Next.js 16 shell with a static export, strict TypeScript, ESLint and Prettier, and the `@helios/engine` workspace package that keeps simulation out of the interface (DEC-032). Task 01.4 is complete: four configuration layers with distinct failure policies, an Ajv-validated scenario contract with relational invariants and unit auditing, and a startup that refuses an invalid scenario with a field, a value and a fix (DEC-033). Task 01.5 is complete: six quality gates, 22 unit and property tests, an aggregate `verify` that ends in the production build, and a CI workflow on Linux and Windows that `check-ci` holds to the same gate list (DEC-034). Task 01.6 is complete: a documentation convention that turns six module READMEs, API notes, a generated data dictionary, an experiment log and a changelog into checked artefacts, with `check-docs` bringing the register checks to nine (DEC-035).
- No simulation code yet, and therefore no metric: the shell names what each route will contain and displays no value until its source exists (NFR-07). The engine's first model arrives in phase 02.

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
| Application | Next.js 16 App Router + React 19 + TypeScript 5.9 (strict) |
| Styling | Tailwind CSS 4, with the graphic-charter palette as `@theme` tokens; shadcn/ui used selectively |
| Simulation engine | TypeScript, headless-capable, runs in a Web Worker in the browser |
| Configuration | JSON Schema 2020-12 validated by Ajv 8.20.0 inside the engine; defaults, scenario, settings and runtime state kept as separate layers |
| 3D twin | Three.js via React Three Fiber + Drei; 2D map as the authoritative fallback |
| Charts | Recharts, fed from stored run records |
| Solar position | SunCalc (or a validated equivalent) |
| Weather | Open-Meteo forecast + ERA5 archive, cached, synthetic fallback |
| ML experiments | Python + scikit-learn (Colab), exported to ONNX, run with onnxruntime-web |
| Embedded node | ESP32 DevKit v1 firmware built with PlatformIO, simulated in Wokwi for VS Code |
| Telemetry | MQTT over a free public broker for synthetic data, local Mosquitto for the bench, validated by a Node adapter |
| Persistence | IndexedDB, local-first |
| Tests | Vitest 5 + fast-check 4, unit and property tests over the TypeScript sources; Playwright from phase 08 |
| CI | GitHub Actions on `ubuntu-latest` and `windows-latest`; Node from `.nvmrc`, `npm ci`, one step per gate |
| Hosting | Vercel Hobby or static-compatible hosting |

Rationale and rejected alternatives: [`docs/decision-log.md`](docs/decision-log.md).

## Runtime and support

| Requirement | Value |
| --- | --- |
| Node | 26.13.1 (Active LTS "Lithium"), `engines` `>=26.0.0 <27`, pinned in [`.nvmrc`](.nvmrc) |
| npm | 11.20.0 exactly, the npm bundled with Node 26.13.1, declared in `packageManager`; `.npmrc` enforces `engine-strict` and exact versions |
| Install | `npm ci` from the committed lockfile; a wrong Node line is refused with `EBADENGINE` |
| Checks | `npm run check` runs nine register checks; `npm run verify` adds type-check, lint, format check, tests and the production build |
| Commands | `npm run dev` (port 3000), `npm run build` (static export in `out/`), `npm run preview` (server for that export, port 4173), `npm run test` (Vitest), `npm run verify` (every gate) |
| Browsers | Chrome/Edge latest two (gated); Firefox, Safari 17.4+ (supported); no WebGL2 falls back to the 2D map |
| Hardware | 4 cores, 8 GB RAM, 1920×1080, WebGL2; minimum 2 cores, 4 GB |

Full baseline, performance budgets and failure messages: [`docs/runtime-support.md`](docs/runtime-support.md).

## Quality gates

Every command runs from the repository root. A clean clone runs the first; CI runs the same six gates on every push to `main` and every pull request, on Linux and Windows.

| Gate | Exact command |
| --- | --- |
| Registers, configuration, documentation and the CI contract | `npm run check` |
| Type-check | `npm run typecheck` |
| Lint | `npm run lint` |
| Format | `npm run format:check` |
| Unit and property tests | `npm run test` |
| Production build | `npm run build` |

`npm run verify` runs those six in that order and stops at the first failure, so a red test, lint error or formatting drift never reaches a build. `npm run test:watch` keeps Vitest open while editing. The workflow lives in [`.github/workflows/ci.yml`](.github/workflows/ci.yml); `node scripts/check-ci.mjs`, part of `npm run check`, proves it uses `npm ci`, the `.nvmrc` Node line, commit-pinned actions and one step per gate. Design, the demonstrated failure path and what is not covered: [`docs/quality-gates.md`](docs/quality-gates.md).

## Repository layout

```text
.
├── docs/                       Phase 00 deliverables and the report seed
│   ├── 00-scope-brief.md
│   ├── acceptance-checklist.md
│   ├── api.md                  Engine and application exports, with their contracts
│   ├── configuration.md        The four layers, startup validation, what the check proves
│   ├── conventions.md          Licence, branches, commits, what enters Git
│   ├── data-dictionary.md      Scenario fields, generated from the schema
│   ├── data-provenance.md      Simulation truth, labelling rules, generated register
│   ├── decision-log.md
│   ├── documentation.md        The documentation contracts and what the checker proves
│   ├── experiment-log.md       Ten-field records, one per question
│   ├── metric-register.json    Every displayable value: class, unit, source, gate
│   ├── quality-gates.md        The six gates, CI, the demonstrated failure path
│   ├── requirements.md
│   ├── runtime-support.md      Pinned runtime, browsers, hardware, budgets
│   └── report/
│       └── 01-product-statement.md
├── .github/
│   └── workflows/
│       └── ci.yml              Six gates on ubuntu-latest and windows-latest
├── embedded/                   Planned: ESP32 firmware, Wokwi circuit, telemetry schema (phases 12–15)
├── packages/
│   └── engine/                 @helios/engine — the simulation boundary, no React or DOM
│       ├── package.json
│       ├── README.md           Purpose, inputs, outputs and tests for the engine module
│       └── src/
│           ├── config/         Validator, invariants, units audit, issue model, tests
│           └── index.ts
├── scenarios/
│   ├── README.md               Scenario contract, conventions, tariff policy
│   ├── scenario.schema.json    JSON Schema for every scenario
│   ├── tunis-typical-v1.json   Default simulation scenario
│   ├── tunis-offgrid-v1.json   Off-grid autonomy variant
│   └── tunis-dust-v1.json      Heavy-soiling variant
├── scripts/
│   ├── check-acceptance.mjs    Signed checklist: targets, references, digest
│   ├── check-ci.mjs            Workflow structure and the gate list it must match
│   ├── check-config.mjs        The four failure classes, units, layer boundaries
│   ├── check-decisions.mjs     Decision log: index/body sync, topics, references
│   ├── check-docs.mjs          Module contracts, API tables, dictionary, log, changelog
│   ├── check-provenance.mjs    Metric register, class rules, generated tables
│   ├── check-requirements.mjs  Register structure, dependencies, wording
│   ├── check-runtime.mjs       Node/npm pins, workspaces, overrides, lockfile
│   ├── README.md               What each script proves and what it may write
│   ├── serve-static.mjs        Serves the static export for `npm run preview`
│   └── validate-scenarios.mjs  Runs the engine validator over every scenario
├── src/
│   ├── app/                    Layout, six routes, palette tokens, icon, 404
│   │   └── README.md           Purpose, inputs, outputs and tests for the route shell
│   ├── components/             Header, navigation, page intro, planned items, references
│   │   └── README.md           Purpose, inputs, outputs and tests for the shared blocks
│   └── lib/
│       ├── config/             Defaults, settings, resolution, runtime state, startup, tests
│       │   └── README.md       Purpose, inputs, outputs and tests for the four layers
│       └── routes.ts           One source for the navigation and the overview index
├── .gitattributes              LF normalisation, binary declarations
├── .gitignore                  Regenerable output out, evidence in
├── .editorconfig               UTF-8, LF, indentation
├── .npmrc                      engine-strict, exact versions, lockfile
├── .nvmrc                      Node 26.13.1
├── .prettierrc.json            Shared formatting, Tailwind class order
├── .vscode/                    Recommended extensions and settings
├── eslint.config.mjs           Flat config, incl. the engine boundary rule
├── next.config.ts              Static export, transpiled engine package
├── postcss.config.mjs          Tailwind CSS 4 PostCSS plugin
├── tsconfig.base.json          Shared strict compiler options
├── tsconfig.json               Application compiler options
├── vitest.config.ts            Test discovery, the @ alias, Node environment
├── package.json                Pinned engines, packageManager, scripts
├── package-lock.json           Lockfile v3, the only supported install path
├── CHANGELOG.md                Releases, one entry per phase gate
├── LICENSE                     MIT
├── Helios_Roadmap_and_Graphic_Charter_v2_Embedded.html
├── Helios_Roadmap_and_Graphic_Charter.html   Superseded 12-phase chart
└── README.md
```

Scenarios validate with `node scripts/validate-scenarios.mjs`, which runs the same engine validator the application uses at startup. `node scripts/check-config.mjs` proves the four failure classes, the unit audit and the layer boundaries. `node scripts/check-ci.mjs` parses the workflow and proves it runs the same gates as `npm run verify`. Both are part of `npm run check`. The metric register and its generated tables are checked with `node scripts/check-provenance.mjs`; `--write` regenerates the tables after a register edit. The signed acceptance checklist — its six task-00.6 targets, cross-document AC references and content digest — is checked with `node scripts/check-acceptance.mjs`. The decision log — index/body sync, rejected alternatives on every entry, the eight task-00.7 topics and DEC/AS/FR reference resolution — is checked with `node scripts/check-decisions.mjs`. The documentation system — six module READMEs with purpose, inputs, outputs and a runnable test command, API tables that match the exports in both directions, the generated data dictionary, the experiment format, the changelog and the document map — is checked with `node scripts/check-docs.mjs`; `--write` regenerates the dictionary after a schema edit. `npm run verify` runs all nine checks, type-check, lint, format check, the unit and property tests, and the production build; CI runs the same six gates on Linux and Windows. The application builds to a self-contained static export in `out/`, fonts included, so the demo opens with the network disabled (NFR-02).

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
| [Configuration](docs/configuration.md) | The four layers, precedence without merging, startup failure, units, what the check proves |
| [Repository conventions](docs/conventions.md) | MIT licence, branch and commit rules, what enters Git, pre-commit checks |
| [Runtime and support](docs/runtime-support.md) | Pinned Node/npm, exact-version and lockfile policy, browser tiers, hardware expectations |
| [Quality gates](docs/quality-gates.md) | The six gates, test coverage, the CI matrix, the demonstrated failure path, what is not covered |
| [Documentation conventions](docs/documentation.md) | The document map, module README contract, API and dictionary rules, experiment log, changelog, what the checker proves |
| [API notes](docs/api.md) | Every export of the engine and of the application configuration surface, with its contract |
| [Data dictionary](docs/data-dictionary.md) | Every scenario field with type, constraints, requirement and unit, generated from the schema |
| [Experiment log](docs/experiment-log.md) | Ten-field records, pre-registered hypotheses, frozen thresholds |
| [Changelog](CHANGELOG.md) | Releases per phase in Keep a Changelog form |

## Design

The visual identity (palette, typography, motif, interface rules) is defined in the graphic charter inside the roadmap HTML. Headline colours: Basalt `#202B2A`, Limestone `#E9E3D5`, Oxide `#B86B45`, Sage `#8A9B83`. Typography: Literata for headings and large metrics, DM Sans for interface text, DM Mono for units, timestamps and identifiers.

## License

MIT — see [`LICENSE`](LICENSE). It covers the code, documentation and the machine-checked artefacts; third-party data and libraries keep their own terms (DEC-029). Repository rules are in [`docs/conventions.md`](docs/conventions.md): Conventional Commits, short-lived branches, and an ignore policy that keeps regenerable output out of Git while evidence stays in (DEC-030).
