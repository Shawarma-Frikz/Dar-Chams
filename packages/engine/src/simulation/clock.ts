/**
 * Fixed-step simulation lifecycle and a versioned seeded random stream.
 * Playback speed is metadata for a host scheduler; it never changes step size,
 * step order or random values. The clock never reads wall time or browser APIs.
 */

import type { Scenario } from '../config/scenario.ts';
import { parseInstant } from '../time/instant.ts';
import { createStepGrid, stepAt } from '../time/timeline.ts';
import type { SimulationClock, SimulationClockState } from './interfaces.ts';

export interface SimulationClockOptions {
  /** Maximum selectable playback rate. Defaults to 1000×. */
  readonly maximumSpeedMultiplier?: number;
}

const DEFAULT_MAXIMUM_SPEED_MULTIPLIER = 1000;
const UINT64_MASK = (1n << 64n) - 1n;

const validateSeed = (seed: number): void => {
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new RangeError(
      `simulation seed must be a non-negative safe integer, received ${String(seed)}`,
    );
  }
};

const validateRate = (rate: number, maximum: number): void => {
  if (!Number.isFinite(rate) || rate < 1 || rate > maximum) {
    throw new RangeError(
      `speed multiplier must be finite and in [1, ${maximum}], received ${String(rate)}`,
    );
  }
};

/** SplitMix64: stable integer mixing, converted from the high 53 bits to [0, 1). */
const createRandomStream = (seed: number): (() => number) => {
  let state = BigInt(seed);
  return () => {
    state = (state + 0x9e3779b97f4a7c15n) & UINT64_MASK;
    let value = state;
    value = ((value ^ (value >> 30n)) * 0xbf58476d1ce4e5b9n) & UINT64_MASK;
    value = ((value ^ (value >> 27n)) * 0x94d049bb133111ebn) & UINT64_MASK;
    value ^= value >> 31n;
    return Number(value >> 11n) / 0x20_0000_0000_0000;
  };
};

/**
 * Creates a deterministic clock from a validated scenario. It advances only
 * when `stepForward` is called; start/pause/resume never consult wall time.
 */
export function createSimulationClock(
  scenario: Pick<Scenario, 'simulation'>,
  options: SimulationClockOptions = {},
): SimulationClock {
  const { simulation } = scenario;
  validateSeed(simulation.seed);
  const maximumSpeedMultiplier = options.maximumSpeedMultiplier ?? DEFAULT_MAXIMUM_SPEED_MULTIPLIER;
  if (!Number.isFinite(maximumSpeedMultiplier) || maximumSpeedMultiplier < 1) {
    throw new RangeError(
      `maximum speed multiplier must be finite and at least 1, received ${String(maximumSpeedMultiplier)}`,
    );
  }
  validateRate(simulation.default_speed_multiplier, maximumSpeedMultiplier);

  const grid = createStepGrid(
    parseInstant(simulation.start),
    simulation.timestep_minutes,
    simulation.horizon_hours * 60,
  );

  let status: SimulationClockState['status'] = 'idle';
  let stepIndex = 0;
  let currentStep: SimulationClockState['currentStep'] = null;
  let speedMultiplier = simulation.default_speed_multiplier;
  let seed = simulation.seed;
  let nextRandom = createRandomStream(seed);

  const read = (): SimulationClockState => ({
    status,
    stepIndex,
    currentStep,
    speedMultiplier,
    maximumSpeedMultiplier,
    seed,
  });

  return {
    read,
    start() {
      if (status !== 'idle')
        throw new Error(`start requires an idle clock; current status is ${status}`);
      status = grid.stepCount === 0 ? 'complete' : 'running';
    },
    pause() {
      if (status !== 'running')
        throw new Error(`pause requires a running clock; current status is ${status}`);
      status = 'paused';
    },
    resume() {
      if (status !== 'paused')
        throw new Error(`resume requires a paused clock; current status is ${status}`);
      status = 'running';
    },
    reset(nextSeed: number) {
      validateSeed(nextSeed);
      seed = nextSeed;
      nextRandom = createRandomStream(seed);
      status = 'idle';
      stepIndex = 0;
      currentStep = null;
      speedMultiplier = simulation.default_speed_multiplier;
    },
    setSpeedMultiplier(rate: number) {
      validateRate(rate, maximumSpeedMultiplier);
      speedMultiplier = rate;
    },
    stepForward() {
      if (status === 'complete') throw new Error('cannot advance a complete clock; reset it first');
      if (status === 'idle') status = 'paused';
      currentStep = stepAt(grid, stepIndex);
      stepIndex += 1;
      if (stepIndex === grid.stepCount) status = 'complete';
      return read();
    },
    random() {
      return nextRandom();
    },
  };
}
