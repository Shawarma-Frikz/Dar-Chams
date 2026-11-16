#!/usr/bin/env node
// Scenario files on disk, validated by the same validator the application runs
// at startup (packages/engine/src/config). JSON Schema covers structure,
// the invariants cover contradictions inside one document, and this script
// covers the rule that needs a file name: the file is named after its id, so a
// fixture and the run it produced stay tied together.
//
// Usage: node scripts/validate-scenarios.mjs

import fs from 'node:fs';
import path from 'node:path';
import { createScenarioValidator, formatIssues } from '@dar-chams/engine';

const DIR = path.resolve('scenarios');
const SCHEMA_FILE = 'scenario.schema.json';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const schemaPath = path.join(DIR, SCHEMA_FILE);
if (!fs.existsSync(schemaPath)) {
  console.error(`missing ${SCHEMA_FILE}`);
  process.exit(1);
}

let schema;
try {
  schema = readJson(schemaPath);
} catch (error) {
  console.error(`${SCHEMA_FILE}: invalid JSON (${error.message})`);
  process.exit(1);
}

const validator = createScenarioValidator(schema);
const files = fs
  .readdirSync(DIR)
  .filter((name) => name.endsWith('.json') && name !== SCHEMA_FILE)
  .sort();

if (files.length === 0) {
  console.error('no scenario files found');
  process.exit(1);
}

let problems = 0;
for (const name of files) {
  let document;
  try {
    document = readJson(path.join(DIR, name));
  } catch (error) {
    console.error(`${name}: invalid JSON (${error.message})`);
    problems += 1;
    continue;
  }

  const checked = validator.check(document);
  if (!checked.ok) {
    console.error(formatIssues(name, checked.issues));
    console.error('');
    problems += checked.issues.length;
    continue;
  }

  const expected = `${checked.scenario.id}.json`;
  if (name !== expected) {
    console.error(`${name}: file name must equal the scenario id, so the file is "${expected}"`);
    problems += 1;
  }
}

if (problems > 0) {
  console.error(`${problems} problem(s) found`);
  process.exit(1);
}

console.log(`validated ${files.length} scenario(s): ${files.join(', ')}`);
