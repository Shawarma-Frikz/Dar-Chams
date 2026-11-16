import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  intervalWattHours,
  kilowattHoursFromWattHours,
  kilowattsFromWatts,
  wattHoursFromKilowattHours,
  wattsFromKilowatts,
} from './energy.ts';

describe('internal power and energy units', () => {
  it('turns power over an interval into watt-hours, at the step scale', () => {
    expect(intervalWattHours(2000, 15)).toBe(500);
    expect(intervalWattHours(2500, 5)).toBeCloseTo(208.333333, 6);
    expect(intervalWattHours(-1000, 60)).toBe(-1000);
    expect(intervalWattHours(0, 15)).toBe(0);
  });

  it('converts to display scales only through a named function', () => {
    expect(wattsFromKilowatts(6)).toBe(6000);
    expect(kilowattsFromWatts(6000)).toBe(6);
    expect(wattHoursFromKilowattHours(0.625)).toBe(625);
    expect(kilowattHoursFromWattHours(625)).toBe(0.625);
  });

  it('refuses a value that is not a finite number, or a negative interval', () => {
    expect(() => intervalWattHours(Number.NaN, 15)).toThrow(/finite/);
    expect(() => intervalWattHours(1000, Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => intervalWattHours(1000, -5)).toThrow(/negative/);
    expect(() => wattsFromKilowatts(Number.NaN)).toThrow(/finite/);
  });

  it('computes interval energy as power × minutes / 60 for arbitrary finite inputs', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.integer({ min: 0, max: 1440 }),
        (power, minutes) => {
          const expected = (power * minutes) / 60;
          return (
            Math.abs(intervalWattHours(power, minutes) - expected) <= Math.abs(expected) * 1e-12
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('round-trips a scale conversion without losing value', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e6, noNaN: true }), (value) => {
        const roundTrip = kilowattHoursFromWattHours(wattHoursFromKilowattHours(value));
        const wattsRoundTrip = kilowattsFromWatts(wattsFromKilowatts(value));
        return (
          Math.abs(roundTrip - value) <= Math.abs(value) * 1e-12 &&
          Math.abs(wattsRoundTrip - value) <= Math.abs(value) * 1e-12
        );
      }),
      { numRuns: 200 },
    );
  });
});
