# Experiment log

| Field | Value |
| --- | --- |
| Version | 1.1.0 |
| Date | 2026-11-18 |
| Phase | 01 (task 01.6); EXP-001 records the controlled phase-03.7 shading/soiling response |
| Records | 1 |
| Checked by | `node scripts/check-docs.mjs` |
| Related | [Data provenance](data-provenance.md) · [Metric register](metric-register.json) · [Decision log](decision-log.md) · AC-02, AC-09, AC-11, AC-33 |

An experiment is a question asked of the engine with its inputs fixed before the run. The scenario
file, the seed and the engine version are the inputs; the manifest, the metrics and the result are
the outputs. The output is regenerable and stays untracked ([conventions](conventions.md) §4); this
log is the committed record of what was asked, what was expected and what came back.

The log exists so that a result in the report can be traced to a question asked before the result was
known. That is what makes a threshold defensible, and what keeps a negative result from disappearing.

## Record format

Every experiment is a second-level heading `## EXP-nnn · Title`, followed by these fields in this
order. `check-docs` rejects a record that omits one.

| Field | Required content |
| --- | --- |
| `Date` | ISO date the experiment was run |
| `Question` | One sentence the run answers |
| `Hypothesis` | What was expected before seeing the result |
| `Scenario` | A scenario file that exists in `scenarios/` |
| `Seed` | The integer seed taken from that file |
| `Engine` | `dar-chams-engine` and the version from the run manifest |
| `Metrics` | The registered `MET-nn` identifiers the record reports |
| `Result` | The measured outcome, including a negative one |
| `Artefact` | The untracked manifest or report path |
| `Decision` | The decision entry the result informs, or `none` |

## Rules

- The question and the hypothesis are written **before** the run. A hypothesis added afterwards is a
  conclusion, not an experiment.
- One record per question. A second scenario or seed is a second record, so a comparison has two
  traceable inputs; the paired runner reports them together (AC-09).
- The scenario file is never edited to improve a result. A changed input is a new versioned file
  (DEC-021), and the old record keeps pointing at the file that produced it.
- IDs are sequential, `EXP-001` onward, and never reused.
- A negative result is recorded and reported (DEC-010, DEC-013). Deleting it would make the log a
  highlight reel rather than evidence.
- A threshold is frozen before the final run and not tuned afterwards (task 11.1); changing one is a
  decision-log entry.
- Replay fixtures are the exception that stays committed: a recorded device session is evidence that
  cannot be regenerated (AC-33), so its path may point into a committed fixture directory.

## Records

## EXP-001 · Do configured soiling and shading losses produce a repeatable PV reduction?

- Date: 2026-11-18
- Question: Do explicit scenario soiling and site-local shading controls produce an explainable, repeatable reduction in modeled PV energy?
- Hypothesis: With the fixed four-step input fixture, 12% soiling and a 50% shading window active for one step reduce DC and gross AC interval energy by 21.4286% relative to 2% soiling and no shading; replay is identical.
- Scenario: scenarios/tunis-typical-v1.json
- Seed: 20260621
- Engine: dar-chams-engine 0.1.0
- Metrics: MET-12, MET-13, MET-18, MET-19, MET-23, MET-24
- Result: hypothesis confirmed. DC energy was 7912.524312 Wh → 6216.983388 Wh; gross AC energy was 7596.023340 Wh → 5968.304052 Wh (21.428571% reduction). Replaying the fixed inputs produced identical per-step output. This synthetic controlled fixture is not an annual-yield validation.
- Artefact: runs/exp-001/summary.json
- Decision: DEC-052

The runner and assumptions are documented in [shading/soiling validation](shading-soiling-validation.md).

The template below is a format illustration and is not counted as a record.

### Template — not a record

```text
## EXP-001 · Does the irradiance fixture reproduce the reference at solar noon?

- Date: 2026-06-21
- Question: Does the engine's clear-sky irradiance match the reference fixture at solar noon?
- Hypothesis: Sunrise and solar noon stay within ±2 minutes, and noon elevation within ±0.5°.
- Scenario: scenarios/tunis-typical-v1.json
- Seed: 42
- Engine: dar-chams-engine 0.1.0
- Metrics: MET-01, MET-02
- Result: pending — this is the template, not a result.
- Artefact: runs/exp-001/manifest.json
- Decision: none
```

## What the check verifies

`scripts/check-docs.mjs` counts the records against the `Records` field, requires all ten fields on
every record, resolves the scenario path, requires an integer seed, resolves every `MET-nn` against
`docs/metric-register.json` and every `DEC-nnn` against the decision log, and checks that IDs are
sequential. It then parses the template above, removes one required field from the copy, and requires
that the broken copy be rejected — so a passing run is evidence that the format is enforced, even
while the log is empty.
