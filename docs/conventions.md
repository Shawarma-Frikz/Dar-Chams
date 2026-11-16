# Repository conventions

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-16 |
| Phase | 01 (task 01.1) |
| Licence | MIT — [`LICENSE`](../LICENSE) (DEC-029) |
| Commit style | Conventional Commits (DEC-030) |
| Runtime | Node 26.2.0, npm 11.15.0, exact versions and a committed lockfile — [`runtime-support.md`](runtime-support.md) (DEC-031) |
| Checked by | `npm run check` — the six checkers — before every commit; CI from 01.5 |

This document records how the repository is kept reproducible: the licence, what enters Git, how branches and commits are named, and which files are treated as evidence rather than output. Task 01.1 also asks for a clean clone that installs with documented commands; that half is satisfied by 01.2 and 01.3, when `package.json` and the README quick start exist.

---

## 1 · Licence: MIT

- The MIT text lives at [`LICENSE`](../LICENSE), SPDX identifier `MIT`, copyright held by the author. There is no CLA and no DCO requirement; a contributor keeps their own copyright.
- The grant covers the code, the documentation, the machine-checked Phase 00 artefacts and the roadmap chart.
- It does not relicense third-party material. Open-Meteo data, PVGIS reference values, Wokwi simulation, scikit-learn and every npm or PyPI dependency keep their own terms; attribution obligations are recorded where the data is used.
- A dependency must be licence-compatible (MIT, ISC, BSD, Apache-2.0). A copyleft or otherwise restrictive dependency requires a decision-log entry before it is added.
- The README states the licence; the report cites it.

## 2 · Branches

- `main` is the only long-lived branch and must always pass the checks in section 7.
- Work happens on short-lived branches that name the phase: `<type>/<phase>-<slug>`, for example `feat/01-scaffold`, `docs/01-conventions`, `fix/03-irradiance-sign`.
- `<type>` is one of the commit types in section 3, so the branch name predicts the commit type.
- Merge into `main` as a single squashed commit once CI exists (01.5), so one phase-visible change is one commit. Before CI, a fast-forward or one squashed commit achieves the same.
- Never force-push `main` and never rewrite published history. A mistake is corrected by a new commit; a superseded decision is corrected by a new decision entry, not an edited one (DEC-030).
- Annotated tags mark phase gates: `v0.<phase>` after a phase is accepted (for example `v0.1` after phase 01), and `v1.0.0` at the phase-16 release.

## 3 · Commit messages: Conventional Commits

```text
<type>(<scope>): <subject>

<body — why the change exists, not what it does>

Refs: FR-EMS-04, AC-09, DEC-013
```

- Subject: imperative, lowercase after the colon, at most 72 characters, no trailing period.
- Body: wrapped at 72 characters, states the reason for the change and any consequence a future reader would not infer from the diff.
- One logical change per commit. A formatter sweep and a behaviour change are two commits.
- A breaking change carries `!` after the type or scope and a `BREAKING CHANGE:` footer.
- History written before 2026-11-16 uses sentence-style subjects. It is not rewritten to match; the convention applies from phase 01 onward.

| Type | Use for |
| --- | --- |
| `feat` | a new capability |
| `fix` | a defect |
| `docs` | documentation, decision log, registers, roadmap |
| `test` | tests and fixtures |
| `refactor` | a change with no behaviour change |
| `perf` | performance work |
| `build` | toolchain, dependencies, lockfile |
| `ci` | workflows and automation |
| `chore` | housekeeping |
| `data` | scenarios, weather fixtures, replay evidence |

Scopes: `engine`, `sim`, `pv`, `battery`, `loads`, `ems`, `fct`, `ui`, `twin`, `emb`, `data`, `docs`, `ci`, `deps`.

**Traceability.** The `Refs:` footer cites the identifiers that already exist — `FR-…`, `NFR-…`, `CON-…`, `AC-…` and `DEC-…`. A commit can therefore be traced from a code change to the requirement it satisfies and the criterion that measures it, without a separate mapping table.

## 4 · What enters Git, and what never does

**Committed — evidence:**

- `docs/` including the decision log, registers and the signed checklist; `scenarios/*.json`; the checkers in `scripts/`.
- Fixtures that cannot be regenerated: cached weather snapshots, recorded replay sessions (AC-33), the Wokwi `diagram.json`.
- Firmware source, the lockfile, `LICENSE`, `.gitattributes`, `.gitignore`, editor settings and this document.

**Never committed:**

- Secrets and local configuration: `.env*` (except `.env.example`), keys, certificates, broker credentials.
- Dependencies and build output: `node_modules/`, `.next/`, `out/`, `.pio/`, coverage and Playwright reports, TypeScript and lint caches.
- Generated results: `runs/`, `datasets/`, `experiments/`, `artifacts/`.
- Downloaded model files and bulky source assets.
- Operating-system and editor junk.

**Why generated runs stay out.** A run is reproducible from a scenario, a seed and an engine version (AC-02), so the evidence is the manifest, not the output. A replay fixture is the exception: it records a device session that no longer exists once the session ends, which is why it is committed rather than regenerated.

## 5 · Line endings, encoding and formatters

- Files are UTF-8 with LF endings, enforced by [`.gitattributes`](../.gitattributes) and [`.editorconfig`](../.editorconfig). Windows scripts, if any are ever added, are the sole CRLF exception.
- The signed checklist digest normalises CRLF to LF, so a checkout on Windows cannot fail the check by itself. It does not tolerate edits: any text change invalidates the digest until the document is re-signed.
- Format-on-save runs Prettier for TypeScript, TSX, CSS and HTML. It is disabled for Markdown and JSON, because `docs/`, `scenarios/` and `metric-register.json` are evidence: a reflowed paragraph or reordered key is a change to the artefact, and for the checklist it is a signature break.
- Prose in `docs/` is wrapped by hand. Do not run a prose formatter over it.

## 6 · Changing a signed or generated artefact

1. A change to a gate, a threshold, a provenance class or a metric starts with a decision-log entry.
2. The artefact is edited next.
3. If the artefact is signed, the content digest and the sign-off are renewed in the same commit — the checklist states that an edit after signing invalidates it.
4. Generated register tables are refreshed with `node scripts/check-provenance.mjs --write`, never edited by hand.

A commit that changes a signed document without renewing its digest fails `check-acceptance` by design.

## 7 · Checks before every commit

```text
npm run check
```

That script runs, in order:

```text
node scripts/check-runtime.mjs
node scripts/check-acceptance.mjs
node scripts/check-decisions.mjs
node scripts/check-requirements.mjs
node scripts/check-provenance.mjs
node scripts/validate-scenarios.mjs
```

All six must pass. The first fails on a Node line that does not satisfy `engines`, an npm version that differs from `packageManager`, a missing npm setting, a stale lockfile, a floating dependency spec, a workspace manifest that drifts from the root pin, or an override that is not an exact installed version (DEC-031, DEC-032).

The code gates are separate and can be run individually:

```text
npm run typecheck
npm run lint
npm run format:check
```

`npm run verify` runs the six checks and then all three. From 01.5, CI runs that single script together with unit and property tests and the production build; a failing check blocks a green build.

## 8 · Editor setup

- [`.vscode/extensions.json`](../.vscode/extensions.json) recommends ESLint, Prettier, Tailwind CSS IntelliSense, the Vitest explorer, PlatformIO IDE and Wokwi for VS Code.
- [`.vscode/settings.json`](../.vscode/settings.json) sets LF, final newlines, trimmed whitespace, format-on-save for code, and disables it for Markdown and JSON.
- PlatformIO creates `.pio/` inside the embedded project; it is ignored. The Wokwi project reads the compiled `.pio/build/esp32dev/firmware.bin` and ELF, so the build directory must exist before the simulator starts — building is the documented first step, not a committed artefact.
- On this Windows machine, PowerShell may block `.ps1` execution (DEC-018). Commands are documented as plain `npm`; in PowerShell use `npm.cmd`, or work in Git Bash.
- Python tooling for the ML experiments lives in `experiments/` and is not part of the Node workspace; its generated output stays untracked.
