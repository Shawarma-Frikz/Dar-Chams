/**
 * The site timezone: wall-clock labels, offsets and calendar-day boundaries.
 *
 * The engine stores UTC instants, but a household lives on a local calendar:
 * daily energy is reported midnight to midnight in the site's zone (MET-15) and
 * a schedule is written as a wall-clock time. `Intl.DateTimeFormat` supplies the
 * zone database already present in Node and every browser, so no timezone
 * package and no network fetch is added (NFR-02, CON-03).
 *
 * A local time can be ambiguous or nonexistent at a daylight-saving transition.
 * The resolver follows JavaScript's `compatible` convention: an ambiguous time
 * takes the earlier instant, and a time inside a gap shifts forward by the gap.
 * Both are asserted by fixtures, so the rule cannot drift unnoticed.
 */

import type { Instant } from './instant.ts';
import {
  DAY_MS,
  MINUTE_MS,
  instantEpochMilliseconds,
  instantFromEpochMilliseconds,
  isValidCalendarDate,
  millisecondsFromParts,
} from './instant.ts';

export interface ZonedParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

export interface SiteDayBounds {
  /** The calendar date in the site zone, `YYYY-MM-DD`. */
  readonly date: string;
  /** First instant of that local date. */
  readonly start: Instant;
  /** First instant of the next local date; a DST day is 23, 23.5, 24.5 or 25 hours. */
  readonly end: Instant;
  readonly minutes: number;
}

const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string): Intl.DateTimeFormat => {
  if (typeof timeZone !== 'string' || timeZone.trim() === '') {
    throw new RangeError('a timezone name is required');
  }
  const cached = FORMATTERS.get(timeZone);
  if (cached) return cached;

  let created: Intl.DateTimeFormat;
  try {
    created = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    throw new RangeError(`"${timeZone}" is not an IANA timezone this runtime knows`);
  }
  FORMATTERS.set(timeZone, created);
  return created;
};

export function isTimeZone(name: string): boolean {
  try {
    formatterFor(name);
    return true;
  } catch {
    return false;
  }
}

export function zonedParts(instant: Instant, timeZone: string): ZonedParts {
  const entries = formatterFor(timeZone).formatToParts(new Date(instantEpochMilliseconds(instant)));
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(entries.find((entry) => entry.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

/** The offset in effect at that instant, in minutes east of UTC. */
export function zoneOffsetMinutes(instant: Instant, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const wall = millisecondsFromParts({ ...parts, millisecond: 0 });
  return Math.round((wall - instantEpochMilliseconds(instant)) / MINUTE_MS);
}

const sameWallClock = (instant: Instant, parts: ZonedParts, timeZone: string): boolean => {
  const actual = zonedParts(instant, timeZone);
  return (
    actual.year === parts.year &&
    actual.month === parts.month &&
    actual.day === parts.day &&
    actual.hour === parts.hour &&
    actual.minute === parts.minute &&
    actual.second === parts.second
  );
};

/**
 * Resolves wall-clock parts in a zone to the instant they name. Offsets are
 * read a day either side of the guess so a transition inside that window is
 * visible; a gap shifts forward, an overlap takes the earlier occurrence.
 */
export function instantFromZonedParts(parts: ZonedParts, timeZone: string): Instant {
  if (!isValidCalendarDate(parts.year, parts.month, parts.day)) {
    throw new RangeError(`${parts.year}-${parts.month}-${parts.day} is not a calendar date`);
  }
  if (parts.hour > 23 || parts.minute > 59 || parts.second > 59) {
    throw new RangeError(
      `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(parts.second).padStart(2, '0')} is not a clock time`,
    );
  }

  const wall = millisecondsFromParts({ ...parts, millisecond: 0 });
  const before = zoneOffsetMinutes(instantFromEpochMilliseconds(wall - DAY_MS), timeZone);
  const after = zoneOffsetMinutes(instantFromEpochMilliseconds(wall + DAY_MS), timeZone);
  const first = instantFromEpochMilliseconds(wall - before * MINUTE_MS);
  const second = instantFromEpochMilliseconds(wall - after * MINUTE_MS);
  const earlier = instantFromEpochMilliseconds(Math.min(first, second));
  const later = instantFromEpochMilliseconds(Math.max(first, second));

  if (sameWallClock(earlier, parts, timeZone)) return earlier;
  if (sameWallClock(later, parts, timeZone)) return later;
  return later;
}

const offsetText = (minutes: number): string => {
  if (minutes === 0) return 'Z';
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const rest = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}:${rest}`;
};

/** The instant as a reader in the site zone writes it, offset included. */
export function formatZonedInstant(instant: Instant, timeZone: string): string {
  const parts = zonedParts(instant, timeZone);
  const offset = zoneOffsetMinutes(instant, timeZone);
  const milliseconds = ((instantEpochMilliseconds(instant) % 1000) + 1000) % 1000;
  const pad = (value: number, size = 2): string => String(value).padStart(size, '0');
  return (
    `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}` +
    `T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}` +
    `.${pad(milliseconds, 3)}${offsetText(offset)}`
  );
}

/** The calendar date the instant falls on in the site zone. */
export function siteDate(instant: Instant, timeZone: string): string {
  const parts = zonedParts(instant, timeZone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const parseCalendarDate = (date: string): CalendarDate => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`"${date}" is not a calendar date in YYYY-MM-DD form`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCalendarDate(year, month, day)) {
    throw new RangeError(`"${date}" names a date the calendar does not have`);
  }
  return { year, month, day };
};

const nextCalendarDate = (date: CalendarDate): CalendarDate => {
  const next = new Date(millisecondsFromParts({ ...date, hour: 0, minute: 0, second: 0 }) + DAY_MS);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
};

/**
 * Midnight to midnight in the site zone. The length is not assumed: a spring
 * transition gives 23 hours, an autumn one 25, and Lord Howe's half-hour shift
 * gives 23.5 or 24.5.
 */
export function siteDayBounds(date: string, timeZone: string): SiteDayBounds {
  const civil = parseCalendarDate(date);
  const midnight = { hour: 0, minute: 0, second: 0 };
  const start = instantFromZonedParts({ ...civil, ...midnight }, timeZone);
  const end = instantFromZonedParts({ ...nextCalendarDate(civil), ...midnight }, timeZone);
  const minutes = (instantEpochMilliseconds(end) - instantEpochMilliseconds(start)) / MINUTE_MS;

  if (minutes <= 0 || !Number.isInteger(minutes)) {
    throw new RangeError(`the site day ${date} has no whole-minute length in ${timeZone}`);
  }
  return { date, start, end, minutes };
}
