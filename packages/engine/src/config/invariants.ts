/**
 * Relational rules JSON Schema cannot express.
 *
 * Each one describes a state that is internally contradictory rather than
 * merely out of range: a usable window that runs backwards, a load assigned to
 * a room that does not exist, a job longer than the window reserved for it.
 * These run only after the schema has accepted the document, so every value
 * here is the type the `Scenario` interface declares.
 */

import type { ConfigIssue } from './issues.ts';
import { describeValue } from './issues.ts';
import type { Scenario } from './scenario.ts';

const toMinutes = (clock: string): number => {
  const [hours = '0', minutes = '0'] = clock.split(':');
  return Number(hours) * 60 + Number(minutes);
};

function checkBatteryWindow(scenario: Scenario, issues: ConfigIssue[]): void {
  const { min_soc: min, max_soc: max, initial_soc: initial } = scenario.battery;
  if (min >= max) {
    issues.push({
      layer: 'scenario',
      path: 'battery.min_soc',
      code: 'relation.soc-window',
      message: 'is not below battery.max_soc, so the usable window is empty',
      received: `${min} and ${max}`,
      expected: `a min_soc below max_soc, for example 0.10 against 0.95`,
      hint: 'a battery cannot charge into a window that runs backwards; raise max_soc or lower min_soc',
    });
  } else if (initial < min || initial > max) {
    issues.push({
      layer: 'scenario',
      path: 'battery.initial_soc',
      code: 'relation.soc-start',
      message: 'starts the run outside the usable window',
      received: describeValue(initial),
      expected: `a value between min_soc (${min}) and max_soc (${max})`,
      hint: 'state of charge is a fraction in [0, 1]; the run cannot begin at a level the controller must never leave',
    });
  }
}

function checkHousehold(scenario: Scenario, issues: ConfigIssue[]): void {
  const { rooms, appliances } = scenario.household;

  const roomIds = new Set<string>();
  rooms.forEach((room, index) => {
    if (roomIds.has(room.id)) {
      issues.push({
        layer: 'scenario',
        path: `household.rooms[${index}].id`,
        code: 'relation.room-id',
        message: 'is used by more than one room',
        received: describeValue(room.id),
        expected: 'a room id that appears once',
        hint: 'events, annotations and the twin refer to rooms by id, so ids must be unambiguous',
      });
    }
    roomIds.add(room.id);
  });

  const applianceIds = new Set<string>();
  appliances.forEach((appliance, index) => {
    const path = `household.appliances[${index}]`;
    if (applianceIds.has(appliance.id)) {
      issues.push({
        layer: 'scenario',
        path: `${path}.id`,
        code: 'relation.appliance-id',
        message: 'is used by more than one appliance',
        received: describeValue(appliance.id),
        expected: 'an appliance id that appears once',
        hint: 'shed decisions and timeline events name the appliance by id',
      });
    }
    applianceIds.add(appliance.id);

    if (!roomIds.has(appliance.room)) {
      issues.push({
        layer: 'scenario',
        path: `${path}.room`,
        code: 'relation.room-reference',
        message: 'names a room that household.rooms does not declare',
        received: describeValue(appliance.room),
        expected: `one of ${[...roomIds].join(', ')}`,
        hint: 'every load belongs to a room; add the room or correct the reference',
      });
    }

    const window = appliance.flexibility;
    if (window) {
      const span = (toMinutes(window.latest) - toMinutes(window.earliest) + 1440) % 1440;
      if (window.duration_minutes > span) {
        issues.push({
          layer: 'scenario',
          path: `${path}.flexibility.duration_minutes`,
          code: 'relation.flexibility-window',
          message: 'is longer than the window it has to run in',
          received: `${window.duration_minutes} min in a ${span} min window`,
          expected: `at most ${span} minutes between ${window.earliest} and ${window.latest}`,
          hint: 'a task that cannot finish inside its window is not flexible, it is unschedulable',
        });
      }
    }
  });
}

function checkTariffBands(scenario: Scenario, issues: ConfigIssue[]): void {
  const bands = scenario.tariff.import_bands;
  let previous = 0;
  let openEndedSeen = false;
  bands.forEach((band, index) => {
    const path = `tariff.import_bands[${index}].up_to_kwh_per_month`;
    if (band.up_to_kwh_per_month === null) {
      if (index !== bands.length - 1) {
        issues.push({
          layer: 'scenario',
          path,
          code: 'relation.tariff-bands',
          message: 'is open-ended but is not the last band',
          received: 'null',
          expected: 'an increasing monthly limit, with null only on the final band',
          hint: 'bands are read in order; an open-ended band before the last one makes the rest unreachable',
        });
      }
      openEndedSeen = true;
      return;
    }
    if (openEndedSeen || band.up_to_kwh_per_month <= previous) {
      issues.push({
        layer: 'scenario',
        path,
        code: 'relation.tariff-bands',
        message: 'does not increase from the band before it',
        received: describeValue(band.up_to_kwh_per_month),
        expected: `a monthly limit above ${previous} kWh`,
        hint: 'tariff bands are cumulative thresholds; they must ascend and be closed by one open-ended band',
      });
    }
    previous = band.up_to_kwh_per_month;
  });
}

/** Returns every relational problem; an empty array means the document is coherent. */
export function checkScenarioInvariants(scenario: Scenario): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  checkBatteryWindow(scenario, issues);
  checkHousehold(scenario, issues);
  checkTariffBands(scenario, issues);
  return issues;
}
