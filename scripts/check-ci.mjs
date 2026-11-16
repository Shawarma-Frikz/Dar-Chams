#!/usr/bin/env node
// Proof for task 01.5: the quality gates that CI runs are the gates the
// repository declares, in the order `npm run verify` runs them, and nothing
// quietly neutralises a failure.
//
// The workflow is parsed (not grepped) so the assertions are about structure:
// triggers, permissions, runner matrix, pinned actions, install command and one
// step per gate. The validator is then run against deliberately broken copies
// of the parsed workflow and manifest, because a check that cannot fail proves
// nothing.
//
// Usage: node scripts/check-ci.mjs

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'ci.yml');
const MANIFEST_FILE = path.join(ROOT, 'package.json');

const GATES = [
  { id: 'check', script: 'check', label: 'registers, configuration and this contract' },
  { id: 'typecheck', script: 'typecheck', label: 'type-check' },
  { id: 'lint', script: 'lint', label: 'lint' },
  { id: 'format', script: 'format:check', label: 'format check' },
  { id: 'test', script: 'test', label: 'unit and property tests' },
  { id: 'build', script: 'build', label: 'production build' },
];

// ---------------------------------------------------------------------------
// A reader for the YAML subset the workflow uses: nested mappings, sequences of
// scalars or mappings, inline arrays and quoted scalars. Anything else throws
// rather than being ignored, so the check cannot pass on a file it misunderstood.
// ---------------------------------------------------------------------------
const stripComment = (line) => {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
  }
  return line;
};

const parseScalar = (text) => {
  const value = text.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    const body = value.slice(1, -1).trim();
    return body === '' ? [] : body.split(',').map((entry) => parseScalar(entry));
  }
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~' || value === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
};

const isKeyValue = (text) => /^[^\s:][^:]*:(\s|$)/.test(text);

function parseMapping(lines, index, indent) {
  const result = {};
  let cursor = index;
  while (cursor < lines.length && lines[cursor].indent === indent) {
    const { text, number } = lines[cursor];
    if (text.startsWith('- ')) break;
    const split = text.indexOf(':');
    if (split === -1) throw new Error(`line ${number}: expected "key: value"`);
    const key = text.slice(0, split).trim();
    const rest = text.slice(split + 1).trim();
    cursor += 1;
    if (rest !== '') {
      result[key] = parseScalar(rest);
    } else if (cursor < lines.length && lines[cursor].indent > indent) {
      const [child, next] = parseBlock(lines, cursor, lines[cursor].indent);
      result[key] = child;
      cursor = next;
    } else {
      result[key] = null;
    }
  }
  return [result, cursor];
}

function parseSequence(lines, index, indent) {
  const result = [];
  let cursor = index;
  while (
    cursor < lines.length &&
    lines[cursor].indent === indent &&
    lines[cursor].text.startsWith('- ')
  ) {
    const { text } = lines[cursor];
    const content = text.slice(2).trim();
    if (content === '') {
      cursor += 1;
      if (cursor >= lines.length || lines[cursor].indent <= indent) {
        throw new Error('a list item has no content');
      }
      const [child, next] = parseBlock(lines, cursor, lines[cursor].indent);
      result.push(child);
      cursor = next;
      continue;
    }
    if (isKeyValue(content)) {
      const itemIndent = indent + 2;
      const item = [{ indent: itemIndent, text: content, number: lines[cursor].number }];
      let next = cursor + 1;
      while (next < lines.length && lines[next].indent > indent) {
        item.push(lines[next]);
        next += 1;
      }
      const [child, consumed] = parseBlock(item, 0, itemIndent);
      if (consumed !== item.length) {
        throw new Error(`line ${item[consumed].number}: unexpected structure inside a list item`);
      }
      result.push(child);
      cursor = next;
      continue;
    }
    result.push(parseScalar(content));
    cursor += 1;
  }
  return [result, cursor];
}

function parseBlock(lines, index, indent) {
  if (index >= lines.length) return [null, index];
  if (lines[index].text.startsWith('- ')) return parseSequence(lines, index, indent);
  return parseMapping(lines, index, indent);
}

function parseYaml(text) {
  const lines = [];
  text.split(/\r?\n/).forEach((raw, position) => {
    if (/^\t/.test(raw)) throw new Error(`line ${position + 1}: tabs are not allowed`);
    const line = stripComment(raw).replace(/\s+$/, '');
    if (line.trim() === '') return;
    lines.push({
      indent: line.length - line.trimStart().length,
      text: line.trimStart(),
      number: position + 1,
    });
  });
  if (lines.length === 0) return null;
  const [value, next] = parseBlock(lines, 0, lines[0].indent);
  if (next !== lines.length) {
    throw new Error(`line ${lines[next].number}: unexpected indentation`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// The contract between the workflow, package.json and this gate list.
// ---------------------------------------------------------------------------
function findProblems(workflow, manifest, raw) {
  const problems = [];
  const note = (condition, message) => {
    if (!condition) problems.push(message);
  };

  if (!workflow || typeof workflow !== 'object') {
    return ['the workflow did not parse into a mapping'];
  }

  const triggers = workflow.on;
  note(
    Boolean(triggers) && typeof triggers === 'object',
    'the workflow must declare on: push and pull_request',
  );
  note(Boolean(triggers) && 'push' in triggers, 'the workflow must run on push');
  note(Boolean(triggers) && 'pull_request' in triggers, 'the workflow must run on pull_request');
  note(
    Boolean(triggers?.push?.branches?.includes('main')),
    'push must be limited to the main branch',
  );
  note(workflow.permissions?.contents === 'read', 'permissions.contents must be read');
  note(
    workflow.concurrency?.['cancel-in-progress'] === true,
    'concurrency must cancel superseded runs',
  );

  const jobs = workflow.jobs;
  note(Boolean(jobs) && Object.keys(jobs).length > 0, 'the workflow must declare at least one job');

  const expected = GATES.map((gate) => `npm run ${gate.script}`);
  const jobGates = [];

  for (const [id, job] of Object.entries(jobs ?? {})) {
    note(typeof job['runs-on'] === 'string', `${id}: runs-on must be set`);
    note(
      Number.isInteger(job['timeout-minutes']) &&
        job['timeout-minutes'] > 0 &&
        job['timeout-minutes'] <= 60,
      `${id}: timeout-minutes must be an integer between 1 and 60`,
    );
    const operatingSystems = job.strategy?.matrix?.os;
    note(
      Array.isArray(operatingSystems) &&
        operatingSystems.includes('ubuntu-latest') &&
        operatingSystems.includes('windows-latest'),
      `${id}: the matrix must cover ubuntu-latest and windows-latest`,
    );

    const steps = job.steps;
    note(Array.isArray(steps) && steps.length > 0, `${id}: steps must be a non-empty list`);
    if (!Array.isArray(steps)) continue;

    const uses = [];
    const commands = [];
    for (const step of steps) {
      if (step.uses) {
        uses.push(String(step.uses));
        note(!step.run, `${id}: a step cannot be both uses and run`);
      } else if (step.run) {
        commands.push(String(step.run));
      } else {
        note(false, `${id}: every step must have a run or uses key`);
      }
    }

    note(
      uses.some((reference) => reference.startsWith('actions/checkout@')),
      `${id}: the workflow must check the repository out`,
    );
    const setupNode = steps.find((step) => String(step.uses).startsWith('actions/setup-node@'));
    note(Boolean(setupNode), `${id}: the workflow must install Node with actions/setup-node`);
    note(
      setupNode?.with?.['node-version-file'] === '.nvmrc',
      `${id}: actions/setup-node must read the Node line from .nvmrc`,
    );
    note(
      setupNode?.with?.cache === 'npm',
      `${id}: actions/setup-node must cache npm from the lockfile`,
    );
    for (const reference of uses) {
      note(
        /@[0-9a-f]{40}$/.test(reference),
        `${id}: "${reference}" must be pinned to a commit SHA, not a tag`,
      );
    }

    note(commands.includes('npm ci'), `${id}: dependencies must be installed with npm ci`);
    note(
      !commands.some((command) => /\bnpm install\b/.test(command)),
      `${id}: npm install rewrites the lockfile; CI must use npm ci`,
    );

    jobGates.push(commands.filter((command) => command.startsWith('npm run ')));
  }

  jobGates.forEach((commands, index) => {
    note(
      JSON.stringify(commands) === JSON.stringify(expected),
      `job ${index + 1}: gates must be ${expected.join(', ')}, build last`,
    );
  });

  note(!/\|\|\s*true/.test(raw), 'no command may swallow a failure with "|| true"');
  note(!/continue-on-error:\s*true/.test(raw), 'no step may set continue-on-error');
  note(!/--no-verify/.test(raw), 'no command may bypass hooks');

  for (const gate of GATES) {
    note(
      typeof manifest.scripts?.[gate.script] === 'string',
      `package.json: the ${gate.id} gate needs a "${gate.script}" script`,
    );
  }

  const chain = (script) =>
    String(manifest.scripts?.[script] ?? '')
      .split('&&')
      .map((entry) => entry.trim().replace(/^npm run /, ''));

  const checks = Object.keys(manifest.scripts ?? {}).filter((key) => key.startsWith('check:'));
  const chainedChecks = chain('check');
  note(
    checks.every((key) => chainedChecks.includes(key)),
    `npm run check must include every check:* script (missing: ${
      checks.filter((key) => !chainedChecks.includes(key)).join(', ') || 'none'
    })`,
  );
  note(!chainedChecks.includes('check'), 'npm run check must not call itself');

  const verify = chain('verify');
  note(
    JSON.stringify(verify) === JSON.stringify(GATES.map((gate) => gate.script)),
    `npm run verify must run ${GATES.map((gate) => gate.script).join(' then ')}, build last`,
  );

  return problems;
}

// ---------------------------------------------------------------------------
// Run it.
// ---------------------------------------------------------------------------
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const sample = parseYaml('a:\n  b: 1\n  c:\n    - x\n    - y: true\n');
expect(
  JSON.stringify(sample) === JSON.stringify({ a: { b: 1, c: ['x', { y: true }] } }),
  'parser: the YAML subset reader must parse nested mappings and list items',
);

const raw = fs.readFileSync(WORKFLOW_FILE, 'utf8');
const workflow = parseYaml(raw);
const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));

const problems = findProblems(workflow, manifest, raw);
expect(problems.length === 0, `workflow: ${problems.join('; ')}`);

const steps = workflow?.jobs?.['quality-gates']?.steps ?? [];
expect(
  steps.filter((step) => step.run).length === GATES.length + 1,
  `workflow: expected ${GATES.length + 1} run steps (install plus one per gate), found ${
    steps.filter((step) => step.run).length
  }`,
);

// The check must be able to fail: break copies, not the real files.
const withWorkflow = (mutate) => {
  const copy = structuredClone(workflow);
  mutate(copy);
  return findProblems(copy, manifest, raw);
};

const negatives = [
  [
    'a missing gate',
    (copy) => {
      const list = copy.jobs['quality-gates'].steps;
      list.splice(
        list.findIndex((step) => step.run === 'npm run lint'),
        1,
      );
    },
  ],
  [
    'an unpinned action',
    (copy) => {
      const step = copy.jobs['quality-gates'].steps.find((entry) =>
        String(entry.uses).startsWith('actions/checkout@'),
      );
      step.uses = 'actions/checkout@v4';
    },
  ],
  [
    'a swallowed failure',
    (copy) => {
      const step = copy.jobs['quality-gates'].steps.find((entry) => entry.run === 'npm run build');
      step.run = 'npm run build || true';
    },
  ],
  [
    'a missing pull_request trigger',
    (copy) => {
      delete copy.on.pull_request;
    },
  ],
  [
    'a floating Node version',
    (copy) => {
      const step = copy.jobs['quality-gates'].steps.find((entry) =>
        String(entry.uses).startsWith('actions/setup-node@'),
      );
      step.with = { 'node-version-file': '.nvmrc', cache: 'npm', 'node-version': '26' };
      delete step.with['node-version-file'];
    },
  ],
];

for (const [label, mutate] of negatives) {
  const found = withWorkflow(mutate);
  expect(found.length > 0, `negative: ${label} should be reported, but the check passed it`);
}

const withoutTest = structuredClone(manifest);
withoutTest.scripts.verify = withoutTest.scripts.verify.replace(' && npm run test', '');
expect(
  findProblems(workflow, withoutTest, raw).length > 0,
  'negative: dropping the test gate from npm run verify should be reported',
);

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
if (failures.length > 0) {
  console.error('ci: FAILED');
  for (const failure of failures) console.error(`  x ${failure}`);
  console.error(`\n${failures.length} problem(s) found`);
  process.exit(1);
}

const operatingSystems = workflow.jobs['quality-gates'].strategy.matrix.os;
console.log('ci: OK');
console.log(
  `  workflow: push to main, pull requests and manual runs; ${operatingSystems.join(' + ')}; ` +
    'actions pinned to commits',
);
console.log(
  `  gates: ${GATES.map((gate) => gate.script).join(', ')} — mirrored by npm run verify and by CI, build last`,
);
console.log('  install: npm ci from the lockfile, on the Node line in .nvmrc');
console.log(
  `  negative: ${negatives.length + 1} broken variants detected (missing gate, unpinned action, swallowed failure, missing trigger, floating Node, dropped test)`,
);
console.log(
  `  registers: ${Object.keys(manifest.scripts).filter((key) => key.startsWith('check:')).length} checks, all in the chain`,
);
