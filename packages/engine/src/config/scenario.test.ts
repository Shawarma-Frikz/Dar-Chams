import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ConfigIssue } from './issues.ts';
import { ConfigError, formatIssues } from './issues.ts';
import { checkScenarioInvariants } from './invariants.ts';
import { createScenarioValidator } from './schema.ts';
import type { Scenario } from './scenario.ts';
import { auditSchemaUnits } from './units.ts';

const SCENARIOS = fileURLToPath(new URL('../../../../scenarios', import.meta.url));

const readJson = (name: string): unknown => JSON.parse(readFileSync(join(SCENARIOS, name), 'utf8'));

const schema = readJson('scenario.schema.json');
const validator = createScenarioValidator(schema);

interface TestDocument {
  site: {
    latitude_deg: number;
    longitude_deg: number;
    altitude_m: number;
    timezone: string;
    [key: string]: unknown;
  };
  battery: {
    min_soc: number;
    max_soc: number;
    initial_soc: number;
    nominal_capacity_kwh: number;
    [key: string]: unknown;
  };
  grid: { export_limit_kw: number; [key: string]: unknown };
  pv: {
    tilt_deg: number;
    azimuth_deg: number;
    installed_dc_kwp: number;
    panel_count: number;
    tracker: { enabled: boolean; axes: number };
    shading_profile?: {
      windows: { start: string; end: string; shading_loss: number }[];
    };
    [key: string]: unknown;
  };
  household: {
    rooms: { id: string }[];
    appliances: {
      id: string;
      room: string;
      flexibility?: { duration_minutes: number; [key: string]: unknown };
      [key: string]: unknown;
    }[];
    [key: string]: unknown;
  };
  tariff: { import_bands: { up_to_kwh_per_month: number | null }[]; [key: string]: unknown };
  [key: string]: unknown;
}

const fixture = (): TestDocument =>
  structuredClone(readJson('tunis-typical-v1.json')) as TestDocument;

const issueAt = (document: unknown, path: string): ConfigIssue | undefined => {
  const checked = validator.check(document);
  return checked.ok ? undefined : checked.issues.find((issue) => issue.path === path);
};

describe('the scenario contract', () => {
  it('accepts every scenario the repository ships', () => {
    const names = readdirSync(SCENARIOS).filter(
      (name) => name.endsWith('.json') && name !== 'scenario.schema.json',
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const checked = validator.check(readJson(name));
      expect(checked.ok, `${name} should validate`).toBe(true);
      if (checked.ok) {
        expect(checked.scenario.schema_version).toBe('0.2.0');
        expect(checked.scenario.site.latitude_deg).toBeGreaterThanOrEqual(-90);
        expect(checked.scenario.site.latitude_deg).toBeLessThanOrEqual(90);
        expect(checked.scenario.site.longitude_deg).toBeGreaterThanOrEqual(-180);
        expect(checked.scenario.site.longitude_deg).toBeLessThanOrEqual(180);
        expect(Number.isFinite(checked.scenario.site.altitude_m)).toBe(true);
        expect(checked.scenario.site.altitude_m).toBeGreaterThanOrEqual(-100);
        expect(checked.scenario.site.altitude_m).toBeLessThanOrEqual(5000);
        expect(checked.scenario.pv.installed_dc_kwp).toBeGreaterThan(0);
        expect(checked.scenario.pv.panel_count).toBeGreaterThan(0);
        expect(checked.scenario.pv.tilt_deg).toBeGreaterThanOrEqual(0);
        expect(checked.scenario.pv.tilt_deg).toBeLessThanOrEqual(90);
        expect(checked.scenario.pv.azimuth_deg).toBeGreaterThanOrEqual(0);
        expect(checked.scenario.pv.azimuth_deg).toBeLessThan(360);
        expect(checked.scenario.pv.tracker).toEqual({ enabled: false, axes: 0 });
        expect(checked.scenario.pv.shading_profile).toBeUndefined();
      }
    }
  });

  it('requires a synthetic weather fallback for offline runs', () => {
    const scenario = fixture();
    const weather = scenario.weather as { fallback_order: string[] };
    weather.fallback_order = ['cached'];
    expect(validator.check(scenario).ok).toBe(false);
  });

  it('allows an optional shading profile and requires tracking axes to be explicitly enabled', () => {
    const unshaded = fixture();
    expect(validator.check(unshaded).ok).toBe(true);

    const shaded = fixture();
    shaded.pv.shading_profile = {
      windows: [{ start: '15:00', end: '16:30', shading_loss: 0.3 }],
    };
    expect(validator.check(shaded).ok).toBe(true);

    const invalidShading = fixture();
    invalidShading.pv.shading_profile = {
      windows: [{ start: '25:00', end: '16:30', shading_loss: 0.3 }],
    };
    expect(validator.check(invalidShading).ok).toBe(false);

    const impossibleLoss = fixture();
    impossibleLoss.pv.shading_profile = {
      windows: [{ start: '15:00', end: '16:30', shading_loss: 1.1 }],
    };
    expect(validator.check(impossibleLoss).ok).toBe(false);

    const overnight = fixture();
    overnight.pv.shading_profile = {
      windows: [
        { start: '22:00', end: '02:00', shading_loss: 0.3 },
        { start: '02:00', end: '04:00', shading_loss: 0.2 },
      ],
    };
    expect(validator.check(overnight).ok).toBe(true);

    const emptyWindow = fixture();
    emptyWindow.pv.shading_profile = {
      windows: [{ start: '15:00', end: '15:00', shading_loss: 0.3 }],
    };
    expect(issueAt(emptyWindow, 'pv.shading_profile.windows[0]')?.code).toBe(
      'relation.shading-window',
    );

    const overlap = fixture();
    overlap.pv.shading_profile = {
      windows: [
        { start: '15:00', end: '17:00', shading_loss: 0.3 },
        { start: '16:30', end: '18:00', shading_loss: 0.2 },
      ],
    };
    expect(issueAt(overlap, 'pv.shading_profile.windows[1]')?.code).toBe(
      'relation.shading-window-overlap',
    );

    const disabledWithAxis = fixture();
    disabledWithAxis.pv.tracker.axes = 1;
    expect(validator.check(disabledWithAxis).ok).toBe(false);

    const enabledWithoutAxis = fixture();
    enabledWithoutAxis.pv.tracker.enabled = true;
    expect(validator.check(enabledWithoutAxis).ok).toBe(false);

    const enabledOneAxis = fixture();
    enabledOneAxis.pv.tracker.enabled = true;
    enabledOneAxis.pv.tracker.axes = 1;
    expect(validator.check(enabledOneAxis).ok).toBe(true);
  });

  it('rejects a battery capacity that cannot store energy', () => {
    const document = fixture();
    document.battery.nominal_capacity_kwh = 0;
    const issue = issueAt(document, 'battery.nominal_capacity_kwh');
    expect(issue?.code).toBe('schema.range');
    expect(issue?.received).toBe('0');
    expect(issue?.hint).toContain('kWh');
  });

  it('rejects a negative power and says that direction is not a sign', () => {
    const document = fixture();
    document.grid.export_limit_kw = -1;
    const issue = issueAt(document, 'grid.export_limit_kw');
    expect(issue?.code).toBe('schema.range');
    expect(issue?.hint).toContain('non-negative');
  });

  it('rejects seeds that JavaScript cannot represent exactly', () => {
    const document = fixture() as TestDocument & { simulation: { seed: number } };
    document.simulation.seed = Number.MAX_SAFE_INTEGER + 1;
    const issue = issueAt(document, 'simulation.seed');
    expect(issue?.code).toBe('relation.seed-range');
    expect(issue?.hint).toContain('Number.MAX_SAFE_INTEGER');
  });

  it('rejects an SOC state of charge outside [0, 1] as a fraction', () => {
    const document = fixture();
    document.battery.initial_soc = 1.4;
    const issue = issueAt(document, 'battery.initial_soc');
    expect(issue?.code).toBe('schema.range');
    expect(issue?.hint).toContain('[0, 1]');
  });

  it('rejects an empty SOC window and a start outside it', () => {
    const backwards = fixture();
    backwards.battery.min_soc = 0.9;
    backwards.battery.max_soc = 0.4;
    expect(issueAt(backwards, 'battery.min_soc')?.code).toBe('relation.soc-window');

    const outside = fixture();
    outside.battery.initial_soc = 0.95;
    outside.battery.max_soc = 0.9;
    expect(issueAt(outside, 'battery.initial_soc')?.code).toBe('relation.soc-start');
  });

  it('answers a missing unit with the name that carries it', () => {
    const document = fixture();
    document.pv.tilt = 30;
    const issue = issueAt(document, 'pv.tilt');
    expect(issue?.code).toBe('schema.unknown-key');
    expect(issue?.hint).toContain('did you mean "tilt_deg"');
  });

  it('rejects a site timezone the runtime does not know', () => {
    const document = fixture();
    document.site.timezone = 'Mars/Olympus';
    const issue = issueAt(document, 'site.timezone');
    expect(issue?.code).toBe('relation.timezone');
    expect(issue?.expected).toContain('Africa/Tunis');
  });

  it('rejects a start offset that contradicts the site timezone', () => {
    const document = fixture();
    (document.simulation as { start: string }).start = '2026-06-21T00:00:00+02:00';
    const issue = issueAt(document, 'simulation.start');
    expect(issue?.code).toBe('relation.start-offset');
    expect(issue?.expected).toContain('+01:00');
    expect(issue?.hint).toContain('offset');
  });

  it('reports every problem instead of the first one', () => {
    const document = fixture();
    document.grid.export_limit_kw = -1;
    document.pv.tilt_deg = 120;
    const checked = validator.check(document);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    const paths = checked.issues.map((issue) => issue.path);
    expect(paths).toContain('grid.export_limit_kw');
    expect(paths).toContain('pv.tilt_deg');
  });

  it('keeps the contract unit-complete, and the audit refuses a bare number', () => {
    expect(auditSchemaUnits(schema)).toEqual([]);

    const synthetic = auditSchemaUnits({
      type: 'object',
      properties: {
        capacity_kwh: { type: 'number' },
        capacity: { type: 'number' },
        appliances: {
          type: 'array',
          items: { type: 'object', properties: { standby_draw: { type: 'number' } } },
        },
      },
    });
    expect(synthetic.map((issue) => issue.path)).toEqual(['capacity', 'appliances[].standby_draw']);
    expect(synthetic[0]?.code).toBe('contract.unit-missing');
  });
});

describe('the issue report', () => {
  it('renders numbered blocks that name the path, the value and the fix', () => {
    const document = fixture();
    document.battery.nominal_capacity_kwh = 0;
    const checked = validator.check(document);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;

    const text = formatIssues('tunis-typical-v1.json', checked.issues);
    expect(text).toContain('tunis-typical-v1.json: 1 problem in the scenario configuration layer');
    expect(text).toContain('1. battery.nominal_capacity_kwh  ·  schema.range');
    expect(text).toMatch(/\n {3}received {2}0/);
    expect(text).toContain('fix');
  });

  it('carries the source and the issues on ConfigError', () => {
    const document = fixture();
    document.battery.min_soc = 0.9;
    document.battery.max_soc = 0.4;
    const checked = validator.check(document);
    if (checked.ok) throw new Error('fixture should be invalid');

    const error = new ConfigError('scenarios/x.json', checked.issues);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ConfigError');
    expect(error.source).toBe('scenarios/x.json');
    expect(error.issues).toHaveLength(checked.issues.length);
    expect(error.message).toContain('battery.min_soc');
  });

  it('never throws while formatting an arbitrary issue list', () => {
    const issue = fc.record({
      layer: fc.constantFrom('defaults', 'scenario', 'settings', 'runtime' as const),
      path: fc.string(),
      code: fc.string(),
      message: fc.string(),
      received: fc.option(fc.string(), { nil: undefined }),
      expected: fc.option(fc.string(), { nil: undefined }),
      hint: fc.option(fc.string(), { nil: undefined }),
    });
    fc.assert(
      fc.property(fc.array(issue, { maxLength: 8 }), (issues) => {
        const text = formatIssues('fixture.json', issues);
        if (issues.length === 0) return text === 'fixture.json: valid';
        return text.includes('1. ') && text.includes(`${issues.length} problem`);
      }),
      { numRuns: 200 },
    );
  });
});

describe('the SOC invariant', () => {
  it('flags a start outside the window, and only then', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (first, second, initial) => {
          const document = fixture();
          document.battery.min_soc = Math.min(first, second);
          document.battery.max_soc = Math.max(first, second);
          document.battery.initial_soc = initial;

          const issues = checkScenarioInvariants(document as unknown as Scenario).filter((issue) =>
            issue.path.startsWith('battery.'),
          );

          if (document.battery.min_soc >= document.battery.max_soc) {
            return issues.some((issue) => issue.code === 'relation.soc-window');
          }
          const outside = initial < document.battery.min_soc || initial > document.battery.max_soc;
          if (outside) return issues.some((issue) => issue.code === 'relation.soc-start');
          return issues.length === 0;
        },
      ),
      { numRuns: 300 },
    );
  });
});
