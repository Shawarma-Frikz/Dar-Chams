/**
 * Startup configuration.
 *
 * Importing this module validates the boot scenario and throws a formatted
 * `ConfigError` if it is not valid, so an invalid capacity, a negative power,
 * an impossible SOC window or a field that forgot its unit stops the build (for
 * the static export) or the first request (in development) instead of reaching
 * a page. The same validator is what `scripts/check-config.mjs` runs, so the
 * messages a reader sees in CI are the messages the application would have
 * thrown.
 */

import scenarioDocument from '../../../scenarios/tunis-typical-v1.json' with { type: 'json' };

import { DEFAULT_SCENARIO_SOURCE } from './defaults.ts';
import { resolveConfiguration } from './resolve.ts';

export const CONFIGURATION = resolveConfiguration({
  document: scenarioDocument,
  source: DEFAULT_SCENARIO_SOURCE,
});
