import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  clampStateOfCharge,
  percentFromStateOfCharge,
  stateOfCharge,
  stateOfChargeFromPercent,
} from './state-of-charge.ts';
import type { StateOfCharge } from './state-of-charge.ts';
import { ABSOLUTE_ZERO_CELSIUS, celsius } from './temperature.ts';

describe('temperature', () => {
  it('keeps degrees Celsius as the one scale, down to absolute zero', () => {
    expect(celsius(45)).toBe(45);
    expect(celsius(-12.5)).toBe(-12.5);
    expect(celsius(ABSOLUTE_ZERO_CELSIUS)).toBe(-273.15);
  });

  it('refuses a temperature below absolute zero or a non-finite value', () => {
    expect(() => celsius(-273.16)).toThrow(/absolute zero/);
    expect(() => celsius(Number.NaN)).toThrow(/finite/);
    expect(() => celsius(Number.NEGATIVE_INFINITY)).toThrow(/finite/);
  });
});

describe('state of charge', () => {
  it('stores the 0–1 fraction and converts only at a display boundary', () => {
    expect(stateOfCharge(0.55)).toBe(0.55);
    expect(percentFromStateOfCharge(stateOfCharge(0.5))).toBe(50);
    expect(stateOfChargeFromPercent(55)).toBeCloseTo(0.55, 12);
    expect(stateOfChargeFromPercent(0)).toBe(0);
    expect(stateOfChargeFromPercent(100)).toBe(1);
  });

  it('refuses a percentage written where a fraction belongs, and the reverse', () => {
    expect(() => stateOfCharge(55)).toThrow(/0–1 fraction/);
    expect(() => stateOfCharge(-0.01)).toThrow(/0–1 fraction/);
    expect(() => stateOfCharge(1.01)).toThrow(/0–1 fraction/);
    expect(() => stateOfCharge(Number.NaN)).toThrow(/finite/);
    expect(() => stateOfChargeFromPercent(-1)).toThrow(/between 0 and 100/);
    expect(() => stateOfChargeFromPercent(101)).toThrow(/between 0 and 100/);
  });

  it('round-trips a fraction through percent for any state of charge', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (fraction) => {
        const percent = percentFromStateOfCharge(stateOfCharge(fraction));
        return Math.abs(stateOfChargeFromPercent(percent) - fraction) <= 1e-12;
      }),
      { numRuns: 200 },
    );
  });

  it('clamps calculated SOC to the battery window and rejects invalid inputs', () => {
    const minimum = stateOfCharge(0.1);
    const maximum = stateOfCharge(0.9);
    expect(clampStateOfCharge(-0.2, minimum, maximum)).toBe(minimum);
    expect(clampStateOfCharge(0.5, minimum, maximum)).toBe(0.5);
    expect(clampStateOfCharge(1.2, minimum, maximum)).toBe(maximum);
    expect(() => clampStateOfCharge(Number.NaN, minimum, maximum)).toThrow(/finite/);
    expect(() => clampStateOfCharge(0.5, maximum, minimum)).toThrow(/must not exceed/);
    expect(() =>
      clampStateOfCharge(0.5, stateOfCharge(0.2), 1.1 as unknown as StateOfCharge),
    ).toThrow(/0–1 fraction/);
  });

  it('keeps bounded SOC inside every generated usable battery window', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        (edgeA, edgeB, candidate) => {
          const minimum = stateOfCharge(Math.min(edgeA, edgeB));
          const maximum = stateOfCharge(Math.max(edgeA, edgeB));
          const result = clampStateOfCharge(candidate, minimum, maximum);
          return result >= minimum && result <= maximum && Number.isFinite(result);
        },
      ),
      { numRuns: 500 },
    );
  });
});
