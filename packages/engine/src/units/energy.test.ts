import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  addWattHours,
  addWatts,
  intervalWattHours,
  kilowattHours,
  kilowattHoursFromWattHours,
  kilowatts,
  kilowattsFromWatts,
  wattHours,
  wattHoursFromKilowattHours,
  watts,
  wattsFromKilowatts,
} from './energy.ts';

describe('internal power and energy units', () => {
  it('turns power over an interval into watt-hours, at the step scale', () => {
    expect(intervalWattHours(watts(2000), 15)).toBe(500);
    expect(intervalWattHours(watts(2500), 5)).toBeCloseTo(208.333333, 6);
    expect(intervalWattHours(watts(-1000), 60)).toBe(-1000);
    expect(intervalWattHours(watts(0), 15)).toBe(0);
  });

  it('converts to display scales only through a named function', () => {
    expect(wattsFromKilowatts(kilowatts(6))).toBe(6000);
    expect(kilowattsFromWatts(watts(6000))).toBe(6);
    expect(wattHoursFromKilowattHours(kilowattHours(0.625))).toBe(625);
    expect(kilowattHoursFromWattHours(wattHours(625))).toBe(0.625);
  });

  it('adds only values already in the same unit', () => {
    expect(addWatts(watts(1000), watts(500), watts(-200))).toBe(1300);
    expect(addWattHours(wattHours(500), wattHours(625))).toBe(1125);
    expect(addWatts()).toBe(0);
    expect(addWattHours()).toBe(0);
  });

  it('refuses a value that is not a finite number, or a negative interval', () => {
    expect(() => watts(Number.NaN)).toThrow(/finite/);
    expect(() => wattHours(Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => intervalWattHours(watts(1000), Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => intervalWattHours(watts(1000), -5)).toThrow(/negative/);
    expect(() => kilowatts(Number.NaN)).toThrow(/finite/);
    expect(() => addWatts(watts(Number.MAX_VALUE), watts(Number.MAX_VALUE))).toThrow(/overflowed/);
  });

  it('computes interval energy as power × minutes / 60 for arbitrary finite inputs', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.integer({ min: 0, max: 1440 }),
        (power, minutes) => {
          const expected = (power * minutes) / 60;
          return (
            Math.abs(intervalWattHours(watts(power), minutes) - expected) <=
            Math.abs(expected) * 1e-12
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('round-trips a scale conversion without losing value', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e6, noNaN: true }), (value) => {
        const roundTrip = kilowattHoursFromWattHours(
          wattHoursFromKilowattHours(kilowattHours(value)),
        );
        const wattsRoundTrip = kilowattsFromWatts(wattsFromKilowatts(kilowatts(value)));
        return (
          Math.abs(roundTrip - value) <= Math.abs(value) * 1e-12 &&
          Math.abs(wattsRoundTrip - value) <= Math.abs(value) * 1e-12
        );
      }),
      { numRuns: 200 },
    );
  });
});
