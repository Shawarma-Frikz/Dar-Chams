/**
 * The schema half of scenario validation.
 *
 * Ajv enforces `scenarios/scenario.schema.json` as written; the contract is
 * passed in rather than imported so the engine keeps no dependency on the
 * repository layout, and so a caller cannot validate against a schema other
 * than the one it shipped.
 *
 * `strictTypes` is relaxed because the contract omits `type: "object"` inside
 * its `if`/`then` branches. That is valid JSON Schema with the same meaning;
 * rewriting a frozen phase-00 artefact to satisfy a validator would be the
 * wrong fix. Every other strict check stays on.
 */

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { ErrorObject } from 'ajv';

import type { ConfigIssue } from './issues.ts';
import { describeValue, readPath, sortIssues } from './issues.ts';
import { checkScenarioInvariants } from './invariants.ts';
import { isFractionKey } from './units.ts';
import type { Scenario } from './scenario.ts';

export type ScenarioCheck =
  | { readonly ok: true; readonly scenario: Scenario }
  | { readonly ok: false; readonly issues: readonly ConfigIssue[] };

export interface ScenarioValidator {
  check(document: unknown): ScenarioCheck;
}

const NOISE_KEYWORDS = new Set(['if', 'allOf']);

const ARTICLES: Record<string, string> = {
  array: 'an array',
  object: 'an object',
  integer: 'an integer',
  number: 'a number',
  string: 'a string',
  boolean: 'a boolean',
  null: 'null',
};

const describeType = (type: unknown): string => {
  const types = Array.isArray(type) ? type : [type];
  return types.map((entry) => ARTICLES[String(entry)] ?? String(entry)).join(' or ');
};

const distance = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current: number[] = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length] ?? a.length;
};

/**
 * The suggestion for an unknown key. The convention that names carry units
 * makes the common mistake predictable: `tilt` is `tilt_deg`, not a new field.
 */
function suggestKey(key: string, vocabulary: readonly string[]): string | undefined {
  const prefixed = vocabulary
    .filter((candidate) => candidate.startsWith(`${key}_`))
    .sort((a, b) => a.length - b.length)[0];
  if (prefixed) return prefixed;
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of vocabulary) {
    const candidateDistance = distance(key, candidate);
    if (candidateDistance < bestDistance) {
      bestDistance = candidateDistance;
      best = candidate;
    }
  }
  return bestDistance <= 3 ? best : undefined;
}

function collectKeys(node: unknown, into: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  const properties = record.properties;
  if (properties && typeof properties === 'object') {
    for (const [key, value] of Object.entries(properties)) {
      into.add(key);
      collectKeys(value, into);
    }
  }
  for (const key of ['items', 'if', 'then', 'else', 'additionalProperties', 'contains'] as const) {
    collectKeys(record[key], into);
  }
  for (const key of ['$defs', 'definitions'] as const) {
    const defs = record[key];
    if (defs && typeof defs === 'object') {
      for (const value of Object.values(defs)) collectKeys(value, into);
    }
  }
  for (const key of ['allOf', 'anyOf', 'oneOf', 'prefixItems'] as const) {
    const branches = record[key];
    if (Array.isArray(branches)) for (const branch of branches) collectKeys(branch, into);
  }
}

interface RangeExplanation {
  message: string;
  expected: string;
  hint?: string;
}

function explainRange(
  keyword: string,
  limit: unknown,
  key: string,
  value: unknown,
): RangeExplanation {
  const comparator =
    keyword === 'minimum'
      ? 'at least'
      : keyword === 'exclusiveMinimum'
        ? 'greater than'
        : keyword === 'maximum'
          ? 'at most'
          : 'less than';
  const hint = (() => {
    if (isFractionKey(key)) {
      return 'fractions are written in [0, 1] in a scenario file, not as percentages';
    }
    if (key === 'nominal_capacity_kwh') {
      return 'set the nameplate capacity in kWh; the default scenario uses 5.12 for a 5.12 kWh battery';
    }
    if (typeof value === 'number' && value < 0 && /_(kwp|kw|w|kwh)$/.test(key)) {
      return 'powers and energies are non-negative; direction is carried by the field, not by the sign';
    }
    return undefined;
  })();
  return {
    message: `must be ${comparator} ${describeValue(limit)}`,
    expected: `a number ${comparator} ${describeValue(limit)}`,
    ...(hint ? { hint } : {}),
  };
}

function toIssue(
  error: ErrorObject,
  document: unknown,
  vocabulary: readonly string[],
): ConfigIssue | null {
  if (NOISE_KEYWORDS.has(error.keyword)) return null;
  const params = (error.params ?? {}) as Record<string, unknown>;
  const base = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
  const key = base.slice(base.lastIndexOf('.') + 1);
  const received = describeValue(readPath(document, error.instancePath));

  switch (error.keyword) {
    case 'required': {
      const missing = String(params.missingProperty ?? '');
      return {
        layer: 'scenario',
        path: base ? `${base}.${missing}` : missing,
        code: 'schema.required',
        message: 'is missing from the document',
        expected: 'a value for every field the schema declares',
        hint: 'copy the closest scenario file and edit its values; nothing is defaulted at load time',
      };
    }
    case 'additionalProperties': {
      const unknownKey = String(params.additionalProperty ?? '');
      const suggestion = suggestKey(unknownKey, vocabulary);
      return {
        layer: 'scenario',
        path: base ? `${base}.${unknownKey}` : unknownKey,
        code: 'schema.unknown-key',
        message: 'is not a key the scenario schema declares',
        received: describeValue(readPath(document, `${error.instancePath}/${unknownKey}`)),
        expected: suggestion ? `the key "${suggestion}"` : 'a key the schema declares',
        hint: suggestion
          ? `did you mean "${suggestion}"? Field names carry their unit (_deg, _kw, _kwh, _w, _minutes, _hours)`
          : 'unknown keys are rejected rather than ignored, so a typo cannot pass as a setting',
      };
    }
    case 'type':
      return {
        layer: 'scenario',
        path: base,
        code: 'schema.type',
        message: `must be ${describeType(params.type)}`,
        received,
        expected: describeType(params.type),
      };
    case 'enum': {
      const allowed = Array.isArray(params.allowedValues) ? params.allowedValues : [];
      return {
        layer: 'scenario',
        path: base,
        code: 'schema.enum',
        message: `must be one of ${allowed.map(describeValue).join(', ')}`,
        received,
        expected: 'one of the values the schema enumerates',
      };
    }
    case 'const':
      return {
        layer: 'scenario',
        path: base,
        code: 'schema.const',
        message: `must be exactly ${describeValue(params.allowedValue)}`,
        received,
        expected: describeValue(params.allowedValue),
      };
    case 'minimum':
    case 'exclusiveMinimum':
    case 'maximum':
    case 'exclusiveMaximum':
      return {
        layer: 'scenario',
        path: base,
        code: 'schema.range',
        received,
        ...explainRange(error.keyword, params.limit, key, readPath(document, error.instancePath)),
      };
    case 'minLength':
      return {
        layer: 'scenario',
        path: base,
        code: 'schema.length',
        message: 'must not be empty',
        received,
        expected: 'at least one character',
      };
    case 'pattern':
      return {
        layer: 'scenario',
        path: base,
        code: 'schema.pattern',
        message: `must match ${String(params.pattern ?? 'the required pattern')}`,
        received,
        expected: `a string matching ${String(params.pattern ?? '')}`,
      };
    case 'format':
      return {
        layer: 'scenario',
        path: base,
        code: 'schema.format',
        message: `must be a valid ${String(params.format ?? 'value')}`,
        received,
        expected:
          params.format === 'date'
            ? 'an ISO 8601 date, YYYY-MM-DD'
            : params.format === 'date-time'
              ? 'an ISO 8601 instant with an explicit offset, for example 2026-06-21T00:00:00+01:00'
              : `a value in the ${String(params.format ?? '')} format`,
      };
    case 'minItems':
      return {
        layer: 'scenario',
        path: base,
        code: 'schema.items',
        message: `must contain at least ${String(params.limit)} entries`,
        received,
        expected: `at least ${String(params.limit)} entries`,
      };
    case 'uniqueItems':
      return {
        layer: 'scenario',
        path: base,
        code: 'schema.unique',
        message: 'contains the same entry twice',
        received,
        expected: 'distinct entries',
        hint: `the duplicate is at index ${String(params.j)}; order is display order, so remove the repeat`,
      };
    default:
      return {
        layer: 'scenario',
        path: base || '(document)',
        code: `schema.${error.keyword}`,
        message: error.message ?? 'does not satisfy the schema',
        received,
      };
  }
}

/**
 * Compiles the contract once. Calling `check` on the returned validator is
 * cheap; compiling is not, so build one per schema and reuse it.
 */
export function createScenarioValidator(schema: unknown): ScenarioValidator {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false });
  addFormats(ajv);
  const validate = ajv.compile(schema as object);
  const collected = new Set<string>();
  collectKeys(schema, collected);
  const vocabulary = [...collected];

  return {
    check(document: unknown): ScenarioCheck {
      if (!validate(document)) {
        const seen = new Set<string>();
        const issues: ConfigIssue[] = [];
        for (const error of validate.errors ?? []) {
          const issue = toIssue(error, document, vocabulary);
          if (!issue) continue;
          const id = `${issue.path}|${issue.code}|${issue.message}`;
          if (seen.has(id)) continue;
          seen.add(id);
          issues.push(issue);
        }
        return { ok: false, issues: sortIssues(issues) };
      }
      const scenario = document as Scenario;
      const relational = checkScenarioInvariants(scenario);
      if (relational.length > 0) return { ok: false, issues: sortIssues(relational) };
      return { ok: true, scenario };
    },
  };
}
