/**
 * Absolute instants: the only timestamp representation the engine stores.
 *
 * A scenario writes timestamps as ISO 8601 strings with an explicit offset
 * (DEC-005), which is what a reader needs; the engine converts each one once to
 * a millisecond count since the Unix epoch, which is what arithmetic needs. The
 * brand stops a plain number from being passed where an instant is meant, and
 * the two constructors are the only places a timestamp enters the engine
 * (DEC-037).
 *
 * The parser is deliberately stricter than `Date.parse`: a timestamp without
 * an offset is rejected rather than interpreted in the host machine's zone, a
 * calendar date the calendar does not have is rejected rather than rolled over,
 * and precision finer than a millisecond is rejected rather than truncated.
 * Those three silences are how a run becomes irreproducible on another machine.
 */

declare const instantBrand: unique symbol;

/** Milliseconds since 1970-01-01T00:00:00Z, tagged so it cannot be a duration. */
export type Instant = number & { readonly [instantBrand]: 'Instant' };

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

const ISO_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

export const isValidCalendarDate = (year: number, month: number, day: number): boolean =>
  Number.isInteger(year) &&
  Number.isInteger(month) &&
  Number.isInteger(day) &&
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <= daysInMonth(year, month);

export { daysInMonth };

export interface CivilParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond?: number;
}

/**
 * Civil parts read as if they were UTC. `Date.UTC` is not used because it
 * treats years 0–99 as 1900–1999; setting the full year explicitly does not.
 */
export function millisecondsFromParts(parts: CivilParts): number {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, parts.second, parts.millisecond ?? 0);
  return date.getTime();
}

export function instantFromEpochMilliseconds(milliseconds: number): Instant {
  if (typeof milliseconds !== 'number' || !Number.isSafeInteger(milliseconds)) {
    throw new RangeError(
      `an instant must be a whole number of milliseconds, received ${String(milliseconds)}`,
    );
  }
  return milliseconds as Instant;
}

export function instantEpochMilliseconds(instant: Instant): number {
  return instant;
}

/**
 * Reads an ISO 8601 instant that carries `Z` or a numeric offset. Anything
 * that does not identify one instant on the timeline is refused.
 */
export function parseInstant(text: string): Instant {
  if (typeof text !== 'string') {
    throw new RangeError('an instant must be written as a string');
  }
  const match = ISO_INSTANT.exec(text);
  if (!match) {
    throw new RangeError(
      `"${text}" is not an ISO 8601 instant with an explicit offset; append Z or ±hh:mm`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = match[7] ?? '';
  const zone = match[8] ?? '';

  if (!isValidCalendarDate(year, month, day)) {
    throw new RangeError(`"${text}" names a date the calendar does not have`);
  }
  if (hour > 23 || minute > 59) {
    throw new RangeError(`"${text}" names a clock time that does not exist`);
  }
  if (second > 59) {
    throw new RangeError(`"${text}" uses a leap second, which the engine does not model`);
  }
  if (fraction.length > 3) {
    throw new RangeError(
      `"${text}" is finer than a millisecond; instants are stored at millisecond resolution`,
    );
  }

  let offsetMinutes = 0;
  if (zone !== 'Z') {
    const offsetHours = Number(zone.slice(1, 3));
    const offsetMinutesPart = Number(zone.slice(4, 6));
    if (offsetHours > 23 || offsetMinutesPart > 59) {
      throw new RangeError(`"${text}" carries an offset the clock does not have`);
    }
    offsetMinutes = (zone[0] === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutesPart);
  }

  const milliseconds = fraction ? Number(fraction.padEnd(3, '0')) : 0;
  const wall = millisecondsFromParts({
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond: milliseconds,
  });
  return instantFromEpochMilliseconds(wall - offsetMinutes * MINUTE_MS);
}

/** The canonical UTC form, always with `Z` and millisecond precision. */
export function formatInstant(instant: Instant): string {
  return new Date(instantEpochMilliseconds(instant)).toISOString();
}

/** Advances by whole minutes; fractional minutes would leave the step grid. */
export function addMinutes(instant: Instant, minutes: number): Instant {
  if (!Number.isInteger(minutes)) {
    throw new RangeError(`an instant advances by whole minutes, received ${minutes}`);
  }
  return instantFromEpochMilliseconds(instantEpochMilliseconds(instant) + minutes * MINUTE_MS);
}

export function minutesBetween(from: Instant, to: Instant): number {
  return (instantEpochMilliseconds(to) - instantEpochMilliseconds(from)) / MINUTE_MS;
}
