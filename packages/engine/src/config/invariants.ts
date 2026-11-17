/**
 * Relational rules JSON Schema cannot express.
 *
 * Each one describes a state that is internally contradictory rather than
 * merely out of range: a usable window that runs backwards, a load assigned to
 * a room that does not exist, a job longer than the window reserved for it.
 * These run only after the schema has accepted the document, so every value
 * here is the type the `Scenario` interface declares.
 */

import type { ConfigIssue } from './issues.ts';
import { describeValue } from './issues.ts';
import type { Scenario } from './scenario.ts';
import type { Instant } from '../time/instant.ts';
import { parseInstant } from '../time/instant.ts';
import { formatZonedInstant, isTimeZone, zoneOffsetMinutes } from '../time/zone.ts';

const toMinutes = (clock: string): number => {
  const [hours = '0', minutes = '0'] = clock.split(':');
  return Number(hours) * 60 + Number(minutes);
};

/** The offset written in an ISO instant, in minutes east of UTC. */
const writtenOffsetMinutes = (text: string): number => {
  const match = /(Z|([+-])(\d{2}):(\d{2}))$/.exec(text);
  if (!match || match[1] === 'Z') return 0;
  const hours = Number(match[3]);
  const minutes = Number(match[4]);
  return (match[2] === '-' ? -1 : 1) * (hours * 60 + minutes);
};

const offsetLabel = (minutes: number): string => {
  if (minutes === 0) return 'Z';
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
};

/**
 * A timestamp is only a timezone-aware instant if its zone exists and the
 * offset it carries is the offset that zone had at that moment. A wrong offset
 * still names an instant, but not the local time the author meant.
 */
function checkSiteTime(scenario: Scenario, issues: ConfigIssue[]): void {
  const { timezone } = scenario.site;
  if (!isTimeZone(timezone)) {
    issues.push({
      layer: 'scenario',
      path: 'site.timezone',
      code: 'relation.timezone',
      message: 'is not an IANA timezone this runtime knows',
      received: describeValue(timezone),
      expected: 'an IANA identifier such as "Africa/Tunis"',
      hint: 'the site zone is the only zone a run displays; an abbreviation such as CET or a city name is not an identifier',
    });
    return;
  }

  const written = scenario.simulation.start;
  let start: Instant;
  try {
    start = parseInstant(written);
  } catch (error) {
    issues.push({
      layer: 'scenario',
      path: 'simulation.start',
      code: 'relation.start-instant',
      message: 'is not an instant the engine can read',
      received: describeValue(written),
      expected:
        'an ISO 8601 instant with an explicit offset, for example 2026-06-21T00:00:00+01:00',
      hint: error instanceof Error ? error.message : 'append Z or a numeric offset',
    });
    return;
  }

  const declared = writtenOffsetMinutes(written);
  const actual = zoneOffsetMinutes(start, timezone);
  if (declared !== actual) {
    issues.push({
      layer: 'scenario',
      path: 'simulation.start',
      code: 'relation.start-offset',
      message: "does not carry the site timezone's offset at that instant",
      received: describeValue(written),
      expected: `an instant with offset ${offsetLabel(actual)} for ${timezone}, for example ${formatZonedInstant(start, timezone)}`,
      hint: 'the written offset and the site timezone must agree, or the run starts at a local time nobody intended',
    });
  }
}

function checkBatteryWindow(scenario: Scenario, issues: ConfigIssue[]): void {
  const { min_soc: min, max_soc: max, initial_soc: initial } = scenario.battery;
  if (min >= max) {
    issues.push({
      layer: 'scenario',
      path: 'battery.min_soc',
      code: 'relation.soc-window',
      message: 'is not below battery.max_soc, so the usable window is empty',
      received: `${min} and ${max}`,
      expected: `a min_soc below max_soc, for example 0.10 against 0.95`,
      hint: 'a battery cannot charge into a window that runs backwards; raise max_soc or lower min_soc',
    });
  } else if (initial < min || initial > max) {
    issues.push({
      layer: 'scenario',
      path: 'battery.initial_soc',
      code: 'relation.soc-start',
      message: 'starts the run outside the usable window',
      received: describeValue(initial),
      expected: `a value between min_soc (${min}) and max_soc (${max})`,
      hint: 'state of charge is a fraction in [0, 1]; the run cannot begin at a level the controller must never leave',
    });
  }
}

function checkShadingProfile(scenario: Scenario, issues: ConfigIssue[]): void {
  const windows = scenario.pv.shading_profile?.windows ?? [];
  const segments: { start: number; end: number; index: number }[] = [];

  windows.forEach((window, index) => {
    const start = toMinutes(window.start);
    const end = toMinutes(window.end);
    const path = `pv.shading_profile.windows[${index}]`;
    if (start === end) {
      issues.push({
        layer: 'scenario',
        path,
        code: 'relation.shading-window',
        message: 'has the same start and end, so its daily duration is ambiguous',
        received: `${window.start}–${window.end}`,
        expected: 'a non-empty daily interval with different start and end times',
        hint: 'use distinct site-local times; an interval may cross midnight',
      });
      return;
    }

    if (start < end) {
      segments.push({ start, end, index });
    } else {
      segments.push({ start, end: 1440, index }, { start: 0, end, index });
    }
  });

  const reportedPairs = new Set<string>();
  for (let left = 0; left < segments.length; left += 1) {
    const a = segments[left];
    if (!a) continue;
    for (let right = left + 1; right < segments.length; right += 1) {
      const b = segments[right];
      if (!b || a.index === b.index || Math.max(a.start, b.start) >= Math.min(a.end, b.end)) {
        continue;
      }
      const pair = `${a.index}:${b.index}`;
      if (reportedPairs.has(pair)) continue;
      reportedPairs.add(pair);
      issues.push({
        layer: 'scenario',
        path: `pv.shading_profile.windows[${b.index}]`,
        code: 'relation.shading-window-overlap',
        message: `overlaps shading window ${a.index}`,
        received: `${windows[b.index]?.start ?? ''}–${windows[b.index]?.end ?? ''}`,
        expected: 'windows that do not overlap within a repeating site-local day',
        hint: 'merge overlapping periods and assign one shading loss to the merged interval',
      });
      break;
    }
  }
}

function checkHousehold(scenario: Scenario, issues: ConfigIssue[]): void {
  const { rooms, appliances } = scenario.household;

  const roomIds = new Set<string>();
  rooms.forEach((room, index) => {
    if (roomIds.has(room.id)) {
      issues.push({
        layer: 'scenario',
        path: `household.rooms[${index}].id`,
        code: 'relation.room-id',
        message: 'is used by more than one room',
        received: describeValue(room.id),
        expected: 'a room id that appears once',
        hint: 'events, annotations and the twin refer to rooms by id, so ids must be unambiguous',
      });
    }
    roomIds.add(room.id);
  });

  const applianceIds = new Set<string>();
  appliances.forEach((appliance, index) => {
    const path = `household.appliances[${index}]`;
    if (applianceIds.has(appliance.id)) {
      issues.push({
        layer: 'scenario',
        path: `${path}.id`,
        code: 'relation.appliance-id',
        message: 'is used by more than one appliance',
        received: describeValue(appliance.id),
        expected: 'an appliance id that appears once',
        hint: 'shed decisions and timeline events name the appliance by id',
      });
    }
    applianceIds.add(appliance.id);

    if (!roomIds.has(appliance.room)) {
      issues.push({
        layer: 'scenario',
        path: `${path}.room`,
        code: 'relation.room-reference',
        message: 'names a room that household.rooms does not declare',
        received: describeValue(appliance.room),
        expected: `one of ${[...roomIds].join(', ')}`,
        hint: 'every load belongs to a room; add the room or correct the reference',
      });
    }

    const window = appliance.flexibility;
    if (window) {
      const span = (toMinutes(window.latest) - toMinutes(window.earliest) + 1440) % 1440;
      if (window.duration_minutes > span) {
        issues.push({
          layer: 'scenario',
          path: `${path}.flexibility.duration_minutes`,
          code: 'relation.flexibility-window',
          message: 'is longer than the window it has to run in',
          received: `${window.duration_minutes} min in a ${span} min window`,
          expected: `at most ${span} minutes between ${window.earliest} and ${window.latest}`,
          hint: 'a task that cannot finish inside its window is not flexible, it is unschedulable',
        });
      }
    }
  });
}

function checkTariffBands(scenario: Scenario, issues: ConfigIssue[]): void {
  const bands = scenario.tariff.import_bands;
  let previous = 0;
  let openEndedSeen = false;
  bands.forEach((band, index) => {
    const path = `tariff.import_bands[${index}].up_to_kwh_per_month`;
    if (band.up_to_kwh_per_month === null) {
      if (index !== bands.length - 1) {
        issues.push({
          layer: 'scenario',
          path,
          code: 'relation.tariff-bands',
          message: 'is open-ended but is not the last band',
          received: 'null',
          expected: 'an increasing monthly limit, with null only on the final band',
          hint: 'bands are read in order; an open-ended band before the last one makes the rest unreachable',
        });
      }
      openEndedSeen = true;
      return;
    }
    if (openEndedSeen || band.up_to_kwh_per_month <= previous) {
      issues.push({
        layer: 'scenario',
        path,
        code: 'relation.tariff-bands',
        message: 'does not increase from the band before it',
        received: describeValue(band.up_to_kwh_per_month),
        expected: `a monthly limit above ${previous} kWh`,
        hint: 'tariff bands are cumulative thresholds; they must ascend and be closed by one open-ended band',
      });
    }
    previous = band.up_to_kwh_per_month;
  });
}

/** Returns every relational problem; an empty array means the document is coherent. */
export function checkScenarioInvariants(scenario: Scenario): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  if (!Number.isSafeInteger(scenario.simulation.seed) || scenario.simulation.seed < 0) {
    issues.push({
      layer: 'scenario',
      path: 'simulation.seed',
      code: 'relation.seed-range',
      message: 'must be a non-negative safe integer so distinct seeds remain distinct at runtime',
      received: describeValue(scenario.simulation.seed),
      expected: 'an integer from 0 through 9007199254740991',
      hint: 'choose a non-negative integer no greater than Number.MAX_SAFE_INTEGER',
    });
  }
  checkSiteTime(scenario, issues);
  checkBatteryWindow(scenario, issues);
  checkShadingProfile(scenario, issues);
  checkHousehold(scenario, issues);
  checkTariffBands(scenario, issues);
  return issues;
}
