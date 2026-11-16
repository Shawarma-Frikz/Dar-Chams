import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { StepTerms } from './balance.ts';
import {
  BALANCE_TERMS,
  BALANCE_TOLERANCE_WH,
  BalanceError,
  assertBalanced,
  balanceStep,
  inverterConversionLoss,
} from './balance.ts';
import { intervalWattHours, wattHours, watts } from '../units/energy.ts';

const zero = () => wattHours(0);

const step = (overrides: Partial<StepTerms> = {}): StepTerms => ({
  pv: zero(),
  gridImport: zero(),
  batteryDischarge: zero(),
  load: zero(),
  batteryCharge: zero(),
  gridExport: zero(),
  conversionLoss: zero(),
  batteryLoss: zero(),
  standbyLoss: zero(),
  ...overrides,
});

const worked = (): StepTerms =>
  step({
    pv: wattHours(1000),
    gridImport: wattHours(500),
    batteryDischarge: wattHours(250),
    load: wattHours(1100),
    batteryCharge: wattHours(400),
    gridExport: wattHours(100),
    conversionLoss: wattHours(40),
    batteryLoss: wattHours(90),
    standbyLoss: wattHours(20),
  });

describe('the energy ledger', () => {
  it('closes a worked step and reports both sides of the identity', () => {
    const balance = balanceStep(worked());
    expect(balance.supplyWh).toBe(1750);
    expect(balance.demandWh).toBe(1750);
    expect(balance.residualWh).toBe(0);
    expect(balance.toleranceWh).toBe(BALANCE_TOLERANCE_WH);
    expect(balance.balanced).toBe(true);
  });

  it('keeps the residual signed: surplus positive, shortfall negative', () => {
    expect(balanceStep(step({ pv: wattHours(10) })).residualWh).toBe(10);
    expect(balanceStep(step({ load: wattHours(4) })).residualWh).toBe(-4);
  });

  it('accepts a residual at the tolerance and refuses one beyond it', () => {
    expect(balanceStep(step({ pv: wattHours(BALANCE_TOLERANCE_WH) })).balanced).toBe(true);
    expect(balanceStep(step({ pv: wattHours(BALANCE_TOLERANCE_WH * 2) })).balanced).toBe(false);
    expect(balanceStep(step({ load: wattHours(BALANCE_TOLERANCE_WH) })).balanced).toBe(true);
  });

  it('refuses a negative magnitude: a reversed flow changes the term, not the sign', () => {
    expect(() => balanceStep(step({ batteryCharge: wattHours(-5) }))).toThrow(
      /batteryCharge must be a non-negative magnitude/,
    );
    expect(() => balanceStep(step({ gridExport: wattHours(-0.001) }))).toThrow(/gridExport/);
  });

  it('refuses a term that is not a finite number', () => {
    expect(() => balanceStep({ ...worked(), pv: Number.NaN } as unknown as StepTerms)).toThrow(
      /pv must be a finite/,
    );
    expect(() =>
      balanceStep({ ...worked(), load: Number.POSITIVE_INFINITY } as unknown as StepTerms),
    ).toThrow(/load must be a finite/);
  });

  it('refuses a missing term and a term the ledger does not have', () => {
    const missing = { ...worked() } as Record<string, unknown>;
    delete missing.standbyLoss;
    expect(() => balanceStep(missing as unknown as StepTerms)).toThrow(/missing standbyLoss/);

    const extra = { ...worked(), curtailment: wattHours(1) };
    expect(() => balanceStep(extra as unknown as StepTerms)).toThrow(
      /curtailment is not a step term/,
    );
    expect(BALANCE_TERMS).toHaveLength(9);
  });

  it('throws a BalanceError that names the step and both totals', () => {
    expect(() => assertBalanced(worked(), 0)).not.toThrow();
    let caught: unknown;
    try {
      assertBalanced(step({ load: wattHours(2) }), 37);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BalanceError);
    const failure = caught as BalanceError;
    expect(failure.stepIndex).toBe(37);
    expect(failure.residualWh).toBe(-2);
    expect(failure.supplyWh).toBe(0);
    expect(failure.demandWh).toBe(2);
    expect(failure.message).toMatch(/step 37 does not balance/);
  });

  it('refuses a step index that is not a non-negative whole number', () => {
    expect(() => assertBalanced(worked(), -1)).toThrow(/step index/);
    expect(() => assertBalanced(worked(), 1.5)).toThrow(/step index/);
  });

  it('turns an inverter efficiency into the conversion loss and nothing else', () => {
    expect(inverterConversionLoss(wattHours(960), 0.96)).toBeCloseTo(40, 12);
    expect(inverterConversionLoss(wattHours(0), 0.5)).toBe(0);
    expect(inverterConversionLoss(wattHours(500), 1)).toBe(0);
    expect(() => inverterConversionLoss(wattHours(500), 0)).toThrow(/efficiency/);
    expect(() => inverterConversionLoss(wattHours(500), 1.2)).toThrow(/efficiency/);
    expect(() => inverterConversionLoss(wattHours(-1), 0.9)).toThrow(/non-negative/);
  });

  it('computes the residual as supply minus demand for arbitrary magnitudes', () => {
    const magnitude = fc.double({ min: 0, max: 1e6, noNaN: true });
    fc.assert(
      fc.property(
        magnitude,
        magnitude,
        magnitude,
        magnitude,
        magnitude,
        (pv, imp, dis, load, chg) => {
          const terms = step({
            pv: wattHours(pv),
            gridImport: wattHours(imp),
            batteryDischarge: wattHours(dis),
            load: wattHours(load),
            batteryCharge: wattHours(chg),
          });
          const balance = balanceStep(terms);
          return (
            balance.supplyWh === pv + imp + dis &&
            balance.residualWh === pv + imp + dis - (load + chg) &&
            balance.balanced === Math.abs(pv + imp + dis - (load + chg)) <= BALANCE_TOLERANCE_WH
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it('closes a step when one term is derived from the other seven', () => {
    const magnitude = fc.double({ min: 0, max: 1e6, noNaN: true });
    fc.assert(
      fc.property(magnitude, magnitude, magnitude, magnitude, magnitude, (a, b, c, d, e) => {
        const supply = wattHours(a) + wattHours(b) + wattHours(c);
        const demand = wattHours(d) + wattHours(e);
        const gridExport = supply - demand;
        fc.pre(gridExport >= 0);
        const balance = balanceStep(
          step({
            pv: wattHours(a),
            gridImport: wattHours(b),
            batteryDischarge: wattHours(c),
            load: wattHours(d),
            batteryCharge: wattHours(e),
            gridExport: wattHours(gridExport),
          }),
        );
        return Math.abs(balance.residualWh) <= BALANCE_TOLERANCE_WH;
      }),
      { numRuns: 300 },
    );
  });

  it('keeps a step that follows the power-to-energy conversion inside the tolerance', () => {
    const power = fc.double({ min: 0, max: 5e4, noNaN: true });
    const minutes = fc.constantFrom(5, 15, 30, 60);
    fc.assert(
      fc.property(power, power, minutes, (generated, consumed, length) => {
        const pvEnergy = intervalWattHours(watts(generated), length);
        const loadEnergy = intervalWattHours(watts(consumed), length);
        const net = pvEnergy - loadEnergy;
        const balance = balanceStep(
          step({
            pv: wattHours(pvEnergy),
            load: wattHours(loadEnergy),
            gridExport: wattHours(Math.max(0, net)),
            gridImport: wattHours(Math.max(0, -net)),
          }),
        );
        return balance.balanced;
      }),
      { numRuns: 200 },
    );
  });
});

// Compile-time guards: `npm run typecheck` fails if either line starts compiling.
const plain: StepTerms = {
  // @ts-expect-error a plain number is not a watt-hour
  pv: 1000,
  gridImport: zero(),
  batteryDischarge: zero(),
  load: zero(),
  batteryCharge: zero(),
  gridExport: zero(),
  conversionLoss: zero(),
  batteryLoss: zero(),
  standbyLoss: zero(),
};
void plain;

const powerAsEnergy: StepTerms = {
  ...step(),
  // @ts-expect-error instantaneous power is not interval energy
  batteryCharge: watts(500),
};
void powerAsEnergy;
