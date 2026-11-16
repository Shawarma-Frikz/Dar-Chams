#!/usr/bin/env node
// Dependency-free checks for the signed acceptance checklist.
// Run from the repository root: node scripts/check-acceptance.mjs

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const problems = [];
const fail = (msg) => problems.push(msg);

const checklist = read('docs/acceptance-checklist.md');
const lines = checklist.split(/\r?\n/);

function cells(line) {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

// Row schemas are parsed from the edges (ID first, status last) because
// threshold text can contain unescaped pipes (e.g. "|residual| ≤ ...").
function row(line) {
  const c = cells(line);
  return { id: c[0], body: c.slice(1, -1), status: c.at(-1) };
}
const clean = (s) => s.replace(/\*/g, '');

// Header fields.
const header = lines.slice(0, 20).join('\n');
for (const field of ['Version', 'Date', 'Phase', 'Owner', 'Content digest \\(sha256\\)']) {
  if (!new RegExp(`\\| ${field} \\| [^|]+\\|`).test(header)) {
    fail(`header: missing or empty field "${field}"`);
  }
}

// Signature digest: sha256 of the whole document with the recorded digest
// replaced by its placeholder. Any edit after signing breaks this check.
const digestRow = header.match(/\| Content digest \(sha256\) \| `?([0-9a-f]{64})`? \|/);
if (!digestRow) {
  fail('header: content digest is not a sha256 hex string');
} else {
  const recorded = digestRow[1];
  if (checklist.split(recorded).length - 1 !== 1) fail('signature: digest hex must appear exactly once');
  const canonical = checklist.replace(/\r\n/g, '\n').split(recorded).join('«DIGEST»');
  const actual = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  if (actual !== recorded) {
    fail('signature: content digest does not match the document; renew the digest and sign-off after any edit');
  }
}

// Section A: phase-00 task rows.
const taskRows = [];
for (const line of lines) {
  const r = row(line);
  if (/^00\.\d+$/.test(r.id)) {
    if (r.body.length < 2) {
      fail(`${r.id}: expected 4 cells (task, criterion, artifact, status), found ${r.body.length + 2}`);
      continue;
    }
    taskRows.push({ id: r.id, status: clean(r.status) });
  }
}
for (let i = 1; i <= 7; i += 1) {
  const id = `00.${i}`;
  if (!taskRows.some((r) => r.id === id)) fail(`section A: missing task row ${id}`);
}
for (const r of taskRows) {
  if (!/^Met(\s|$|—)/.test(r.status)) fail(`${r.id}: status "${r.status}" is not Met`);
}

// Section B: acceptance criteria.
const acRows = [];
for (const line of lines) {
  const r = row(line);
  if (/^AC-\d{2}$/.test(r.id)) {
    if (r.body.length < 3) {
      fail(`${r.id}: expected 5 cells (ID, criterion, threshold, evidence, status), found ${r.body.length + 2}`);
      continue;
    }
    acRows.push({
      id: r.id,
      criterion: r.body[0],
      threshold: r.body.slice(1, -1).join(' | '),
      evidence: r.body.at(-1),
      status: clean(r.status),
    });
  }
}
const acIds = new Set(acRows.map((r) => r.id));
if (acIds.size !== acRows.length) fail('section B: duplicate AC ID');
for (const r of acRows) {
  if (!r.criterion) fail(`${r.id}: empty criterion`);
  if (!r.threshold) fail(`${r.id}: empty threshold`);
  if (!r.evidence) fail(`${r.id}: empty evidence`);
  if (!/^(Met|Pending\b)/.test(r.status)) fail(`${r.id}: status "${r.status}" is not Met or Pending`);
  if (/etc\.|various|appropriate|reasonable|as needed/i.test(r.threshold)) {
    fail(`${r.id}: threshold uses vague wording`);
  }
}

// Task 00.6 headline targets: every roadmap target must be covered by a
// defined criterion with a threshold.
const headline = {
  'energy-balance closure': ['AC-01'],
  'deterministic replay': ['AC-02'],
  'valid state transitions': ['AC-03', 'AC-23'],
  'baseline-vs-optimizer comparison': ['AC-09', 'AC-10', 'AC-11', 'AC-12'],
  'forecast error reporting': ['AC-07'],
  'stable demo performance': ['AC-18', 'AC-19'],
};
for (const [target, ids] of Object.entries(headline)) {
  for (const id of ids) {
    if (!acIds.has(id)) fail(`task 00.6 target "${target}": ${id} is not defined`);
  }
}

// Decision gates.
for (const gate of ['Physics gate', 'Data gate', 'Optimizer gate', '3D gate', 'Hardware gate', 'Embedded gate', 'Claim gate']) {
  if (!checklist.includes(`| ${gate} |`)) fail(`section C: missing decision gate "${gate}"`);
}
const gateSection = checklist.split('## C · Decision gates')[1]?.split('## D · Sign-off')[0] ?? '';
const gateCount = gateSection
  .split(/\r?\n/)
  .filter((l) => /^\| .+ \| .+ \|$/.test(l) && !l.startsWith('| Gate ') && !/^\| -/.test(l)).length;

// Sign-off.
const signOff = checklist.split('## D · Sign-off')[1] ?? '';
const authorRow = signOff.split('\n').find((l) => l.startsWith('| Author'));
if (!authorRow) fail('section D: missing author sign-off row');
else {
  const c = cells(authorRow);
  if (c.length !== 4 || c.slice(1, 3).some((x) => !x) || !c[3]) {
    fail('section D: author sign-off row must have name, date and signature');
  }
}

// Cross-document AC references must resolve to defined criteria.
const sources = ['docs/00-scope-brief.md', 'docs/data-provenance.md', 'docs/decision-log.md', 'docs/metric-register.json'];
const referenced = new Set();
for (const rel of sources) {
  const text = read(rel);
  for (const m of text.matchAll(/\bAC-(\d{2})\s+to\s+AC-(\d{2})\b/g)) {
    for (let i = +m[1]; i <= +m[2]; i += 1) referenced.add(`AC-${String(i).padStart(2, '0')}`);
  }
  for (const m of text.matchAll(/\bAC-(\d{2})\b/g)) referenced.add(m[0]);
}
for (const id of referenced) {
  if (!acIds.has(id)) fail(`${id}: referenced in ${sources.join(', ')} but not defined in the checklist`);
}

// Threshold rules paragraph and provisional markers must stay consistent.
if (!checklist.includes('frozen before the final experiment')) {
  fail('threshold rules: freezing rule paragraph is missing');
}
const provisional = acRows.filter((r) => r.threshold.includes('*provisional*')).map((r) => r.id);

if (problems.length) {
  console.error('acceptance checklist: FAILED');
  for (const p of problems) console.error(`  x ${p}`);
  console.error(`\n${problems.length} problem(s) found`);
  process.exit(1);
}

console.log('acceptance checklist: OK');
console.log(`  signature: content digest valid — signed content is unmodified`);
console.log(`  tasks: ${taskRows.length}/7 phase-00 rows Met`);
console.log(`  criteria: ${acRows.length} defined, ${referenced.size} cross-document references resolve`);
console.log(`  task 00.6 targets: ${Object.keys(headline).length}/6 covered`);
console.log(`  provisional thresholds: ${provisional.join(', ') || 'none'} (frozen per task 11.1)`);
console.log(`  decision gates: ${gateCount} present, sign-off complete`);
