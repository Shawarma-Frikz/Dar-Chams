/**
 * Power and interval energy in the engine's canonical units.
 *
 * Power is always watts and interval energy always watt-hours; kilowatts and
 * kilowatt-hours exist only behind a named conversion. Each quantity is a
 * branded number, so `Watts + WattHours` is a plain number that cannot be
 * assigned back to either unit, and `addWatts` refuses an energy argument at
 * compile time. A value read from a scenario or a provider first passes through
 * the constructor for the unit it is written in — `watts()` for a `_w` field,
 * `wattsFromKilowatts()` for a `_kw` one — which is the only place a raw number
 * becomes a quantity. A branded number still satisfies a `number` parameter,
 * so the guard covers arithmetic and assignment, not a deliberate call to a
 * constructor for another quantity.
 */

declare const wattsBrand: unique symbol;
declare const wattHoursBrand: unique symbol;
declare const kilowattsBrand: unique symbol;
declare const kilowattHoursBrand: unique symbol;

/** Instantaneous power in watts, the internal unit. */
export type Watts = number & { readonly [wattsBrand]: 'W' };

/** Energy over one interval in watt-hours, the internal unit. */
export type WattHours = number & { readonly [wattHoursBrand]: 'Wh' };

/** Instantaneous power in kilowatts, an input and display scale. */
export type Kilowatts = number & { readonly [kilowattsBrand]: 'kW' };

/** Energy in kilowatt-hours, an input and display scale. */
export type KilowattHours = number & { readonly [kilowattHoursBrand]: 'kWh' };

const requireFinite = (value: number, what: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${what} must be a finite number, received ${String(value)}`);
  }
  return value;
};

/** Tags a value already counted in watts: a `_w` scenario field or a sensor reading. */
export function watts(value: number): Watts {
  return requireFinite(value, 'power') as Watts;
}

/** Tags a value already counted in watt-hours: a `_wh` field or a stored total. */
export function wattHours(value: number): WattHours {
  return requireFinite(value, 'energy') as WattHours;
}

/** Tags a value already counted in kilowatts: a `_kw` scenario field. */
export function kilowatts(value: number): Kilowatts {
  return requireFinite(value, 'power in kilowatts') as Kilowatts;
}

/** Tags a value already counted in kilowatt-hours: a `_kwh` scenario field. */
export function kilowattHours(value: number): KilowattHours {
  return requireFinite(value, 'energy in kilowatt-hours') as KilowattHours;
}

/** kW → W at an input boundary. */
export function wattsFromKilowatts(value: Kilowatts): Watts {
  const converted = requireFinite(value, 'kilowatts') * 1000;
  if (!Number.isFinite(converted)) throw new RangeError('the converted power overflowed');
  return converted as Watts;
}

/** W → kW at a display boundary. */
export function kilowattsFromWatts(value: Watts): Kilowatts {
  return (requireFinite(value, 'watts') / 1000) as Kilowatts;
}

/** kWh → Wh at an input boundary. */
export function wattHoursFromKilowattHours(value: KilowattHours): WattHours {
  const converted = requireFinite(value, 'kilowatt-hours') * 1000;
  if (!Number.isFinite(converted)) throw new RangeError('the converted energy overflowed');
  return converted as WattHours;
}

/** Wh → kWh at a display boundary. */
export function kilowattHoursFromWattHours(value: WattHours): KilowattHours {
  return (requireFinite(value, 'watt-hours') / 1000) as KilowattHours;
}

/** W × minutes / 60 = Wh, the conversion every step uses (FR-SIM-03). */
export function intervalWattHours(power: Watts, durationMinutes: number): WattHours {
  requireFinite(power, 'power');
  if (requireFinite(durationMinutes, 'duration') < 0) {
    throw new RangeError('an interval cannot have a negative duration');
  }
  const energy = (power * durationMinutes) / 60;
  if (!Number.isFinite(energy)) throw new RangeError('the interval energy overflowed');
  return energy as WattHours;
}

/** Adds powers only: an energy value is a compile error. */
export function addWatts(...values: readonly Watts[]): Watts {
  let total = 0;
  for (const value of values) total += requireFinite(value, 'power');
  if (!Number.isFinite(total)) throw new RangeError('the power sum overflowed');
  return total as Watts;
}

/** Adds interval energies only: a power value is a compile error. */
export function addWattHours(...values: readonly WattHours[]): WattHours {
  let total = 0;
  for (const value of values) total += requireFinite(value, 'energy');
  if (!Number.isFinite(total)) throw new RangeError('the energy sum overflowed');
  return total as WattHours;
}
