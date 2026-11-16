/**
 * Units are carried by field names, never by a `units` block: `tilt_deg`,
 * `installed_dc_kwp`, `rated_power_w`. That convention is only worth having if
 * something enforces it, so this module audits the contract itself — every
 * numeric property in the scenario schema must either end in a recognised unit
 * suffix or be listed as deliberately unitless. A new `capacity` field cannot
 * enter the schema unnoticed.
 */

import type { ConfigIssue } from './issues.ts';

/** Longest first, so `_tnd_per_kwh` wins over `_per_kwh`. */
export const UNIT_SUFFIXES = [
  '_kwh_per_month',
  '_tnd_per_kwh',
  '_per_degc',
  '_per_month',
  '_per_kwh',
  '_multiplier',
  '_minutes',
  '_hours',
  '_kwh',
  '_kwp',
  '_degc',
  '_deg',
  '_kw',
  '_tnd',
  '_w',
  '_m',
] as const;

/**
 * Quantities that are unitless by definition. Fractions are written in
 * `[0, 1]`; counts and indices have no unit; `seed` is a stream number.
 */
export const UNITLESS_QUANTITIES: readonly string[] = [
  'axes',
  'panel_count',
  'seed',
  'duty_cycle',
  'soiling_loss',
  'mismatch_loss',
  'availability',
  'efficiency',
  'round_trip_efficiency',
  'annual_capacity_fade',
  'initial_soc',
  'min_soc',
  'max_soc',
  'reserve_soc',
  'hysteresis_soc',
];

export function hasUnitSuffix(key: string): boolean {
  return UNIT_SUFFIXES.some((suffix) => key.endsWith(suffix));
}

/** The fraction-valued keys, used to explain a range failure in the reader's terms. */
export function isFractionKey(key: string): boolean {
  return (
    UNITLESS_QUANTITIES.includes(key) &&
    (key.endsWith('_soc') ||
      key.endsWith('_loss') ||
      key.endsWith('efficiency') ||
      key === 'availability' ||
      key.endsWith('_fade') ||
      key === 'duty_cycle')
  );
}

const isNumericType = (type: unknown): boolean =>
  type === 'number' ||
  type === 'integer' ||
  (Array.isArray(type) && type.some((entry) => entry === 'number' || entry === 'integer'));

interface SchemaNode {
  readonly properties?: Record<string, SchemaNode>;
  readonly items?: SchemaNode;
  readonly $defs?: Record<string, SchemaNode>;
  readonly allOf?: readonly SchemaNode[];
  readonly if?: SchemaNode;
  readonly then?: SchemaNode;
  readonly else?: SchemaNode;
  readonly type?: unknown;
}

function walk(node: SchemaNode | undefined, trail: string, issues: ConfigIssue[]): void {
  if (!node || typeof node !== 'object') return;
  for (const [key, property] of Object.entries(node.properties ?? {})) {
    const path = trail ? `${trail}.${key}` : key;
    if (
      isNumericType(property?.type) &&
      !hasUnitSuffix(key) &&
      !UNITLESS_QUANTITIES.includes(key)
    ) {
      issues.push({
        layer: 'scenario',
        path,
        code: 'contract.unit-missing',
        message: 'is a number whose name carries no unit',
        expected: `a name ending in one of ${UNIT_SUFFIXES.map((s) => s.slice(1)).join(', ')}`,
        hint: `rename it to carry its unit (for example ${key}_kwh or ${key}_kw), or add "${key}" to UNITLESS_QUANTITIES if it is a fraction or a count`,
      });
    }
    walk(property, path, issues);
  }
  walk(node.items, `${trail}[]`, issues);
  for (const [name, definition] of Object.entries(node.$defs ?? {})) walk(definition, name, issues);
  for (const branch of node.allOf ?? []) walk(branch, trail, issues);
  walk(node.if, trail, issues);
  walk(node.then, trail, issues);
  walk(node.else, trail, issues);
}

/**
 * Every numeric property must name its unit. Returns one issue per offending
 * key; an empty array means the contract is unit-complete.
 */
export function auditSchemaUnits(schema: unknown): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  walk(schema as SchemaNode, '', issues);
  return issues;
}
