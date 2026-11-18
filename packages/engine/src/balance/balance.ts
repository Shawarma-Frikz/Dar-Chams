/**
 * The energy ledger: the conservation identity every simulated step must satisfy.
 *
 * Every term is a non-negative magnitude in watt-hours over one step, and its
 * name states the direction it flows and where it is measured. Supply enters the
 * site: PV at the array's DC terminals, grid import at the meter, battery
 * discharge at the cells. Demand leaves it: household load, battery charge at
 * the cells, grid export at the meter, and the three conversion and loss terms —
 * the inverter, the battery's own round trip, and the inverter's standby draw.
 *
 * A flow that reverses changes its term, not its sign, so a sign error cannot
 * cancel against another mistake. Every conversion between a supply's
 * measurement point and a demand's has a named term, which is what stops a
 * component from quietly dropping the energy it wastes: a PV model that produced
 * DC and reported AC would have to write the difference into `conversionLoss` or
 * the step would not close.
 *
 * The residual is the only signed number here, which is why it is a plain number
 * rather than a `WattHours`. `docs/energy-balance.md` states the identity, the
 * convention, the worked example and the tolerance (DEC-039).
 */

import type { WattHours } from '../units/energy.ts';
import { addWattHours, wattHours } from '../units/energy.ts';

/** The ten magnitudes, in ledger order: three supply terms, then seven demand terms. */
export const BALANCE_TERMS = [
  'pv',
  'gridImport',
  'batteryDischarge',
  'load',
  'batteryCharge',
  'gridExport',
  'conversionLoss',
  'clippingLoss',
  'batteryLoss',
  'standbyLoss',
] as const;

export type BalanceTerm = (typeof BALANCE_TERMS)[number];

export interface StepTerms {
  /** PV energy produced at the array's DC terminals. */
  readonly pv: WattHours;
  /** Energy received at the meter from the grid. */
  readonly gridImport: WattHours;
  /** Energy released by the battery cells onto the DC bus. */
  readonly batteryDischarge: WattHours;
  /** Energy consumed by household appliances. */
  readonly load: WattHours;
  /** Energy stored in the battery cells. */
  readonly batteryCharge: WattHours;
  /** Energy delivered at the meter to the grid. */
  readonly gridExport: WattHours;
  /** Energy lost in the inverter on every path that crosses it. */
  readonly conversionLoss: WattHours;
  /** DC-side PV energy discarded when an inverter reaches its AC rating. */
  readonly clippingLoss: WattHours;
  /** Energy lost inside the battery between its terminals and its cells. */
  readonly batteryLoss: WattHours;
  /** Energy the inverter consumes while it is energised. */
  readonly standbyLoss: WattHours;
}

export interface StepBalance {
  readonly supplyWh: WattHours;
  readonly demandWh: WattHours;
  /** Supply minus demand: positive is a surplus, negative a shortfall. */
  readonly residualWh: number;
  readonly toleranceWh: number;
  readonly balanced: boolean;
}

/**
 * The largest residual a step may carry, in watt-hours.
 *
 * The terms are exact arithmetic, not measurements, so this is the rounding
 * allowance of ten double-precision sums near 1e5 Wh — about 1e-10 Wh — with
 * four orders of headroom. It is four orders below the smallest term a shipped
 * appliance produces (1 W over 5 minutes is 0.083 Wh), so a real leak cannot
 * hide inside it.
 */
export const BALANCE_TOLERANCE_WH = 1e-6;

const SUPPLY_TERMS = ['pv', 'gridImport', 'batteryDischarge'] as const;
const DEMAND_TERMS = [
  'load',
  'batteryCharge',
  'gridExport',
  'conversionLoss',
  'clippingLoss',
  'batteryLoss',
  'standbyLoss',
] as const;

const requireTerm = (terms: StepTerms, name: BalanceTerm): WattHours => {
  if (!(name in terms)) {
    throw new TypeError(`step terms are missing ${name}`);
  }
  const value = terms[name];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(
      `${name} must be a finite number of watt-hours, received ${String(value)}`,
    );
  }
  if (value < 0) {
    throw new RangeError(
      `${name} must be a non-negative magnitude, received ${value}: a reversed flow changes the term, not the sign`,
    );
  }
  return value as WattHours;
};

const formatWh = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toPrecision(12).replace(/\.?0+$/, '');

/**
 * Settles one step: sums the three supply terms and the seven demand terms and
 * returns the residual. A malformed ledger is a programming error and throws; a
 * ledger that merely fails to close is reported, so the caller can name the step.
 */
export function balanceStep(terms: StepTerms): StepBalance {
  if (terms === null || typeof terms !== 'object') {
    throw new TypeError(
      `step terms must be an object of ${BALANCE_TERMS.length} watt-hour magnitudes`,
    );
  }
  for (const key of Object.keys(terms)) {
    if (!(BALANCE_TERMS as readonly string[]).includes(key)) {
      throw new TypeError(`${key} is not a step term; the ledger has ${BALANCE_TERMS.join(', ')}`);
    }
  }

  const supplyWh = addWattHours(...SUPPLY_TERMS.map((name) => requireTerm(terms, name)));
  const demandWh = addWattHours(...DEMAND_TERMS.map((name) => requireTerm(terms, name)));
  const residualWh = supplyWh - demandWh;
  return {
    supplyWh,
    demandWh,
    residualWh,
    toleranceWh: BALANCE_TOLERANCE_WH,
    balanced: Math.abs(residualWh) <= BALANCE_TOLERANCE_WH,
  };
}

export class BalanceError extends Error {
  readonly stepIndex: number;
  readonly supplyWh: number;
  readonly demandWh: number;
  readonly residualWh: number;
  readonly toleranceWh: number;

  constructor(balance: StepBalance, stepIndex: number) {
    super(
      `step ${stepIndex} does not balance: supply ${formatWh(balance.supplyWh)} Wh, ` +
        `demand ${formatWh(balance.demandWh)} Wh, residual ${formatWh(balance.residualWh)} Wh ` +
        `beyond ±${formatWh(balance.toleranceWh)} Wh`,
    );
    this.name = 'BalanceError';
    this.stepIndex = stepIndex;
    this.supplyWh = balance.supplyWh;
    this.demandWh = balance.demandWh;
    this.residualWh = balance.residualWh;
    this.toleranceWh = balance.toleranceWh;
  }
}

/** Settles a step and throws `BalanceError` if it does not close within tolerance. */
export function assertBalanced(terms: StepTerms, stepIndex: number): StepBalance {
  if (!Number.isInteger(stepIndex) || stepIndex < 0) {
    throw new RangeError(
      `a step index is a non-negative whole number, received ${String(stepIndex)}`,
    );
  }
  const balance = balanceStep(terms);
  if (!balance.balanced) {
    throw new BalanceError(balance, stepIndex);
  }
  return balance;
}

/**
 * The DC energy the inverter consumed beyond the AC energy it delivered:
 * `acEnergy × (1 / efficiency - 1)`. A producer calls it once per path that
 * crosses the inverter — PV production, battery discharge, battery charge — and
 * sums the results into `conversionLoss`. DC energy never converted because
 * of inverter clipping is a separate `clippingLoss` term. Standby draw is separate
 * because the inverter takes it from the AC bus rather than losing it in
 * conversion.
 */
export function inverterConversionLoss(acEnergy: WattHours, efficiency: number): WattHours {
  if (acEnergy < 0) {
    throw new RangeError(`AC energy must be a non-negative magnitude, received ${acEnergy}`);
  }
  if (!Number.isFinite(efficiency) || efficiency <= 0 || efficiency > 1) {
    throw new RangeError(
      `inverter efficiency must be above 0 and at most 1, received ${String(efficiency)}`,
    );
  }
  return wattHours(acEnergy * (1 / efficiency - 1));
}
