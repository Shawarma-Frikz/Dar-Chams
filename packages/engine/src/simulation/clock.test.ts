import { describe, expect, it } from 'vitest';
import { parseInstant } from '../time/instant.ts';
import type { Scenario } from '../config/scenario.ts';
import { createSimulationClock } from './clock.ts';

const scenario = (seed = 42, defaultSpeed = 1): Pick<Scenario, 'simulation'> => ({
  simulation: {
    timestep_minutes: 15,
    start: '2026-06-21T00:00:00+01:00',
    horizon_hours: 1,
    seed,
    default_speed_multiplier: defaultSpeed,
  },
});

const replay = (seed: number, speed: number) => {
  const clock = createSimulationClock(scenario(seed), { maximumSpeedMultiplier: 1000 });
  clock.setSpeedMultiplier(speed);
  clock.start();
  const results = [];
  while (clock.read().status !== 'complete') {
    const state = clock.stepForward();
    results.push({
      index: state.currentStep?.index,
      start: state.currentStep?.start,
      end: state.currentStep?.end,
      randomEvent: clock.random(),
    });
  }
  return results;
};

describe('simulation clock', () => {
  it('transitions through start, pause, resume, manual step, completion and reset', () => {
    const clock = createSimulationClock(scenario(42, 2));
    expect(clock.read()).toMatchObject({
      status: 'idle',
      stepIndex: 0,
      currentStep: null,
      seed: 42,
    });

    clock.start();
    expect(clock.read().status).toBe('running');
    clock.pause();
    expect(clock.read().status).toBe('paused');
    const stepped = clock.stepForward();
    expect(stepped).toMatchObject({ status: 'paused', stepIndex: 1 });
    expect(stepped.currentStep?.index).toBe(0);

    clock.resume();
    expect(clock.read().status).toBe('running');
    clock.stepForward();
    clock.stepForward();
    const last = clock.stepForward();
    expect(last).toMatchObject({ status: 'complete', stepIndex: 4 });
    expect(last.currentStep).toMatchObject({ index: 3, durationMinutes: 15 });
    expect(() => clock.stepForward()).toThrow(/complete clock/);

    clock.reset(7);
    expect(clock.read()).toMatchObject({
      status: 'idle',
      stepIndex: 0,
      currentStep: null,
      seed: 7,
    });
    expect(clock.read().speedMultiplier).toBe(2);
    expect(clock.random()).toBe(replay(7, 1)[0]?.randomEvent);
  });

  it('rejects invalid lifecycle transitions and invalid seeds', () => {
    const clock = createSimulationClock(scenario());
    expect(() => clock.pause()).toThrow(/requires a running clock/);
    expect(() => clock.resume()).toThrow(/requires a paused clock/);
    expect(() => clock.start()).not.toThrow();
    expect(() => clock.start()).toThrow(/requires an idle clock/);
    expect(() => clock.reset(-1)).toThrow(/non-negative safe integer/);
    expect(() => clock.reset(Number.MAX_SAFE_INTEGER + 1)).toThrow(/non-negative safe integer/);
  });

  it('accepts 1×, 60× and the configured maximum without changing fixed-step results', () => {
    const atOne = replay(42, 1);
    expect(replay(42, 60)).toEqual(atOne);
    expect(replay(42, 1000)).toEqual(atOne);

    const clock = createSimulationClock(scenario(), { maximumSpeedMultiplier: 1000 });
    clock.setSpeedMultiplier(60);
    expect(clock.read()).toMatchObject({ speedMultiplier: 60, maximumSpeedMultiplier: 1000 });
    clock.setSpeedMultiplier(1000);
    expect(clock.read().speedMultiplier).toBe(1000);
    for (const invalid of [0, 0.5, 1001, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => clock.setSpeedMultiplier(invalid)).toThrow(/speed multiplier/);
    }
  });

  it('replays the same ordered steps and seeded events, and separates different seeds', () => {
    const first = replay(123456, 1);
    expect(replay(123456, 60)).toEqual(first);
    expect(replay(123456, 1000)).toEqual(first);
    expect(replay(123457, 1).map((event) => event.randomEvent)).not.toEqual(
      first.map((event) => event.randomEvent),
    );
    expect(first.map((event) => event.index)).toEqual([0, 1, 2, 3]);
    expect(first.map((event) => event.start)).toEqual([
      parseInstant('2026-06-20T23:00:00Z'),
      parseInstant('2026-06-20T23:15:00Z'),
      parseInstant('2026-06-20T23:30:00Z'),
      parseInstant('2026-06-20T23:45:00Z'),
    ]);
    for (const event of first) expect(event.randomEvent).toBeGreaterThanOrEqual(0);
    for (const event of first) expect(event.randomEvent).toBeLessThan(1);
  });

  it('rewinds the random stream when reset with the same seed', () => {
    const clock = createSimulationClock(scenario());
    const initial = [clock.random(), clock.random(), clock.random()];
    expect(initial).toEqual([0.7415648787718233, 0.1599103928769201, 0.27860113025513866]);
    clock.reset(42);
    expect([clock.random(), clock.random(), clock.random()]).toEqual(initial);
  });

  it('validates speed limits against the scenario default', () => {
    expect(() => createSimulationClock(scenario(42, 61), { maximumSpeedMultiplier: 60 })).toThrow(
      /speed multiplier/,
    );
    expect(() => createSimulationClock(scenario(), { maximumSpeedMultiplier: 0 })).toThrow(
      /maximum speed multiplier/,
    );
  });
});
