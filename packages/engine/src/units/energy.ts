/**
 * Power and interval energy in the engine's internal units.
 *
 * The engine computes in watts and stores interval energy in watt-hours
 * (DEC-004). Kilowatts and kilowatt-hours appear only at a boundary — a
 * scenario field, a manifest or a label — and every conversion has a name, so
 * no calculation mixes the two scales by accident. Task 02.2 extends this to
 * temperature, state of charge and a dimensional guard across all quantities;
 * what exists here is the time-step conversion and the display scales.
 */

/** Instantaneous power in watts, the internal unit. */
export type Watts = number;

/** Energy over one interval in watt-hours, the internal unit. */
export type WattHours = number;

const requireFinite = (value: number, what: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${what} must be a finite number, received ${String(value)}`);
  }
  return value;
};

/** W × minutes / 60 = Wh, the conversion every step will use (FR-SIM-03). */
export function intervalWattHours(powerWatts: Watts, durationMinutes: number): WattHours {
  requireFinite(powerWatts, 'power');
  if (requireFinite(durationMinutes, 'duration') < 0) {
    throw new RangeError('an interval cannot have a negative duration');
  }
  const energy = (powerWatts * durationMinutes) / 60;
  if (!Number.isFinite(energy)) throw new RangeError('the interval energy overflowed');
  return energy;
}

export function wattsFromKilowatts(kilowatts: number): Watts {
  return requireFinite(kilowatts, 'kilowatts') * 1000;
}

export function kilowattsFromWatts(watts: Watts): number {
  return requireFinite(watts, 'watts') / 1000;
}

export function wattHoursFromKilowattHours(kilowattHours: number): WattHours {
  return requireFinite(kilowattHours, 'kilowatt-hours') * 1000;
}

export function kilowattHoursFromWattHours(wattHours: WattHours): number {
  return requireFinite(wattHours, 'watt-hours') / 1000;
}
