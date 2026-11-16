# Quality gates

| Field | Value |
| --- | --- |
| Version | 1.1.1 |
| Date | 2026-11-16 |
| Phase | 01 (tasks 01.5, 01.6); v1.1.0 records the ninth check; v1.1.1 tracks the corrected Node line |
| Decided by | DEC-034; tests chosen by DEC-017; the toolchain pin by DEC-031; the documentation check by DEC-035 |
| Checked by | `node scripts/check-ci.mjs`, or `npm run check` for all nine checks |
| Related | [Conventions](conventions.md) §7 · [Runtime support](runtime-support.md) · NFR-06, NFR-09, EX-06 |

Task 01.5 asks for formatting, lint, type-check, unit-test and production-build commands, and for CI to run them on pushes and pull requests. Its acceptance condition is not "the commands exist" but "a failing check blocks a green build", so this document records the gate list, the order, the CI job and the two ways the failure path is demonstrated.

---

## 1 · The six gates

| Gate | Command | What it proves |
| --- | --- | --- |
| Registers | `npm run check` | The nine document, configuration and documentation checks in [conventions](conventions.md) §7 pass against the tree as committed |
| Type-check | `npm run typecheck` | `tsc --noEmit` under the strict base config, including the test files and `vitest.config.ts` |
| Lint | `npm run lint` | ESLint 9 on the flat config, including the engine boundary that forbids React, Next and `@/` imports (DEC-002) |
| Format | `npm run format:check` | Prettier 3 over code, config and scripts; Markdown and JSON evidence are excluded by [`.prettierignore`](../.prettierignore) |
| Unit tests | `npm run test` | Vitest 5.1.0 runs every `*.test.ts` in `packages/` and `src/` against the TypeScript sources; fast-check 4.10.2 adds property tests |
| Production build | `npm run build` | Next.js 16 compiles the six routes and writes the static export to `out/` |

`npm run test:watch` is the same runner in watch mode, for the edit-test loop.

The order is deliberate. The cheap, broad checks come first — a formatting error costs a second, a failing build costs twenty — and the build is last, because it is both the slowest gate and the artefact the others exist to protect. A failure at any point stops the chain:

```text
npm run verify
  → npm run check        nine checks
  → npm run typecheck
  → npm run lint
  → npm run format:check
  → npm run test         unit and property tests
  → npm run build        static export
```

`verify` is the single command a contributor runs before a commit, and the same list the workflow runs. CI does not call `verify`, because one combined step would report six gates as one red cross; it runs the same six commands as separate steps so a failing gate is named on the pull request.

The register gate is itself nine checks. The seventh, `scripts/check-docs.mjs`, holds six module READMEs (purpose, inputs, outputs, runnable tests), the API tables in both directions, the generated data dictionary, the experiment record format, the changelog and the document map to their contracts (DEC-035).

## 2 · What the tests cover

All 22 tests exercise code that shipped in 01.4, because the first meaningful unit to test is the one the last two tasks built:

| File | Tests | Subject |
| --- | --- | --- |
| [`packages/engine/src/config/scenario.test.ts`](../packages/engine/src/config/scenario.test.ts) | 12 | The shipped scenarios validate; the four failure classes 01.4 promised are rejected with the right path, code and fix; issues collect instead of aborting; the unit audit and the SOC invariant hold |
| [`src/lib/config/layers.test.ts`](../src/lib/config/layers.test.ts) | 10 | Settings recover without throwing, refuse scenario fields and never change the scenario; runtime state derives from a frozen configuration; resolution fails closed |

Three of them are properties rather than examples, run 200–300 times each:

- the SOC invariant flags a start outside the window, and only then, for arbitrary fractions;
- `formatIssues` renders any list of issues without throwing;
- `parseUserSettings` never throws on anything `JSON.parse` can return, and always yields a usable preference.

The tests import the same modules the application imports — the engine entry point and the `src/lib/config` files — with no mocks, so a test cannot pass against behaviour the app does not have. Fixtures are the shipped scenario files, read from `scenarios/`, not copies; a scenario that stops being valid fails the tests and the configuration check together.

## 3 · The CI job

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push to `main`, every pull request and manual dispatch.

| Setting | Value | Why |
| --- | --- | --- |
| Runners | `ubuntu-latest` and `windows-latest`, `fail-fast: false` | Linux is the case-sensitive path check; Windows is the OS the project is graded on, and where CRLF and file locking appear |
| Node | `node-version-file: .nvmrc` | The workflow cannot drift from the pinned Node line (26.13.1), whose bundled npm is the one `packageManager` declares (DEC-031, DEC-036) |
| Install | `npm ci` with `cache: npm` | The only supported install path; a stale lockfile fails here |
| Actions | `actions/checkout` and `actions/setup-node` pinned to commit SHAs | A tag can be moved; a commit cannot |
| Permissions | `contents: read` | The job needs to read the repository and nothing else |
| Concurrency | `ci-${{ github.ref }}`, cancel in progress | A superseded push stops consuming minutes |
| Timeout | 25 minutes | A hung job fails instead of burning the monthly budget |

The job does not deploy, publish or upload artefacts. It exists to answer one question: does this commit pass the gates on both operating systems.

**Before merge.** NFR-06 says the checks must pass *in CI before merge*. The workflow makes a failing run red; requiring that run before merging is a repository setting — Settings → Branches → require status checks to pass — not a file in the tree. It is recorded here so the step is deliberate rather than forgotten. Without it, a maintainer can still merge a red pull request.

## 4 · The check on the check

`scripts/check-ci.mjs` is the eighth register check. It parses the workflow (a small reader for the YAML subset the file uses, not a regular expression), then asserts:

- triggers: `push` on `main`, `pull_request`, and a manual dispatch;
- `permissions.contents: read`, concurrency with cancellation, a job timeout of 1–60 minutes;
- a matrix that includes both runners;
- `npm ci`, never `npm install`, and no `|| true`, `continue-on-error: true` or `--no-verify`;
- both actions pinned to 40-character commit SHAs, `setup-node` reading `.nvmrc` and caching npm;
- each job runs exactly `npm run check`, `typecheck`, `lint`, `format:check`, `test`, `build`, in that order, build last;
- `package.json` defines every gate, `npm run check` chains every `check:*` script and does not recurse, and `npm run verify` is the same six steps in the same order.

It then breaks copies of the parsed workflow and manifest and requires each break to be reported: a removed gate, an action referenced by tag, a command ending in `|| true`, a missing pull-request trigger, `setup-node` without the `.nvmrc` line, and `verify` without the test gate. A check that cannot fail proves nothing.

## 5 · The failure path, demonstrated

The DONE WHEN condition was not asserted, it was run. A deliberately red test was added to `packages/engine/src/config/`, and `npm run verify` produced:

```text
FAIL  packages/engine/src/config/failing-gate.test.ts > blocks the production build
AssertionError: expected 2 to be 3
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 22 passed (23)
npm error Lifecycle script `verify` failed with error
```

Exit code 1, and the build step never started — the log contains no "Compiled successfully". Removing the file and re-running the same command restored the green chain, ending with the seven static routes in `out/`.

In CI the same mechanism is structural: a step's non-zero exit fails the job, and a failed job cannot satisfy a required status check.

## 6 · What is not covered

- **Coverage thresholds.** Measured coverage has no meaningful denominator until the engine has physics to test (phase 02); a threshold now would guard almost nothing.
- **Browser and component tests.** Playwright arrives in phase 08 with the interface it has to drive (DEC-017). The shell is currently static and carries no interactive behaviour beyond navigation.
- **macOS.** Linux and Windows cover the failure classes that exist in this stack. A third runner doubles the minutes for no new class; it returns to the matrix if a Safari- or macOS-specific defect appears.
- **Branch protection.** A repository setting, recorded in §3 rather than enforced by a file.
- **Dependency update automation.** Dependabot is not configured; an exact-version policy (DEC-031) makes upgrades deliberate, and automating the pull requests is a later convenience.
