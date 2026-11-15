#!/usr/bin/env node
// Dependency-free scenario checks.
//
// The JSON Schema in scenarios/scenario.schema.json is the format contract and will be
// enforced with Ajv in phase 01.4. JSON Schema cannot express relational invariants
// (SOC ordering, unique IDs, room references, schedule validity), so this script covers
// those plus a fast structural pass for CI. Run with: node scripts/validate-scenarios.mjs

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('scenarios');
const SCHEMA_FILE = 'scenario.schema.json';
const errors = [];

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isInteger = (v) => Number.isInteger(v);
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isClock = (v) => typeof v === 'string' && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
const isEntityId = (v) => typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v);
const isScenarioId = (v) => typeof v === 'string' && /^[a-z][a-z0-9-]*$/.test(v);

const PRIORITIES = ['critical', 'important', 'flexible', 'discretionary'];
const PROFILES = ['always_on', 'duty_cycle', 'schedule', 'flexible_window'];
const PROVENANCE = ['synthetic-design', 'dataset-derived', 'measured'];
const TIMESTEPS = [5, 15, 30, 60];
const REQUIRED = [
  'schema_version', 'id', 'name', 'description', 'created', 'provenance', 'site',
  'mode', 'simulation', 'pv', 'inverter', 'battery', 'grid', 'tariff', 'weather',
  'household', 'policies',
];

const fail = (file, message) => errors.push(`${file}: ${message}`);
const inRange = (v, min, max) => isFiniteNumber(v) && v >= min && v <= max;

function checkWindow(file, label, window) {
  if (!window || typeof window !== 'object') return fail(file, `${label} must be an object`);
  if (!isClock(window.start)) fail(file, `${label}.start must be HH:MM`);
  if (!isClock(window.end)) fail(file, `${label}.end must be HH:MM`);
  if (window.start === window.end) fail(file, `${label} has identical start and end`);
}

function checkAppliance(file, appliance, roomIds, seenIds) {
  const label = `appliance "${appliance?.id ?? '?'}"`;
  if (!isEntityId(appliance.id)) fail(file, `${label}: id must match ^[a-z][a-z0-9_]*$`);
  if (seenIds.has(appliance.id)) fail(file, `${label}: duplicate id`);
  seenIds.add(appliance.id);
  if (!isText(appliance.name)) fail(file, `${label}: name is required`);
  if (!roomIds.has(appliance.room)) fail(file, `${label}: room "${appliance.room}" does not exist`);
  if (!(isFiniteNumber(appliance.rated_power_w) && appliance.rated_power_w > 0)) {
    fail(file, `${label}: rated_power_w must be > 0`);
  }
  if (!PRIORITIES.includes(appliance.priority)) fail(file, `${label}: invalid priority`);
  if (typeof appliance.controllable !== 'boolean') fail(file, `${label}: controllable must be boolean`);
  if (!PROFILES.includes(appliance.profile)) fail(file, `${label}: invalid profile`);
  if ('note' in appliance && !isText(appliance.note)) fail(file, `${label}: note must be text`);

  const has = (key) => key in appliance;
  switch (appliance.profile) {
    case 'always_on':
      if (has('duty_cycle') || has('schedule') || has('flexibility')) {
        fail(file, `${label}: always_on must not define duty_cycle, schedule or flexibility`);
      }
      break;
    case 'duty_cycle':
      if (!(isFiniteNumber(appliance.duty_cycle) && appliance.duty_cycle > 0 && appliance.duty_cycle <= 1)) {
        fail(file, `${label}: duty_cycle must be in (0, 1]`);
      }
      if (has('schedule') || has('flexibility')) {
        fail(file, `${label}: duty_cycle must not define schedule or flexibility`);
      }
      break;
    case 'schedule':
      if (!has('schedule')) fail(file, `${label}: schedule profile requires a schedule`);
      else checkWindow(file, `${label}.schedule`, appliance.schedule);
      if (has('duty_cycle') || has('flexibility')) {
        fail(file, `${label}: schedule must not define duty_cycle or flexibility`);
      }
      break;
    case 'flexible_window': {
      const f = appliance.flexibility;
      if (!f || typeof f !== 'object') {
        fail(file, `${label}: flexible_window requires flexibility`);
        break;
      }
      if (!isClock(f.earliest)) fail(file, `${label}: flexibility.earliest must be HH:MM`);
      if (!isClock(f.latest)) fail(file, `${label}: flexibility.latest must be HH:MM`);
      if (!(isInteger(f.duration_minutes) && f.duration_minutes > 0 && f.duration_minutes <= 1440)) {
        fail(file, `${label}: flexibility.duration_minutes must be an integer in 1..1440`);
      }
      if (typeof f.non_interruptible !== 'boolean') {
        fail(file, `${label}: flexibility.non_interruptible must be boolean`);
      }
      if (appliance.controllable !== true) {
        fail(file, `${label}: flexible appliances must be controllable`);
      }
      if (has('duty_cycle') || has('schedule')) {
        fail(file, `${label}: flexible_window must not define duty_cycle or schedule`);
      }
      break;
    }
  }
}

function checkScenario(file, s) {
  for (const key of REQUIRED) if (!(key in s)) fail(file, `missing required key "${key}"`);
  if (s.schema_version !== '0.1.0') fail(file, `schema_version must be "0.1.0"`);
  if (!isScenarioId(s.id)) fail(file, 'id must match ^[a-z][a-z0-9-]*$');
  if (path.basename(file, '.json') !== s.id) fail(file, `file name must equal id ("${s.id}.json")`);
  if (!isText(s.name) || !isText(s.description)) fail(file, 'name and description are required');
  if (typeof s.created !== 'string' || Number.isNaN(Date.parse(s.created))) fail(file, 'created must be a date');
  if (!s.provenance || !PROVENANCE.includes(s.provenance.class)) fail(file, 'invalid provenance.class');
  if (!s.provenance || !isText(s.provenance.notes)) fail(file, 'provenance.notes is required');

  const site = s.site ?? {};
  if (!inRange(site.latitude_deg, -90, 90)) fail(file, 'site.latitude_deg out of range');
  if (!inRange(site.longitude_deg, -180, 180)) fail(file, 'site.longitude_deg out of range');
  if (!isFiniteNumber(site.altitude_m)) fail(file, 'site.altitude_m must be a number');
  if (!isText(site.timezone)) fail(file, 'site.timezone is required');
  if (!['grid_connected', 'off_grid'].includes(s.mode)) fail(file, 'invalid mode');

  const sim = s.simulation ?? {};
  if (!TIMESTEPS.includes(sim.timestep_minutes)) fail(file, 'unsupported timestep_minutes');
  if (typeof sim.start !== 'string' || Number.isNaN(Date.parse(sim.start))) fail(file, 'invalid simulation.start');
  if (!(isInteger(sim.horizon_hours) && sim.horizon_hours >= 1 && sim.horizon_hours <= 168)) {
    fail(file, 'simulation.horizon_hours must be an integer in 1..168');
  }
  if (!(isInteger(sim.seed) && sim.seed >= 0)) fail(file, 'simulation.seed must be a non-negative integer');
  if (!(isFiniteNumber(sim.default_speed_multiplier) && sim.default_speed_multiplier >= 1)) {
    fail(file, 'simulation.default_speed_multiplier must be >= 1');
  }

  const pv = s.pv ?? {};
  if (!(isFiniteNumber(pv.installed_dc_kwp) && pv.installed_dc_kwp > 0)) fail(file, 'pv.installed_dc_kwp must be > 0');
  if (!(isInteger(pv.panel_count) && pv.panel_count > 0)) fail(file, 'pv.panel_count must be a positive integer');
  if (!inRange(pv.tilt_deg, 0, 90)) fail(file, 'pv.tilt_deg out of range');
  if (!inRange(pv.azimuth_deg, 0, 360)) fail(file, 'pv.azimuth_deg out of range');
  if (!inRange(pv.soiling_loss, 0, 1)) fail(file, 'pv.soiling_loss out of range');
  if (!inRange(pv.mismatch_loss, 0, 1)) fail(file, 'pv.mismatch_loss out of range');
  if (!inRange(pv.availability, 0, 1)) fail(file, 'pv.availability out of range');
  if (!pv.tracker || typeof pv.tracker.enabled !== 'boolean') fail(file, 'pv.tracker.enabled must be boolean');
  else if (pv.tracker.enabled && ![1, 2].includes(pv.tracker.axes)) fail(file, 'enabled tracker needs 1 or 2 axes');
  for (const [i, w] of (pv.shading_windows ?? []).entries()) checkWindow(file, `pv.shading_windows[${i}]`, w);

  const inverter = s.inverter ?? {};
  if (!(isFiniteNumber(inverter.rated_ac_kw) && inverter.rated_ac_kw > 0)) fail(file, 'inverter.rated_ac_kw must be > 0');
  if (!inRange(inverter.efficiency, 0, 1) || inverter.efficiency === 0) fail(file, 'inverter.efficiency must be in (0, 1]');
  if (!isFiniteNumber(inverter.standby_w) || inverter.standby_w < 0) fail(file, 'inverter.standby_w must be >= 0');

  const battery = s.battery ?? {};
  if (!['lfp', 'nmc', 'lead_acid'].includes(battery.chemistry)) fail(file, 'invalid battery.chemistry');
  if (!inRange(battery.min_soc, 0, 1) || !inRange(battery.max_soc, 0, 1)) fail(file, 'battery SOC bounds out of range');
  if (!inRange(battery.initial_soc, 0, 1)) fail(file, 'battery.initial_soc out of range');
  if (isFiniteNumber(battery.min_soc) && isFiniteNumber(battery.max_soc) && !(battery.min_soc < battery.max_soc)) {
    fail(file, 'battery.min_soc must be below max_soc');
  }
  if (isFiniteNumber(battery.min_soc) && isFiniteNumber(battery.max_soc) && isFiniteNumber(battery.initial_soc)) {
    if (battery.initial_soc < battery.min_soc || battery.initial_soc > battery.max_soc) {
      fail(file, 'battery.initial_soc must lie inside the usable window');
    }
  }
  if (!(isFiniteNumber(battery.nominal_capacity_kwh) && battery.nominal_capacity_kwh > 0)) {
    fail(file, 'battery.nominal_capacity_kwh must be > 0');
  }
  if (!(isFiniteNumber(battery.max_charge_kw) && battery.max_charge_kw > 0)) fail(file, 'battery.max_charge_kw must be > 0');
  if (!(isFiniteNumber(battery.max_discharge_kw) && battery.max_discharge_kw > 0)) fail(file, 'battery.max_discharge_kw must be > 0');
  if (!inRange(battery.round_trip_efficiency, 0, 1) || battery.round_trip_efficiency === 0) {
    fail(file, 'battery.round_trip_efficiency must be in (0, 1]');
  }

  const grid = s.grid ?? {};
  if (!(isFiniteNumber(grid.import_limit_kw) && grid.import_limit_kw >= 0)) fail(file, 'grid.import_limit_kw invalid');
  if (!(isFiniteNumber(grid.export_limit_kw) && grid.export_limit_kw >= 0)) fail(file, 'grid.export_limit_kw invalid');
  if (s.mode === 'off_grid' && (grid.import_limit_kw !== 0 || grid.export_limit_kw !== 0)) {
    fail(file, 'off_grid requires zero import and export limits');
  }
  for (const [i, o] of (grid.outages ?? []).entries()) {
    if (Number.isNaN(Date.parse(o?.start)) || Number.isNaN(Date.parse(o?.end))) {
      fail(file, `grid.outages[${i}] needs valid start and end instants`);
    }
  }

  const tariff = s.tariff ?? {};
  if (!/^[A-Z]{3}$/.test(tariff.currency ?? '')) fail(file, 'tariff.currency must be ISO-4217 letters');
  if (typeof tariff.verified !== 'boolean') fail(file, 'tariff.verified must be boolean');
  if (!isText(tariff.source)) fail(file, 'tariff.source is required');
  if (!Array.isArray(tariff.import_bands) || tariff.import_bands.length === 0) fail(file, 'tariff.import_bands must not be empty');
  if (tariff.verified === true) {
    const bands = tariff.import_bands ?? [];
    bands.forEach((b, i) => {
      if (!isFiniteNumber(b.price_tnd_per_kwh)) fail(file, `tariff.import_bands[${i}].price_tnd_per_kwh must be numeric when verified`);
    });
    if (!isFiniteNumber(tariff.fixed_monthly_tnd)) fail(file, 'tariff.fixed_monthly_tnd must be numeric when verified');
    if (!isFiniteNumber(tariff.export_compensation_tnd_per_kwh)) {
      fail(file, 'tariff.export_compensation_tnd_per_kwh must be numeric when verified');
    }
  }

  const weather = s.weather ?? {};
  if (!Array.isArray(weather.fallback_order) || weather.fallback_order.length === 0) {
    fail(file, 'weather.fallback_order must not be empty');
  } else if (new Set(weather.fallback_order).size !== weather.fallback_order.length) {
    fail(file, 'weather.fallback_order must not repeat entries');
  }

  const household = s.household ?? {};
  const rooms = household.rooms ?? [];
  const appliances = household.appliances ?? [];
  if (!Array.isArray(rooms) || rooms.length === 0) fail(file, 'household.rooms must not be empty');
  if (!Array.isArray(appliances) || appliances.length === 0) fail(file, 'household.appliances must not be empty');
  const roomIds = new Set();
  for (const room of rooms) {
    if (!isEntityId(room.id)) fail(file, `room "${room.id}" has an invalid id`);
    if (roomIds.has(room.id)) fail(file, `duplicate room id "${room.id}"`);
    roomIds.add(room.id);
    if (!isText(room.name)) fail(file, `room "${room.id}" is missing a name`);
  }
  const applianceIds = new Set();
  for (const appliance of appliances) checkAppliance(file, appliance, roomIds, applianceIds);

  const policies = s.policies ?? {};
  if (!inRange(policies.baseline?.reserve_soc, 0, 1)) fail(file, 'policies.baseline.reserve_soc out of range');
  if (!inRange(policies.scheduler?.reserve_soc, 0, 1)) fail(file, 'policies.scheduler.reserve_soc out of range');
  const order = policies.baseline?.shed_order ?? [];
  if (!Array.isArray(order) || order.length === 0) fail(file, 'policies.baseline.shed_order must not be empty');
  else {
    if (order.some((p) => !PRIORITIES.includes(p))) fail(file, 'shed_order contains an unknown priority');
    if (new Set(order).size !== order.length) fail(file, 'shed_order must not repeat a priority');
  }
  if (!(isInteger(policies.scheduler?.horizon_hours) && policies.scheduler.horizon_hours >= 1)) {
    fail(file, 'policies.scheduler.horizon_hours must be a positive integer');
  }
}

function main() {
  const schemaPath = path.join(DIR, SCHEMA_FILE);
  if (!fs.existsSync(schemaPath)) {
    console.error(`missing ${SCHEMA_FILE}`);
    process.exit(1);
  }
  try {
    JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    console.error(`${SCHEMA_FILE}: invalid JSON (${error.message})`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(DIR)
    .filter((name) => name.endsWith('.json') && name !== SCHEMA_FILE)
    .sort();

  if (files.length === 0) {
    console.error('no scenario files found');
    process.exit(1);
  }

  for (const name of files) {
    const full = path.join(DIR, name);
    let scenario;
    try {
      scenario = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (error) {
      fail(name, `invalid JSON (${error.message})`);
      continue;
    }
    checkScenario(full, scenario);
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`  x ${error}`);
    console.error(`\n${errors.length} problem(s) found`);
    process.exit(1);
  }

  console.log(`validated ${files.length} scenario(s): ${files.join(', ')}`);
  console.log('note: full JSON Schema validation with Ajv arrives in phase 01.4');
}

main();
