/**
 * The user-settings layer: presentation only.
 *
 * A setting may change how the interface looks, never what the installation
 * does. Anything that can change a result belongs in a scenario, so a settings
 * document that carries `battery` or `capacity` is a layer violation and is
 * reported as one instead of being quietly applied.
 *
 * The parser never throws. It is the boundary to storage written by another
 * build, so its policy is the opposite of the scenario layer's: an unreadable
 * preference falls back to the default and says why, because a stale
 * preference must not stop the application from opening. Resolution stays
 * strict — see resolve.ts — so a bad default is still a build failure.
 */

import type { ConfigIssue } from '@dar-chams/engine';

export const SETTINGS_SCHEMA_VERSION = 1 as const;

export type MotionPreference = 'system' | 'reduced';

export interface UserSettings {
  readonly schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  readonly display: {
    readonly motion: MotionPreference;
  };
}

export interface SettingsLoad {
  readonly settings: UserSettings;
  readonly issues: readonly ConfigIssue[];
  readonly recovered: boolean;
}

export const SETTINGS_STORAGE_KEY = 'dar-chams.settings.v1';

const TOP_LEVEL_KEYS = ['schemaVersion', 'display'] as const;
const DISPLAY_KEYS = ['motion'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const foreignKey = (path: string, key: string): ConfigIssue => ({
  layer: 'settings',
  path,
  code: 'settings.foreign-key',
  message: `"${key}" is not a presentation setting`,
  expected: `one of ${[...TOP_LEVEL_KEYS].join(', ')}`,
  hint: 'installation values belong in a scenario; settings may not change what the simulation does',
});

/**
 * Validates a settings document read from storage, recovering to `fallback`
 * whatever it cannot trust.
 */
export function parseUserSettings(raw: unknown, fallback: UserSettings): SettingsLoad {
  if (!isRecord(raw)) {
    return {
      settings: fallback,
      recovered: true,
      issues: [
        {
          layer: 'settings',
          path: '(stored settings)',
          code: 'settings.shape',
          message: 'is not an object, so nothing could be read',
          received: Array.isArray(raw) ? 'an array' : typeof raw,
          expected: 'an object with schemaVersion and display',
          hint: 'the previous settings were discarded; defaults are in use',
        },
      ],
    };
  }

  if (raw.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    return {
      settings: fallback,
      recovered: true,
      issues: [
        {
          layer: 'settings',
          path: 'schemaVersion',
          code: 'settings.version',
          message: `was written for a different settings schema`,
          received: JSON.stringify(raw.schemaVersion) ?? 'nothing',
          expected: String(SETTINGS_SCHEMA_VERSION),
          hint: 'settings from another build are discarded rather than migrated; defaults are in use',
        },
      ],
    };
  }

  const issues: ConfigIssue[] = [];
  for (const key of Object.keys(raw)) {
    if (!(TOP_LEVEL_KEYS as readonly string[]).includes(key)) {
      issues.push(foreignKey(key, key));
    }
  }

  const display = isRecord(raw.display) ? raw.display : {};
  for (const key of Object.keys(display)) {
    if (!(DISPLAY_KEYS as readonly string[]).includes(key)) {
      issues.push(foreignKey(`display.${key}`, key));
    }
  }

  const motion = display.motion;
  let resolvedMotion: MotionPreference = fallback.display.motion;
  if (motion !== 'system' && motion !== 'reduced') {
    issues.push({
      layer: 'settings',
      path: 'display.motion',
      code: 'settings.value',
      message: 'must be "system" or "reduced"',
      received: JSON.stringify(motion) ?? 'nothing',
      expected: '"system" (follow the operating system) or "reduced" (force reduced motion)',
      hint: `"${fallback.display.motion}" is in use instead`,
    });
  } else {
    resolvedMotion = motion;
  }

  return {
    settings: Object.freeze({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      display: Object.freeze({ motion: resolvedMotion }),
    }),
    issues,
    recovered: issues.length > 0,
  };
}
