/**
 * Battery state of charge as a 0–1 fraction (DEC-038).
 *
 * The scenario stores `initial_soc`, `min_soc`, `max_soc`, `reserve_soc` and
 * `hysteresis_soc` as fractions, and the engine keeps that scale everywhere.
 * A percentage exists only at a display boundary: `percentFromStateOfCharge`
 * and `stateOfChargeFromPercent` are the two named crossings, so no
 * calculation can treat 55 % and 0.55 as the same number.
 */

declare const stateOfChargeBrand: unique symbol;

/** A state of charge in `[0, 1]`. */
export type StateOfCharge = number & { readonly [stateOfChargeBrand]: 'SOC' };

/** Tags a value already stored as a 0–1 fraction. */
export function stateOfCharge(fraction: number): StateOfCharge {
  if (typeof fraction !== 'number' || !Number.isFinite(fraction)) {
    throw new RangeError(`state of charge must be a finite number, received ${String(fraction)}`);
  }
  if (fraction < 0 || fraction > 1) {
    throw new RangeError(
      `state of charge must be a 0–1 fraction, received ${fraction}; store 55 % as 0.55 and convert at a display boundary`,
    );
  }
  return fraction as StateOfCharge;
}

/** 0.55 → 55, the display boundary; the caller decides how many digits to show. */
export function percentFromStateOfCharge(value: StateOfCharge): number {
  return stateOfCharge(value) * 100;
}

/** 55 → 0.55, the input boundary for a percentage a reader or datasheet supplied. */
export function stateOfChargeFromPercent(percent: number): StateOfCharge {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) {
    throw new RangeError(`a percentage must be a finite number, received ${String(percent)}`);
  }
  if (percent < 0 || percent > 100) {
    throw new RangeError(`a percentage must be between 0 and 100, received ${percent}`);
  }
  return stateOfCharge(percent / 100);
}
