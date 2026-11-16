/**
 * Temperature in degrees Celsius, the canonical unit (DEC-038).
 *
 * The scenario contract and every measurement are in °C; there is no second
 * temperature scale to convert between, so the boundary is the constructor
 * that refuses a value below absolute zero. Temperatures are deliberately not
 * additive: an absolute temperature is not a quantity you sum, and a
 * temperature difference would be a separate type if a later phase needs one.
 */

declare const celsiusBrand: unique symbol;

/** A temperature in degrees Celsius. */
export type Celsius = number & { readonly [celsiusBrand]: 'degC' };

/** Zero kelvin expressed in °C. */
export const ABSOLUTE_ZERO_CELSIUS = -273.15;

/** Tags a value already counted in °C, refusing one below absolute zero. */
export function celsius(value: number): Celsius {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`temperature must be a finite number, received ${String(value)}`);
  }
  if (value < ABSOLUTE_ZERO_CELSIUS) {
    throw new RangeError(
      `temperature ${value} °C is below absolute zero (${ABSOLUTE_ZERO_CELSIUS} °C)`,
    );
  }
  return value as Celsius;
}
