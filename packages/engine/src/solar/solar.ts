/** Solar geometry from SunCalc (Meeus-based), with engine-owned time semantics. */

import * as SunCalc from 'suncalc';
import type { Site } from '../config/scenario.ts';
import type { Instant } from '../time/instant.ts';
import { instantEpochMilliseconds } from '../time/instant.ts';
import { siteDayBounds, zoneOffsetMinutes } from '../time/zone.ts';

export interface SolarPosition {
  /** Apparent solar elevation above the horizon, in degrees. */
  readonly elevation_deg: number;
  /** Compass azimuth clockwise from true north, in degrees in [0, 360). */
  readonly azimuth_deg: number;
}

/** Scenario-owned coordinates; an object prevents latitude/longitude swaps. */
export type SolarCoordinates = Pick<Site, 'latitude_deg' | 'longitude_deg'>;

/** The site fields needed for solar events, including its IANA zone and altitude. */
export type SolarSite = SolarCoordinates & Pick<Site, 'altitude_m' | 'timezone'>;

export type SolarDayStatus = 'normal' | 'polar-day' | 'polar-night';

export interface SolarDay {
  readonly date: string;
  readonly timezone: string;
  readonly day_length_minutes: number;
  readonly status: SolarDayStatus;
  /** Absolute instants. Sunrise/sunset are null when the Sun does not cross the horizon threshold. */
  readonly sunrise: Instant | null;
  readonly solar_noon: Instant;
  readonly sunset: Instant | null;
}

const validateCoordinates = ({ latitude_deg, longitude_deg }: SolarCoordinates): void => {
  if (!Number.isFinite(latitude_deg) || latitude_deg < -90 || latitude_deg > 90) {
    throw new RangeError('latitude_deg must be finite and between -90 and 90');
  }
  if (!Number.isFinite(longitude_deg) || longitude_deg < -180 || longitude_deg > 180) {
    throw new RangeError('longitude_deg must be finite and between -180 and 180');
  }
};

const checkedDate = (instant: Instant): Date => {
  const milliseconds = instantEpochMilliseconds(instant);
  if (!Number.isSafeInteger(milliseconds))
    throw new RangeError('instant must be a safe millisecond value');
  const date = new Date(milliseconds);
  if (!Number.isFinite(date.getTime()))
    throw new RangeError('instant is outside the supported date range');
  const year = date.getUTCFullYear();
  if (year < 1900 || year > 2150) {
    throw new RangeError('solar calculations are supported from 1900 through 2150');
  }
  return date;
};

/** Position at an absolute instant. Azimuth is north-based clockwise; elevation includes refraction. */
export function solarPositionAt(instant: Instant, site: SolarCoordinates): SolarPosition {
  validateCoordinates(site);
  const position = SunCalc.getPosition(checkedDate(instant), site.latitude_deg, site.longitude_deg);
  return { elevation_deg: position.altitude, azimuth_deg: position.azimuth };
}

const inBounds = (date: Date | null, start: number, end: number): Instant | null => {
  if (!date) return null;
  const milliseconds = date.getTime();
  return milliseconds >= start && milliseconds < end ? (milliseconds as Instant) : null;
};

/**
 * Solar events for one site-local calendar day. DST days can be 23, 23.5, 24.5
 * or 25 hours. SunCalc accepts a fixed offset per calculation, so calculate at
 * each offset present at the day's boundaries and retain only events inside
 * the exact IANA-zone day. This covers both sides of an offset transition.
 */
export function solarDayForSiteDate(date: string, site: SolarSite): SolarDay {
  validateCoordinates(site);
  if (!Number.isFinite(site.altitude_m) || site.altitude_m < -100 || site.altitude_m > 5_000) {
    throw new RangeError('altitude_m must be finite and between -100 and 5000');
  }

  const { timezone } = site;
  const bounds = siteDayBounds(date, timezone);
  const start = instantEpochMilliseconds(bounds.start);
  const end = instantEpochMilliseconds(bounds.end);
  const representative = checkedDate((start + Math.floor((end - start) / 2)) as Instant);
  const offsets = new Set([
    zoneOffsetMinutes(bounds.start, timezone),
    zoneOffsetMinutes((end - 1) as Instant, timezone),
    zoneOffsetMinutes(representative.getTime() as Instant, timezone),
  ]);

  const candidates = [...offsets].map((offset) =>
    SunCalc.getTimes(
      representative,
      site.latitude_deg,
      site.longitude_deg,
      Math.max(0, site.altitude_m),
      offset,
    ),
  );
  const sunrises = candidates
    .map((times) => inBounds(times.sunrise, start, end))
    .filter((value): value is Instant => value !== null)
    .sort((a, b) => a - b);
  const sunsets = candidates
    .map((times) => inBounds(times.sunset, start, end))
    .filter((value): value is Instant => value !== null)
    .sort((a, b) => a - b);
  const noons = candidates
    .map((times) => inBounds(times.solarNoon, start, end))
    .filter((value): value is Instant => value !== null)
    .sort((a, b) => Math.abs(a - (start + end) / 2) - Math.abs(b - (start + end) / 2));

  if (noons.length === 0) {
    throw new RangeError(`SunCalc did not return solar noon inside site day ${date} (${timezone})`);
  }
  const sunrise = sunrises[0] ?? null;
  const sunset = sunsets.at(-1) ?? null;
  if ((sunrise === null) !== (sunset === null)) {
    throw new RangeError(
      `SunCalc returned an incomplete sunrise/sunset pair for ${date} (${timezone})`,
    );
  }

  let status: SolarDayStatus = 'normal';
  if (sunrise === null) {
    const alwaysUp = candidates.some((times) => times.alwaysUp === true);
    const alwaysDown = candidates.some((times) => times.alwaysDown === true);
    if (alwaysUp === alwaysDown) {
      throw new RangeError(
        `SunCalc could not classify missing sunrise/sunset for ${date} (${timezone})`,
      );
    }
    status = alwaysUp ? 'polar-day' : 'polar-night';
  }

  return {
    date,
    timezone,
    day_length_minutes: bounds.minutes,
    status,
    sunrise,
    solar_noon: noons[0]!,
    sunset,
  };
}
