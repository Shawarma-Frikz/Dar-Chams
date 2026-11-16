/**
 * Public surface of the Helios engine package.
 *
 * The simulation itself arrives in phase 02. What exists now is the boundary
 * the later phases run behind: engine identity, the scenario contract and the
 * validator that any configuration must pass before the engine sees it. No
 * React, no Next.js and no browser API may appear here; the engine stays
 * runnable in plain Node for tests and batch experiments (DEC-002).
 */

export const ENGINE_NAME = 'helios-engine';
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
  Simulation,
  Site,
  Tariff,
  TariffBand,
  TimestepMinutes,
  TimeWindow,
  Tracker,
  Weather,
} from './config/scenario.ts';
