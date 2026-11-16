#!/usr/bin/env node
// Proof for task 01.4: the four configuration layers are separate, and the
// four failure classes the task names stop a load with a message a reader can
// act on.
//
// It runs the real validator and the real resolution code — the same modules
// the application imports at startup — against the shipped scenarios and
// against documents that were deliberately broken here. Nothing is mocked, so a
// message that reads well in this output is the message a build would print.
//
// Usage: node scripts/check-config.mjs

import fs from 'node:fs';
import path from 'node:path';

import {
  ConfigError,
  auditSchemaUnits,
  createScenarioValidator,
  formatIssues,
} from '@dar-chams/engine';

import {
  DEFAULT_SCENARIO_ID,
  DEFAULT_SCENARIO_SOURCE,
  DEFAULT_SETTINGS,
} from '../src/lib/config/defaults.ts';
import { createRuntimeState } from '../src/lib/config/runtime.ts';
import { resolveConfiguration } from '../src/lib/config/resolve.ts';
import { parseUserSettings } from '../src/lib/config/settings.ts';

const ROOT = path.resolve('.');
const SCENARIOS = path.join(ROOT, 'scenarios');
const SCHEMA_FILE = path.join(SCENARIOS, 'scenario.schema.json');

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
const validator = createScenarioValidator(schema);
const readScenario = (id) =>
  JSON.parse(fs.readFileSync(path.join(SCENARIOS, `${id}.json`), 'utf8'));

// ---------------------------------------------------------------------------
// 1 · The shipped scenarios pass, through the runtime validator.
// ---------------------------------------------------------------------------
const shipped = fs
  .readdirSync(SCENARIOS)
  .filter((name) => name.endsWith('.json') && name !== 'scenario.schema.json')
  .sort();

for (const name of shipped) {
  const checked = validator.check(JSON.parse(fs.readFileSync(path.join(SCENARIOS, name), 'utf8')));
  expect(
    checked.ok,
    `${name} should be valid, got:\n${checked.ok ? '' : formatIssues(name, checked.issues)}`,
  );
}

// ---------------------------------------------------------------------------
// 2 · The DONE WHEN failure classes, injected and then read back.
// ---------------------------------------------------------------------------
const broken = (mutate) => {
  const document = readScenario(DEFAULT_SCENARIO_ID);
  mutate(document);
  return validator.check(document);
};

const washerIndex = readScenario(DEFAULT_SCENARIO_ID).household.appliances.findIndex(
  (appliance) => appliance.id === 'washing_machine',
);
expect(washerIndex >= 0, 'fixture: the default scenario must contain the washing machine');

const cases = [
  {
    label: 'invalid capacity',
    check: broken((document) => {
      document.battery.nominal_capacity_kwh = 0;
    }),
    path: 'battery.nominal_capacity_kwh',
    code: 'schema.range',
    contains: ['greater than 0', 'kWh'],
  },
  {
    label: 'negative power',
    check: broken((document) => {
      document.grid.export_limit_kw = -1;
    }),
    path: 'grid.export_limit_kw',
    code: 'schema.range',
    contains: ['at least 0', 'non-negative'],
  },
  {
    label: 'unsafe random seed',
    check: broken((document) => {
      document.simulation.seed = Number.MAX_SAFE_INTEGER + 1;
    }),
    path: 'simulation.seed',
    code: 'relation.seed-range',
    contains: ['safe integer', 'Number.MAX_SAFE_INTEGER'],
  },
  {
    label: 'impossible SOC (out of range)',
    check: broken((document) => {
      document.battery.initial_soc = 1.4;
    }),
    path: 'battery.initial_soc',
    code: 'schema.range',
    contains: ['[0, 1]', 'fractions'],
  },
  {
    label: 'impossible SOC (window runs backwards)',
    check: broken((document) => {
      document.battery.min_soc = 0.9;
      document.battery.max_soc = 0.4;
    }),
    path: 'battery.min_soc',
    code: 'relation.soc-window',
    contains: ['window is empty', 'max_soc'],
  },
  {
    label: 'impossible SOC (starts outside the window)',
    check: broken((document) => {
      document.battery.initial_soc = 0.95;
      document.battery.max_soc = 0.9;
    }),
    path: 'battery.initial_soc',
    code: 'relation.soc-start',
    contains: ['outside the usable window'],
  },
  {
    label: 'missing units',
    check: broken((document) => {
      document.pv.tilt = 30;
    }),
    path: 'pv.tilt',
    code: 'schema.unknown-key',
    contains: ['did you mean "tilt_deg"', 'carry their unit'],
  },
  {
    label: 'load assigned to a missing room',
    check: broken((document) => {
      document.household.appliances[0].room = 'garage';
    }),
    path: 'household.appliances[0].room',
    code: 'relation.room-reference',
    contains: ['does not declare'],
  },
  {
    label: 'flexible task longer than its window',
    check: broken((document) => {
      const washer = document.household.appliances.find((item) => item.id === 'washing_machine');
      if (washer) washer.flexibility.duration_minutes = 900;
    }),
    path: `household.appliances[${washerIndex}].flexibility.duration_minutes`,
    code: 'relation.flexibility-window',
    contains: ['unschedulable'],
  },
  {
    label: 'unknown site timezone',
    check: broken((document) => {
      document.site.timezone = 'Mars/Olympus';
    }),
    path: 'site.timezone',
    code: 'relation.timezone',
    contains: ['IANA', 'Africa/Tunis'],
  },
  {
    label: 'start offset contradicts the site timezone',
    check: broken((document) => {
      document.simulation.start = '2026-06-21T00:00:00+02:00';
    }),
    path: 'simulation.start',
    code: 'relation.start-offset',
    contains: ['offset', 'Africa/Tunis'],
  },
];

for (const testCase of cases) {
  const issue = testCase.check.ok
    ? undefined
    : testCase.check.issues.find((entry) => entry.path === testCase.path);
  expect(!testCase.check.ok, `${testCase.label}: document should be rejected`);
  expect(issue !== undefined, `${testCase.label}: expected an issue at ${testCase.path}`);
  if (!issue) continue;
  expect(
    issue.code === testCase.code,
    `${testCase.label}: expected code ${testCase.code}, got ${issue.code}`,
  );
  const text = [issue.message, issue.expected, issue.hint].filter(Boolean).join(' ');
  for (const fragment of testCase.contains) {
    expect(
      text.includes(fragment),
      `${testCase.label}: message should mention "${fragment}", got "${text}"`,
    );
  }
  expect(
    issue.hint !== undefined || issue.expected !== undefined,
    `${testCase.label}: an issue must say what would be accepted`,
  );
}

// ---------------------------------------------------------------------------
// 3 · The contract is unit-complete, and the audit is not vacuous.
// ---------------------------------------------------------------------------
const unitIssues = auditSchemaUnits(schema);
expect(
  unitIssues.length === 0,
  `schema: ${unitIssues.length} numeric propert(ies) without a unit: ${unitIssues.map((i) => i.path).join(', ')}`,
);
const syntheticUnits = auditSchemaUnits({
  type: 'object',
  properties: { capacity: { type: 'number' } },
});
expect(
  syntheticUnits.length === 1 && syntheticUnits[0].code === 'contract.unit-missing',
  'units: the audit must reject a numeric property whose name carries no unit',
);

// ---------------------------------------------------------------------------
// 4 · The four layers are separate.
// ---------------------------------------------------------------------------
const settingsWithPhysics = parseUserSettings(
  { schemaVersion: 1, display: { motion: 'system' }, battery: { nominal_capacity_kwh: 99 } },
  DEFAULT_SETTINGS,
);
expect(
  settingsWithPhysics.issues.some((issue) => issue.code === 'settings.foreign-key'),
  'settings: a scenario field in the settings document must be reported as a layer violation',
);
expect(
  settingsWithPhysics.settings.display.motion === DEFAULT_SETTINGS.display.motion,
  'settings: a foreign key must not change the setting that is in force',
);

const stale = parseUserSettings(
  { schemaVersion: 0, display: { motion: 'reduced' } },
  DEFAULT_SETTINGS,
);
expect(
  stale.issues.some((issue) => issue.code === 'settings.version'),
  'settings: a document from another schema version must be reported',
);
expect(
  stale.settings.display.motion === DEFAULT_SETTINGS.display.motion,
  'settings: an unreadable preference must fall back to the default, not to the stored value',
);

const defaults = parseUserSettings(DEFAULT_SETTINGS, DEFAULT_SETTINGS);
expect(
  defaults.issues.length === 0,
  `defaults: the shipped defaults must validate, got ${formatIssues('defaults', defaults.issues)}`,
);

// A scenario is copied whole; the defaults never fill a field.
const offGrid = resolveConfiguration({
  document: readScenario('tunis-offgrid-v1'),
  source: 'scenarios/tunis-offgrid-v1.json',
});
expect(
  offGrid.scenario.mode === 'off_grid',
  'scenario: the resolved mode must be the off-grid one',
);
expect(
  offGrid.scenario.pv.installed_dc_kwp === 6,
  'scenario: no default may overwrite a scenario value (expected the off-grid 6 kWp)',
);

// Settings may not reach the scenario.
const reduced = resolveConfiguration({
  document: readScenario(DEFAULT_SCENARIO_ID),
  source: DEFAULT_SCENARIO_SOURCE,
  settings: { schemaVersion: 1, display: { motion: 'reduced' } },
});
const unchanged = resolveConfiguration({
  document: readScenario(DEFAULT_SCENARIO_ID),
  source: DEFAULT_SCENARIO_SOURCE,
});
expect(
  reduced.presentation.motion === 'reduced',
  'settings: an accepted preference must be applied',
);
expect(
  JSON.stringify(reduced.scenario) === JSON.stringify(unchanged.scenario),
  'settings: a presentation preference must not change the scenario',
);

// A bad scenario throws the formatted report, not a bare assertion.
let thrown = null;
try {
  const tooSteep = readScenario(DEFAULT_SCENARIO_ID);
  tooSteep.pv.tilt_deg = 100;
  resolveConfiguration({ document: tooSteep, source: 'fixture.json' });
} catch (error) {
  thrown = error;
}
expect(thrown instanceof ConfigError, 'resolution: an invalid scenario must throw ConfigError');
expect(
  thrown?.message.includes('pv.tilt_deg') && thrown?.message.includes('at most 90'),
  `resolution: the thrown message must name the path and the limit, got "${thrown?.message?.split('\n')[0] ?? ''}"`,
);

// The resolved scenario is frozen, at every depth.
const frozen = resolveConfiguration({
  document: readScenario(DEFAULT_SCENARIO_ID),
  source: DEFAULT_SCENARIO_SOURCE,
});
expect(Object.isFrozen(frozen.scenario), 'resolution: the scenario must be frozen');
expect(
  Object.isFrozen(frozen.scenario.battery),
  'resolution: nested scenario objects must be frozen too',
);
let mutationBlocked = false;
try {
  frozen.scenario.battery.min_soc = 0;
} catch {
  mutationBlocked = true;
}
expect(mutationBlocked, 'resolution: writing to the resolved scenario must fail');

// Runtime state derives from the configuration and never writes back.
const runtime = createRuntimeState(frozen);
expect(
  runtime.simTimeIso === frozen.scenario.simulation.start,
  'runtime: the simulated instant must start where the scenario starts',
);
expect(
  runtime.speedMultiplier === frozen.scenario.simulation.default_speed_multiplier,
  'runtime: the speed must come from the scenario',
);
runtime.stepIndex = 12;
expect(
  frozen.scenario.simulation.seed === readScenario(DEFAULT_SCENARIO_ID).simulation.seed,
  'runtime: advancing the run must not touch the configuration',
);

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
if (failures.length > 0) {
  console.error('config: FAILED');
  for (const failure of failures) console.error(`  x ${failure}`);
  console.error(`\n${failures.length} problem(s) found`);
  process.exit(1);
}

console.log('config: OK');
console.log(
  `  scenarios: ${shipped.length} of ${shipped.length} valid through the runtime validator (schema + relations)`,
);
console.log(`  failures: ${cases.length} injected, each rejected with a path, a value and a fix`);
console.log('  units: every numeric property in the contract names its unit (audit self-tested)');
console.log(
  '  layers: defaults valid, settings refuse scenario fields, scenario frozen, runtime derived',
);
