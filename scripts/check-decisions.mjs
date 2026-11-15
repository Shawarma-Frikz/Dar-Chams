#!/usr/bin/env node
// Dependency-free checks for the decision log.
// Run from the repository root: node scripts/check-decisions.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const problems = [];
const fail = (msg) => problems.push(msg);

const log = read('docs/decision-log.md');
const requirements = read('docs/requirements.md');
const scopeBrief = read('docs/00-scope-brief.md');
const lines = log.split(/\r?\n/);

function cells(line) {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

// Header fields.
const header = lines.slice(0, 16).join('\n');
for (const field of ['Version', 'Date', 'Phase', 'Owner']) {
  if (!new RegExp(`\\| ${field} \\| [^|]+\\|`).test(header)) {
    fail(`header: missing or empty field "${field}"`);
  }
}

// Index table: contiguous IDs, controlled status, ISO dates.
const index = [];
for (const line of lines) {
  const c = cells(line);
  if (/^DEC-\d{3}$/.test(c[0])) {
    if (c.length !== 4) {
      fail(`${c[0]}: expected 4 cells (ID, decision, status, date), found ${c.length}`);
      continue;
    }
    index.push({ id: c[0], title: c[1], status: c[2], date: c[3] });
  }
}
index.forEach((row, i) => {
  const expected = `DEC-${String(i + 1).padStart(3, '0')}`;
  if (row.id !== expected) fail(`index: expected ${expected}, found ${row.id}`);
  if (!row.title) fail(`${row.id}: empty decision title`);
  if (!['Accepted', 'Superseded', 'Rejected'].includes(row.status)) {
    fail(`${row.id}: status "${row.status}" is not Accepted, Superseded or Rejected`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) fail(`${row.id}: date "${row.date}" is not ISO`);
});
if (!index.length) fail('index: no DEC rows found');

// Body sections: one per index entry, each with decision, rejected
// alternatives and consequences — the task 00.7 contract.
const defined = new Set(index.map((r) => r.id));
const bodyIds = new Set();
const bodies = new Map();
for (const m of log.matchAll(/^## (DEC-\d{3}) · (.+)$/gm)) {
  if (bodyIds.has(m[1])) fail(`${m[1]}: duplicate body section`);
  bodyIds.add(m[1]);
  bodies.set(m[1], m[2]);
}
for (const row of index) {
  if (!bodyIds.has(row.id)) fail(`${row.id}: in the index but has no body section`);
}
for (const id of bodyIds) {
  if (!defined.has(id)) fail(`${id}: body section exists but is not in the index`);
}
for (const id of bodyIds) {
  const start = log.indexOf(`## ${id} · `);
  const next = log.indexOf('\n## DEC-', start + 1);
  const body = log.slice(start, next === -1 ? undefined : next);
  for (const part of ['**Decision.**', '**Alternatives rejected.**', '**Consequences.**']) {
    if (!body.includes(part)) fail(`${id}: body is missing ${part}`);
  }
}

// Task 00.7 required topics, each mapped to the entry that records it.
const topics = {
  framework: ['DEC-002', 'DEC-025'],
  units: ['DEC-004'],
  timestep: ['DEC-003'],
  'weather source': ['DEC-006'],
  'battery model': ['DEC-007'],
  '3D approach': ['DEC-015'],
  persistence: ['DEC-014'],
  'optimization method': ['DEC-009'],
};
for (const [topic, ids] of Object.entries(topics)) {
  for (const id of ids) {
    if (!defined.has(id)) fail(`task 00.7 topic "${topic}": ${id} is not defined`);
  }
}

// Internal references in the body must resolve.
for (const m of log.matchAll(/\bDEC-(\d{3})\b/g)) {
  const id = `DEC-${m[1]}`;
  if (!defined.has(id)) fail(`${id}: referenced in the log but not defined`);
}

// Outgoing references: requirements, provenance, register and scope brief
// must not cite decisions that do not exist.
const externalSources = ['docs/requirements.md', 'docs/data-provenance.md', 'docs/metric-register.json', 'docs/00-scope-brief.md', 'docs/acceptance-checklist.md'];
for (const rel of externalSources) {
  const text = read(rel);
  for (const m of text.matchAll(/\bDEC-(\d{3})\b/g)) {
    if (!defined.has(`DEC-${m[1]}`)) fail(`DEC-${m[1]}: referenced in ${rel} but not defined`);
  }
}

// Assumption references in constraint sources must resolve to the scope
// brief assumption table.
const assumptionIds = new Set([...scopeBrief.matchAll(/^\| (AS-\d{2}) \|/gm)].map((m) => m[1]));
for (const m of requirements.matchAll(/\bAS-(\d{2})\b/g)) {
  if (!assumptionIds.has(`AS-${m[1]}`)) fail(`AS-${m[1]}: referenced in requirements but not defined in the scope brief`);
}

// Requirement references in the decision log must resolve to the register.
const reqIds = new Set();
for (const m of requirements.matchAll(/\b((?:FR-[A-Z]+|NFR|CON|EX)-\d{2})\b/g)) reqIds.add(m[1]);
for (const m of log.matchAll(/\b((?:FR-[A-Z]+|NFR)-\d{2})\b/g)) {
  if (!reqIds.has(m[1])) fail(`${m[1]}: referenced in the decision log but not in the requirements register`);
}

if (problems.length) {
  console.error('decision log: FAILED');
  for (const p of problems) console.error(`  x ${p}`);
  console.error(`\n${problems.length} problem(s) found`);
  process.exit(1);
}

console.log('decision log: OK');
console.log(`  entries: ${index.length}, index and body in sync, all with rejected alternatives`);
console.log(`  task 00.7 topics: ${Object.keys(topics).length}/8 covered`);
console.log(`  references: DEC, AS and FR/NFR references all resolve`);
