#!/usr/bin/env node
// Dependency-free check that the pinned runtime, the npm settings and the
// committed lockfile still agree. Run from the repository root:
//   node scripts/check-runtime.mjs

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const problems = [];
const fail = (msg) => problems.push(msg);

// A Node install satisfies an engines range without pulling in semver: the
// project writes ranges as space-separated conjunctions of comparators, so a
// comparator evaluator is enough. It is not a general semver implementation.
const parseVer = (s) => {
  const m = /^v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/.exec(String(s).trim());
  if (!m) return null;
  return [m[1], m[2], m[3]].map((p) => (p === undefined || p === 'x' || p === '*' ? null : Number(p)));
};
const fill = (v) => v.map((x) => (x === null ? 0 : x));
const cmp = (a, b) => {
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
};
const testToken = (ver, token) => {
  const m = /^(>=|<=|>|<|=|\^|~)?(.*)$/.exec(token);
  const op = m[1] || '=';
  const target = parseVer(m[2]);
  if (!target) return false;
  const t = fill(target);
  if (op === '=') return target.every((p, i) => p === null || p === ver[i]);
  if (op === '>') return cmp(ver, t) > 0;
  if (op === '>=') return cmp(ver, t) >= 0;
  if (op === '<') return cmp(ver, t) < 0;
  if (op === '<=') return cmp(ver, t) <= 0;
  if (op === '~') return cmp(ver, t) >= 0 && ver[0] === t[0] && ver[1] === t[1];
  if (op === '^') {
    if (cmp(ver, t) < 0) return false;
    if (t[0] > 0) return ver[0] === t[0];
    if (t[1] > 0) return ver[0] === 0 && ver[1] === t[1];
    return ver[0] === 0 && ver[1] === 0 && ver[2] === t[2];
  }
  return false;
};
const satisfies = (version, range) => {
  const ver = parseVer(version);
  if (!ver) return false;
  return String(range)
    .split('||')
    .some((clause) => clause.trim().split(/\s+/).filter(Boolean).every((t) => testToken(ver, t)));
};

const installedNpm = () => {
  const fromAgent = /npm\/(\d+\.\d+\.\d+)/.exec(process.env.npm_config_user_agent ?? '');
  if (fromAgent) return fromAgent[1];
  try {
    return execSync('npm --version', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

// package.json
let pkg;
try {
  pkg = JSON.parse(read('package.json'));
} catch (error) {
  console.error('runtime: FAILED');
  console.error(`  x package.json is missing or not valid JSON: ${error.message}`);
  process.exit(1);
}

const nodeVersion = process.version.replace(/^v/, '');
if (!pkg.engines?.node) fail('package.json: engines.node is missing');
else if (!satisfies(nodeVersion, pkg.engines.node)) {
  fail(`node: ${process.version} does not satisfy engines.node "${pkg.engines.node}"`);
}
if (!pkg.engines?.npm) fail('package.json: engines.npm is missing');

const npmVersion = installedNpm();
if (!npmVersion) fail('npm: version could not be determined');
else if (pkg.engines?.npm && !satisfies(npmVersion, pkg.engines.npm)) {
  fail(`npm: ${npmVersion} does not satisfy engines.npm "${pkg.engines.npm}"`);
}

const declared = /^npm@(\d+\.\d+\.\d+)$/.exec(pkg.packageManager ?? '');
if (!declared) fail('package.json: packageManager must be "npm@x.y.z"');
else if (npmVersion && declared[1] !== npmVersion) {
  fail(`npm: packageManager declares ${declared[1]} but ${npmVersion} is installed`);
}

// .nvmrc
const nvmrc = read('.nvmrc').trim();
if (!/^\d+\.\d+\.\d+$/.test(nvmrc)) fail(`.nvmrc: "${nvmrc}" is not an exact version`);
else {
  if (pkg.engines?.node && !satisfies(nvmrc, pkg.engines.node)) {
    fail(`.nvmrc: ${nvmrc} does not satisfy engines.node "${pkg.engines.node}"`);
  }
  if (parseVer(nvmrc)[0] !== parseVer(nodeVersion)[0]) {
    fail(`.nvmrc: ${nvmrc} is a different major line from the running ${process.version}`);
  }
}

// .npmrc
const npmrc = read('.npmrc');
for (const setting of ['engine-strict=true', 'save-exact=true', 'package-lock=true']) {
  if (!npmrc.split(/\r?\n/).some((l) => l.trim() === setting)) fail(`.npmrc: missing "${setting}"`);
}

// Lockfile
let lock = null;
try {
  lock = JSON.parse(read('package-lock.json'));
} catch {
  fail('package-lock.json: missing or not valid JSON; run npm install --package-lock-only');
}
if (lock) {
  if (!(lock.lockfileVersion >= 3)) fail(`lockfile: version ${lock.lockfileVersion} is older than 3`);
  if (lock.name !== pkg.name) fail(`lockfile: name "${lock.name}" does not match package.json "${pkg.name}"`);
  if (lock.version !== pkg.version) {
    fail(`lockfile: version "${lock.version}" does not match package.json "${pkg.version}"`);
  }
  const rootBlock = lock.packages?.[''];
  if (!rootBlock) fail('lockfile: root package entry is missing');
  else if (JSON.stringify(rootBlock.engines) !== JSON.stringify(pkg.engines)) {
    fail('lockfile: engines disagree with package.json; regenerate the lockfile');
  }
}

// Exact-version policy across every dependency block.
const blocks = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
let pinned = 0;
for (const block of blocks) {
  for (const [name, spec] of Object.entries(pkg[block] ?? {})) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(spec))) {
      fail(`package.json: ${block}.${name} must be an exact version, found "${spec}"`);
    } else pinned += 1;
  }
}

// Licence consistency.
if (pkg.license !== 'MIT') fail(`package.json: license must be MIT, found "${pkg.license}"`);
else if (!read('LICENSE').startsWith('MIT License')) fail('LICENSE: does not contain the MIT text');

// The tree is only clean if generated directories are ignored.
if (!read('.gitignore').includes('node_modules/')) fail('.gitignore: node_modules/ is not ignored');

if (problems.length) {
  console.error('runtime: FAILED');
  for (const p of problems) console.error(`  x ${p}`);
  console.error(`\n${problems.length} problem(s) found`);
  process.exit(1);
}

console.log('runtime: OK');
console.log(`  node: ${process.version} satisfies engines.node "${pkg.engines.node}"`);
console.log(`  npm: ${npmVersion} pinned by packageManager "npm@${declared[1]}"`);
console.log(`  .nvmrc: ${nvmrc} agrees with engines and the running major line`);
console.log('  .npmrc: engine-strict, save-exact and package-lock are set');
console.log(`  lockfile: v${lock.lockfileVersion}, name/version/engines match, ${pinned} dependency entries pinned exactly`);
console.log('  licence: MIT in package.json and LICENSE');
