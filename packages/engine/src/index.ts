/**
 * Public surface of the Dar Chams engine package.
 *
 * Phase 01 built the boundary the simulation runs behind: engine identity, the
 * scenario contract and the validator any configuration must pass. Phase 02
 * adds the time base — absolute instants, site-zone day boundaries and a
 * uniform step grid — and the canonical units: branded watts, watt-hours,
 * degrees Celsius and state of charge, with every scale change behind a named
 * conversion (DEC-038). It also fixes the energy ledger every later component
 * must satisfy: eight non-negative magnitudes over one step, a signed residual
 * and an absolute tolerance (DEC-039). Physics, controllers and the running
 * clock are still to come. No React, no Next.js and no browser API may appear
 * here; the engine stays runnable in plain Node for tests and batch
 * experiments (DEC-002).
 */

export const ENGINE_NAME = 'dar-chams-engine';
export const ENGINE_VERSION = '0.1.0';

export { ConfigError, describeValue, formatIssues, readPath, sortIssues } from './config/issues.ts';
export type { ConfigIssue, IssueLayer } from './config/issues.ts';

export { checkScenarioInvariants } from './config/invariants.ts';
export { createScenarioValidator } from './config/schema.ts';
export type { ScenarioCheck, ScenarioValidator } from './config/schema.ts';

export {
  auditSchemaUnits,
  hasUnitSuffix,
  UNIT_SUFFIXES,
  UNITLESS_QUANTITIES,
} from './config/units.ts';

export {
  addMinutes,
  formatInstant,
  instantEpochMilliseconds,
  instantFromEpochMilliseconds,
  minutesBetween,
  parseInstant,
} from './time/instant.ts';
export type { Instant } from './time/instant.ts';

export {
  formatZonedInstant,
  instantFromZonedParts,
  isTimeZone,
  siteDate,
  siteDayBounds,
  zoneOffsetMinutes,
  zonedParts,
} from './time/zone.ts';
export type { SiteDayBounds, ZonedParts } from './time/zone.ts';

export {
  TIMESTEP_MINUTES,
  createStepGrid,
  groupStepsBySiteDay,
  siteDayGrid,
  stepAt,
  stepsInSiteDay,
} from './time/timeline.ts';
export type { SiteDaySegment, Step, StepGrid } from './time/timeline.ts';

export {
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
} from './units/energy.ts';
export type { KilowattHours, Kilowatts, WattHours, Watts } from './units/energy.ts';

export {
  clampStateOfCharge,
  percentFromStateOfCharge,
  stateOfCharge,
  stateOfChargeFromPercent,
} from './units/state-of-charge.ts';
export type { StateOfCharge } from './units/state-of-charge.ts';

export { ABSOLUTE_ZERO_CELSIUS, celsius } from './units/temperature.ts';
export type { Celsius } from './units/temperature.ts';

export {
  BALANCE_TERMS,
  BALANCE_TOLERANCE_WH,
  BalanceError,
  assertBalanced,
  balanceStep,
  inverterConversionLoss,
} from './balance/balance.ts';
export type { BalanceTerm, StepBalance, StepTerms } from './balance/balance.ts';

export type {
  ApplianceDispatch,
  ApplianceInput,
  ApplianceModel,
  ApplianceOutput,
  BatteryInput,
  BatteryModel,
  BatteryOutput,
  ClockStatus,
  GridInput,
  GridModel,
  GridOutput,
  InverterInput,
  InverterModel,
  InverterOutput,
  PvInput,
  PvModel,
  PvOutput,
  Scheduler,
  SchedulerInput,
  SchedulerObservation,
  SchedulerOutput,
  SimulationClock,
  SimulationClockState,
  WeatherFrame,
  WeatherQuery,
  WeatherSource,
} from './simulation/interfaces.ts';
export { createSimulationClock } from './simulation/clock.ts';
export type { SimulationClockOptions } from './simulation/clock.ts';
export { createEventJournal } from './simulation/events.ts';
export type { EventJournal, SimulationEvent, SimulationEventInput } from './simulation/events.ts';

export type {
  Appliance,
  ApplianceProfile,
  BaselinePolicy,
  Battery,
  Degradation,
  Flexibility,
  Grid,
  Household,
  Inverter,
  OperatingMode,
  Outage,
  Policies,
  Priority,
  Provenance,
  ProvenanceClass,
  Pv,
  Room,
  Scenario,
  SchedulerPolicy,
  ShadingProfile,
  ShadingWindow,
  Simulation,
  Site,
  Tariff,
  TariffBand,
  TimestepMinutes,
  TimeWindow,
  Tracker,
  Weather,
} from './config/scenario.ts';
