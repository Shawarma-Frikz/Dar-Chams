import { describe, expect, it } from 'vitest';
import { stateOfCharge } from '../units/state-of-charge.ts';
import { watts } from '../units/energy.ts';
import { parseInstant } from '../time/instant.ts';
import { createEventJournal, type SimulationEventInput } from './events.ts';

const at = parseInstant('2026-06-21T12:00:00+01:00');
const forecastStart = parseInstant('2026-06-21T13:00:00+01:00');
const forecastEnd = parseInstant('2026-06-22T13:00:00+01:00');

const replayInputs = (): SimulationEventInput[] => [
  {
    kind: 'appliance-started',
    timestamp: at,
    stepIndex: 0,
    source: 'scheduler',
    entityId: 'water_heater',
    previousState: 'off',
    nextState: 'on',
    payload: { reason: 'optimized' },
  },
  {
    kind: 'appliance-stopped',
    timestamp: at,
    stepIndex: 0,
    source: 'appliance',
    entityId: 'water_heater',
    previousState: 'on',
    nextState: 'off',
    payload: { reason: 'scheduled' },
  },
  {
    kind: 'soc-threshold-crossed',
    timestamp: at,
    stepIndex: 0,
    source: 'battery',
    entityId: 'home_battery',
    previousState: stateOfCharge(0.31),
    nextState: stateOfCharge(0.24),
    payload: {
      threshold: 'reserve',
      direction: 'crossed_below',
      thresholdSoc: stateOfCharge(0.25),
    },
  },
  {
    kind: 'grid-outage',
    timestamp: at,
    stepIndex: 0,
    source: 'grid',
    entityId: 'site_grid',
    previousState: 'connected',
    nextState: 'islanded',
    payload: { outageId: 'outage-17', reason: 'unexpected' },
  },
  {
    kind: 'grid-return',
    timestamp: at,
    stepIndex: 0,
    source: 'grid',
    entityId: 'site_grid',
    previousState: 'islanded',
    nextState: 'connected',
    payload: { outageId: 'outage-17', reason: 'resynchronized' },
  },
  {
    kind: 'forecast-updated',
    timestamp: at,
    stepIndex: 0,
    source: 'weather',
    entityId: 'site_forecast',
    previousState: 'forecast-v1',
    nextState: 'forecast-v2',
    payload: {
      horizonStart: forecastStart,
      horizonEnd: forecastEnd,
      provenance: 'dataset-derived',
    },
  },
  {
    kind: 'inverter-limit-changed',
    timestamp: at,
    stepIndex: 0,
    source: 'inverter',
    entityId: 'main_inverter',
    previousState: 'within_limit',
    nextState: 'limited',
    payload: {
      requestedPower: watts(2400),
      availableLimit: watts(2000),
      curtailedPower: watts(400),
      reason: 'rated_limit',
    },
  },
  {
    kind: 'optimization-action',
    timestamp: at,
    stepIndex: 0,
    source: 'optimizer',
    entityId: 'action-4',
    previousState: 'proposed',
    nextState: 'scheduled',
    payload: {
      action: 'schedule',
      targetEntityId: 'washing_machine',
      rationale: 'Use forecast PV surplus while preserving battery reserve.',
    },
  },
];

const record = (scenarioId = 'tunis-typical-v1', seed = 2026) => {
  const journal = createEventJournal(scenarioId, seed);
  for (const input of replayInputs()) journal.append(input);
  return journal;
};

describe('simulation event journal', () => {
  it('records every roadmap event family with timestamp, source, entity, states, payload and stable ID', () => {
    const journal = record();
    const events = journal.read();
    expect(journal.size).toBe(8);
    expect(events.map((event) => event.kind)).toEqual([
      'appliance-started',
      'appliance-stopped',
      'soc-threshold-crossed',
      'grid-outage',
      'grid-return',
      'forecast-updated',
      'inverter-limit-changed',
      'optimization-action',
    ]);
    for (const [sequence, event] of events.entries()) {
      expect(event).toMatchObject({
        timestamp: at,
        stepIndex: 0,
        entityId: expect.any(String),
        source: expect.any(String),
        previousState: expect.anything(),
        nextState: expect.anything(),
        payload: expect.any(Object),
        sequence,
        eventId: `dc-event-v1:tunis-typical-v1:2026:${String(sequence).padStart(10, '0')}`,
      });
    }
  });

  it('reproduces identical records and IDs for the same scenario, seed and event order', () => {
    expect(record().read()).toEqual(record().read());
    expect(record('tunis-typical-v1', 2027).read()[0]?.eventId).not.toBe(
      record().read()[0]?.eventId,
    );
    expect(record('tunis-dust-v1', 2026).read()[0]?.eventId).not.toBe(record().read()[0]?.eventId);
  });

  it('returns immutable snapshots and cloned payloads', () => {
    const source = replayInputs()[0];
    if (!source || source.kind !== 'appliance-started') throw new Error('fixture missing');
    const journal = createEventJournal('tunis-typical-v1', 1);
    const recorded = journal.append(source);
    expect(Object.isFrozen(journal.read())).toBe(true);
    expect(Object.isFrozen(recorded)).toBe(true);
    expect(Object.isFrozen(recorded.payload)).toBe(true);
    expect(recorded.payload).not.toBe(source.payload);
    expect(() => ((recorded.payload as { reason: string }).reason = 'manual')).toThrow();
  });

  it('rejects non-transition events and invalid identities without appending them', () => {
    const journal = createEventJournal('tunis-typical-v1', 1);
    const event = replayInputs()[0];
    if (!event || event.kind !== 'appliance-started') throw new Error('fixture missing');
    expect(() =>
      journal.append({
        ...event,
        previousState: 'on' as const,
        nextState: 'on' as const,
      } as unknown as SimulationEventInput),
    ).toThrow(/state change/);
    expect(journal.size).toBe(0);
    expect(() => createEventJournal('   ', 1)).toThrow(/scenarioId/);
    expect(() => createEventJournal('scenario', -1)).toThrow(/seed/);
  });

  it('rejects out-of-order timestamps and step indices', () => {
    const base = replayInputs()[0];
    if (!base || base.kind !== 'appliance-started') throw new Error('fixture missing');
    const journal = createEventJournal('scenario', 1);
    journal.append(base);
    expect(() =>
      journal.append({
        ...base,
        kind: 'appliance-stopped',
        timestamp: parseInstant('2026-06-21T11:59:59+01:00'),
        previousState: 'on',
        nextState: 'off',
      }),
    ).toThrow(/chronological order/);
    expect(journal.size).toBe(1);

    const stepJournal = createEventJournal('scenario', 1);
    stepJournal.append({ ...base, stepIndex: 2 });
    const stop = replayInputs()[1];
    if (!stop || stop.kind !== 'appliance-stopped') throw new Error('fixture missing');
    expect(() => stepJournal.append({ ...stop, stepIndex: 1 })).toThrow(/non-decreasing order/);
    expect(stepJournal.size).toBe(1);
  });

  it('validates SOC threshold direction and crossing values', () => {
    const journal = createEventJournal('scenario', 1);
    const crossing = replayInputs()[2];
    if (!crossing || crossing.kind !== 'soc-threshold-crossed') throw new Error('fixture missing');
    expect(() =>
      journal.append({
        ...crossing,
        previousState: stateOfCharge(0.2),
        nextState: stateOfCharge(0.1),
      }),
    ).toThrow(/do not cross/);
    expect(journal.size).toBe(0);
  });

  it('validates forecast horizons and inverter power magnitudes', () => {
    const journal = createEventJournal('scenario', 1);
    const forecast = replayInputs()[5];
    const inverter = replayInputs()[6];
    if (!forecast || forecast.kind !== 'forecast-updated') throw new Error('forecast missing');
    if (!inverter || inverter.kind !== 'inverter-limit-changed')
      throw new Error('inverter missing');
    expect(() =>
      journal.append({
        ...forecast,
        payload: { ...forecast.payload, horizonEnd: forecast.payload.horizonStart },
      }),
    ).toThrow(/horizon end/);
    expect(() =>
      journal.append({
        ...inverter,
        payload: { ...inverter.payload, curtailedPower: watts(3000) },
      }),
    ).toThrow(/cannot exceed requested power/);
    expect(journal.size).toBe(0);
  });

  it('allows chronological pre-epoch timestamps as valid absolute instants', () => {
    const journal = createEventJournal('historical-run', 0);
    const beforeEpoch = parseInstant('1969-12-31T23:00:00Z');
    const event = replayInputs()[0];
    if (!event || event.kind !== 'appliance-started') throw new Error('fixture missing');
    expect(journal.append({ ...event, timestamp: beforeEpoch }).timestamp).toBe(beforeEpoch);
  });
});
