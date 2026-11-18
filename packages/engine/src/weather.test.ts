import { describe, expect, it } from 'vitest';
import { createStepGrid, parseInstant } from './index.ts';
import type { WeatherQuery } from './simulation/interfaces.ts';
import {
  createOpenMeteoWeatherSource,
  createSyntheticWeather,
  MemoryWeatherCache,
} from './weather.ts';

const query = (): WeatherQuery => ({
  site: {
    label: 'Tunis',
    latitude_deg: 36.8,
    longitude_deg: 10.18,
    altitude_m: 0,
    timezone: 'Africa/Tunis',
  },
  grid: createStepGrid(parseInstant('2026-06-21T10:00:00Z'), 30, 120),
  weather: {
    primary_source: 'open-meteo-forecast',
    historical_source: 'open-meteo-era5',
    cache_dir: 'data/weather-cache',
    refresh_hours: 6,
    fallback_order: ['cached', 'synthetic'],
  },
  seed: 42,
});

const providerResponse = (input: WeatherQuery) => {
  const start = input.grid.start;
  return {
    hourly: {
      time: [
        start - 3_600_000,
        start,
        start + 3_600_000,
        start + 7_200_000,
        start + 10_800_000,
      ].map((value) => value / 1000),
      temperature_2m: [20, 22, 24, 26, 28],
      shortwave_radiation: [100, 200, 300, 400, 500],
      direct_normal_irradiance: [80, 160, 240, 320, 400],
      diffuse_radiation: [20, 40, 60, 80, 100],
      wind_speed_10m: [1, 2, 3, 4, 5],
    },
  };
};

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200 });

describe('Open-Meteo weather adapter', () => {
  it('validates and interpolates a complete provider series onto the simulation grid', async () => {
    const input = query();
    const result = await createOpenMeteoWeatherSource({
      fetch: async () => jsonResponse(providerResponse(input)),
    }).read(input);
    expect(result.source).toBe('provider');
    expect(result.fallbackEvent).toBeNull();
    expect(result.frames).toHaveLength(input.grid.stepCount);
    expect(result.frames.map((frame) => frame.ambientTemperature)).toEqual([22, 23, 24, 25]);
    expect(result.frames.map((frame) => frame.globalHorizontalIrradianceWm2)).toEqual([
      300, 300, 400, 400,
    ]);
    expect(result.frames.every((frame) => frame.provenance === 'X')).toBe(true);
  });

  it('reuses a complete cache snapshot when the provider is unavailable', async () => {
    const input = query();
    const cache = new MemoryWeatherCache();
    const online = createOpenMeteoWeatherSource({
      cache,
      fetch: async () => jsonResponse(providerResponse(input)),
    });
    const captured = await online.read(input);
    const offline = await createOpenMeteoWeatherSource({
      cache,
      fetch: async () => {
        throw new Error('offline');
      },
    }).read(input);
    expect(offline.source).toBe('cached');
    expect(offline.frames).toEqual(captured.frames);
    expect(offline.fallbackEvent).toMatchObject({
      kind: 'weather-fallback',
      to: 'cached',
      reason: 'offline',
    });
  });

  it('rejects corrupt or incomplete cache entries and returns stable synthetic frames', async () => {
    const input = query();
    const cache = new MemoryWeatherCache();
    const source = createOpenMeteoWeatherSource({
      cache,
      fetch: async () => {
        throw new Error('offline');
      },
    });
    const first = await source.read(input);
    const replay = await source.read(input);
    expect(first.source).toBe('synthetic');
    expect(first.frames).toEqual(replay.frames);
    expect(first.frames).toEqual(createSyntheticWeather(input));
    expect(
      first.frames.every(
        (frame) => frame.provenance === 'S' && Number.isFinite(frame.globalHorizontalIrradianceWm2),
      ),
    ).toBe(true);
    expect(first.fallbackEvent?.to).toBe('synthetic');
    const corruptCache = {
      read: async () => ({ key: 'wrong-key', frames: [{ instant: 1, provenance: 'X' }] }),
      write: async () => undefined,
    };
    const corrupt = await createOpenMeteoWeatherSource({
      cache: corruptCache,
      fetch: async () => {
        throw new Error('offline');
      },
    }).read(input);
    expect(corrupt.source).toBe('synthetic');
    expect(corrupt.frames).toEqual(first.frames);
  });

  it('turns HTTP and malformed-data failures into visible fallback without partial frames', async () => {
    const input = query();
    const failed = await createOpenMeteoWeatherSource({
      fetch: async () => new Response('unavailable', { status: 503 }),
    }).read(input);
    const malformed = await createOpenMeteoWeatherSource({
      fetch: async () => jsonResponse({ hourly: { time: [] } }),
    }).read(input);
    expect(failed.frames).toHaveLength(input.grid.stepCount);
    expect(failed.source).toBe('synthetic');
    expect(failed.fallbackEvent?.reason).toContain('503');
    expect(malformed.source).toBe('synthetic');
    expect(malformed.fallbackEvent?.reason).toContain('invalid temperature_2m');
  });
});
