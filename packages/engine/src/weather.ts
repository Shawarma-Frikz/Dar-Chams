/** Optional Open-Meteo adapter with validated cache and deterministic offline weather. */
import type {
  WeatherFrame,
  WeatherQuery,
  WeatherReadResult,
  WeatherSource,
} from './simulation/interfaces.ts';
import { instantEpochMilliseconds } from './time/instant.ts';
import { stepAt } from './time/timeline.ts';
import { celsius } from './units/temperature.ts';
import { solarPositionAt } from './solar/solar.ts';

export interface WeatherCache {
  read(key: string): Promise<unknown | null>;
  write(key: string, value: unknown): Promise<void>;
}

export interface WeatherSourceOptions {
  readonly fetch?: typeof fetch;
  readonly cache?: WeatherCache;
  readonly timeoutMs?: number;
}

interface CacheSnapshot {
  readonly key: string;
  readonly frames: readonly WeatherFrame[];
  readonly savedAt: number;
}
interface ProviderResponse {
  readonly hourly?: Record<string, unknown>;
}

/** A process-local cache suitable for previews, tests and as the backing of a browser persistence adapter. */
export class MemoryWeatherCache implements WeatherCache {
  readonly #entries = new Map<string, unknown>();
  async read(key: string): Promise<unknown | null> {
    return this.#entries.get(key) ?? null;
  }
  async write(key: string, value: unknown): Promise<void> {
    this.#entries.set(key, structuredClone(value));
  }
}

const weatherKey = (query: WeatherQuery): string =>
  JSON.stringify({
    adapterVersion: 1,
    latitude: query.site.latitude_deg,
    longitude: query.site.longitude_deg,
    start: query.grid.start,
    end: query.grid.end,
    step: query.grid.timestepMinutes,
    seed: query.seed,
    weather: query.weather,
  });

const utcDate = (instant: number): string => new Date(instant).toISOString().slice(0, 10);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function decodeFrames(value: unknown, query: WeatherQuery): readonly WeatherFrame[] | null {
  if (!Array.isArray(value) || value.length !== query.grid.stepCount) return null;
  try {
    return value.map((row, index) => {
      if (typeof row !== 'object' || row === null) throw new Error('invalid cached weather row');
      const item = row as Record<string, unknown>;
      const expected = stepAt(query.grid, index).start;
      if (item.instant !== expected || (item.provenance !== 'X' && item.provenance !== 'S'))
        throw new Error('cache frame does not match requested grid');
      const temperature = item.ambientTemperature;
      const ghi = item.globalHorizontalIrradianceWm2;
      const dni = item.directNormalIrradianceWm2;
      const dhi = item.diffuseHorizontalIrradianceWm2;
      const wind = item.windSpeedMps;
      if (
        ![temperature, ghi, dni, dhi, wind].every(finite) ||
        (ghi as number) < 0 ||
        (dni as number) < 0 ||
        (dhi as number) < 0 ||
        (wind as number) < 0
      )
        throw new Error('cache contains invalid weather values');
      return {
        instant: expected,
        ambientTemperature: celsius(temperature as number),
        globalHorizontalIrradianceWm2: ghi as number,
        directNormalIrradianceWm2: dni as number,
        diffuseHorizontalIrradianceWm2: dhi as number,
        windSpeedMps: wind as number,
        provenance: item.provenance,
      };
    });
  } catch {
    return null;
  }
}

function parseProvider(body: ProviderResponse, query: WeatherQuery): readonly WeatherFrame[] {
  const hourly = body.hourly;
  if (!hourly || !Array.isArray(hourly.time))
    throw new Error('Open-Meteo response has no hourly time series');
  const times = hourly.time as unknown[];
  const fields = [
    'temperature_2m',
    'shortwave_radiation',
    'direct_normal_irradiance',
    'diffuse_radiation',
    'wind_speed_10m',
  ] as const;
  const series = Object.fromEntries(
    fields.map((field) => {
      const values = hourly[field];
      if (!Array.isArray(values) || values.length !== times.length || !values.every(finite))
        throw new Error(`Open-Meteo response has invalid ${field} values`);
      return [field, values as number[]];
    }),
  ) as Record<(typeof fields)[number], number[]>;
  const epochHours = times.map((time) => {
    if (!finite(time)) throw new Error('Open-Meteo response has invalid UTC timestamps');
    return time * 1000;
  });
  for (let i = 1; i < epochHours.length; i += 1)
    if ((epochHours[i] ?? 0) <= (epochHours[i - 1] ?? 0))
      throw new Error('Open-Meteo timestamps are not strictly increasing');
  const frames: WeatherFrame[] = [];
  for (let index = 0; index < query.grid.stepCount; index += 1) {
    const instant = stepAt(query.grid, index).start;
    let upper = epochHours.findIndex((time) => time >= instant);
    if (upper < 0) upper = epochHours.length;
    const lower = upper - 1;
    if (lower < 0 || upper >= epochHours.length)
      throw new Error('Open-Meteo response does not cover the requested simulation interval');
    const from = epochHours[lower] ?? 0;
    const to = epochHours[upper] ?? 0;
    const fraction = to === from ? 0 : (instant - from) / (to - from);
    const interpolate = (field: (typeof fields)[number]): number =>
      (series[field][lower] ?? 0) * (1 - fraction) + (series[field][upper] ?? 0) * fraction;
    // Open-Meteo radiation values are hourly means for the preceding hour;
    // hold that interval's mean across its sub-hour simulation steps.
    const radiationIndex = epochHours.findIndex((time) => time > instant);
    if (radiationIndex < 0)
      throw new Error('Open-Meteo response does not cover the preceding-hour radiation interval');
    const temperature = interpolate('temperature_2m');
    const ghi = series.shortwave_radiation[radiationIndex] ?? 0;
    const dni = series.direct_normal_irradiance[radiationIndex] ?? 0;
    const dhi = series.diffuse_radiation[radiationIndex] ?? 0;
    const wind = interpolate('wind_speed_10m');
    if (temperature < -273.15 || ghi < 0 || dni < 0 || dhi < 0 || wind < 0)
      throw new Error('Open-Meteo returned a physically invalid value');
    frames.push({
      instant,
      ambientTemperature: celsius(temperature),
      globalHorizontalIrradianceWm2: ghi,
      directNormalIrradianceWm2: dni,
      diffuseHorizontalIrradianceWm2: dhi,
      windSpeedMps: wind,
      provenance: 'X',
    });
  }
  return frames;
}

function hash(seed: number, text: string): number {
  let value = (seed ^ 0x811c9dc5) >>> 0;
  for (let index = 0; index < text.length; index += 1)
    value = Math.imul(value ^ (text.charCodeAt(index) ?? 0), 0x01000193) >>> 0;
  return value / 0x1_0000_0000;
}

/** Stable offline weather: no clock, network or mutable random stream is consulted. */
export function createSyntheticWeather(query: WeatherQuery): readonly WeatherFrame[] {
  return Array.from({ length: query.grid.stepCount }, (_, index) => {
    const instant = stepAt(query.grid, index).start;
    const solar = solarPositionAt(instant, query.site);
    const elevation = Math.max(0, solar.elevation_deg);
    const dateKey = `${utcDate(instant)}:${Math.floor((instantEpochMilliseconds(instant) % 86_400_000) / 3_600_000)}`;
    const cloud =
      0.12 +
      hash(query.seed, `${query.site.latitude_deg}:${query.site.longitude_deg}:${dateKey}`) * 0.68;
    const clearGhi = elevation > 0 ? 1050 * Math.sin((elevation * Math.PI) / 180) : 0;
    const ghi = clearGhi * (1 - cloud * 0.72);
    const dni =
      elevation > 0
        ? Math.min(
            1000,
            (clearGhi * (1 - cloud)) / Math.max(0.15, Math.sin((elevation * Math.PI) / 180)),
          )
        : 0;
    const dhi = Math.max(0, ghi - dni * Math.sin((elevation * Math.PI) / 180));
    const seasonal = Math.cos(((new Date(instant).getUTCMonth() - 6) / 12) * Math.PI * 2);
    const temperature = 18 + 9 * seasonal + 5 * Math.sin((elevation * Math.PI) / 180) - cloud * 2;
    const wind = 1.5 + hash(query.seed ^ 0x5bd1e995, `${dateKey}:wind`) * 4.5;
    return {
      instant,
      ambientTemperature: celsius(temperature),
      globalHorizontalIrradianceWm2: ghi,
      directNormalIrradianceWm2: dni,
      diffuseHorizontalIrradianceWm2: dhi,
      windSpeedMps: wind,
      provenance: 'S' as const,
    };
  });
}

/** Creates a fail-visible provider with atomic cache writes and a deterministic last resort. */
export function createOpenMeteoWeatherSource(options: WeatherSourceOptions = {}): WeatherSource {
  const request = options.fetch ?? globalThis.fetch;
  const cache = options.cache ?? new MemoryWeatherCache();
  const timeoutMs = options.timeoutMs ?? 8_000;
  return {
    async read(query): Promise<WeatherReadResult> {
      const key = weatherKey(query);
      let providerError = 'Open-Meteo request failed';
      try {
        if (!request) throw new Error('fetch is unavailable in this runtime');
        const start = instantEpochMilliseconds(query.grid.start) - 3_600_000;
        const end = instantEpochMilliseconds(query.grid.end) + 3_600_000;
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.search = new URLSearchParams({
          latitude: String(query.site.latitude_deg),
          longitude: String(query.site.longitude_deg),
          hourly:
            'temperature_2m,shortwave_radiation,direct_normal_irradiance,diffuse_radiation,wind_speed_10m',
          timezone: 'UTC',
          timeformat: 'unixtime',
          start_date: utcDate(start),
          end_date: utcDate(end),
        }).toString();
        const response = await request(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok) throw new Error(`Open-Meteo returned HTTP ${response.status}`);
        const frames = parseProvider((await response.json()) as ProviderResponse, query);
        let warning: string | null = null;
        try {
          await cache.write(key, { key, frames, savedAt: Date.now() } satisfies CacheSnapshot);
        } catch (error) {
          warning = `Weather was loaded but its cache could not be saved: ${error instanceof Error ? error.message : String(error)}`;
        }
        return { frames, source: 'provider', fallbackEvent: null, warning };
      } catch (error) {
        providerError = error instanceof Error ? error.message : String(error);
      }

      if (query.weather.fallback_order.includes('cached')) {
        try {
          const raw = await cache.read(key);
          if (
            typeof raw === 'object' &&
            raw !== null &&
            'key' in raw &&
            raw.key === key &&
            'frames' in raw
          ) {
            const frames = decodeFrames(raw.frames, query);
            if (frames) {
              const savedAt = 'savedAt' in raw && finite(raw.savedAt) ? raw.savedAt : null;
              const stale =
                savedAt === null || Date.now() - savedAt > query.weather.refresh_hours * 3_600_000;
              return {
                frames,
                source: 'cached',
                fallbackEvent: {
                  kind: 'weather-fallback',
                  at: query.grid.start,
                  from: 'open-meteo',
                  to: 'cached',
                  reason: providerError,
                },
                warning: stale
                  ? 'Using a cached weather sample that is older than the configured refresh interval.'
                  : null,
              };
            }
          }
        } catch (error) {
          providerError += `; cache read failed: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
      if (query.weather.fallback_order.includes('synthetic')) {
        return {
          frames: createSyntheticWeather(query),
          source: 'synthetic',
          fallbackEvent: {
            kind: 'weather-fallback',
            at: query.grid.start,
            from: 'open-meteo',
            to: 'synthetic',
            reason: providerError,
          },
          warning: null,
        };
      }
      throw new Error(`No configured weather fallback is available: ${providerError}`);
    },
  };
}
