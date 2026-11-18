/** Fixed-array DC production and inverter AC conversion for one simulation step. */
import type { Pv, Site } from '../config/scenario.ts';
import type { Instant } from '../time/instant.ts';
import type { InverterInput, InverterOutput, PvInput, PvOutput } from '../simulation/interfaces.ts';
import { solarPositionAt } from './solar.ts';
import { calculateTemperatureDerate, estimatePanelTemperature } from './panel-temperature.ts';
import { intervalWattHours, wattHours, watts } from '../units/energy.ts';
import { zonedParts } from '../time/zone.ts';

const finiteNonNegative = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and non-negative`);
  }
};

const fraction = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be finite and between 0 and 1`);
  }
};

function shadingLossAt(pv: Pv, site: Site, instant: Instant): number {
  const parts = zonedParts(instant, site.timezone);
  const minuteOfDay = parts.hour * 60 + parts.minute;
  const windows = pv.shading_profile?.windows ?? [];
  let loss = 0;
  for (const window of windows) {
    const [startHour, startMinute] = window.start.split(':').map(Number);
    const [endHour, endMinute] = window.end.split(':').map(Number);
    const start = (startHour ?? 0) * 60 + (startMinute ?? 0);
    const end = (endHour ?? 0) * 60 + (endMinute ?? 0);
    const active =
      start < end
        ? minuteOfDay >= start && minuteOfDay < end
        : minuteOfDay >= start || minuteOfDay < end;
    if (active) loss = Math.max(loss, window.shading_loss);
  }
  return loss;
}

/** Calculates one fixed-array DC output step, preserving each configured multiplier for reporting. */
export function calculatePvOutput(input: PvInput): PvOutput {
  const { system, step, weather, planeOfArray, site, systemDerate } = input;
  finiteNonNegative('installed_dc_kwp', system.installed_dc_kwp);
  finiteNonNegative('planeOfArray.totalWm2', planeOfArray.totalWm2);
  fraction('systemDerate', systemDerate);
  fraction('availability', system.availability);
  fraction('soiling_loss', system.soiling_loss);
  fraction('mismatch_loss', system.mismatch_loss);

  const sunElevationDeg = solarPositionAt(step.start, site).elevation_deg;
  const isNight = sunElevationDeg <= 0;
  const cellTemperature = estimatePanelTemperature({
    ambientTemperature: weather.ambientTemperature,
    planeOfArrayIrradianceWm2: isNight ? 0 : planeOfArray.totalWm2,
    noctDegC: system.noct_degc,
  }).cellTemperature;
  const derate = calculateTemperatureDerate({
    cellTemperature,
    temperatureCoefficientPerDegC: system.temperature_coefficient_per_degc,
    systemDerate,
  });
  const shadingLoss = shadingLossAt(system, site, step.start);
  const factors = {
    temperatureFactor: derate.temperatureFactor,
    systemDerate,
    soilingFactor: 1 - system.soiling_loss,
    mismatchFactor: 1 - system.mismatch_loss,
    shadingFactor: 1 - shadingLoss,
    availabilityFactor: system.availability,
  };
  const stcPower = system.installed_dc_kwp * (isNight ? 0 : planeOfArray.totalWm2);
  const dcPowerValue =
    stcPower *
    factors.temperatureFactor *
    factors.systemDerate *
    factors.soilingFactor *
    factors.mismatchFactor *
    factors.shadingFactor *
    factors.availabilityFactor;
  if (!Number.isFinite(dcPowerValue)) {
    throw new RangeError('PV DC power calculation overflowed a finite result');
  }
  const dcPower = watts(dcPowerValue);
  return {
    dcPower,
    dcEnergy: intervalWattHours(dcPower, step.durationMinutes),
    cellTemperature,
    ...factors,
  };
}

/** Converts array DC power to AC power while preserving inverter, clipping and standby losses. */
export function calculateInverterOutput(input: InverterInput): InverterOutput {
  const { system, step, dcPower } = input;
  finiteNonNegative('dcPower', dcPower);
  if (!Number.isFinite(system.rated_ac_kw) || system.rated_ac_kw <= 0) {
    throw new RangeError('rated_ac_kw must be finite and greater than zero');
  }
  if (!Number.isFinite(system.efficiency) || system.efficiency <= 0 || system.efficiency > 1) {
    throw new RangeError('inverter efficiency must be finite and in (0, 1]');
  }
  finiteNonNegative('standby_w', system.standby_w);
  const ratedAcW = system.rated_ac_kw * 1000;
  if (!Number.isFinite(ratedAcW)) {
    throw new RangeError('rated AC power conversion overflowed');
  }
  const unconstrainedAcW = dcPower * system.efficiency;
  const exceedsRating = unconstrainedAcW > ratedAcW;
  if (exceedsRating && !system.clipping) {
    throw new RangeError(
      'PV input would exceed inverter rated AC capacity while clipping is disabled',
    );
  }
  const acPower = watts(Math.min(unconstrainedAcW, ratedAcW));
  const acEnergy = intervalWattHours(acPower, step.durationMinutes);
  const conversionLoss = wattHours(acEnergy * (1 / system.efficiency - 1));
  const acceptedDcPowerW = acPower / system.efficiency;
  const clippingLoss = intervalWattHours(
    watts(Math.max(0, dcPower - acceptedDcPowerW)),
    step.durationMinutes,
  );
  const standbyLoss = intervalWattHours(watts(system.standby_w), step.durationMinutes);
  return { acPower, acEnergy, conversionLoss, clippingLoss, standbyLoss };
}

/** Builds a reusable pure PV component for the 02.4 port. */
export function createPvModel(): { evaluate(input: PvInput): PvOutput } {
  return { evaluate: calculatePvOutput };
}

/** Builds a reusable pure inverter component for the 02.4 port. */
export function createInverterModel(): { convert(input: InverterInput): InverterOutput } {
  return { convert: calculateInverterOutput };
}
