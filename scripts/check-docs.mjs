#!/usr/bin/env node
// Dependency-free checks for the documentation system.
// Run from the repository root: node scripts/check-docs.mjs
// Regenerate the data dictionary: node scripts/check-docs.mjs --write

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const MODULES = [
  { name: 'engine', readme: 'packages/engine/README.md' },
  { name: 'application', readme: 'src/app/README.md' },
  { name: 'components', readme: 'src/components/README.md' },
  { name: 'configuration', readme: 'src/lib/config/README.md' },
  { name: 'scripts', readme: 'scripts/README.md' },
  { name: 'scenarios', readme: 'scenarios/README.md' },
];

const REQUIRED_SECTIONS = ['Purpose', 'Inputs', 'Outputs', 'Tests'];
const EXPERIMENT_FIELDS = [
  'Date',
  'Question',
  'Hypothesis',
  'Scenario',
  'Seed',
  'Engine',
  'Metrics',
  'Result',
  'Artefact',
  'Decision',
];
const DICTIONARY_START = '<!-- data-dictionary:start -->';
const DICTIONARY_END = '<!-- data-dictionary:end -->';

const manifest = JSON.parse(read('package.json'));
const decisions = parseDecisionIndex(read('docs/decision-log.md'));
const metricRegister = JSON.parse(read('docs/metric-register.json'));
const metricIds = new Set((metricRegister.metrics ?? []).map((metric) => metric.id));
const schema = JSON.parse(read('scenarios/scenario.schema.json'));

const docFiles = [
  ...fs
    .readdirSync(path.join(root, 'docs'))
    .filter((file) => file.endsWith('.md'))
    .map((file) => `docs/${file}`),
  ...fs
    .readdirSync(path.join(root, 'docs/report'))
    .filter((file) => file.endsWith('.md'))
    .map((file) => `docs/report/${file}`),
];
const requiredDocs = [
  ...new Set([...docFiles, 'README.md', 'CHANGELOG.md', ...MODULES.map((module) => module.readme)]),
].sort();

const configSources = [
  ...fs
    .readdirSync(path.join(root, 'src/lib/config'))
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .sort()
    .map((file) => `src/lib/config/${file}`),
  'src/lib/routes.ts',
];

function parseDecisionIndex(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (/^DEC-\d{3}$/.test(cells[0])) {
      map.set(cells[0], { title: cells[1], status: cells[2], date: cells[3] });
    }
  }
  return map;
}

/** Level-2 headings and the text under each one. */
function splitLevel2(text) {
  const sections = new Map();
  let heading = null;
  let body = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      if (heading) sections.set(heading, body.join('\n').trim());
      heading = match[1].trim();
      body = [];
    } else if (heading) {
      body.push(line);
    }
  }
  if (heading) sections.set(heading, body.join('\n').trim());
  return sections;
}

function stripFences(text) {
  return text.replace(/```[\s\S]*?```/g, '');
}

function parseExports(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const names = new Set();
  for (const match of clean.matchAll(
    /export (?:const|function|class|interface|type) ([A-Za-z0-9_]+)/g,
  )) {
    names.add(match[1]);
  }
  for (const match of clean.matchAll(/export (?:type )?\{([\s\S]*?)\} from/g)) {
    for (const raw of match[1].split(',')) {
      const name = raw
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .pop();
      if (name && /^[A-Za-z0-9_]+$/.test(name)) names.add(name);
    }
  }
  return names;
}

function readExportTable(text, startMarker, endMarker, label) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    return { label, error: `${label}: the export table markers are missing` };
  }
  const body = text.slice(start + startMarker.length, end);
  const lines = body.split(/\r?\n/).filter((line) => line.trim().startsWith('|'));
  if (lines.length < 2) return { label, error: `${label}: the export table is empty` };
  const names = new Set();
  const duplicates = [];
  for (const line of lines.slice(2)) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 3) {
      return { label, error: `${label}: a row does not have three cells: ${line.trim()}` };
    }
    const match = cells[0].match(/^`([A-Za-z0-9_]+)`$/);
    if (!match) {
      return { label, error: `${label}: the first column is not a code name: ${cells[0]}` };
    }
    if (!cells[2]) return { label, error: `${label}: ${match[1]} has an empty contract` };
    if (names.has(match[1])) duplicates.push(match[1]);
    names.add(match[1]);
  }
  return { label, names, duplicates };
}

function checkModule(name, text) {
  const issues = [];
  const sections = splitLevel2(text);

  for (const section of REQUIRED_SECTIONS) {
    const body = sections.get(section);
    if (body === undefined) issues.push(`${name}: README is missing "## ${section}"`);
    else if (body.length < 40) issues.push(`${name}: "## ${section}" has no substantive content`);
  }

  const tests = sections.get('Tests') ?? '';
  const npmCommands = [...tests.matchAll(/npm run ([\w:-]+)/g)].map((match) => match[1]);
  const nodeCommands = [...tests.matchAll(/node (scripts\/[\w.-]+)/g)].map((match) => match[1]);
  if (npmCommands.length === 0 && nodeCommands.length === 0) {
    issues.push(`${name}: "## Tests" names no runnable command`);
  }
  for (const script of npmCommands) {
    if (!manifest.scripts?.[script]) {
      issues.push(`${name}: "npm run ${script}" is not a package script`);
    }
  }
  for (const file of nodeCommands) {
    if (!exists(file)) issues.push(`${name}: "node ${file}" does not exist`);
  }

  const cited = new Set([...text.matchAll(/\bDEC-(\d{3})\b/g)].map((match) => `DEC-${match[1]}`));
  if (cited.size === 0) issues.push(`${name}: README cites no decision`);
  for (const id of cited) {
    const record = decisions.get(id);
    if (!record) issues.push(`${name}: cites ${id}, which is not in the decision log`);
    else if (record.status !== 'Accepted') {
      issues.push(`${name}: cites ${id}, whose status is ${record.status}`);
    }
  }

  return { issues, cited };
}

function checkApi(apiText) {
  const issues = [];
  const engineExports = parseExports(read('packages/engine/src/index.ts'));
  const appExports = new Set(configSources.flatMap((file) => [...parseExports(read(file))]));

  const engineTable = readExportTable(
    apiText,
    '<!-- engine-exports:start -->',
    '<!-- engine-exports:end -->',
    'engine',
  );
  const appTable = readExportTable(
    apiText,
    '<!-- config-exports:start -->',
    '<!-- config-exports:end -->',
    'application',
  );

  for (const table of [engineTable, appTable]) {
    if (table.error) issues.push(table.error);
    for (const name of table.duplicates ?? [])
      issues.push(`${table.label}: duplicate row for ${name}`);
  }

  const compare = (label, exported, table) => {
    if (!table.names) return;
    for (const name of exported) {
      if (!table.names.has(name)) issues.push(`${label}: ${name} is exported but has no API row`);
    }
    for (const name of table.names) {
      if (!exported.has(name)) issues.push(`${label}: ${name} has an API row but is not exported`);
    }
  };
  compare('engine', engineExports, engineTable);
  compare('application', appExports, appTable);

  return { issues, engineCount: engineExports.size, appCount: appExports.size };
}

function resolveRef(node, document) {
  if (!node || typeof node !== 'object' || !node.$ref) return node;
  const parts = node.$ref.replace(/^#\//, '').split('/');
  let current = document;
  for (const part of parts) current = current?.[part];
  return current ?? node;
}

const UNIT_LABELS = [
  ['_kwh_per_month', 'kWh/month'],
  ['_tnd_per_kwh', 'TND/kWh'],
  ['_per_degc', 'per °C'],
  ['_per_month', 'per month'],
  ['_per_kwh', 'per kWh'],
  ['_multiplier', 'multiplier'],
  ['_minutes', 'min'],
  ['_hours', 'h'],
  ['_kwh', 'kWh'],
  ['_kwp', 'kWp'],
  ['_degc', '°C'],
  ['_deg', '°'],
  ['_kw', 'kW'],
  ['_tnd', 'TND'],
  ['_w', 'W'],
  ['_m', 'm'],
];

const FRACTION_KEYS = new Set([
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
]);

function unitText(key) {
  if (FRACTION_KEYS.has(key)) return 'fraction [0, 1]';
  for (const [suffix, label] of UNIT_LABELS) {
    if (key.endsWith(suffix)) return label;
  }
  if (['panel_count', 'axes', 'seed'].includes(key)) return 'count';
  return '—';
}

function typeText(node) {
  if (node.const !== undefined) return `const \`${String(node.const)}\``;
  const parts = [];
  if (node.enum) parts.push(node.enum.map((value) => `\`${String(value)}\``).join(' or '));
  else if (node.type) parts.push(Array.isArray(node.type) ? node.type.join(' or ') : node.type);
  else if (node.properties) parts.push('object');
  else if (node.items) parts.push('array');
  else parts.push('any');
  if (node.minimum !== undefined) parts.push(`≥ ${node.minimum}`);
  if (node.exclusiveMinimum !== undefined) parts.push(`> ${node.exclusiveMinimum}`);
  if (node.maximum !== undefined) parts.push(`≤ ${node.maximum}`);
  if (node.exclusiveMaximum !== undefined) parts.push(`< ${node.exclusiveMaximum}`);
  if (node.minItems !== undefined) parts.push(`min ${node.minItems} item(s)`);
  if (node.uniqueItems) parts.push('unique items');
  if (node.format) parts.push(`format ${node.format}`);
  if (node.pattern) parts.push(`pattern \`${node.pattern}\``);
  return parts.join(', ');
}

function collectDictionaryRows(document) {
  const rows = [];
  const walk = (node, trail, requiredSet) => {
    const resolved = resolveRef(node, document);
    if (!resolved) return;
    if (trail) {
      const key = trail.replace(/\[\]$/, '').split('.').pop();
      rows.push({
        path: trail,
        type: typeText(resolved),
        required: requiredSet ? (requiredSet.has(key) ? 'Yes' : 'No') : '—',
        unit: unitText(key),
      });
    }
    if (resolved.properties) {
      const required = new Set(resolved.required ?? []);
      for (const [key, child] of Object.entries(resolved.properties)) {
        walk(child, trail ? `${trail}.${key}` : key, required);
      }
    }
    if (resolved.items) {
      const item = resolveRef(resolved.items, document);
      if (!item) return;
      const itemPath = `${trail}[]`;
      rows.push({
        path: itemPath,
        type: typeText(item),
        required: '—',
        unit: unitText(trail.replace(/\[\]$/, '').split('.').pop()),
      });
      if (item.properties) {
        const required = new Set(item.required ?? []);
        for (const [key, child] of Object.entries(item.properties)) {
          walk(child, `${itemPath}.${key}`, required);
        }
      }
    }
  };

  const rootRequired = new Set(document.required ?? []);
  for (const [key, child] of Object.entries(document.properties ?? {})) {
    walk(child, key, rootRequired);
  }
  return rows;
}

function renderDictionary(rows) {
  const lines = [
    '_Generated from [`scenario.schema.json`](../scenarios/scenario.schema.json) by `scripts/check-docs.mjs`. Do not edit this table by hand; edit the schema and run `node scripts/check-docs.mjs --write`._',
    '',
    '| Path | Type and constraints | Required | Unit |',
    '| --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    lines.push(
      `| \`${row.path}\` | ${row.type.replace(/\|/g, '\\|')} | ${row.required} | ${row.unit} |`,
    );
  }
  return lines.join('\n');
}

function checkDictionary(text, generated) {
  const start = text.indexOf(DICTIONARY_START);
  const end = text.indexOf(DICTIONARY_END);
  if (start === -1 || end === -1 || end < start) {
    return ['dictionary: the data-dictionary markers are missing'];
  }
  const current = text.slice(start + DICTIONARY_START.length, end).trim();
  if (current !== generated) {
    return ['dictionary: the table is out of date; run: node scripts/check-docs.mjs --write'];
  }
  return [];
}

function parseExperimentFields(block) {
  const fields = {};
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^- ([A-Za-z]+):\s*(.+)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  const heading = block.match(/^## (EXP-\d{3}) · (.+)$/m);
  return { id: heading?.[1], title: heading?.[2], fields };
}

function validateExperiment(record, label) {
  const issues = [];
  const { fields } = record;
  for (const field of EXPERIMENT_FIELDS) {
    if (!fields[field]) issues.push(`experiment ${label}: missing ${field}`);
  }
  if (fields.Date && !/^\d{4}-\d{2}-\d{2}$/.test(fields.Date)) {
    issues.push(`experiment ${label}: Date is not ISO`);
  }
  if (fields.Scenario && !exists(fields.Scenario)) {
    issues.push(`experiment ${label}: scenario ${fields.Scenario} does not exist`);
  }
  if (fields.Seed && !/^\d+$/.test(fields.Seed)) {
    issues.push(`experiment ${label}: Seed is not an integer`);
  }
  if (fields.Engine && !/^dar-chams-engine \d+\.\d+\.\d+$/.test(fields.Engine)) {
    issues.push(`experiment ${label}: Engine must be "dar-chams-engine <version>"`);
  }
  if (fields.Metrics) {
    for (const raw of fields.Metrics.split(',')) {
      const id = raw.trim();
      if (!/^MET-\d{2}$/.test(id) || !metricIds.has(id)) {
        issues.push(`experiment ${label}: ${id} is not a registered metric`);
      }
    }
  }
  if (fields.Decision && fields.Decision !== 'none') {
    for (const match of fields.Decision.matchAll(/\bDEC-\d{3}\b/g)) {
      if (!decisions.has(match[0])) {
        issues.push(`experiment ${label}: ${match[0]} is not in the decision log`);
      }
    }
  }
  return issues;
}

function checkExperimentLog(text) {
  const issues = [];
  const header = text.match(/\| Records \| (\d+) \|/);
  if (!header) issues.push('experiment log: header has no Records count');

  const formatBlock = text.split('## Record format')[1]?.split('\n## ')[0] ?? '';
  for (const field of EXPERIMENT_FIELDS) {
    if (!formatBlock.includes(`\`${field}\``)) {
      issues.push(`experiment log: the record format does not mention ${field}`);
    }
  }

  const templateMatch = text.match(/### Template — not a record\s*\n```text\n([\s\S]*?)```/);
  if (!templateMatch) {
    issues.push('experiment log: the template block is missing');
  } else {
    const template = parseExperimentFields(templateMatch[1]);
    if (!template.id) issues.push('experiment log: the template has no EXP heading');
    else issues.push(...validateExperiment(template, 'template'));
  }

  const records = [];
  for (const chunk of stripFences(text).split(/^## /m).slice(1)) {
    const newline = chunk.indexOf('\n');
    const heading = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
    if (!heading.startsWith('EXP-')) continue;
    records.push(parseExperimentFields(`## ${chunk}`));
  }

  records.forEach((record, index) => {
    const expected = `EXP-${String(index + 1).padStart(3, '0')}`;
    if (record.id !== expected) {
      issues.push(`experiment log: expected ${expected}, found ${record.id ?? '(none)'}`);
    }
    issues.push(...validateExperiment(record, record.id ?? `record ${index + 1}`));
  });

  if (header && Number(header[1]) !== records.length) {
    issues.push(
      `experiment log: header says ${header[1]} records, the log contains ${records.length}`,
    );
  }

  return { issues, records: records.length };
}

function checkChangelog(text) {
  const issues = [];
  const base = String(manifest.repository?.url ?? '').replace(/\.git$/, '');
  const releases = [];

  for (const chunk of text.split(/^## /m).slice(1)) {
    const newline = chunk.indexOf('\n');
    const heading = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
    const body = newline === -1 ? '' : chunk.slice(newline + 1);
    if (heading === '[Unreleased]') {
      releases.push({ label: 'Unreleased', date: null, body });
      continue;
    }
    const match = heading.match(/^\[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2})$/);
    if (match) {
      releases.push({ label: match[1], date: match[2], body });
    } else {
      issues.push(`changelog: unrecognised release heading "## ${heading}"`);
    }
  }

  if (releases.length === 0 || releases[0].label !== 'Unreleased') {
    issues.push('changelog: [Unreleased] must be the first section');
  }

  const released = releases.filter((release) => release.label !== 'Unreleased');
  for (const release of released) {
    if (!release.date) issues.push(`changelog: ${release.label} has no ISO date`);
    if (!/^### /m.test(release.body)) issues.push(`changelog: ${release.label} has no category`);
    if (!/^- /m.test(release.body)) issues.push(`changelog: ${release.label} has no entry`);
  }

  if (!released.some((release) => release.label === manifest.version)) {
    issues.push(`changelog: package version ${manifest.version} has no released heading`);
  }

  const versions = released.map((release) => release.label.split('.').map((part) => Number(part)));
  for (let index = 1; index < versions.length; index += 1) {
    const previous = versions[index - 1];
    const current = versions[index];
    const order =
      (previous[0] ?? 0) - (current[0] ?? 0) ||
      (previous[1] ?? 0) - (current[1] ?? 0) ||
      (previous[2] ?? 0) - (current[2] ?? 0);
    if (order <= 0) {
      issues.push(
        `changelog: releases must descend; ${released[index - 1].label} is not above ${released[index].label}`,
      );
    }
  }

  const links = new Map(
    [...text.matchAll(/^\[([^\]]+)\]:\s+(\S+)$/gm)].map((match) => [match[1], match[2]]),
  );
  for (const label of ['Unreleased', ...released.map((release) => release.label)]) {
    const url = links.get(label);
    if (!url) issues.push(`changelog: missing link definition for [${label}]`);
    else if (!url.startsWith(`${base}/`)) {
      issues.push(`changelog: [${label}] does not point at ${base}`);
    }
  }

  for (const match of text.matchAll(/\bDEC-(\d{3})\b/g)) {
    if (!decisions.has(`DEC-${match[1]}`)) {
      issues.push(`changelog: cites DEC-${match[1]}, which is not defined`);
    }
  }

  return { issues, releases: released.length };
}

function checkDocMap(mapText, required) {
  const targets = new Set();
  for (const match of mapText.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0].trim();
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    targets.add(path.posix.normalize(path.posix.join('docs', target)));
  }
  return required
    .filter((rel) => !targets.has(rel))
    .map((rel) => `documentation map: ${rel} has no row`);
}

function checkScriptsTable(scriptsReadme) {
  const files = new Set(
    fs.readdirSync(path.join(root, 'scripts')).filter((file) => file.endsWith('.mjs')),
  );
  const documented = new Set(
    [...scriptsReadme.matchAll(/^\| `([A-Za-z0-9_.-]+\.mjs)` \|/gm)].map((match) => match[1]),
  );
  const issues = [];
  for (const file of files) {
    if (!documented.has(file)) issues.push(`scripts/README.md: ${file} has no row`);
  }
  for (const file of documented) {
    if (!files.has(file)) issues.push(`scripts/README.md: ${file} does not exist`);
  }
  return { issues, count: files.size };
}

function checkIdentity(identity, css, header, mark, icon, layout, appSources) {
  const issues = [];
  const engineManifest = JSON.parse(read('packages/engine/package.json'));
  const packageLock = read('package-lock.json');
  const engineSource = read('packages/engine/src/index.ts');
  const settingsSource = read('src/lib/config/settings.ts');
  const schema = JSON.parse(read('scenarios/scenario.schema.json'));
  const api = read('docs/api.md');
  const repositoryUrl = 'https://github.com/Shawarma-Frikz/Dar-Chams';
  const tokens = [
    ...identity.matchAll(
      /^\| `(--[a-z0-9-]+)` \| `?(#[0-9A-Fa-f]{6})`? \| `?(#[0-9A-Fa-f]{6})`? \|/gm,
    ),
  ];
  const dayStart = css.indexOf('/* identity-day:start */');
  const dayEnd = css.indexOf('/* identity-day:end */');
  const nightStart = css.indexOf('/* identity-night:start */');
  const nightEnd = css.indexOf('/* identity-night:end */');
  if ([dayStart, dayEnd, nightStart, nightEnd].some((i) => i < 0)) {
    issues.push('identity: CSS token block markers are missing');
    return issues;
  }
  const declarations = (block) =>
    new Map(
      [...block.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [
        m[1],
        m[2].toLowerCase(),
      ]),
    );
  const day = declarations(css.slice(dayStart, dayEnd));
  const night = declarations(css.slice(nightStart, nightEnd));
  const documented = new Set(tokens.map(([, name]) => name));
  if (tokens.length !== 24)
    issues.push(`identity: expected 24 documented tokens, found ${tokens.length}`);
  if (documented.size !== 24 || [...day.keys()].some((name) => !documented.has(name)))
    issues.push('identity: documented token names do not match the day block');
  if (day.size !== 24) issues.push(`identity: expected 24 day tokens, found ${day.size}`);
  for (const name of night.keys())
    if (!day.has(name)) issues.push(`identity: night token ${name} has no day definition`);
  for (const [, name, dayValue, nightValue] of tokens) {
    if (day.get(name) !== dayValue.toLowerCase())
      issues.push(`identity: ${name} day token does not match globals.css`);
    if ((night.get(name) ?? day.get(name)) !== nightValue.toLowerCase())
      issues.push(`identity: ${name} night token does not match globals.css`);
  }
  if (
    !identity.includes('Dar Chams') ||
    !identity.includes('دار شمس') ||
    !header.includes('Dar Chams') ||
    !header.includes('دار شمس')
  )
    issues.push('identity: Latin and Arabic names must appear in the charter and header');
  if (
    manifest.name !== 'dar-chams' ||
    engineManifest.name !== '@dar-chams/engine' ||
    !packageLock.includes('node_modules/@dar-chams/engine') ||
    !engineSource.includes("ENGINE_NAME = 'dar-chams-engine'") ||
    !settingsSource.includes("SETTINGS_STORAGE_KEY = 'dar-chams.settings.v1'") ||
    !schema.$id?.startsWith(`${repositoryUrl}/`) ||
    manifest.repository?.url !== `${repositoryUrl}.git` ||
    !api.includes('`@dar-chams/engine`') ||
    !identity.includes('`Dar-Chams` GitHub repository')
  )
    issues.push(
      'identity: repository, package, engine, storage or schema identifiers are not aligned to Dar Chams',
    );
  const arch = 'M4 22V10A8 8 0 0 1 20 10V22';
  if (
    !mark.includes(arch) ||
    !mark.includes('cx="12" cy="10" r="3.6"') ||
    !icon.includes(arch) ||
    !icon.includes('cx="12" cy="10" r="3.6"') ||
    !icon.includes('Dar Chams')
  )
    issues.push('identity: brand mark or favicon does not match the charter');
  for (const legacy of [
    'basalt',
    'limestone',
    'oxide',
    'sage',
    'lichen',
    'chalk',
    'clay',
    'slate',
  ]) {
    if (
      new RegExp(`--(?:color-)?${legacy}\\b|(?:text|bg|border|decoration)-${legacy}\\b`, 'i').test(
        appSources,
      )
    )
      issues.push(`identity: legacy ${legacy} token remains in the application`);
  }
  for (const family of [
    'Bricolage_Grotesque',
    'Instrument_Sans',
    'Martian_Mono',
    'Noto_Kufi_Arabic',
  ]) {
    if (!layout.includes(family)) issues.push(`identity: ${family} font loader is missing`);
  }
  for (const variable of [
    '--font-bricolage',
    '--font-instrument',
    '--font-martian',
    '--font-kufi',
  ]) {
    if (!layout.includes(variable) || !css.includes(variable))
      issues.push(`identity: ${variable} is not wired through layout.tsx and globals.css`);
  }
  if (!header.includes('font-arabic'))
    issues.push('identity: header does not use the Arabic font utility');
  return issues;
}

function readAppSources(directory = path.join(root, 'src')) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .map((entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) return readAppSources(full);
      return /\.(?:css|svg|ts|tsx)$/.test(entry.name) ? fs.readFileSync(full, 'utf8') : '';
    })
    .flat(Infinity)
    .join('\n');
}

function audit() {
  const issues = [];
  const cited = new Set();

  for (const module of MODULES) {
    if (!exists(module.readme)) {
      issues.push(`module ${module.name}: missing ${module.readme}`);
      continue;
    }
    const result = checkModule(module.name, read(module.readme));
    issues.push(...result.issues);
    for (const id of result.cited) cited.add(id);
  }

  const api = checkApi(read('docs/api.md'));
  issues.push(...api.issues);

  issues.push(
    ...checkIdentity(
      read('docs/identity.md'),
      read('src/app/globals.css'),
      read('src/components/site-header.tsx'),
      read('src/components/brand-mark.tsx'),
      read('src/app/icon.svg'),
      read('src/app/layout.tsx'),
      readAppSources(),
    ),
  );

  const dictionaryIssues = checkDictionary(read('docs/data-dictionary.md'), dictionaryTable);
  issues.push(...dictionaryIssues);

  const experiments = checkExperimentLog(read('docs/experiment-log.md'));
  issues.push(...experiments.issues);

  const changelog = checkChangelog(read('CHANGELOG.md'));
  issues.push(...changelog.issues);

  issues.push(...checkDocMap(read('docs/documentation.md'), requiredDocs));

  const scripts = checkScriptsTable(read('scripts/README.md'));
  issues.push(...scripts.issues);

  const probe = parseExports(
    "export const A = 1;\nexport function b() {}\nexport type { C, D as E } from './x.ts';",
  );
  if (probe.size !== 4 || !['A', 'b', 'C', 'E'].every((name) => probe.has(name))) {
    issues.push('self-test: the export parser does not read all three export forms');
  }

  return {
    issues,
    stats: {
      modules: MODULES.length,
      decisions: cited.size,
      engineExports: api.engineCount,
      appExports: api.appCount,
      dictionary: dictionaryRows.length,
      experiments: experiments.records,
      releases: changelog.releases,
      documents: requiredDocs.length,
      scripts: scripts.count,
    },
  };
}

function runNegatives() {
  const engineReadme = read('packages/engine/README.md');
  const apiText = read('docs/api.md');
  const dictionaryText = read('docs/data-dictionary.md');
  const changelogText = read('CHANGELOG.md');
  const experimentText = read('docs/experiment-log.md');
  const mapText = read('docs/documentation.md');
  const identityText = read('docs/identity.md');
  const cssText = read('src/app/globals.css');

  return [
    {
      name: 'module section removed',
      issues: checkModule('engine', engineReadme.replace('## Outputs', '## Results')).issues,
    },
    {
      name: 'export row removed',
      issues: checkApi(apiText.replace(/^\| `ENGINE_NAME` \|.*\n/m, '')).issues,
    },
    {
      name: 'dictionary row changed',
      issues: checkDictionary(
        dictionaryText.replace('| `pv.tilt_deg` |', '| `pv.tilt` |'),
        dictionaryTable,
      ),
    },
    {
      name: 'changelog version removed',
      issues: checkChangelog(changelogText.replace(/^## \[0\.1\.0\].*\n/m, '')).issues,
    },
    {
      name: 'experiment seed removed',
      issues: checkExperimentLog(experimentText.replace('- Seed: 42\n', '')).issues,
    },
    {
      name: 'decision citation unresolved',
      issues: checkModule('engine', engineReadme.replace('DEC-002,', 'DEC-999,')).issues,
    },
    {
      name: 'document orphaned',
      issues: checkDocMap(
        mapText.replace(/^\| \[`docs\/quality-gates\.md`\].*\n/m, ''),
        requiredDocs,
      ),
    },
    {
      name: 'identity token removed',
      issues: checkIdentity(
        identityText.replace('| `--wash` |', '| `--gone` |'),
        cssText,
        read('src/components/site-header.tsx'),
        read('src/components/brand-mark.tsx'),
        read('src/app/icon.svg'),
        read('src/app/layout.tsx'),
        readAppSources(),
      ),
    },
  ];
}

const dictionaryRows = collectDictionaryRows(schema);
const dictionaryTable = renderDictionary(dictionaryRows);

if (process.argv.includes('--write')) {
  const docPath = 'docs/data-dictionary.md';
  const text = read(docPath);
  const start = text.indexOf(DICTIONARY_START);
  const end = text.indexOf(DICTIONARY_END);
  if (start === -1 || end === -1 || end < start) {
    console.error('docs: FAILED\n  x dictionary: the data-dictionary markers are missing');
    process.exit(1);
  }
  const current = text.slice(start + DICTIONARY_START.length, end).trim();
  if (current !== dictionaryTable) {
    const next =
      text.slice(0, start + DICTIONARY_START.length) +
      '\n' +
      dictionaryTable +
      '\n' +
      text.slice(end);
    fs.writeFileSync(path.join(root, docPath), next);
    console.log('data dictionary: table regenerated in docs/data-dictionary.md');
  }
}

const result = audit();
const negatives = runNegatives();
for (const negative of negatives) {
  if (negative.issues.length === 0) {
    result.issues.push(`self-proof: "${negative.name}" was not detected`);
  }
}

if (result.issues.length) {
  console.error('docs: FAILED');
  for (const issue of result.issues) console.error(`  x ${issue}`);
  console.error(`\n${result.issues.length} problem(s) found`);
  process.exit(1);
}

const { stats } = result;
console.log('docs: OK');
console.log(
  `  modules: ${stats.modules} READMEs with purpose, inputs, outputs and tests; ${stats.decisions} decisions cited, all accepted`,
);
console.log(
  `  api: ${stats.engineExports} engine exports and ${stats.appExports} application exports documented, no phantom rows`,
);
console.log(
  `  dictionary: ${stats.dictionary} paths generated from scenarios/scenario.schema.json`,
);
console.log(`  experiments: ${stats.experiments} records; format enforced and template parsed`);
console.log(
  `  changelog: ${manifest.version} released; ${stats.releases} releases in descending order; links match the repository`,
);
console.log(`  map: ${stats.documents} documents named; every document has a row`);
console.log(`  scripts: ${stats.scripts} scripts, each named in scripts/README.md`);
console.log('  identity: name, mark, 24 colour tokens and font loaders match the charter');
console.log(`  negative: ${negatives.length} broken variants detected, each reported`);
