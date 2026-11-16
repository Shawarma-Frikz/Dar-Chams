#!/usr/bin/env node
// Proof for task 02.1: a full site day produces the expected number of steps,
// and the day and timezone boundaries are placed correctly.
//
// The expected counts and offsets are written here, independent of the code
// that computes them, and the fixtures include two DST zones — Paris, whose
// shift is an hour, and Lord Howe, whose shift is thirty minutes. The same run
// then feeds deliberately broken cases through the public API and the scenario
// validator, because a check that cannot fail proves nothing.
//
// Usage: node scripts/check-time.mjs

import fs from 'node:fs';
import path from 'node:path';

import {
  TIMESTEP_MINUTES,
  createScenarioValidator,
  createStepGrid,
  formatInstant,
  formatZonedInstant,
  groupStepsBySiteDay,
  instantFromZonedParts,
  intervalWattHours,
  kilowattHoursFromWattHours,
  parseInstant,
  siteDayBounds,
  siteDayGrid,
  stepAt,
  stepsInSiteDay,
  wattsFromKilowatts,
  zoneOffsetMinutes,
} from '@dar-chams/engine';

const ROOT = path.resolve('.');
const SCENARIOS = path.join(ROOT, 'scenarios');

const problems = [];
const expect = (condition, message) => {
  if (!condition) problems.push(message);
};
const same = (actual, expected, message) => {
  const equal = JSON.stringify(actual) === JSON.stringify(expected);
  expect(equal, `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};
const label = (instant, timeZone) => formatZonedInstant(instant, timeZone).replace('.000', '');

const schema = JSON.parse(fs.readFileSync(path.join(SCENARIOS, 'scenario.schema.json'), 'utf8'));
const validator = createScenarioValidator(schema);
const readScenario = (name) => JSON.parse(fs.readFileSync(path.join(SCENARIOS, name), 'utf8'));

// ---------------------------------------------------------------------------
// 1 · The shipped scenarios, on the real grid.
// ---------------------------------------------------------------------------
const shipped = fs
  .readdirSync(SCENARIOS)
  .filter((name) => name.endsWith('.json') && name !== 'scenario.schema.json')
  .sort();

const runs = [];
for (const name of shipped) {
  const checked = validator.check(readScenario(name));
  expect(checked.ok, `${name} should validate before its time axis is used`);
  if (!checked.ok) continue;

  const { scenario } = checked;
  const timeZone = scenario.site.timezone;
  const start = parseInstant(scenario.simulation.start);
  const timestep = scenario.simulation.timestep_minutes;
  const horizonMinutes = scenario.simulation.horizon_hours * 60;
  const grid = createStepGrid(start, timestep, horizonMinutes);

  same(grid.stepCount, horizonMinutes / timestep, `${name}: steps are duration / timestep`);
  expect(
    stepAt(grid, 0).start === start,
    `${name}: the first step must begin at the scenario start`,
  );
  expect(
    stepAt(grid, grid.stepCount - 1).end === grid.end,
    `${name}: the last step must end at the horizon`,
  );
  expect(
    zoneOffsetMinutes(start, timeZone) === writtenOffset(scenario.simulation.start),
    `${name}: the written start offset must be the site zone's offset`,
  );

  const days = groupStepsBySiteDay(grid, timeZone);
  same(
    days.reduce((sum, day) => sum + day.stepCount, 0),
    grid.stepCount,
    `${name}: the site days must tile the run`,
  );
  for (const day of days) {
    expect(
      day.stepCount * timestep === day.minutes,
      `${name} ${day.date}: ${day.stepCount} steps of ${timestep} min must equal ${day.minutes} min`,
    );
  }
  runs.push({ name, steps: grid.stepCount, days: days.length, timestep });
}

function writtenOffset(text) {
  const match = /(Z|([+-])(\d{2}):(\d{2}))$/.exec(text);
  if (!match || match[1] === 'Z') return 0;
  const sign = match[2] === '-' ? -1 : 1;
  return sign * (Number(match[3]) * 60 + Number(match[4]));
}

// ---------------------------------------------------------------------------
// 2 · A full day at every supported timestep.
// ---------------------------------------------------------------------------
const TUNIS = 'Africa/Tunis';
const tunisDay = siteDayBounds('2026-06-21', TUNIS);
const expectedDaySteps = { 5: 288, 15: 96, 30: 48, 60: 24 };

same(tunisDay.minutes, 1440, 'a Tunisian day is 24 hours');
same(
  [label(tunisDay.start, TUNIS), label(tunisDay.end, TUNIS)],
  ['2026-06-21T00:00:00+01:00', '2026-06-22T00:00:00+01:00'],
  'the Tunisian day runs local midnight to local midnight',
);

for (const timestep of TIMESTEP_MINUTES) {
  const expected = expectedDaySteps[timestep];
  same(
    stepsInSiteDay('2026-06-21', TUNIS, timestep),
    expected,
    `2026-06-21 at ${timestep} min should be ${expected} steps`,
  );
  const grid = siteDayGrid('2026-06-21', TUNIS, timestep);
  same(grid.stepCount, expected, `the full-day grid at ${timestep} min`);
  expect(
    stepAt(grid, expected - 1).end === tunisDay.end,
    `the last ${timestep}-minute step must end exactly at the next local midnight`,
  );
}

// ---------------------------------------------------------------------------
// 3 · Daylight-saving days, in two zones and two directions.
// ---------------------------------------------------------------------------
const dst = [
  {
    zone: 'Europe/Paris',
    date: '2026-03-29',
    minutes: 1380,
    at15: 92,
    opens: '+01:00',
    closes: '+02:00',
  },
  {
    zone: 'Europe/Paris',
    date: '2026-10-25',
    minutes: 1500,
    at15: 100,
    opens: '+02:00',
    closes: '+01:00',
  },
  {
    zone: 'Australia/Lord_Howe',
    date: '2026-10-04',
    minutes: 1410,
    at15: 94,
    opens: '+10:30',
    closes: '+11:00',
  },
  {
    zone: 'Australia/Lord_Howe',
    date: '2026-04-05',
    minutes: 1470,
    at15: 98,
    opens: '+11:00',
    closes: '+10:30',
  },
];

for (const fixture of dst) {
  const bounds = siteDayBounds(fixture.date, fixture.zone);
  same(bounds.minutes, fixture.minutes, `${fixture.zone} ${fixture.date}: day length`);
  same(
    stepsInSiteDay(fixture.date, fixture.zone, 15),
    fixture.at15,
    `${fixture.zone} ${fixture.date}: 15-minute steps`,
  );
  expect(
    label(bounds.start, fixture.zone).endsWith(fixture.opens),
    `${fixture.zone} ${fixture.date}: the day must open on ${fixture.opens}, got ${label(bounds.start, fixture.zone)}`,
  );
  expect(
    label(bounds.end, fixture.zone).endsWith(fixture.closes),
    `${fixture.zone} ${fixture.date}: the day must close on ${fixture.closes}, got ${label(bounds.end, fixture.zone)}`,
  );
}

const gap = instantFromZonedParts(
  { year: 2026, month: 3, day: 29, hour: 2, minute: 30, second: 0 },
  'Europe/Paris',
);
const overlap = instantFromZonedParts(
  { year: 2026, month: 10, day: 25, hour: 2, minute: 30, second: 0 },
  'Europe/Paris',
);
same(
  label(gap, 'Europe/Paris'),
  '2026-03-29T03:30:00+02:00',
  'a local time inside the spring gap shifts forward',
);
same(
  label(overlap, 'Europe/Paris'),
  '2026-10-25T02:30:00+02:00',
  'an ambiguous local time takes the earlier occurrence',
);

// ---------------------------------------------------------------------------
// 4 · Instants are stored once, and read back in the site zone.
// ---------------------------------------------------------------------------
const start = parseInstant('2026-06-21T00:00:00+01:00');
same(formatInstant(start), '2026-06-20T23:00:00.000Z', 'the instant is stored in UTC');
same(label(start, TUNIS), '2026-06-21T00:00:00+01:00', 'the instant is displayed in site time');
same(zoneOffsetMinutes(start, TUNIS), 60, 'Tunisia is UTC+1 in June');
same(
  label(parseInstant('2026-06-21T00:00:00Z'), 'Asia/Kathmandu'),
  '2026-06-21T05:45:00+05:45',
  'a 45-minute offset is carried, not rounded',
);

// ---------------------------------------------------------------------------
// 5 · Internal units: watts and watt-hours, with named display conversions.
// ---------------------------------------------------------------------------
same(intervalWattHours(2500, 15), 625, '2.5 kW for 15 minutes is 625 Wh');
same(kilowattHoursFromWattHours(625), 0.625, '625 Wh is 0.625 kWh');
same(intervalWattHours(6000, 5), 500, '6 kW for 5 minutes is 500 Wh');
same(wattsFromKilowatts(6), 6000, '6 kW is 6000 W');

// ---------------------------------------------------------------------------
// 6 · Negative proofs: each broken case must be refused, not repaired.
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

rejected('a naive instant', () => parseInstant('2026-06-21T00:00:00'), /offset/);
rejected(
  'a horizon that is not a whole number of steps',
  () => createStepGrid(start, 15, 1441),
  /whole number/,
);
rejected(
  'an hourly grid on a 23.5-hour day',
  () => stepsInSiteDay('2026-10-04', 'Australia/Lord_Howe', 60),
  /not a whole number/,
);

const offsetMismatch = readScenario('tunis-typical-v1.json');
offsetMismatch.simulation.start = '2026-06-21T00:00:00+02:00';
const mismatchCheck = validator.check(offsetMismatch);
const mismatchIssue = mismatchCheck.ok
  ? undefined
  : mismatchCheck.issues.find((issue) => issue.code === 'relation.start-offset');
expect(
  !mismatchCheck.ok && mismatchIssue?.path === 'simulation.start',
  'a start offset that contradicts the site zone must be rejected at simulation.start',
);
if (mismatchIssue) negatives.push('a start offset that contradicts the site zone');

const unknownZone = readScenario('tunis-typical-v1.json');
unknownZone.site.timezone = 'Mars/Olympus';
const zoneCheck = validator.check(unknownZone);
const zoneIssue = zoneCheck.ok
  ? undefined
  : zoneCheck.issues.find((issue) => issue.code === 'relation.timezone');
expect(
  !zoneCheck.ok && zoneIssue?.path === 'site.timezone',
  'a timezone the runtime does not know must be rejected at site.timezone',
);
if (zoneIssue) negatives.push('an unknown site timezone');

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
if (problems.length > 0) {
  console.error('time: FAILED');
  for (const problem of problems) console.error(`  x ${problem}`);
  console.error(`\n${problems.length} problem(s) found`);
  process.exit(1);
}

console.log('time: OK');
const uniform = runs.every(
  (run) =>
    run.steps === runs[0]?.steps &&
    run.days === runs[0]?.days &&
    run.timestep === runs[0]?.timestep,
);
console.log(
  uniform
    ? `  runs: ${runs.length} scenarios, each ${runs[0]?.steps} steps at ${runs[0]?.timestep} min over ${runs[0]?.days} site days, every boundary on a step`
    : `  runs: ${runs
        .map((run) => `${run.steps} steps, ${run.days} site days at ${run.timestep} min`)
        .join('; ')}, every boundary on a step`,
);
console.log(
  `  day: ${label(tunisDay.start, TUNIS)} → ${label(tunisDay.end, TUNIS)} (${tunisDay.minutes} min): ` +
    `${TIMESTEP_MINUTES.map((timestep) => expectedDaySteps[timestep]).join('/')} steps at ` +
    `${TIMESTEP_MINUTES.join('/')} min`,
);
console.log(
  `  dst: ${dst
    .map(
      (fixture) =>
        `${fixture.date} ${fixture.zone.split('/')[1]} ${fixture.minutes / 60} h → ${fixture.at15} steps`,
    )
    .join('; ')}`,
);
console.log('  transitions: 02:30 in a gap → 03:30+02:00; 02:30 ambiguous → the earlier +02:00');
console.log(
  `  instants: ${label(start, TUNIS)} stored ${formatInstant(start)}; a +05:45 zone is carried exactly`,
);
console.log('  units: 2500 W × 15 min = 625 Wh = 0.625 kWh; 6 kW = 6000 W');
console.log(`  negative: ${negatives.length} broken cases detected (${negatives.join(', ')})`);
