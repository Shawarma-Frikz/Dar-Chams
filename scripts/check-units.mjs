#!/usr/bin/env node
// Proof for task 02.2: power, interval energy, temperature and state of charge
// each keep one canonical unit, and no calculation can add one to another.
//
// Three independent kinds of proof run here. The runtime checks exercise every
// conversion on the shipped scenarios and refuse a value written on the wrong
// scale. The schema audit proves the contract itself keeps SOC as a 0–1
// fraction and never stores a percentage. The type guard compiles
// `scripts/fixtures/unit-guard.ts` with tsc and requires each deliberately
// mixed calculation to fail with the diagnostic written beside it, so a brand
// that stops separating the units cannot pass silently.
//
// Usage: node scripts/check-units.mjs

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import {
  ABSOLUTE_ZERO_CELSIUS,
  addWattHours,
  addWatts,
  auditSchemaUnits,
  celsius,
  createScenarioValidator,
  intervalWattHours,
  kilowattHours,
  kilowattHoursFromWattHours,
  kilowatts,
  kilowattsFromWatts,
  percentFromStateOfCharge,
  stateOfCharge,
  stateOfChargeFromPercent,
  wattHours,
  wattHoursFromKilowattHours,
  watts,
  wattsFromKilowatts,
} from '@dar-chams/engine';

const ROOT = path.resolve('.');
const SCENARIOS = path.join(ROOT, 'scenarios');
const FIXTURE = path.join(ROOT, 'scripts', 'fixtures', 'unit-guard.ts');
const FIXTURE_TSCONFIG = path.join(ROOT, 'scripts', 'fixtures', 'tsconfig.unit-guard.json');

const problems = [];
const expect = (condition, message) => {
  if (!condition) problems.push(message);
};
const same = (actual, expected, message) => {
  const equal = JSON.stringify(actual) === JSON.stringify(expected);
  expect(equal, `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};
const close = (actual, expected, message) => {
  expect(Math.abs(actual - expected) <= 1e-12, `${message}: expected ${expected}, got ${actual}`);
};

// ---------------------------------------------------------------------------
// 1 · Every scale change is named and exact.
// ---------------------------------------------------------------------------
same(intervalWattHours(watts(2500), 15), 625, '2.5 kW for 15 minutes is 625 Wh');
same(kilowattHoursFromWattHours(wattHours(625)), 0.625, '625 Wh is 0.625 kWh');
same(wattsFromKilowatts(kilowatts(6)), 6000, '6 kW is 6000 W');
same(kilowattsFromWatts(watts(6000)), 6, '6000 W is 6 kW');
same(addWatts(watts(1000), watts(500), watts(-200)), 1300, 'powers add in watts');
same(addWattHours(wattHours(625), wattHours(375)), 1000, 'interval energies add in Wh');

// ---------------------------------------------------------------------------
// 2 · Temperature and state of charge keep their canonical scale.
// ---------------------------------------------------------------------------
same(celsius(45), 45, 'NOCT stays in °C');
same(celsius(ABSOLUTE_ZERO_CELSIUS), ABSOLUTE_ZERO_CELSIUS, 'absolute zero is a valid °C value');
same(percentFromStateOfCharge(stateOfCharge(0.5)), 50, 'half a battery is 50 %');
close(stateOfChargeFromPercent(55), 0.55, '55 % is the fraction 0.55');

// ---------------------------------------------------------------------------
// 3 · The shipped scenarios cross each boundary and stay on the fraction scale.
// ---------------------------------------------------------------------------
const schema = JSON.parse(fs.readFileSync(path.join(SCENARIOS, 'scenario.schema.json'), 'utf8'));
const validator = createScenarioValidator(schema);
const shipped = fs
  .readdirSync(SCENARIOS)
  .filter((name) => name.endsWith('.json') && name !== 'scenario.schema.json')
  .sort();

let socFields = 0;
let appliances = 0;
let percentFields = 0;
let scaleCrossings = 0;

const walk = (node, trail) => {
  if (Array.isArray(node)) {
    node.forEach((entry, index) => walk(entry, `${trail}[${index}]`));
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    const path = trail ? `${trail}.${key}` : key;
    if (key === 'soc' || key.endsWith('_soc')) {
      socFields += 1;
      expect(
        typeof value === 'number' && value >= 0 && value <= 1,
        `${path} must be a 0–1 fraction, got ${JSON.stringify(value)}`,
      );
      if (typeof value === 'number' && value >= 0 && value <= 1) stateOfCharge(value);
    }
    if (key === 'percent' || key.endsWith('_percent')) percentFields += 1;
    walk(value, path);
  }
};

for (const name of shipped) {
  const checked = validator.check(JSON.parse(fs.readFileSync(path.join(SCENARIOS, name), 'utf8')));
  expect(checked.ok, `${name} must validate before its units are read`);
  if (!checked.ok) continue;
  const { scenario } = checked;

  celsius(scenario.pv.noct_degc);
  scaleCrossings += 2;
  same(
    wattsFromKilowatts(kilowatts(scenario.inverter.rated_ac_kw)),
    scenario.inverter.rated_ac_kw * 1000,
    `${name}: the inverter rating crosses kW → W exactly`,
  );
  same(
    wattHoursFromKilowattHours(kilowattHours(scenario.battery.nominal_capacity_kwh)),
    scenario.battery.nominal_capacity_kwh * 1000,
    `${name}: the battery capacity crosses kWh → Wh exactly`,
  );
  for (const appliance of scenario.household.appliances) {
    same(
      watts(appliance.rated_power_w),
      appliance.rated_power_w,
      `${name}: ${appliance.id} is read in watts`,
    );
    appliances += 1;
  }
  walk(scenario, '');
}

expect(percentFields === 0, `no scenario may store a percentage, found ${percentFields}`);

const audit = auditSchemaUnits(schema);
expect(
  audit.length === 0,
  `the schema must be unit-complete and fraction-consistent, got ${audit
    .map((issue) => `${issue.path} (${issue.code})`)
    .join(', ')}`,
);

// ---------------------------------------------------------------------------
// 4 · The type guard: each marked calculation must fail, and only those.
// ---------------------------------------------------------------------------
const fixtureSource = fs.readFileSync(FIXTURE, 'utf8');
const marked = new Map();
fixtureSource.split(/\r?\n/).forEach((line, index) => {
  const match = /\/\/ expect (TS\d+)$/.exec(line.trim());
  if (match) marked.set(index + 1, match[1]);
});
expect(
  marked.size >= 8,
  `the fixture must mark at least 8 mixed calculations, marked ${marked.size}`,
);

const require = createRequire(import.meta.url);
let tsc = null;
try {
  tsc = require.resolve('typescript/lib/tsc.js');
} catch {
  problems.push('typescript is not installed, so the type guard cannot run');
}

let proposed = [];
if (tsc) {
  const run = spawnSync(
    process.execPath,
    [tsc, '--project', FIXTURE_TSCONFIG, '--pretty', 'false'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (run.error) problems.push(`tsc could not run: ${run.error.message}`);
  const reported = new Map();
  for (const match of String(run.stdout ?? run.stderr ?? '').matchAll(
    /unit-guard\.ts\((\d+),\d+\): error (TS\d+)/g,
  )) {
    reported.set(Number(match[1]), match[2]);
  }
  proposed = [...reported.entries()].sort((a, b) => a[0] - b[0]);
  const expected = [...marked.entries()].sort((a, b) => a[0] - b[0]);
  same(proposed, expected, 'tsc must reject exactly the marked mixed-unit calculations');
}

// ---------------------------------------------------------------------------
// 5 · Negative proofs: each value on the wrong scale is refused.
// ---------------------------------------------------------------------------
const negatives = [];
const rejected = (labelText, action, pattern) => {
  let error = null;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  const passed = error !== null && pattern.test(error.message);
  expect(
    passed,
    `${labelText} must be rejected with ${String(pattern)}, got ${error ? `"${error.message}"` : 'no error'}`,
  );
  if (passed) negatives.push(labelText);
};

rejected('a power that is not finite', () => watts(Number.NaN), /finite/);
rejected('a negative interval', () => intervalWattHours(watts(1000), -15), /negative/);
rejected('a state of charge written as a percentage', () => stateOfCharge(55), /0–1 fraction/);
rejected('a state of charge below zero', () => stateOfCharge(-0.01), /0–1 fraction/);
rejected('a percentage above 100', () => stateOfChargeFromPercent(101), /between 0 and 100/);
rejected('a temperature below absolute zero', () => celsius(-300), /absolute zero/);

const socInjected = structuredClone(schema);
socInjected.properties.battery.properties.max_soc.maximum = 100;
const socIssue = auditSchemaUnits(socInjected).find(
  (issue) => issue.code === 'contract.soc-scale' && issue.path === 'battery.max_soc',
);
expect(socIssue !== undefined, 'a schema that lets SOC reach 100 must be reported');
if (socIssue) negatives.push('a schema whose SOC bound is a percentage');

const percentInjected = structuredClone(schema);
percentInjected.properties.battery.properties.soc_percent = { type: 'number' };
const percentIssue = auditSchemaUnits(percentInjected).find(
  (issue) => issue.code === 'contract.percent-stored' && issue.path === 'battery.soc_percent',
);
expect(percentIssue !== undefined, 'a schema field that stores a percentage must be reported');
if (percentIssue) negatives.push('a schema field that stores a percentage');

const temperatureInjected = structuredClone(schema);
temperatureInjected.properties.pv.properties.noct_degc.minimum = -300;
const temperatureIssue = auditSchemaUnits(temperatureInjected).find(
  (issue) => issue.code === 'contract.temperature-range' && issue.path === 'pv.noct_degc',
);
expect(temperatureIssue !== undefined, 'a schema bound below absolute zero must be reported');
if (temperatureIssue) negatives.push('a schema bound below absolute zero');

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
if (problems.length > 0) {
  console.error('units: FAILED');
  for (const problem of problems) console.error(`  x ${problem}`);
  console.error(`\n${problems.length} problem(s) found`);
  process.exit(1);
}

console.log('units: OK');
console.log(
  '  scales: 2500 W × 15 min = 625 Wh = 0.625 kWh; 6 kW = 6000 W; powers and interval energies add in their own unit',
);
console.log('  fraction: SOC stays 0–1; 0.5 ↔ 50 %, a percentage is refused as a fraction');
console.log(
  `  temperature: 45 °C accepted, absolute zero is ${String(ABSOLUTE_ZERO_CELSIUS).replace('-', '−')} °C, −273.16 °C refused`,
);
console.log(
  `  scenarios: ${shipped.length} checked, ${socFields} SOC fractions in range, ${appliances} appliance powers, ` +
    `${scaleCrossings} kW→W and kWh→Wh crossings, schema audit clean`,
);
console.log(
  `  type guard: tsc rejected ${proposed.length} mixed-unit calculations and no other line`,
);
console.log(`  negative: ${negatives.length} broken cases detected (${negatives.join(', ')})`);
