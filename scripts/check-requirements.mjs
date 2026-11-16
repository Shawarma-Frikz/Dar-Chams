#!/usr/bin/env node
// Dependency-free structural checks for the requirements register.
// Run from the repository root: node scripts/check-requirements.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const problems = [];
const fail = (msg) => problems.push(msg);

const requirements = read('docs/requirements.md');
const scopeBrief = read('docs/00-scope-brief.md');
const checklist = read('docs/acceptance-checklist.md');

const rows = requirements.split(/\r?\n/).filter((l) => l.trim().startsWith('|'));

function cells(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
}

const reqRows = [];
const conRows = [];
const exRows = [];

for (const line of rows) {
  const c = cells(line);
  if (/^FR-[A-Z]+-\d{2}$/.test(c[0]) || /^NFR-\d{2}$/.test(c[0])) {
    if (c.length !== 6) {
      fail(
        `${c[0]}: expected 6 cells (ID, requirement, priority, verify, depends on, phase), found ${c.length}`,
      );
      continue;
    }
    reqRows.push({ id: c[0], text: c[1], pri: c[2], verify: c[3], deps: c[4], phase: c[5] });
  } else if (/^CON-\d{2}$/.test(c[0])) {
    if (c.length !== 5) {
      fail(`${c[0]}: expected 5 cells, found ${c.length}`);
      continue;
    }
    conRows.push({ id: c[0], text: c[1], source: c[2], verify: c[3], consequence: c[4] });
  } else if (/^EX-\d{2}$/.test(c[0])) {
    if (c.length !== 5) {
      fail(`${c[0]}: expected 5 cells, found ${c.length}`);
      continue;
    }
    exRows.push({ id: c[0], name: c[1], usedBy: c[2], fallback: c[3], impact: c[4] });
  }
}

// Identity: unique, contiguous numbering per class.
const allIds = [...reqRows, ...conRows, ...exRows].map((r) => r.id);
const seen = new Set();
for (const id of allIds) {
  if (seen.has(id)) fail(`duplicate ID: ${id}`);
  seen.add(id);
}

function checkSequence(prefix, list) {
  list.forEach((row, i) => {
    const expected = `${prefix}-${String(i + 1).padStart(2, '0')}`;
    if (row.id !== expected) fail(`ID gap: expected ${expected}, found ${row.id}`);
  });
}
checkSequence('CON', conRows);
checkSequence('EX', exRows);
checkSequence(
  'NFR',
  reqRows.filter((r) => r.id.startsWith('NFR')),
);

// Required fields and controlled vocabularies.
const verified = new Set(['T', 'A', 'I', 'D']);
for (const r of reqRows) {
  if (!r.text) fail(`${r.id}: empty requirement text`);
  if (!['M', 'S', 'C'].includes(r.pri)) fail(`${r.id}: priority "${r.pri}" is not M, S or C`);
  if (!r.phase) fail(`${r.id}: missing phase`);
  for (const token of r.verify.split(',').map((t) => t.trim())) {
    if (!verified.has(token)) fail(`${r.id}: verification "${token}" is not T, A, I or D`);
  }
}
for (const c of conRows) {
  if (!c.source) fail(`${c.id}: missing source`);
  if (!c.consequence) fail(`${c.id}: missing consequence`);
  if (!c.verify) fail(`${c.id}: missing verification`);
}
for (const e of exRows) {
  if (!e.usedBy) fail(`${e.id}: missing "used by"`);
  if (!e.fallback) fail(`${e.id}: missing fallback`);
  if (!e.impact) fail(`${e.id}: missing impact`);
}

// Dependencies: must resolve to a known requirement, SCN, or an external dependency.
const known = new Set([...reqRows.map((r) => r.id), ...exRows.map((e) => e.id), 'SCN']);
const graph = new Map();
for (const r of reqRows) {
  const deps =
    r.deps === '—'
      ? []
      : r.deps
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean);
  for (const d of deps) {
    if (!known.has(d)) fail(`${r.id}: unknown dependency "${d}"`);
    if (d === r.id) fail(`${r.id}: depends on itself`);
  }
  graph.set(
    r.id,
    deps.filter((d) => d.startsWith('FR-') || d.startsWith('NFR-')),
  );
}

// Cycle detection (DFS, three colours).
const state = new Map();
function visit(id, trail) {
  if (state.get(id) === 'done') return;
  if (state.get(id) === 'open') {
    fail(`dependency cycle: ${[...trail, id].join(' -> ')}`);
    return;
  }
  state.set(id, 'open');
  for (const dep of graph.get(id) ?? []) visit(dep, [...trail, id]);
  state.set(id, 'done');
}
for (const id of graph.keys()) visit(id, []);

// Constraint source references must resolve to an AS, decision, NFR or claim gate.
for (const c of conRows) {
  for (const ref of c.source.match(/(?:AS|DEC|NFR|FR|CON)-\d{2}|claim gate/g) ?? []) {
    if (!/^AS-|^DEC-/.test(ref) && !seen.has(ref) && ref !== 'claim gate') {
      fail(`${c.id}: source "${ref}" is not defined`);
    }
  }
}

// Vague wording.
const banned = [
  'smart',
  'modern',
  'robust',
  'user-friendly',
  'intuitive',
  'seamless',
  'powerful',
  'state-of-the-art',
  'various',
  'appropriate',
  'reasonable',
  'as needed',
  'if possible',
  'nice',
];
for (const r of reqRows) {
  const lower = r.text.toLowerCase();
  for (const word of banned) {
    const stem = word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '[ -]');
    const re = new RegExp(`(^|[^a-z0-9])${stem}[a-z]*([^a-z0-9]|$)`);
    if (re.test(lower)) fail(`${r.id}: banned vague term "${word}"`);
  }
  if (/(^|\W)etc\./.test(lower)) fail(`${r.id}: banned vague term "etc."`);
}

// Every Must requirement must be mapped in scope brief section 6.
const section6 = scopeBrief.split('## 6 · MVP boundary')[1]?.split('## 7 · Non-goals')[0] ?? '';
const mapped = new Set();
for (const m of section6.matchAll(/((?:FR-[A-Z]+|NFR)-)(\d{2})[–-](\d{2})(?!\d)/g)) {
  for (let i = +m[2]; i <= +m[3]; i += 1) mapped.add(`${m[1]}${String(i).padStart(2, '0')}`);
}
for (const m of section6.matchAll(/\b((?:FR-[A-Z]+|NFR)-\d{2})\b/g)) mapped.add(m[1]);
for (const r of reqRows.filter((x) => x.pri === 'M')) {
  if (!mapped.has(r.id)) fail(`${r.id}: Must requirement is not mapped in scope brief section 6`);
}

// Acceptance criteria referenced here must exist in the checklist.
const definedAc = new Set([...checklist.matchAll(/^\| (AC-\d{2}) \|/gm)].map((m) => m[1]));
for (const m of requirements.matchAll(/\bAC-\d{2}\b/g)) {
  if (!definedAc.has(m[0])) fail(`unknown acceptance criterion reference: ${m[0]}`);
}

// Declared counts in section 13 must match the tables.
const must = reqRows.filter((r) => r.pri === 'M').length;
const should = reqRows.filter((r) => r.pri === 'S').length;
const could = reqRows.filter((r) => r.pri === 'C').length;
const fr = reqRows.filter((r) => r.id.startsWith('FR-')).length;
const nfr = reqRows.filter((r) => r.id.startsWith('NFR')).length;

function declared(label) {
  const m = requirements.match(new RegExp(`\\| ${label} \\| (\\d+)`, 'm'));
  return m ? Number(m[1]) : null;
}
function expect(label, actual) {
  const value = declared(label);
  if (value === null) fail(`section 13: missing declared count for "${label}"`);
  else if (value !== actual)
    fail(`section 13: "${label}" declares ${value}, register has ${actual}`);
}
expect('Functional requirements', fr);
expect('Non-functional requirements', nfr);
expect('Constraints', conRows.length);
expect('External dependencies', exRows.length);
const prioDecl = requirements.match(/\| Priorities \| (\d+) Must, (\d+) Should, (\d+) Could \|/);
if (!prioDecl) fail('section 13: missing declared priority mix');
else if (+prioDecl[1] !== must || +prioDecl[2] !== should || +prioDecl[3] !== could) {
  fail(
    `section 13: priority mix declares ${prioDecl[1]}/${prioDecl[2]}/${prioDecl[3]}, register has ${must}/${should}/${could}`,
  );
}
const gateDecl = requirements.match(/\| Project-level gates \| (\d+) criteria/);
if (!gateDecl) fail('section 13: missing declared gate count');
else if (+gateDecl[1] !== definedAc.size) {
  fail(`section 13: ${gateDecl[1]} gates declared, checklist defines ${definedAc.size}`);
}

if (problems.length) {
  console.error('requirements register: FAILED');
  for (const p of problems) console.error(`  x ${p}`);
  console.error(`\n${problems.length} problem(s) found`);
  process.exit(1);
}

console.log(`requirements register: OK`);
console.log(
  `  ${fr} FR, ${nfr} NFR, ${conRows.length} constraints, ${exRows.length} external dependencies`,
);
console.log(`  priorities: ${must} M, ${should} S, ${could} C`);
console.log(`  dependencies: ${[...graph.values()].flat().length} edges, 0 unresolved, 0 cycles`);
console.log(`  Must coverage: ${must}/${must} mapped in scope brief section 6`);
console.log(`  acceptance criteria: ${definedAc.size} defined, all references resolve`);
console.log(`  vague wording: none`);
