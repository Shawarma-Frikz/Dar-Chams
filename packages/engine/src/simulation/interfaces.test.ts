import { describe, expect, it } from 'vitest';
import * as engine from '../index.ts';
import type {
  ApplianceModel,
  BatteryModel,
  GridModel,
  InverterModel,
  PvModel,
  Scheduler,
  SimulationClock,
  WeatherSource,
} from '../index.ts';

// These structural implementations are intentionally inert. They prove each
// port can be supplied without importing UI or implementing phase-03 physics.
const pv = {
  evaluate: (input) => {
    void [
      input.system.installed_dc_kwp,
      input.step.durationMinutes,
      input.weather.globalHorizontalIrradianceWm2,
    ];
    return { dcPower: engine.watts(0) };
  },
} satisfies PvModel;
const inverter = {
  convert: (input) => {
    void [input.system.efficiency, input.step.durationMinutes, input.dcPower];
    return {
      acPower: engine.watts(0),
      conversionLoss: engine.wattHours(0),
      standbyLoss: engine.wattHours(0),
    };
  },
} satisfies InverterModel;
const battery = {
  advance: (input) => {
    void [
      input.system.nominal_capacity_kwh,
      input.step.durationMinutes,
      input.stateOfCharge,
      input.requestedChargePower,
      input.requestedDischargePower,
    ];
    return {
      stateOfCharge: engine.stateOfCharge(0.5),
      chargeEnergy: engine.wattHours(0),
      dischargeEnergy: engine.wattHours(0),
      loss: engine.wattHours(0),
    };
  },
} satisfies BatteryModel;
const appliance = {
  demand: (input) => {
    void [input.appliance.rated_power_w, input.step.durationMinutes, input.enabled];
    return { loadPower: engine.watts(0), loadEnergy: engine.wattHours(0) };
  },
} satisfies ApplianceModel;
const grid = {
  settle: (input) => {
    void [
      input.connection.import_limit_kw,
      input.step.durationMinutes,
      input.requestedImportPower,
      input.requestedExportPower,
    ];
    return { gridImport: engine.wattHours(0), gridExport: engine.wattHours(0) };
  },
} satisfies GridModel;
const weather = {
  read: async (query) => {
    void [query.site.timezone, query.grid.stepCount, query.seed, query.weather.refresh_hours];
    return { frames: [], source: 'synthetic', fallbackEvent: null, warning: null };
  },
} satisfies WeatherSource;
const scheduler = {
  decide: (input) => {
    void [
      input.policy.reserve_soc,
      input.observation.step,
      input.observation.stateOfCharge,
      input.appliances,
    ];
    return {
      dispatch: [],
      requestedBatteryChargePower: engine.watts(0),
      requestedBatteryDischargePower: engine.watts(0),
    };
  },
} satisfies Scheduler;
const clock = {
  read: () => ({
    status: 'idle',
    stepIndex: 0,
    currentStep: null,
    speedMultiplier: 1,
    maximumSpeedMultiplier: 1000,
    seed: 1,
  }),
  start: () => undefined,
  pause: () => undefined,
  resume: () => undefined,
  reset: () => undefined,
  setSpeedMultiplier: () => undefined,
  stepForward: () => ({
    status: 'idle',
    stepIndex: 0,
    currentStep: null,
    speedMultiplier: 1,
    maximumSpeedMultiplier: 1000,
    seed: 1,
  }),
  random: () => 0,
} satisfies SimulationClock;

describe('phase 02.4 component boundaries', () => {
  it('loads and advances the public engine entry in plain Node without a browser', () => {
    expect('window' in globalThis).toBe(false);
    expect('document' in globalThis).toBe(false);
    const grid = engine.createStepGrid(engine.parseInstant('2026-06-21T00:00:00Z'), 15, 15);
    expect(engine.stepAt(grid, 0).durationMinutes).toBe(15);
  });

  it('accepts typed ports for every simulation component', () => {
    expect([pv, inverter, battery, appliance, grid, weather, scheduler, clock]).toHaveLength(8);
    expect(clock.read().status).toBe('idle');
    expect(typeof weather.read).toBe('function');
  });
});
