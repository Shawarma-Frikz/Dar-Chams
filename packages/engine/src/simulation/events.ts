/**
 * Deterministic, append-only events for simulation state transitions.
 * Event IDs use only the scenario identity, run seed and sequence number; no
 * wall clock, randomness or UI state participates in their construction.
 */

import type { Instant } from '../time/instant.ts';
import type { StateOfCharge } from '../units/state-of-charge.ts';
import type { Watts } from '../units/energy.ts';
import type { ProvenanceClass } from '../config/scenario.ts';

interface EventBase<Kind extends string, Source extends string, PreviousState, NextState, Payload> {
  readonly kind: Kind;
  readonly timestamp: Instant;
  readonly stepIndex: number;
  readonly source: Source;
  readonly entityId: string;
  readonly previousState: PreviousState;
  readonly nextState: NextState;
  readonly payload: Payload;
}

export type SimulationEventInput =
  | EventBase<
      'appliance-started',
      'appliance' | 'scheduler' | 'user',
      'off',
      'on',
      { readonly reason: 'scheduled' | 'optimized' | 'manual' | 'safety' }
    >
  | EventBase<
      'appliance-stopped',
      'appliance' | 'scheduler' | 'user',
      'on',
      'off',
      { readonly reason: 'scheduled' | 'optimized' | 'manual' | 'safety' }
    >
  | EventBase<
      'soc-threshold-crossed',
      'battery' | 'scheduler',
      StateOfCharge,
      StateOfCharge,
      {
        readonly threshold: 'reserve' | 'minimum' | 'critical' | 'maximum';
        readonly direction: 'crossed_below' | 'crossed_above';
        readonly thresholdSoc: StateOfCharge;
      }
    >
  | EventBase<
      'grid-outage',
      'grid',
      'connected',
      'islanded',
      { readonly outageId: string | null; readonly reason: 'scheduled' | 'unexpected' }
    >
  | EventBase<
      'grid-return',
      'grid',
      'islanded',
      'connected',
      { readonly outageId: string | null; readonly reason: 'restored' | 'resynchronized' }
    >
  | EventBase<
      'forecast-updated',
      'weather',
      string | null,
      string,
      {
        readonly horizonStart: Instant;
        readonly horizonEnd: Instant;
        readonly provenance: ProvenanceClass;
      }
    >
  | EventBase<
      'inverter-limit-changed',
      'inverter',
      'within_limit' | 'limited',
      'within_limit' | 'limited',
      {
        readonly requestedPower: Watts;
        readonly availableLimit: Watts;
        readonly curtailedPower: Watts;
        readonly reason: 'rated_limit' | 'temperature' | 'availability';
      }
    >
  | EventBase<
      'optimization-action',
      'optimizer' | 'scheduler',
      'proposed' | 'scheduled' | 'dispatched',
      'scheduled' | 'dispatched' | 'cancelled',
      {
        readonly action: 'schedule' | 'reschedule' | 'dispatch' | 'cancel';
        readonly targetEntityId: string;
        readonly rationale: string;
      }
    >;

export type SimulationEvent = SimulationEventInput & {
  readonly eventId: string;
  readonly sequence: number;
};

export interface EventJournal {
  /** Appends a validated event and returns the immutable event with stable ID. */
  append(event: SimulationEventInput): SimulationEvent;
  /** Returns an immutable snapshot in append order. */
  read(): readonly SimulationEvent[];
  readonly size: number;
}

const freezeDeep = <Value>(value: Value): Value => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
  return value;
};

const validateEvent = (event: SimulationEventInput): void => {
  if (!Number.isSafeInteger(event.timestamp)) {
    throw new RangeError('event timestamp must be an integer instant in milliseconds');
  }
  if (!Number.isSafeInteger(event.stepIndex) || event.stepIndex < 0) {
    throw new RangeError(
      `event stepIndex must be a non-negative safe integer, received ${event.stepIndex}`,
    );
  }
  if (!event.entityId.trim()) throw new TypeError('event entityId must not be empty');
  if (Object.is(event.previousState, event.nextState)) {
    throw new TypeError(`event ${event.kind} must describe a state change`);
  }
  if (event.kind === 'soc-threshold-crossed') {
    const { thresholdSoc, direction } = event.payload;
    const validCrossing =
      direction === 'crossed_below'
        ? event.previousState > thresholdSoc && event.nextState <= thresholdSoc
        : event.previousState < thresholdSoc && event.nextState >= thresholdSoc;
    if (!validCrossing) throw new RangeError('SOC event values do not cross the named threshold');
  }
  if (event.kind === 'forecast-updated' && event.payload.horizonStart >= event.payload.horizonEnd) {
    throw new RangeError('forecast horizon end must be later than its start');
  }
  if (event.kind === 'inverter-limit-changed') {
    const { requestedPower, availableLimit, curtailedPower } = event.payload;
    if (
      ![requestedPower, availableLimit, curtailedPower].every(
        (value) => Number.isFinite(value) && value >= 0,
      )
    ) {
      throw new RangeError('inverter event power values must be finite non-negative watts');
    }
    if (curtailedPower > requestedPower) {
      throw new RangeError('inverter curtailed power cannot exceed requested power');
    }
  }
  if (event.kind === 'optimization-action') {
    if (!event.payload.targetEntityId.trim() || !event.payload.rationale.trim()) {
      throw new TypeError('optimization events require a target entity and a non-empty rationale');
    }
  }
};

/**
 * Creates a deterministic event journal for one scenario run. Replaying the
 * same scenario, seed and append order produces byte-identical IDs and records.
 */
export function createEventJournal(scenarioId: string, seed: number): EventJournal {
  if (!scenarioId.trim()) throw new TypeError('event journal scenarioId must not be empty');
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new RangeError(
      `event journal seed must be a non-negative safe integer, received ${String(seed)}`,
    );
  }

  const events: SimulationEvent[] = [];
  const runKey = `${encodeURIComponent(scenarioId)}:${seed}`;

  return {
    get size() {
      return events.length;
    },
    append(input) {
      validateEvent(input);
      const previous = events.at(-1);
      if (previous && input.timestamp < previous.timestamp) {
        throw new RangeError('event timestamps must be appended in chronological order');
      }
      if (previous && input.stepIndex < previous.stepIndex) {
        throw new RangeError('event stepIndex must be appended in non-decreasing order');
      }

      const sequence = events.length;
      const event = freezeDeep({
        ...structuredClone(input),
        eventId: `dc-event-v1:${runKey}:${String(sequence).padStart(10, '0')}`,
        sequence,
      }) as SimulationEvent;
      events.push(event);
      return event;
    },
    read() {
      return Object.freeze([...events]);
    },
  };
}
