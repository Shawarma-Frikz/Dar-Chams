# Documentation system

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-16 |
| Phase | 01 (task 01.6) |
| Decided by | DEC-035; commit vocabulary from DEC-030 |
| Checked by | `node scripts/check-docs.mjs`, or `npm run check` for all nine checks |
| Related | [Conventions](conventions.md) §3, §7 · [API notes](api.md) · [Data dictionary](data-dictionary.md) · [Experiment log](experiment-log.md) · [Changelog](../CHANGELOG.md) |

Task 01.6 asks for architecture decision records, module READMEs, API notes, a data dictionary,
an experiment log and a changelog. This document says where each one lives, which document is
authoritative for what, and how the repository keeps them from drifting. The rule behind all of
it is the one used since phase 00: a claim that can be checked by a machine is checked, and a
document that cannot be checked states what it is authoritative for instead.

---

## 1 · The document map

One document has one job. When two documents could answer the same question, the table names the
authority; the other one links to it rather than restating it.

| Document | Job | Authority for | Checked by |
| --- | --- | --- | --- |
| [`README.md`](../README.md) | Entry point: what Helios is, what runs, how to run it | Product statement, quick start, command list | `check-docs` |
| [`CHANGELOG.md`](../CHANGELOG.md) | Released changes per phase | What changed and when | `check-docs` |
| [`docs/00-scope-brief.md`](00-scope-brief.md) | Scope, operating scenario, MVP boundary, non-goals, risks | What is in scope | `check-acceptance`, `check-requirements` references |
| [`docs/requirements.md`](requirements.md) | FR, NFR, constraints and external dependencies | What must be built and how it is verified | `check-requirements` |
| [`docs/decision-log.md`](decision-log.md) | Architecture decision records (ADRs) | Why each major choice was made | `check-decisions`; citations by `check-docs` |
| [`docs/data-provenance.md`](data-provenance.md) | Provenance classes, claim gate and generated metric tables | What a displayed number means | `check-provenance` |
| [`docs/acceptance-checklist.md`](acceptance-checklist.md) | Signed success criteria with thresholds | Whether a phase is done | `check-acceptance` |
| [`docs/configuration.md`](configuration.md) | The four configuration layers | Where a configuration value lives | `check-config`; existence by `check-docs` |
| [`docs/conventions.md`](conventions.md) | Licence, branches, commits, evidence policy, checks | How the repository is kept | `check-docs` |
| [`docs/quality-gates.md`](quality-gates.md) | Gates, CI job, demonstrated failure path | How a build turns red | `check-ci`; existence by `check-docs` |
| [`docs/runtime-support.md`](runtime-support.md) | Pinned runtime, browsers, hardware, budgets | What the toolchain is | `check-runtime` |
| [`docs/documentation.md`](documentation.md) | This system: map, formats, checks | Which document is authoritative | `check-docs` |
| [`docs/api.md`](api.md) | Public surfaces of the engine and the configuration modules | Signatures and contracts | `check-docs` |
| [`docs/data-dictionary.md`](data-dictionary.md) | Every path in the scenario contract | Field meaning, type, constraint and unit | `check-docs` (generated table) |
| [`docs/experiment-log.md`](experiment-log.md) | One record per experiment | What was asked, with what inputs, and what happened | `check-docs` |
| [`docs/report/01-product-statement.md`](report/01-product-statement.md) | Canonical paragraph for the final report | Report seed | `check-acceptance` |
| [`scenarios/README.md`](../scenarios/README.md) | Scenario contract, variants, authoring rules | How to write a scenario | `check-docs` |
| [`packages/engine/README.md`](../packages/engine/README.md) | Engine module | Engine purpose, inputs, outputs and tests | `check-docs` |
| [`src/app/README.md`](../src/app/README.md) | Route shell | Application routes and export | `check-docs` |
| [`src/components/README.md`](../src/components/README.md) | Presentational components | Component contracts | `check-docs` |
| [`src/lib/config/README.md`](../src/lib/config/README.md) | Configuration layers in the application | Resolution, settings and runtime state | `check-docs` |
| [`scripts/README.md`](../scripts/README.md) | The checker suite | What each script proves | `check-docs` |

`check-docs` fails if a top-level document, a module README, `README.md` or `CHANGELOG.md` is missing
from this table, or if a script in `scripts/` has no row in `scripts/README.md`. A new document
therefore starts with a row here, not with a link nobody follows.

## 2 · Architecture decision records

The decision log is the ADR register. It is not split into one file per decision: a single
append-only log keeps the index, the status and the numbering in one place, and
`check-decisions.mjs` already enforces the index/body correspondence, the status vocabulary,
resolved references and rejected alternatives on every entry.

**When an entry is required.** A choice that constrains later work, that rejects a reasonable
alternative, or whose reversal would be expensive. A changed decision is a new entry that
supersedes the old one; a published entry is never edited.

**Entry format.** Every entry follows this shape, in the log's own order:

```text
## DEC-nnn · Title

**Context.** The situation that forced a choice.

**Decision.** What is now true, in the present tense.

**Alternatives rejected.** Each alternative and why it lost.

**Consequences.** What follows, including the cost and the check that now enforces it.

**Revisit if** The condition that would reopen the decision.
```

`check-decisions.mjs` requires `Decision`, `Alternatives rejected` and `Consequences`. `Context` and
`Revisit if` are part of the convention and are reviewed by hand. The index row carries the ID, a
one-line decision, a status (`Accepted`, `Superseded`, `Rejected`) and an ISO date.

**Citations.** A module README names at least one accepted decision that constrains it, and every
`DEC-nnn` cited there must exist. That is how a reader moves from a file to the reason it is shaped
that way without a separate mapping table.

## 3 · Module READMEs

A major module has a README with four required `##` sections. They answer four questions and
nothing else; the detail belongs in a document named in the map.

| Section | It answers | It must not contain |
| --- | --- | --- |
| `## Purpose` | What the module is responsible for, and what it is not | A tour of every file |
| `## Inputs` | The files, props, configuration and events it reads | The output shape |
| `## Outputs` | The exports, routes, files or exit codes it produces | Test instructions |
| `## Tests` | The exact commands that exercise it, what they cover, and what is not covered | A claim that "it works" |

The `## Tests` section must name at least one runnable command. `check-docs` accepts `npm run <script>`
only when the script exists in `package.json`, and `node <path>` only when the file exists, so a
README cannot document a command that was removed.

The six modules are `packages/engine`, `src/app`, `src/components`, `src/lib/config`, `scripts` and
`scenarios`. Adding a module means writing its README, adding it to `MODULES` in
`scripts/check-docs.mjs`, and adding a row to §1. The README is kept short — roughly 60 lines —
because a long module README becomes a second, unchecked copy of the design documents.

## 4 · API notes

The public surface is what another module may import. Everything else is internal and carries no
promise.

- **Engine.** [`packages/engine/src/index.ts`](../packages/engine/src/index.ts) is the complete public
  surface of `@helios/engine`. [`docs/api.md`](api.md) documents every export it declares — constants,
  classes, functions and types — with the contract each one carries. `check-docs` extracts the
  export names from the source and compares them with the table in both directions: an undocumented
  export fails, and a documented name that no longer exists fails.
- **Application configuration.** The modules in `src/lib/config/` and `src/lib/routes.ts` are the
  application-level API: the layers, their loaders, the resolved shape and the route registry.
  The second table in `docs/api.md` is checked the same way.
- **Changing a surface.** Add or remove the export and its API row in the same commit. A signature
  change that alters a meaning needs a decision-log entry, not only a row edit.

The API notes state intent; they are not a generated TypeScript reference. A generated reference
would list every helper and every property while saying nothing about which parts a caller may rely
on, which is the question the document exists to answer.

## 5 · Data dictionary

[`scenarios/scenario.schema.json`](../scenarios/scenario.schema.json) is the source of the data
dictionary. The table in [`docs/data-dictionary.md`](data-dictionary.md) is generated from it by
`scripts/check-docs.mjs --write`, one row per contract path, with the type, the constraints, whether
the field is required and the unit its name carries.

- Do not edit the generated block by hand. Edit the schema, run the command, and review the diff.
- The narrative around the table — the meaning of the field groups, the conditional rules and the
  units policy — is written by hand and reviewed with the schema.
- `check-docs` regenerates the table in memory and compares it byte for byte, so a schema edit
  without a dictionary refresh fails `npm run check`.
- Adding a path is a schema change first: the engine interface, the unit audit and the dictionary
  follow in the same commit (DEC-033, §6 of [configuration](configuration.md)).

## 6 · Experiment log

[`docs/experiment-log.md`](experiment-log.md) is the committed record of what was asked of the
engine and what came back. The run output is regenerable from a scenario, a seed and an engine
version (AC-02), so it stays untracked ([conventions](conventions.md) §4); the record, the manifest
path and the result are what enter Git.

Every entry is `## EXP-nnn · Title` followed by these fields, in this order:

| Field | Value |
| --- | --- |
| `Date` | ISO date the experiment was run |
| `Question` | One sentence the run answers |
| `Hypothesis` | What was expected before seeing the result |
| `Scenario` | The scenario file, which must exist |
| `Seed` | The integer seed from that file |
| `Engine` | `helios-engine` and the version from the run manifest |
| `Metrics` | The registered `MET-nn` identifiers reported |
| `Result` | The measured outcome, including a negative one |
| `Artefact` | The untracked manifest or report path |
| `Decision` | The decision entry the result informs, or `none` |

Rules: the question and hypothesis are written before the run; IDs are sequential and never
reused; a negative result is recorded, not deleted; and a threshold is never changed after seeing
the result (task 11.1). The document carries a template in a fenced block and zero records at
phase 01. `check-docs` verifies the header count, the field set on every record, the scenario
path, the integer seed, the metric and decision references, and it exercises its own parser
against the template.

## 7 · Changelog

[`CHANGELOG.md`](../CHANGELOG.md) follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

- **Version equals phase gate.** `0.<phase>` is tagged after a phase is accepted
  ([conventions](conventions.md) §2): `0.0.0` is phase 00, `0.1.0` is phase 01, `v1.0.0` is the
  phase-16 release. Pre-1.0, the minor number names the phase and the patch number is reserved for
  a fix between phases.
- **Categories.** `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. A release
  section has at least one category and at least one bullet.
- **How it is written.** Drafted from the Conventional Commit types (DEC-030) and the decision log,
  then reviewed by hand. It is not generated: history before 2026-11-16 does not use the convention,
  and a generated list would record file changes rather than the decisions a reader needs.
- **`[Unreleased]`** comes first and says `Nothing yet.` when there is nothing. Each release heading
  carries an ISO date, and the link definitions point at the repository declared in `package.json`.
- `check-docs` verifies that the `package.json` version has a released heading, that releases descend
  in version order, that each has content, and that the links resolve to the declared repository.

## 8 · Writing rules

- English, per DEC-020; identifiers stay in their own vocabulary — `FR-…`, `NFR-…`, `CON-…`, `EX-…`,
  `AC-…`, `DEC-…`, `MET-…`.
- Links are relative inside the repository, so the tree works from a clean clone and from the
  exported static site.
- Values that a checker can derive are not restated by hand. When a count is unavoidable in prose,
  `check-docs` or another checker compares it with its source.
- `docs/`, `scenarios/` and `metric-register.json` are evidence: Prettier does not reflow them, and
  the signed checklist is never edited without renewing its digest ([conventions](conventions.md) §5,
  §6).
- The canonical product paragraph lives in the README, the scope brief and the report statement and
  is copied verbatim; a change to it is a change to all three.
- Each register carries a version, a date and the phase that last changed it, so a reader can tell
  which statement was true when.

## 9 · The check

```text
npm run check:docs
```

`scripts/check-docs.mjs` is the ninth register check. On every run it verifies:

| Area | What must hold |
| --- | --- |
| Modules | Six READMEs exist; each has non-empty `Purpose`, `Inputs`, `Outputs` and `Tests`; every test command is runnable; every cited decision exists and is accepted |
| API | The engine and configuration export tables equal the exports in the sources, with no phantom rows |
| Dictionary | The generated table equals a fresh walk of `scenario.schema.json` |
| Experiments | The header count matches the records; every record has all ten fields; scenarios, metrics and decisions resolve |
| Changelog | The package version is released; versions descend; every release has content; link definitions match the repository |
| Map | Every document and every script is named in the map or in `scripts/README.md` |
| Self-proof | Seven deliberately broken copies — a missing section, a missing export row, a stale dictionary row, a changelog without the package version, a record without a seed, an unresolved decision and an orphaned document — are each reported |

The last row is the point of the exercise: a check that cannot fail proves nothing, so the checker
demonstrates its own failure path in the same run. The report names the counts it verified rather
than an unqualified "OK".

**What this does not cover.** Prose quality, external link availability, and whether a statement
still matches the code when no machine-readable invariant connects them. Those are review
responsibilities; the checker guards the contracts that can be made mechanical.
