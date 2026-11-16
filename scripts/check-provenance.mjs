#!/usr/bin/env node
// Dependency-free checks for the metric register and its documentation.
// Run from the repository root: node scripts/check-provenance.mjs
// Regenerate the register table in docs/data-provenance.md: node scripts/check-provenance.mjs --write

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const docPath = path.join(root, 'docs/data-provenance.md');
const register = JSON.parse(read('docs/metric-register.json'));
const doc = fs.readFileSync(docPath, 'utf8');

const problems = [];
const fail = (msg) => problems.push(msg);

const CLASS_WORDS = {
  M: 'measured',
  X: 'external',
  S: 'simulated',
  F: 'forecast',
  E: 'inferred',
  D: 'derived',
  C: 'configured',
};

// Canonical unit -> display units allowed by FR-SIM-03 and DEC-004.
const DISPLAY_UNITS = {
  W: ['W', 'kW'],
  kW: ['kW'],
  Wh: ['Wh', 'kWh'],
  kWh: ['kWh'],
  'kWh/kWp': ['kWh/kWp'],
  kWp: ['kWp'],
  'W/m²': ['W/m²'],
  '°C': ['°C'],
  'm/s': ['m/s'],
  '%': ['%'],
  ratio: ['ratio'],
  TND: ['TND'],
  kg: ['kg'],
  h: ['h', 'min'],
  '°': ['°'],
  count: ['count'],
  state: ['state'],
  unitless: ['unitless'],
  '×': ['×'],
  time: ['time'],
};

const GATE = /^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/;
const FORBIDDEN_LABEL = /\b(measured|actual|real|live|observed|metered|sensor)\b/i;

const metrics = Array.isArray(register.metrics) ? register.metrics : [];
const byId = new Map();
const seenLabels = new Map();

// Identity and field checks.
metrics.forEach((m, i) => {
  const expected = `MET-${String(i + 1).padStart(2, '0')}`;
  if (m.id !== expected) fail(`ID gap: expected ${expected}, found ${m.id}`);
  if (byId.has(m.id)) fail(`duplicate ID: ${m.id}`);
  byId.set(m.id, m);
  if (m.label) {
    if (seenLabels.has(m.label))
      fail(`${m.id}: label "${m.label}" duplicates ${seenLabels.get(m.label)}`);
    seenLabels.set(m.label, m.id);
  }
});

let inputEdges = 0;
const rank = { always: 0, conditional: 1, disabled: 2 };
const availabilityKind = (a) => String(a).split(':')[0];

for (const m of metrics) {
  const where = m.id ?? '(no id)';
  if (!m.group) fail(`${where}: missing group`);
  if (!m.label) fail(`${where}: missing label`);
  else if (FORBIDDEN_LABEL.test(m.label)) {
    fail(`${where}: label "${m.label}" implies measurement; v1 has no measured values`);
  }
  if (!m.source) fail(`${where}: missing source`);

  if (!Object.hasOwn(DISPLAY_UNITS, m.unit)) fail(`${where}: unknown canonical unit "${m.unit}"`);
  else if (!DISPLAY_UNITS[m.unit].includes(m.display_unit)) {
    fail(`${where}: display unit "${m.display_unit}" is not a legal conversion of "${m.unit}"`);
  }
  if (!Number.isInteger(m.decimals) || m.decimals < 0 || m.decimals > 4) {
    fail(`${where}: decimals must be an integer 0..4`);
  }

  const classes = Array.isArray(m.classes) ? m.classes : [];
  if (classes.length === 0) fail(`${where}: at least one class is required`);
  for (const c of classes) {
    if (!Object.hasOwn(CLASS_WORDS, c))
      fail(`${where}: class "${c}" is not one of M, X, S, F, E, D, C`);
  }

  const availability = String(m.availability ?? '');
  const kind = availabilityKind(availability);
  if (!['always', 'conditional', 'disabled'].includes(kind) || !availability) {
    fail(`${where}: availability must be always, conditional:<gate> or disabled:<gate>`);
  } else if (kind !== 'always') {
    const gate = availability.slice(kind.length + 1);
    if (!GATE.test(gate))
      fail(`${where}: availability gate "${gate}" is not a dotted scenario field`);
  }
  if (kind === 'disabled' && !m.reason) fail(`${where}: a disabled metric must state a reason`);

  // Class M is legal only for a bench channel behind a hardware gate: no
  // measured value exists until the node is attached (DEC-027).
  if (classes.includes('M')) {
    if (kind === 'always') {
      fail(
        `${where}: class M must be conditional or disabled until the bench node is attached (DEC-027)`,
      );
    } else if (!availability.slice(kind.length + 1).startsWith('hardware.')) {
      fail(`${where}: class M requires a hardware.* availability gate (DEC-027)`);
    }
  }

  const inputs = m.inputs ?? [];
  if (!Array.isArray(inputs)) fail(`${where}: inputs must be an array`);
  if (new Set(inputs).size !== inputs.length) fail(`${where}: duplicate input metric`);
  if (classes.includes('D') && inputs.length === 0) {
    fail(`${where}: a derived metric must name at least one input metric`);
  }
  for (const dep of inputs) {
    if (!byId.has(dep)) fail(`${where}: unknown input "${dep}"`);
    if (dep === m.id) fail(`${where}: cannot derive from itself`);
    inputEdges += 1;
  }

  if (classes.includes('F')) {
    const f = m.forecast;
    if (!f || f.issue_time !== true) fail(`${where}: a forecast must require an issue time`);
    if (!f || !Array.isArray(f.horizon_hours) || f.horizon_hours.length !== 2) {
      fail(`${where}: a forecast must declare horizon_hours as [min, max]`);
    }
  }
}

// A metric cannot be more available than the least available metric it reads.
for (const m of metrics) {
  const own = rank[availabilityKind(m.availability)] ?? 0;
  for (const dep of m.inputs ?? []) {
    const input = byId.get(dep);
    if (!input) continue;
    const theirs = rank[availabilityKind(input.availability)] ?? 0;
    if (theirs > own) {
      fail(`${m.id}: available while its input ${dep} is not (${input.availability})`);
    }
  }
}

// Input graph must be acyclic.
const state = new Map();
function visit(id, trail) {
  if (state.get(id) === 'done') return;
  if (state.get(id) === 'open') {
    fail(`input cycle: ${[...trail, id].join(' -> ')}`);
    return;
  }
  const m = byId.get(id);
  if (!m) return;
  state.set(id, 'open');
  for (const dep of m.inputs ?? []) visit(dep, [...trail, id]);
  state.set(id, 'done');
}
for (const m of metrics) visit(m.id, []);

// Register table: single source of truth is the JSON, the document is generated from it.
function availabilityText(a) {
  if (a === 'always') return 'Always';
  const [kind, gate] = a.split(':');
  return kind === 'conditional' ? `Only when \`${gate}\`` : `Disabled until \`${gate}\``;
}

function displayText(m) {
  if (m.unit === 'state') return 'state';
  if (m.unit === 'time') return 'site timezone';
  return `${m.display_unit} · ${m.decimals} dp`;
}

function renderTable() {
  const order = [];
  for (const m of metrics) if (!order.includes(m.group)) order.push(m.group);
  const lines = [
    '_Generated from [`metric-register.json`](metric-register.json) by `scripts/check-provenance.mjs`. Do not edit these tables by hand; edit the JSON and run `node scripts/check-provenance.mjs --write`._',
    '',
  ];
  for (const group of order) {
    lines.push(`#### ${group}`, '');
    lines.push(
      '| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |',
    );
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const m of metrics.filter((x) => x.group === group)) {
      lines.push(
        `| ${m.id} | ${m.label} | ${m.unit} | ${m.classes.join(' / ')} | ${m.source.replace(/\|/g, '\\|')} | ${
          (m.inputs ?? []).join(', ') || '—'
        } | ${availabilityText(m.availability)} | ${displayText(m)} |`,
      );
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

const START = '<!-- metric-register:start -->';
const END = '<!-- metric-register:end -->';
const startAt = doc.indexOf(START);
const endAt = doc.indexOf(END);
if (startAt === -1 || endAt === -1 || endAt < startAt) {
  fail('docs/data-provenance.md is missing the metric-register markers');
} else {
  const current = doc.slice(startAt + START.length, endAt).trim();
  const generated = renderTable();
  if (current !== generated) {
    if (process.argv.includes('--write')) {
      const next =
        doc.slice(0, startAt + START.length) + '\n' + generated + '\n' + doc.slice(endAt);
      fs.writeFileSync(docPath, next);
      console.log('provenance register: table regenerated in docs/data-provenance.md');
    } else {
      fail('register table is out of date; run: node scripts/check-provenance.mjs --write');
    }
  }
}

// Declared counts in the document must match the register.
const counts = { total: metrics.length, always: 0, conditional: 0, disabled: 0 };
for (const m of metrics) counts[availabilityKind(m.availability)] += 1;

const classCounts = new Map();
for (const m of metrics) {
  const key = m.classes.join('/');
  classCounts.set(key, (classCounts.get(key) ?? 0) + 1);
}

function declared(label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = doc.match(new RegExp(`\\| ${escaped} \\| (\\d+) \\|`, 'm'));
  if (!m) {
    fail(`document: missing declared count for "${label}"`);
    return null;
  }
  return Number(m[1]);
}
const totalDecl = declared('Registered metrics');
const alwaysDecl = declared('Always available');
const condDecl = declared('Conditional');
const disabledDecl = declared('Disabled by a data gate');
if (totalDecl !== null && totalDecl !== counts.total) {
  fail(`document: "Registered metrics" declares ${totalDecl}, register has ${counts.total}`);
}
if (alwaysDecl !== null && alwaysDecl !== counts.always) {
  fail(`document: "Always available" declares ${alwaysDecl}, register has ${counts.always}`);
}
if (condDecl !== null && condDecl !== counts.conditional) {
  fail(`document: "Conditional" declares ${condDecl}, register has ${counts.conditional}`);
}
if (disabledDecl !== null && disabledDecl !== counts.disabled) {
  fail(
    `document: "Disabled by a data gate" declares ${disabledDecl}, register has ${counts.disabled}`,
  );
}

const CLASS_ROWS = {
  'Measured (M)': 'M',
  'Measured or simulated (M / S)': 'M/S',
  'Weather (X / S)': 'X/S',
  'Simulated (S)': 'S',
  'Forecast (F)': 'F',
  'Inferred (E)': 'E',
  'Derived (D)': 'D',
  'Configured (C)': 'C',
};
for (const [label, key] of Object.entries(CLASS_ROWS)) {
  const value = declared(label);
  const actual = classCounts.get(key) ?? 0;
  if (value !== null && value !== actual) {
    fail(`document: "${label}" declares ${value}, register has ${actual}`);
  }
}

if (problems.length) {
  console.error('provenance register: FAILED');
  for (const p of problems) console.error(`  x ${p}`);
  console.error(`\n${problems.length} problem(s) found`);
  process.exit(1);
}

const classSummary = [...classCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${v} ${k}`)
  .join(', ');
const groups = new Set(metrics.map((m) => m.group)).size;

console.log('provenance register: OK');
console.log(`  ${counts.total} metrics in ${groups} groups; classes: ${classSummary}`);
console.log(
  `  availability: ${counts.always} always, ${counts.conditional} conditional, ${counts.disabled} disabled`,
);
console.log(`  derived inputs: ${inputEdges} edges, 0 unresolved, 0 cycles`);
console.log(`  register table: in sync with docs/data-provenance.md`);
console.log(`  labels: no measurement wording`);
