/**
 * Stable, UI-free ports between the simulation coordinator and its physical,
 * policy and data components. These are contracts only: model implementations
 * arrive in their roadmap phases and must settle through the phase-02 ledger.
 */

import type {
  Appliance,
  Battery,
  Grid,
  Inverter,
  Pv,
  SchedulerPolicy,
  Site,
} from '../config/scenario.ts';
import type { Step, StepGrid } from '../time/timeline.ts';
import type { Instant } from '../time/instant.ts';
import type { Celsius } from '../units/temperature.ts';
import type { StateOfCharge } from '../units/state-of-charge.ts';
import type { WattHours, Watts } from '../units/energy.ts';
import type { ProvenanceClass } from '../config/scenario.ts';

/** Weather needed by a physical model for one instant, with units in field names. */
export interface WeatherFrame {
  readonly instant: Instant;
  readonly ambientTemperature: Celsius;
  readonly globalHorizontalIrradianceWm2: number;
  readonly directNormalIrradianceWm2: number;
  readonly diffuseHorizontalIrradianceWm2: number;
  readonly windSpeedMps: number;
  readonly provenance: ProvenanceClass;
}

export interface WeatherQuery {
  readonly site: Site;
  readonly grid: StepGrid;
}

/** External weather I/O stays behind an async port; simulation models stay pure. */
export interface WeatherSource {
  read(query: WeatherQuery): Promise<readonly WeatherFrame[]>;
}

export interface PvInput {
  readonly system: Pv;
  readonly step: Step;
  readonly weather: WeatherFrame;
}

export interface PvOutput {
  /** DC power at the array terminals; the inverter owns later conversion. */
  readonly dcPower: Watts;
}

export interface PvModel {
  evaluate(input: PvInput): PvOutput;
}

export interface InverterInput {
  readonly system: Inverter;
  readonly step: Step;
  readonly dcPower: Watts;
}

export interface InverterOutput {
  readonly acPower: Watts;
  readonly conversionLoss: WattHours;
  readonly standbyLoss: WattHours;
}

export interface InverterModel {
  convert(input: InverterInput): InverterOutput;
}

export interface BatteryInput {
  readonly system: Battery;
  readonly step: Step;
  readonly stateOfCharge: StateOfCharge;
  readonly requestedChargePower: Watts;
  readonly requestedDischargePower: Watts;
}

export interface BatteryOutput {
  readonly stateOfCharge: StateOfCharge;
  readonly chargeEnergy: WattHours;
  readonly dischargeEnergy: WattHours;
  readonly loss: WattHours;
}

export interface BatteryModel {
  advance(input: BatteryInput): BatteryOutput;
}

export interface ApplianceInput {
  readonly appliance: Appliance;
  readonly step: Step;
  /** Supplied by the schedule; the appliance model does not inspect UI state. */
  readonly enabled: boolean;
}

export interface ApplianceOutput {
  readonly loadPower: Watts;
  readonly loadEnergy: WattHours;
}

export interface ApplianceModel {
  demand(input: ApplianceInput): ApplianceOutput;
}

export interface GridInput {
  readonly connection: Grid;
  readonly step: Step;
  readonly requestedImportPower: Watts;
  readonly requestedExportPower: Watts;
}

export interface GridOutput {
  readonly gridImport: WattHours;
  readonly gridExport: WattHours;
}

export interface GridModel {
  settle(input: GridInput): GridOutput;
}

/** The only state a scheduler may inspect: explicit observations, not Scenario or UI stores. */
export interface SchedulerObservation {
  readonly step: Step;
  readonly stateOfCharge: StateOfCharge;
  readonly availablePvPower: Watts;
  readonly forecastLoadPower: Watts;
  readonly gridAvailable: boolean;
  readonly importPriceTndPerKwh: number | null;
}

export interface SchedulerInput {
  readonly policy: SchedulerPolicy;
  readonly observation: SchedulerObservation;
  readonly appliances: readonly Appliance[];
}

export interface ApplianceDispatch {
  readonly applianceId: string;
  readonly enabled: boolean;
}

export interface SchedulerOutput {
  readonly dispatch: readonly ApplianceDispatch[];
  readonly requestedBatteryChargePower: Watts;
  readonly requestedBatteryDischargePower: Watts;
}

export interface Scheduler {
  decide(input: SchedulerInput): SchedulerOutput;
}

export type ClockStatus = 'idle' | 'running' | 'paused' | 'complete';

export interface SimulationClockState {
  readonly status: ClockStatus;
  readonly stepIndex: number;
  readonly currentStep: Step | null;
  readonly speedMultiplier: number;
  readonly maximumSpeedMultiplier: number;
  readonly seed: number;
}

/** Deterministic fixed-step lifecycle and seeded random stream for one run. */
export interface SimulationClock {
  read(): SimulationClockState;
  start(): void;
  pause(): void;
  resume(): void;
  reset(seed: number): void;
  setSpeedMultiplier(multiplier: number): void;
  stepForward(): SimulationClockState;
  /** Returns the next seeded value in [0, 1); reset(seed) rewinds the stream. */
  random(): number;
}
