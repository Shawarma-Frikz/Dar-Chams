# `@helios/engine` — the simulation boundary

| Field | Value |
| --- | --- |
| Version | 0.1.0 |
| Phase | 01 (task 01.6); physics from phase 02 |
| Boundary | No React, Next.js, DOM or browser API may be imported (DEC-002) |
| Checked by | `npm run test`, `node scripts/check-config.mjs` |
| API | [`docs/api.md`](../../docs/api.md) §1 |
| Decisions | DEC-002, DEC-021, DEC-033 |

## Purpose

The engine is the single description of what the installation does. It runs headlessly in Node for
tests and batch experiments and in the browser for the live view, and it owns the scenario contract
so that the application, the CI validator and the test suite cannot disagree about what a valid
scenario is. At phase 01 it contains no physics: it contains the boundary the physics will run
behind — the types, the Ajv validator, the relational invariants, the unit audit and the issue model.
It is not a UI, a controller or a persistence layer.

## Inputs

- A **scenario document** of unknown shape, supplied by the caller. The engine never reads a file
  from disk, so it has no dependency on the repository layout.
- A **JSON Schema** passed to `createScenarioValidator`, normally
  [`scenarios/scenario.schema.json`](../../scenarios/scenario.schema.json). Compiling happens once
  per schema, not per check.
- The unit conventions the contract is held to: numeric names end in a recognised suffix, fractions
  are written in `[0, 1]`, and the unitless exceptions are declared explicitly
  ([configuration](../../docs/configuration.md) §6).

## Outputs

- `ScenarioCheck`: either `{ ok: true, scenario }` with the typed and validated document, or
  `{ ok: false, issues }` with every problem found.
- `ConfigIssue[]`: layer, dotted path, stable code, message, received value, expected value and a
  hint. `ConfigError` renders the same list as a numbered report.
- `Scenario` and its component interfaces: the typed view of the contract, mirrored from the schema.
- `ENGINE_NAME` and `ENGINE_VERSION`, written into every run manifest (NFR-03).
- `auditSchemaUnits`, `hasUnitSuffix`, `UNIT_SUFFIXES` and `UNITLESS_QUANTITIES`: the unit policy as
  code, used by the unit check and available to a schema change.

The complete list, with signatures, is the first table in [`docs/api.md`](../../docs/api.md).

## Tests

```text
npm run test
node scripts/check-config.mjs
node scripts/validate-scenarios.mjs
```

`npm run test` runs the package's twelve tests in
[`src/config/scenario.test.ts`](src/config/scenario.test.ts): the three shipped scenarios validate;
invalid capacity, negative power, an impossible SOC window and a missing unit are each rejected with
the right path, code and fix; issues collect instead of aborting; the issue report renders; the unit
audit flags a synthetic `capacity` field; and two properties (issue rendering and the SOC invariant)
run 200–300 times each. The same command also runs the application's ten configuration tests, for 22
in total.

`node scripts/check-config.mjs` proves the four failure classes outside Vitest, audits every numeric
property in the contract, and asserts that no layer is silently merged. `node scripts/validate-scenarios.mjs`
runs this validator over every committed scenario. Neither command needs a build: Node strips the
TypeScript types, and `erasableSyntaxOnly` keeps the source within what stripping accepts (DEC-033).

**Not covered yet.** There is no physics, no timestep loop and no energy balance until phase 02, so
there is nothing to test at 5,000 steps/s or against the AC-01 residual. The boundary is tested; the
simulation it will carry is not.

## Layout

| Path | Role |
| --- | --- |
| `src/index.ts` | The public surface; every export is documented in the API notes |
| `src/config/scenario.ts` | The typed view of the contract |
| `src/config/schema.ts` | Ajv 8.20.0, error-to-issue translation and unknown-key suggestions |
| `src/config/invariants.ts` | The relational rules JSON Schema cannot express |
| `src/config/units.ts` | Unit suffixes, unitless quantities and the schema audit |
| `src/config/issues.ts` | `ConfigIssue`, `ConfigError`, the formatter and pointer reader |
| `src/config/scenario.test.ts` | Twelve unit and property tests over the shipped scenarios |
| `package.json` | `@helios/engine`, TypeScript-source exports for the workspace |
