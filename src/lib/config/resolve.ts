/**
 * The precedence rule, in one function.
 *
 * scenario  →  validated, frozen, copied whole. Nothing is merged into it.
 * settings  →  presentation only, from the user, fallible by design.
 * defaults  →  used only where a layer is allowed to be absent (settings, and
 *              which scenario boots); never to fill a missing scenario field.
 * runtime   →  not an input. It derives from the resolved configuration and
 *              can never write back into it (runtime.ts).
 *
 * Resolution is strict: any issue throws a `ConfigError` whose message is the
 * formatted report, so a bad value stops a build or a request rather than
 * rendering a page with half a configuration.
 */

import { ConfigError, ENGINE_NAME, ENGINE_VERSION } from '@dar-chams/engine';
import type { Scenario } from '@dar-chams/engine';

import { DEFAULT_SETTINGS } from './defaults.ts';
import { parseUserSettings } from './settings.ts';
import type { UserSettings } from './settings.ts';
import { scenarioValidator } from './validator.ts';

export interface ResolvedConfiguration {
  /** Where the scenario came from, quoted in errors and in the report. */
  readonly source: string;
  readonly scenario: Scenario;
  readonly presentation: UserSettings['display'];
  readonly engine: {
    readonly name: string;
    readonly version: string;
  };
}

export interface ResolveInput {
  readonly document: unknown;
  readonly source: string;
  readonly settings?: unknown;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

export function resolveConfiguration(input: ResolveInput): ResolvedConfiguration {
  const checked = scenarioValidator.check(input.document);
  if (!checked.ok) throw new ConfigError(input.source, checked.issues);

  const loaded = parseUserSettings(input.settings ?? DEFAULT_SETTINGS, DEFAULT_SETTINGS);
  if (loaded.issues.length > 0) throw new ConfigError('user settings', loaded.issues);

  return Object.freeze({
    source: input.source,
    scenario: deepFreeze(checked.scenario),
    presentation: loaded.settings.display,
    engine: Object.freeze({ name: ENGINE_NAME, version: ENGINE_VERSION }),
  });
}
