# Checker scripts

| Field | Value |
| --- | --- |
| Version | 0.3.0 |
| Phase | 01 (task 01.6); v0.2.0 adds the phase-02.1 time proof; v0.3.0 adds the phase-02.2 unit proof |
| Runtime | Node 26 type stripping; no checker imports a third-party module, and only `check-units.mjs` runs one, the already-installed TypeScript compiler |
| Checked by | `npm run check` |
| Decisions | DEC-023, DEC-030, DEC-034, DEC-035, DEC-037, DEC-038 |

## Purpose

`scripts/` turns the repository's claims into exit codes. Each checker reads a document, a register
or a source file, asserts the invariants that can be made mechanical, and exits non-zero with a list
of problems. The suite exists because a register that no program reads is prose with a version
number, and because CI can only block a merge on a command that can fail. The scripts are not
application code and are not imported by it; `serve-static.mjs` is the one exception, and it serves
the exported site for a manual preview.

## Inputs

- `package.json` and `package-lock.json` — pins, scripts, overrides, workspace manifests.
- `docs/` — the decision log, requirements, checklist, provenance register and documentation set.
- `scenarios/` — the schema and every scenario file, read through the engine validator.
- `src/` and `packages/` — the exports and modules the documentation claims to describe.
- `.github/workflows/ci.yml` — parsed as a YAML subset and held to the gate list.
- `scenarios/scenario.schema.json` — the source of the generated data dictionary.

## Outputs

- A human-readable report on stdout and **exit code 0** when every invariant holds.
- A `FAILED` header, one line per problem and **exit code 1** when one does not.
- `docs/data-provenance.md` and `docs/data-dictionary.md` are regenerated with `--write`; no checker
  writes any other file.
- `out/` served on port 4173 by `serve-static.mjs`, for `npm run preview`.

## Tests

```text
npm run check
```

The checkers are the tests: there is no separate unit suite for them, and each script contains its
own negative proof so that a passing run is evidence the check can fail. `check-config.mjs` injects
ten configuration failures and a synthetic unitless field; `check-time.mjs` checks the shipped runs,
four DST days and five broken time cases; `check-units.mjs` compiles eight deliberately mixed-unit
calculations, checks every shipped SOC fraction and scale crossing, and refuses nine wrong-scale
values; `check-ci.mjs` breaks a copy of the workflow six ways;
`check-docs.mjs` breaks seven copies of the documentation; `check-acceptance.mjs` recomputes the
signed digest; `check-decisions.mjs` resolves every reference; `check-requirements.mjs` looks for
cycles, dangling dependencies and vague wording; `check-provenance.mjs` walks the metric graph;
`check-runtime.mjs` checks the lockfile against the manifests. A new script must be added to the
`check` chain and to the table below, or `check-docs` fails.

**Not covered.** The scripts check structure and cross-references, not whether a carefully written
sentence says something false. A statement that no invariant connects to code remains a review
responsibility.

## Layout

| Script | Job | Fails when | Writes |
| --- | --- | --- | --- |
| `check-runtime.mjs` | Node/npm pins, exact versions, workspaces, override, lockfile | A pin, a floating spec or an override drifts | — |
| `check-acceptance.mjs` | Checklist targets, cross-document references, signed digest | An edit invalidates the digest or a reference dangles | — |
| `check-decisions.mjs` | Index/body sync, statuses, topics, DEC/AS/FR references | An entry lacks a body, a topic or a resolved reference | — |
| `check-requirements.mjs` | IDs, dependencies, cycles, Must coverage, wording | An ID gap, a cycle, an uncovered Must or vague wording | — |
| `check-provenance.mjs` | Metric register, classes, gates, derived inputs, tables | A class rule, an input or the generated table is wrong | `docs/data-provenance.md` with `--write` |
| `check-config.mjs` | The configuration failure classes, timezone agreement, units, layer boundaries | The validator accepts a bad scenario or a layer leaks | — |
| `check-time.mjs` | Day step counts, site-day boundaries, DST transitions, instant offsets, unit scales | A count, boundary, offset or negative case is wrong | — |
| `check-units.mjs` | Branded quantities, scale conversions, SOC fractions, the tsc type guard | A mixed-unit calculation compiles, a scale is wrong, or the contract stores a percentage | — |
| `check-docs.mjs` | Module READMEs, API, dictionary, experiment log, changelog, map | A section, export, path, record or version is missing or stale | `docs/data-dictionary.md` with `--write` |
| `check-ci.mjs` | Workflow structure and the gate list | A gate, trigger, pin or install command drifts | — |
| `validate-scenarios.mjs` | Every committed scenario through the runtime validator | A scenario is invalid | — |
| `serve-static.mjs` | Serves `out/` for `npm run preview` | Port in use, or a path escapes `out/` | — |

The generated artefacts are the only files a script may write, and only behind `--write`. Everything
else is read-only, so a check can never repair the thing it is meant to measure.
