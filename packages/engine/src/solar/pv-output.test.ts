import { describe, expect, it } from 'vitest';
import {
  calculateInverterOutput,
  calculatePvOutput,
  celsius,
  createStepGrid,
  parseInstant,
  stepAt,
} from '../index.ts';
import type { InverterInput, PvInput } from '../index.ts';

const site = {
  label: 'Tunis',
  latitude_deg: 36.8065,
  longitude_deg: 10.1815,
  altitude_m: 10,
  timezone: 'Africa/Tunis',
} as const;
const weather = {
  instant: parseInstant('2026-06-21T11:00:00Z'),
  ambientTemperature: celsius(30),
  globalHorizontalIrradianceWm2: 700,
  directNormalIrradianceWm2: 600,
  diffuseHorizontalIrradianceWm2: 100,
  windSpeedMps: 2,
  provenance: 'X' as const,
};
const makePv = (overrides: Partial<PvInput['system']> = {}, systemDerate = 0.95): PvInput => ({
  site,
  step: stepAt(createStepGrid(weather.instant, 15, 15), 0),
  weather,
  planeOfArray: {
    beamWm2: 700,
    skyDiffuseWm2: 100,
    groundReflectedWm2: 10,
    totalWm2: 810,
    incidenceAngleDeg: 20,
    model: 'isotropic-sky-transposition-v1',
    approximation: true,
    provenance: 'S',
  },
  systemDerate,
  system: {
    installed_dc_kwp: 5,
    panel_count: 10,
    tilt_deg: 30,
    azimuth_deg: 180,
    temperature_coefficient_per_degc: -0.0035,
    noct_degc: 45,
    soiling_loss: 0.02,
    mismatch_loss: 0.03,
    availability: 0.98,
    tracker: { enabled: false, axes: 0 },
    ...overrides,
  },
});
const makeInverter = (
  dcPower: number,
  overrides: Partial<InverterInput['system']> = {},
): InverterInput => ({
  dcPower: dcPower as InverterInput['dcPower'],
  step: stepAt(createStepGrid(weather.instant, 15, 15), 0),
  system: { rated_ac_kw: 3, efficiency: 0.96, standby_w: 20, clipping: true, ...overrides },
});

describe('PV and inverter step output', () => {
  it('applies each configured PV factor and integrates DC power over the fixed step', () => {
    const input = makePv();
    const result = calculatePvOutput(input);
    const basePower = 5 * 810;
    const expected =
      basePower *
      result.temperatureFactor *
      input.systemDerate *
      (1 - input.system.soiling_loss) *
      (1 - input.system.mismatch_loss) *
      input.system.availability;
    expect(result.dcPower).toBeCloseTo(expected, 8);
    expect(result.dcEnergy).toBeCloseTo((expected * 15) / 60, 8);
    expect(result.temperatureFactor).toBeLessThan(1);
    expect(result).toMatchObject({
      systemDerate: 0.95,
      soilingFactor: 0.98,
      mismatchFactor: 0.97,
      availabilityFactor: 0.98,
    });
  });

  it('applies configured site-local shading only while its window is active', () => {
    const shaded = calculatePvOutput(
      makePv({
        shading_profile: { windows: [{ start: '12:00', end: '13:00', shading_loss: 0.5 }] },
      }),
    );
    const unshaded = calculatePvOutput(makePv());
    expect(shaded.shadingFactor).toBe(0.5);
    expect(shaded.dcPower).toBeCloseTo(unshaded.dcPower * 0.5, 8);
  });

  it('repeats a controlled soiling-and-shading experiment with an explainable energy reduction', () => {
    const start = parseInstant('2026-06-21T09:00:00Z');
    const grid = createStepGrid(start, 60, 240);
    const poa = {
      ...makePv().planeOfArray,
      beamWm2: 700,
      skyDiffuseWm2: 80,
      groundReflectedWm2: 20,
      totalWm2: 800,
    };
    const baseline = makePv({ installed_dc_kwp: 5, soiling_loss: 0.02 });
    const experiment = makePv({
      installed_dc_kwp: 5,
      soiling_loss: 0.12,
      shading_profile: { windows: [{ start: '12:00', end: '13:00', shading_loss: 0.5 }] },
    });
    const inverter = { rated_ac_kw: 10, efficiency: 0.96, standby_w: 0, clipping: true };

    const run = (input: PvInput) =>
      Array.from({ length: 4 }, (_, index) => {
        const step = stepAt(grid, index);
        const pv = calculatePvOutput({
          ...input,
          step,
          weather: { ...weather, instant: step.start, ambientTemperature: celsius(25) },
          planeOfArray: poa,
        });
        const ac = calculateInverterOutput({ system: inverter, step, dcPower: pv.dcPower });
        return { dcEnergy: pv.dcEnergy, acEnergy: ac.acEnergy, shadingFactor: pv.shadingFactor };
      });

    const baselineRun = run(baseline);
    const experimentRun = run(experiment);
    const replay = run(experiment);
    const baselineDcWh = baselineRun.reduce((sum, step) => sum + step.dcEnergy, 0);
    const experimentDcWh = experimentRun.reduce((sum, step) => sum + step.dcEnergy, 0);
    const baselineAcWh = baselineRun.reduce((sum, step) => sum + step.acEnergy, 0);
    const experimentAcWh = experimentRun.reduce((sum, step) => sum + step.acEnergy, 0);

    expect(replay).toEqual(experimentRun);
    expect(experimentRun.map((step) => step.shadingFactor)).toEqual([1, 1, 0.5, 1]);
    expect(experimentDcWh / baselineDcWh).toBeCloseTo(
      (3 * (0.88 / 0.98) + 0.5 * (0.88 / 0.98)) / 4,
      12,
    );
    expect(experimentAcWh / baselineAcWh).toBeCloseTo(experimentDcWh / baselineDcWh, 12);
    expect((1 - experimentDcWh / baselineDcWh) * 100).toBeCloseTo(21.4285714286, 8);
  });

  it('forces PV DC power and energy to zero at night even if weather inputs are inconsistent', () => {
    const nightInstant = parseInstant('2026-06-21T00:00:00Z');
    const night = makePv();
    const result = calculatePvOutput({
      ...night,
      step: stepAt(createStepGrid(nightInstant, 15, 15), 0),
      weather: { ...night.weather, instant: nightInstant },
      planeOfArray: { ...night.planeOfArray, totalWm2: 1500 },
    });
    expect(result.dcPower).toBe(0);
    expect(result.dcEnergy).toBe(0);
  });

  it('converts DC to AC, separately reports conversion, clipping and standby energy', () => {
    const pvEnergyWh = (5000 * 15) / 60;
    const result = calculateInverterOutput(makeInverter(5000));
    expect(result.acPower).toBe(3000);
    expect(result.acEnergy).toBe(750);
    expect(result.conversionLoss).toBeCloseTo(31.25, 10);
    expect(result.clippingLoss).toBeCloseTo(468.75, 10);
    expect(result.standbyLoss).toBe(5);
    expect(result.acEnergy + result.conversionLoss + result.clippingLoss).toBeCloseTo(
      pvEnergyWh,
      10,
    );
  });

  it('never exceeds the inverter limit and refuses over-rating when clipping is disabled', () => {
    expect(calculateInverterOutput(makeInverter(1000)).acPower).toBeCloseTo(960, 10);
    expect(() => calculateInverterOutput(makeInverter(5000, { clipping: false }))).toThrow(
      /rated AC capacity/,
    );
  });

  it('rejects impossible efficiencies, non-finite DC power and invalid derates', () => {
    expect(() => calculateInverterOutput(makeInverter(Number.NaN))).toThrow(/dcPower/);
    expect(() => calculateInverterOutput(makeInverter(100, { efficiency: 0 }))).toThrow(
      /efficiency/,
    );
    expect(() => calculatePvOutput(makePv({}, 1.1))).toThrow(/systemDerate/);
  });
});
