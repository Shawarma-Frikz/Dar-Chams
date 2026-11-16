/**
 * The runtime layer: what is happening now, for this session only.
 *
 * Runtime state is derived from the resolved configuration and is never an
 * input to it. It is not persisted, not merged with settings and not written
 * back into a scenario; phase 02 owns whatever store drives it. Keeping the
 * direction strictly one-way is what stops "the last run's SOC" becoming
 * "the configured SOC" after a refresh.
 */

import type { ResolvedConfiguration } from './resolve.ts';

export type RuntimeStatus = 'idle' | 'running' | 'paused';

export interface RuntimeState {
  readonly status: RuntimeStatus;
  readonly stepIndex: number;
  /** Simulated instant, not wall-clock time: it starts where the scenario starts. */
  readonly simTimeIso: string;
  readonly speedMultiplier: number;
}

export function createRuntimeState(config: ResolvedConfiguration): RuntimeState {
  return {
    status: 'idle',
    stepIndex: 0,
    simTimeIso: config.scenario.simulation.start,
    speedMultiplier: config.scenario.simulation.default_speed_multiplier,
  };
}
