import { describe, expect, it } from 'vitest';
import {
  calculatePlaneOfArrayIrradiance,
  DEFAULT_GROUND_ALBEDO,
  parseInstant,
  solarDayForSiteDate,
  solarPositionAt,
} from '../index.ts';
import type { PlaneOfArrayInput } from '../index.ts';

const site = {
  label: 'Tunis',
  latitude_deg: 36.8065,
  longitude_deg: 10.1815,
  altitude_m: 10,
  timezone: 'Africa/Tunis',
} as const;

const atNoon = solarDayForSiteDate('2026-06-21', site).solar_noon;
const noonPosition = solarPositionAt(atNoon, site);

const input = (overrides: Partial<PlaneOfArrayInput> = {}): PlaneOfArrayInput => ({
  instant: atNoon,
  site,
  array: { tilt_deg: 30, azimuth_deg: noonPosition.azimuth_deg },
  weather: {
    globalHorizontalIrradianceWm2: 700,
    directNormalIrradianceWm2: 800,
    diffuseHorizontalIrradianceWm2: 100,
  },
  ...overrides,
});

describe('plane-of-array irradiance', () => {
  it('decomposes modeled irradiance into beam, isotropic sky and reflected ground terms', () => {
    const result = calculatePlaneOfArrayIrradiance(
      input({
        array: { tilt_deg: 90, azimuth_deg: noonPosition.azimuth_deg },
        weather: {
          globalHorizontalIrradianceWm2: 700,
          directNormalIrradianceWm2: 0,
          diffuseHorizontalIrradianceWm2: 100,
        },
      }),
    );
    expect(DEFAULT_GROUND_ALBEDO).toBe(0.2);
    expect(result.beamWm2).toBe(0);
    expect(result.skyDiffuseWm2).toBeCloseTo(50, 10);
    expect(result.groundReflectedWm2).toBeCloseTo(70, 10);
    expect(result.totalWm2).toBeCloseTo(120, 10);
    expect(result).toMatchObject({
      model: 'isotropic-sky-transposition-v1',
      approximation: true,
      provenance: 'S',
    });
  });

  it('uses sun angle and panel azimuth to distinguish a facing plane from its back side', () => {
    const sunFacing = calculatePlaneOfArrayIrradiance(
      input({ array: { tilt_deg: 60, azimuth_deg: noonPosition.azimuth_deg }, albedo: 0 }),
    );
    const backFacing = calculatePlaneOfArrayIrradiance(
      input({
        array: { tilt_deg: 60, azimuth_deg: (noonPosition.azimuth_deg + 180) % 360 },
        albedo: 0,
      }),
    );
    expect(sunFacing.beamWm2).toBeGreaterThan(0);
    expect(backFacing.beamWm2).toBeLessThan(sunFacing.beamWm2);
    expect(sunFacing.incidenceAngleDeg).toBeLessThan(backFacing.incidenceAngleDeg);
  });

  it('reduces to horizontal irradiance on a flat plane and guards grazing incidence', () => {
    const elevationRadians = (noonPosition.elevation_deg * Math.PI) / 180;
    const horizontal = calculatePlaneOfArrayIrradiance(
      input({
        array: { tilt_deg: 0, azimuth_deg: 270 },
        weather: {
          globalHorizontalIrradianceWm2: 500,
          directNormalIrradianceWm2: 800,
          diffuseHorizontalIrradianceWm2: 100,
        },
      }),
    );
    expect(horizontal.beamWm2).toBeCloseTo(800 * Math.sin(elevationRadians), 8);
    expect(horizontal.skyDiffuseWm2).toBe(100);
    expect(horizontal.groundReflectedWm2).toBe(0);

    const grazing = calculatePlaneOfArrayIrradiance(
      input({
        array: {
          tilt_deg: noonPosition.elevation_deg,
          azimuth_deg: (noonPosition.azimuth_deg + 180) % 360,
        },
        weather: {
          globalHorizontalIrradianceWm2: 0,
          directNormalIrradianceWm2: 1000,
          diffuseHorizontalIrradianceWm2: 0,
        },
        albedo: 0,
      }),
    );
    expect(grazing.incidenceAngleDeg).toBeCloseTo(90, 6);
    expect(grazing.beamWm2).toBe(0);
  });

  it('reduces POA irradiance when the weather input represents cloudier conditions', () => {
    const clear = calculatePlaneOfArrayIrradiance(input());
    const cloudy = calculatePlaneOfArrayIrradiance(
      input({
        weather: {
          globalHorizontalIrradianceWm2: 210,
          directNormalIrradianceWm2: 120,
          diffuseHorizontalIrradianceWm2: 140,
        },
      }),
    );
    expect(cloudy.totalWm2).toBeLessThan(clear.totalWm2);
  });

  it('sets direct beam to zero below the horizon and keeps the result finite', () => {
    const result = calculatePlaneOfArrayIrradiance(
      input({
        instant: parseInstant('2026-06-21T00:00:00Z'),
        weather: {
          globalHorizontalIrradianceWm2: 0,
          directNormalIrradianceWm2: 900,
          diffuseHorizontalIrradianceWm2: 0,
        },
      }),
    );
    expect(result.beamWm2).toBe(0);
    expect(result.totalWm2).toBe(0);
    expect(Number.isFinite(result.incidenceAngleDeg)).toBe(true);
  });

  it('refuses invalid geometry, negative irradiance and numeric overflow', () => {
    expect(() =>
      calculatePlaneOfArrayIrradiance(input({ array: { tilt_deg: 91, azimuth_deg: 180 } })),
    ).toThrow(/tilt_deg/);
    expect(() =>
      calculatePlaneOfArrayIrradiance(input({ array: { tilt_deg: 30, azimuth_deg: 360 } })),
    ).toThrow(/azimuth_deg/);
    expect(() => calculatePlaneOfArrayIrradiance(input({ albedo: -0.1 }))).toThrow(/albedo/);
    expect(() =>
      calculatePlaneOfArrayIrradiance(
        input({
          weather: {
            globalHorizontalIrradianceWm2: -1,
            directNormalIrradianceWm2: 800,
            diffuseHorizontalIrradianceWm2: 100,
          },
        }),
      ),
    ).toThrow(/globalHorizontalIrradianceWm2/);
    expect(() =>
      calculatePlaneOfArrayIrradiance(
        input({
          weather: {
            globalHorizontalIrradianceWm2: Number.MAX_VALUE,
            directNormalIrradianceWm2: Number.MAX_VALUE,
            diffuseHorizontalIrradianceWm2: Number.MAX_VALUE,
          },
        }),
      ),
    ).toThrow(/overflowed/);
  });
});
