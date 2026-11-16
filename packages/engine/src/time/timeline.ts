/**
 * The step grid: one uniform spacing of whole minutes over a duration.
 *
 * The simulation never advances by a variable amount, so `stepCount` is decided
 * once from `durationMinutes / timestepMinutes` and every step is the same
 * length. That is what lets 15 minutes give 96 steps a day (DEC-003) and makes
 * replay independent of how fast the interface asks for the next frame (DEC-012).
 *
 * A site day is not always 24 hours. A one-hour transition makes it 23 or 25 and
 * a half-hour zone 23.5 or 24.5, so a 15-minute grid gives 92 or 100 steps in
 * Paris and 94 or 98 on Lord Howe. `stepsInSiteDay` reads the day from the zone
 * rather than assuming 96,
 * and refuses a day whose boundary does not fall on the grid instead of placing
 * it at the nearest step.
 */

import type { TimestepMinutes } from '../config/scenario.ts';
import type { Instant } from './instant.ts';
import { addMinutes } from './instant.ts';
import type { SiteDayBounds } from './zone.ts';
import { siteDate, siteDayBounds } from './zone.ts';

export const TIMESTEP_MINUTES = [5, 15, 30, 60] as const;

export interface StepGrid {
  readonly start: Instant;
  readonly end: Instant;
  readonly timestepMinutes: TimestepMinutes;
  readonly durationMinutes: number;
  readonly stepCount: number;
}

export interface Step {
  readonly index: number;
  readonly start: Instant;
  readonly end: Instant;
  readonly durationMinutes: TimestepMinutes;
}

export interface SiteDaySegment extends SiteDayBounds {
  readonly firstIndex: number;
  readonly lastIndex: number;
  readonly stepCount: number;
}

const isTimestep = (minutes: number): minutes is TimestepMinutes =>
  (TIMESTEP_MINUTES as readonly number[]).includes(minutes);

export function createStepGrid(
  start: Instant,
  timestepMinutes: TimestepMinutes,
  durationMinutes: number,
): StepGrid {
  if (!isTimestep(timestepMinutes)) {
    throw new RangeError(
      `a timestep is one of ${TIMESTEP_MINUTES.join(', ')} minutes, received ${String(timestepMinutes)}`,
    );
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new RangeError(
      `a step grid spans a positive whole number of minutes, received ${String(durationMinutes)}`,
    );
  }
  if (durationMinutes % timestepMinutes !== 0) {
    throw new RangeError(
      `${durationMinutes} minutes is not a whole number of ${timestepMinutes}-minute steps`,
    );
  }
  return {
    start,
    end: addMinutes(start, durationMinutes),
    timestepMinutes,
    durationMinutes,
    stepCount: durationMinutes / timestepMinutes,
  };
}

export function stepAt(grid: StepGrid, index: number): Step {
  if (!Number.isInteger(index) || index < 0 || index >= grid.stepCount) {
    throw new RangeError(`step index ${index} is outside 0…${grid.stepCount - 1} for this grid`);
  }
  const start = addMinutes(grid.start, index * grid.timestepMinutes);
  return {
    index,
    start,
    end: addMinutes(start, grid.timestepMinutes),
    durationMinutes: grid.timestepMinutes,
  };
}

/** The number of whole timesteps between the local midnights bounding `date`. */
export function stepsInSiteDay(
  date: string,
  timeZone: string,
  timestepMinutes: TimestepMinutes,
): number {
  const bounds = siteDayBounds(date, timeZone);
  if (bounds.minutes % timestepMinutes !== 0) {
    throw new RangeError(
      `${date} in ${timeZone} is ${bounds.minutes} minutes, which is not a whole number of ${timestepMinutes}-minute steps`,
    );
  }
  return bounds.minutes / timestepMinutes;
}

/** A grid that starts at local midnight and ends at the next local midnight. */
export function siteDayGrid(
  date: string,
  timeZone: string,
  timestepMinutes: TimestepMinutes,
): StepGrid {
  const bounds = siteDayBounds(date, timeZone);
  return createStepGrid(bounds.start, timestepMinutes, bounds.minutes);
}

/**
 * Splits a run at local midnight. A step belongs to the day its start falls in,
 * so consecutive steps are never split across two days and the intervals of a
 * day sum to that day's energy.
 */
export function groupStepsBySiteDay(grid: StepGrid, timeZone: string): SiteDaySegment[] {
  const segments: SiteDaySegment[] = [];
  let index = 0;

  while (index < grid.stepCount) {
    const date = siteDate(stepAt(grid, index).start, timeZone);
    const bounds = siteDayBounds(date, timeZone);
    let last = index;
    while (last + 1 < grid.stepCount && stepAt(grid, last + 1).start < bounds.end) {
      last += 1;
    }
    segments.push({
      ...bounds,
      firstIndex: index,
      lastIndex: last,
      stepCount: last - index + 1,
    });
    index = last + 1;
  }

  return segments;
}
