/**
 * The defaults layer.
 *
 * Defaults exist for the two layers that are allowed to start empty — the
 * application's own settings, and which scenario boots the application — and
 * for nothing else. A scenario is complete by contract (scenarios/README.md):
 * no default is merged into it at load time, so a value the engine runs with is
 * always a value someone wrote down and can point at.
 */

import type { UserSettings } from './settings.ts';

export const DEFAULT_SCENARIO_ID = 'tunis-typical-v1';
export const DEFAULT_SCENARIO_SOURCE = `scenarios/${DEFAULT_SCENARIO_ID}.json`;

export const DEFAULT_SETTINGS: UserSettings = Object.freeze({
  schemaVersion: 1 as const,
  display: Object.freeze({ motion: 'system' as const }),
});
