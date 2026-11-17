import { describe, expect, it } from 'vitest';
import { instantEpochMilliseconds, parseInstant } from '../time/instant.ts';
import { formatZonedInstant, zoneOffsetMinutes } from '../time/zone.ts';
import { solarDayForSiteDate, solarPositionAt } from '../index.ts';

const minute = 60_000;
const site = (latitude_deg: number, longitude_deg: number, timezone: string, altitude_m = 0) => ({
  latitude_deg,
  longitude_deg,
  timezone,
  altitude_m,
});
const localMinute = (value: number, timezone: string): string =>
  formatZonedInstant(value as ReturnType<typeof parseInstant>, timezone).slice(0, 16);
const closeToMinute = (actual: number, expected: string, offset: string): void => {
  const expectedInstant = parseInstant(`${expected}:00${offset}`);
  expect(Math.abs(actual - instantEpochMilliseconds(expectedInstant))).toBeLessThanOrEqual(
    2 * minute,
  );
};

describe('solar geometry', () => {
  it('matches independent published sunrise, solar-noon and sunset references', () => {
    // Reference values: timeanddate.com Sun tables, 2026-11-17, rounded to the minute.
    const fixtures = [
      {
        site: site(36.8065, 10.1815, 'Africa/Tunis'),
        rise: '2026-11-17T06:59',
        noon: '2026-11-17T12:04',
        set: '2026-11-17T17:08',
        offset: '+01:00',
        elevation: 34.2,
        noonAzimuth: 180,
      },
      {
        site: site(48.8566, 2.3522, 'Europe/Paris'),
        rise: '2026-11-17T08:02',
        noon: '2026-11-17T12:35',
        set: '2026-11-17T17:08',
        offset: '+01:00',
        elevation: 22.1,
        noonAzimuth: 180,
      },
      {
        site: site(-33.8688, 151.2093, 'Australia/Sydney'),
        rise: '2026-11-17T05:42',
        noon: '2026-11-17T12:40',
        set: '2026-11-17T19:37',
        offset: '+11:00',
        elevation: 75.1,
        noonAzimuth: 0,
      },
    ] as const;

    for (const fixture of fixtures) {
      const day = solarDayForSiteDate('2026-11-17', fixture.site);
      expect(day.status).toBe('normal');
      expect(day.sunrise).not.toBeNull();
      expect(day.sunset).not.toBeNull();
      closeToMinute(day.sunrise!, fixture.rise, fixture.offset);
      closeToMinute(day.solar_noon, fixture.noon, fixture.offset);
      closeToMinute(day.sunset!, fixture.set, fixture.offset);
      expect(localMinute(day.solar_noon, fixture.site.timezone)).toBe(fixture.noon);

      const position = solarPositionAt(day.solar_noon, fixture.site);
      expect(position.elevation_deg).toBeCloseTo(fixture.elevation, 0);
      const azimuthError = Math.abs(position.azimuth_deg - fixture.noonAzimuth);
      expect(Math.min(azimuthError, 360 - azimuthError)).toBeLessThanOrEqual(0.5);
    }
  });

  it('keeps solar events on the correct site-local day across both DST transitions', () => {
    const paris = site(48.8566, 2.3522, 'Europe/Paris');
    const spring = solarDayForSiteDate('2026-03-29', paris);
    const fall = solarDayForSiteDate('2026-10-25', paris);
    expect(spring.day_length_minutes).toBe(23 * 60);
    expect(fall.day_length_minutes).toBe(25 * 60);
    expect(localMinute(spring.sunrise!, paris.timezone).slice(0, 10)).toBe('2026-03-29');
    expect(localMinute(spring.sunset!, paris.timezone).slice(0, 10)).toBe('2026-03-29');
    expect(zoneOffsetMinutes(spring.sunrise!, paris.timezone)).toBe(120);
    expect(zoneOffsetMinutes(fall.sunrise!, paris.timezone)).toBe(60);
    expect(zoneOffsetMinutes(fall.sunset!, paris.timezone)).toBe(60);

    const lordHowe = site(-31.55, 159.08, 'Australia/Lord_Howe');
    const halfHourSpring = solarDayForSiteDate('2026-10-04', lordHowe);
    const halfHourFall = solarDayForSiteDate('2026-04-05', lordHowe);
    expect(halfHourSpring.day_length_minutes).toBe(1410);
    expect(halfHourFall.day_length_minutes).toBe(1470);
    expect(localMinute(halfHourSpring.sunrise!, lordHowe.timezone).slice(0, 10)).toBe('2026-10-04');
    expect(localMinute(halfHourFall.sunset!, lordHowe.timezone).slice(0, 10)).toBe('2026-04-05');
  });

  it('identifies polar day and night and keeps absent rise/set explicit', () => {
    const tromso = site(69.6492, 18.9553, 'Europe/Oslo');
    const summer = solarDayForSiteDate('2026-06-21', tromso);
    const winter = solarDayForSiteDate('2026-12-21', tromso);
    expect(summer.status).toBe('polar-day');
    expect(summer.sunrise).toBeNull();
    expect(summer.sunset).toBeNull();
    expect(winter.status).toBe('polar-night');
    expect(winter.sunrise).toBeNull();
    expect(winter.sunset).toBeNull();
    expect(Number.isFinite(solarPositionAt(summer.solar_noon, tromso).elevation_deg)).toBe(true);
    expect(solarPositionAt(winter.solar_noon, tromso).elevation_deg).toBeLessThan(0);
  });

  it('rejects invalid coordinates, altitude and unsupported dates', () => {
    const instant = parseInstant('2026-06-21T12:00:00Z');
    expect(() => solarPositionAt(instant, site(91, 0, 'UTC'))).toThrow(/latitude_deg/);
    expect(() => solarPositionAt(instant, site(0, Number.NaN, 'UTC'))).toThrow(/longitude_deg/);
    expect(() => solarDayForSiteDate('2026-06-21', site(0, 0, 'UTC', -101))).toThrow(/altitude_m/);
    expect(() => solarDayForSiteDate('2026-06-21', site(0, 0, 'UTC', -50))).not.toThrow();
    expect(() => solarPositionAt(parseInstant('2200-06-21T12:00:00Z'), site(0, 0, 'UTC'))).toThrow(
      /1900 through 2150/,
    );
    expect(() => solarDayForSiteDate('2026-02-30', site(0, 0, 'UTC'))).toThrow(/calendar/);
  });
});
