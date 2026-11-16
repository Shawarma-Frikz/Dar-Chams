import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { TimestepMinutes } from '../config/scenario.ts';
import { addMinutes, formatInstant, minutesBetween, parseInstant } from './instant.ts';
import {
  formatZonedInstant,
  instantFromZonedParts,
  isTimeZone,
  siteDate,
  siteDayBounds,
  zoneOffsetMinutes,
} from './zone.ts';
import {
  TIMESTEP_MINUTES,
  createStepGrid,
  groupStepsBySiteDay,
  siteDayGrid,
  stepAt,
  stepsInSiteDay,
} from './timeline.ts';

const SCENARIO = fileURLToPath(
  new URL('../../../../scenarios/tunis-typical-v1.json', import.meta.url),
);
const scenario = JSON.parse(readFileSync(SCENARIO, 'utf8')) as {
  site: { timezone: string };
  simulation: { start: string; timestep_minutes: TimestepMinutes; horizon_hours: number };
};

const start = (text: string) => parseInstant(text);

describe('instants', () => {
  it('stores a timezone-aware stamp as one absolute instant', () => {
    const instant = start('2026-06-21T00:00:00+01:00');
    expect(formatInstant(instant)).toBe('2026-06-20T23:00:00.000Z');
    expect(zoneOffsetMinutes(instant, 'Africa/Tunis')).toBe(60);
    expect(formatZonedInstant(instant, 'Africa/Tunis')).toBe('2026-06-21T00:00:00.000+01:00');
    expect(siteDate(instant, 'Africa/Tunis')).toBe('2026-06-21');
  });

  it('refuses a timestamp with no offset', () => {
    expect(() => start('2026-06-21T00:00:00')).toThrow(/offset/);
  });

  it('refuses a date the calendar does not have', () => {
    expect(() => start('2026-02-30T00:00:00Z')).toThrow(/calendar/);
  });

  it('refuses precision finer than a millisecond rather than truncating it', () => {
    expect(() => start('2026-06-21T00:00:00.1234Z')).toThrow(/millisecond/);
  });

  it('refuses a leap second, which the engine does not model', () => {
    expect(() => start('2026-06-21T00:00:60Z')).toThrow(/leap second/);
  });

  it('advances by whole minutes and measures the gap in minutes', () => {
    const from = start('2026-06-21T00:00:00Z');
    const to = addMinutes(from, 15);
    expect(formatInstant(to)).toBe('2026-06-21T00:15:00.000Z');
    expect(minutesBetween(from, to)).toBe(15);
    expect(() => addMinutes(from, 1.5)).toThrow(/whole minutes/);
  });

  it('formats a zone whose offset is not a whole hour, and a negative offset', () => {
    const kathmandu = start('2026-06-21T00:00:00Z');
    expect(formatZonedInstant(kathmandu, 'Asia/Kathmandu')).toBe('2026-06-21T05:45:00.000+05:45');
    const newYork = start('2026-01-15T12:00:00-05:00');
    expect(formatZonedInstant(newYork, 'America/New_York')).toBe('2026-01-15T12:00:00.000-05:00');
  });
});

describe('site days', () => {
  it('gives a Tunisian day 24 hours and 96 steps at 15 minutes', () => {
    const bounds = siteDayBounds('2026-06-21', 'Africa/Tunis');
    expect(bounds.minutes).toBe(1440);
    expect(formatZonedInstant(bounds.start, 'Africa/Tunis')).toBe('2026-06-21T00:00:00.000+01:00');
    expect(formatZonedInstant(bounds.end, 'Africa/Tunis')).toBe('2026-06-22T00:00:00.000+01:00');
    expect(stepsInSiteDay('2026-06-21', 'Africa/Tunis', 5)).toBe(288);
    expect(stepsInSiteDay('2026-06-21', 'Africa/Tunis', 15)).toBe(96);
    expect(stepsInSiteDay('2026-06-21', 'Africa/Tunis', 30)).toBe(48);
    expect(stepsInSiteDay('2026-06-21', 'Africa/Tunis', 60)).toBe(24);
    expect(siteDayGrid('2026-06-21', 'Africa/Tunis', 15).stepCount).toBe(96);
  });

  it('reads a spring DST day as 23 hours, not 24', () => {
    const bounds = siteDayBounds('2026-03-29', 'Europe/Paris');
    expect(bounds.minutes).toBe(1380);
    expect(stepsInSiteDay('2026-03-29', 'Europe/Paris', 15)).toBe(92);
    expect(stepsInSiteDay('2026-03-29', 'Europe/Paris', 60)).toBe(23);
    expect(formatZonedInstant(bounds.start, 'Europe/Paris')).toContain('+01:00');
    expect(formatZonedInstant(bounds.end, 'Europe/Paris')).toContain('+02:00');
  });

  it('reads an autumn DST day as 25 hours, not 24', () => {
    const bounds = siteDayBounds('2026-10-25', 'Europe/Paris');
    expect(bounds.minutes).toBe(1500);
    expect(stepsInSiteDay('2026-10-25', 'Europe/Paris', 15)).toBe(100);
    expect(stepsInSiteDay('2026-10-25', 'Europe/Paris', 60)).toBe(25);
  });

  it('follows a half-hour DST shift exactly, and refuses a grid that cannot', () => {
    expect(siteDayBounds('2026-10-04', 'Australia/Lord_Howe').minutes).toBe(1410);
    expect(siteDayBounds('2026-04-05', 'Australia/Lord_Howe').minutes).toBe(1470);
    expect(stepsInSiteDay('2026-10-04', 'Australia/Lord_Howe', 15)).toBe(94);
    expect(stepsInSiteDay('2026-04-05', 'Australia/Lord_Howe', 15)).toBe(98);
    expect(() => stepsInSiteDay('2026-10-04', 'Australia/Lord_Howe', 60)).toThrow(
      /not a whole number/,
    );
  });

  it('shifts a local time inside a gap forward, and takes the earlier ambiguous time', () => {
    const spring = instantFromZonedParts(
      { year: 2026, month: 3, day: 29, hour: 2, minute: 30, second: 0 },
      'Europe/Paris',
    );
    expect(formatInstant(spring)).toBe('2026-03-29T01:30:00.000Z');
    expect(formatZonedInstant(spring, 'Europe/Paris')).toBe('2026-03-29T03:30:00.000+02:00');

    const autumn = instantFromZonedParts(
      { year: 2026, month: 10, day: 25, hour: 2, minute: 30, second: 0 },
      'Europe/Paris',
    );
    expect(formatInstant(autumn)).toBe('2026-10-25T00:30:00.000Z');
    expect(formatZonedInstant(autumn, 'Europe/Paris')).toBe('2026-10-25T02:30:00.000+02:00');
  });

  it('refuses a zone identifier the runtime does not know', () => {
    expect(isTimeZone('Africa/Tunis')).toBe(true);
    expect(isTimeZone('Mars/Olympus')).toBe(false);
    expect(() => siteDayBounds('2026-06-21', 'Mars/Olympus')).toThrow(/IANA/);
  });
});

describe('the step grid', () => {
  it('turns the shipped 48-hour scenario into 192 steps over two 96-step days', () => {
    const from = start(scenario.simulation.start);
    expect(zoneOffsetMinutes(from, scenario.site.timezone)).toBe(60);

    const grid = createStepGrid(
      from,
      scenario.simulation.timestep_minutes,
      scenario.simulation.horizon_hours * 60,
    );
    expect(grid.stepCount).toBe(192);
    expect(formatInstant(grid.end)).toBe('2026-06-22T23:00:00.000Z');
    expect(stepAt(grid, 0).start).toBe(from);
    expect(stepAt(grid, 191).end).toBe(grid.end);

    const days = groupStepsBySiteDay(grid, scenario.site.timezone);
    expect(days.map((day) => day.date)).toEqual(['2026-06-21', '2026-06-22']);
    expect(days.map((day) => day.stepCount)).toEqual([96, 96]);
    expect(days.map((day) => day.firstIndex)).toEqual([0, 96]);
    expect(days[0]?.start).toBe(siteDayBounds('2026-06-21', 'Africa/Tunis').start);
    expect(days[1]?.end).toBe(grid.end);
  });

  it('splits a run that starts at noon into partial days, and tiles it exactly', () => {
    const grid = createStepGrid(start('2026-06-21T12:00:00+01:00'), 15, 48 * 60);
    const days = groupStepsBySiteDay(grid, 'Africa/Tunis');
    expect(days.map((day) => day.date)).toEqual(['2026-06-21', '2026-06-22', '2026-06-23']);
    expect(days.map((day) => day.stepCount)).toEqual([48, 96, 48]);

    for (let index = 0; index < grid.stepCount - 1; index += 1) {
      expect(stepAt(grid, index).end).toBe(stepAt(grid, index + 1).start);
    }
  });

  it('refuses a duration, an index or a timestep it cannot represent', () => {
    const from = start('2026-06-21T00:00:00+01:00');
    expect(() => createStepGrid(from, 15, 1441)).toThrow(/whole number/);
    expect(() => createStepGrid(from, 15, 0)).toThrow(/positive/);
    expect(() => stepAt(createStepGrid(from, 15, 1440), 96)).toThrow(/outside/);
    expect(() => stepAt(createStepGrid(from, 15, 1440), 1.5)).toThrow(/outside/);
    expect(() => createStepGrid(from, 10 as TimestepMinutes, 1440)).toThrow(/one of/);
  });

  it('makes a day of steps equal its minutes for every supported timestep', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TIMESTEP_MINUTES), (timestep) => {
        const grid = siteDayGrid('2026-06-21', 'Africa/Tunis', timestep);
        return grid.stepCount * timestep === 1440 && grid.stepCount === 1440 / timestep;
      }),
      { numRuns: 50 },
    );
  });

  it('puts every step in exactly one site day, and the days in order', () => {
    const grid = createStepGrid(start('2026-06-21T00:00:00+01:00'), 15, 48 * 60);
    const days = groupStepsBySiteDay(grid, 'Africa/Tunis');
    fc.assert(
      fc.property(fc.integer({ min: 0, max: grid.stepCount - 1 }), (index) => {
        const step = stepAt(grid, index);
        const day = days.find(
          (segment) => index >= segment.firstIndex && index <= segment.lastIndex,
        );
        return day !== undefined && day.date === siteDate(step.start, 'Africa/Tunis');
      }),
      { numRuns: 100 },
    );
  });
});
