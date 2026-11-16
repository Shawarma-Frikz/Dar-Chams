import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ConfigError } from '@dar-chams/engine';

import { DEFAULT_SCENARIO_SOURCE, DEFAULT_SETTINGS } from './defaults.ts';
import { resolveConfiguration } from './resolve.ts';
import { createRuntimeState } from './runtime.ts';
import { SETTINGS_SCHEMA_VERSION, parseUserSettings } from './settings.ts';

const SCENARIO = fileURLToPath(
  new URL('../../../scenarios/tunis-typical-v1.json', import.meta.url),
);
const document = (): unknown => JSON.parse(readFileSync(SCENARIO, 'utf8'));

describe('the settings layer', () => {
  it('accepts a well-formed preference and freezes it', () => {
    const loaded = parseUserSettings(
      { schemaVersion: SETTINGS_SCHEMA_VERSION, display: { motion: 'reduced' } },
      DEFAULT_SETTINGS,
    );
    expect(loaded.issues).toEqual([]);
    expect(loaded.recovered).toBe(false);
    expect(loaded.settings.display.motion).toBe('reduced');
    expect(Object.isFrozen(loaded.settings)).toBe(true);
  });

  it('reports a scenario field as a layer violation and keeps the preference', () => {
    const loaded = parseUserSettings(
      {
        schemaVersion: SETTINGS_SCHEMA_VERSION,
        display: { motion: 'reduced', theme: 'dark' },
        battery: { nominal_capacity_kwh: 99 },
      },
      DEFAULT_SETTINGS,
    );
    expect(loaded.issues.map((issue) => issue.path)).toEqual(['battery', 'display.theme']);
    expect(loaded.issues[0]?.code).toBe('settings.foreign-key');
    expect(loaded.settings.display.motion).toBe('reduced');
    expect(loaded.recovered).toBe(true);
  });

  it('discards settings written for another schema version', () => {
    const loaded = parseUserSettings(
      { schemaVersion: 0, display: { motion: 'reduced' } },
      DEFAULT_SETTINGS,
    );
    expect(loaded.issues[0]?.code).toBe('settings.version');
    expect(loaded.settings.display.motion).toBe(DEFAULT_SETTINGS.display.motion);
  });

  it('falls back, and says so, when a preference is unreadable', () => {
    for (const raw of [null, [], 'reduced', 7, { schemaVersion: 1, display: 'reduced' }]) {
      const loaded = parseUserSettings(raw, DEFAULT_SETTINGS);
      expect(loaded.recovered).toBe(true);
      expect(loaded.issues.length).toBeGreaterThan(0);
      expect(loaded.settings.display.motion).toBe(DEFAULT_SETTINGS.display.motion);
    }
  });

  it('never throws on anything storage might return', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (raw) => {
        const loaded = parseUserSettings(raw, DEFAULT_SETTINGS);
        const motion = loaded.settings.display.motion;
        return (
          (motion === 'system' || motion === 'reduced') && typeof loaded.recovered === 'boolean'
        );
      }),
      { numRuns: 300 },
    );
  });
});

describe('the runtime layer', () => {
  it('derives from the resolved scenario instead of copying it', () => {
    const config = resolveConfiguration({ document: document(), source: DEFAULT_SCENARIO_SOURCE });
    const runtime = createRuntimeState(config);
    expect(runtime.status).toBe('idle');
    expect(runtime.stepIndex).toBe(0);
    expect(runtime.simTimeIso).toBe(config.scenario.simulation.start);
    expect(runtime.speedMultiplier).toBe(config.scenario.simulation.default_speed_multiplier);
  });

  it('cannot write back into the configuration', () => {
    const config = resolveConfiguration({ document: document(), source: DEFAULT_SCENARIO_SOURCE });
    const runtime = createRuntimeState(config);
    expect(runtime).not.toBe(config);
    expect(config.scenario.simulation.timestep_minutes).toBeGreaterThan(0);
    expect(Object.isFrozen(config.scenario)).toBe(true);
  });
});

describe('resolution', () => {
  it('throws a ConfigError for a scenario that contradicts itself', () => {
    const broken = document() as { battery: { min_soc: number; max_soc: number } };
    broken.battery.min_soc = 0.9;
    broken.battery.max_soc = 0.4;
    expect(() => resolveConfiguration({ document: broken, source: 'fixture.json' })).toThrow(
      ConfigError,
    );
  });

  it('treats an unreadable preference as a failure at the strict boundary', () => {
    expect(() =>
      resolveConfiguration({
        document: document(),
        source: DEFAULT_SCENARIO_SOURCE,
        settings: { schemaVersion: 0, display: { motion: 'reduced' } },
      }),
    ).toThrow(ConfigError);
  });

  it('applies an accepted preference without touching the scenario', () => {
    const plain = resolveConfiguration({ document: document(), source: DEFAULT_SCENARIO_SOURCE });
    const reduced = resolveConfiguration({
      document: document(),
      source: DEFAULT_SCENARIO_SOURCE,
      settings: { schemaVersion: SETTINGS_SCHEMA_VERSION, display: { motion: 'reduced' } },
    });
    expect(reduced.presentation.motion).toBe('reduced');
    expect(JSON.stringify(reduced.scenario)).toBe(JSON.stringify(plain.scenario));
  });
});
