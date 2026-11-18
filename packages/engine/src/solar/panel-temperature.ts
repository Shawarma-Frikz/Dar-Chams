/** Simplified NOCT cell-temperature estimate and PV temperature/system derating. */
import type { Pv } from '../config/scenario.ts';
import type { Celsius } from '../units/temperature.ts';
import { celsius } from '../units/temperature.ts';

export interface PanelTemperatureInput {
  readonly ambientTemperature: Celsius;
  readonly planeOfArrayIrradianceWm2: number;
  readonly noctDegC: number;
}

export interface PanelTemperatureEstimate {
  readonly cellTemperature: Celsius;
  readonly model: 'noct-linear-v1';
  readonly approximation: true;
  readonly provenance: 'S';
}

export interface TemperatureDerateInput {
  readonly cellTemperature: Celsius;
  readonly temperatureCoefficientPerDegC: Pv['temperature_coefficient_per_degc'];
  /** Explicit balance-of-system multiplier, in [0, 1]; it does not include separately modeled losses. */
  readonly systemDerate: number;
}

export interface TemperatureDerateResult {
  /** Relative output multiplier at cell temperature, referenced to 25 °C. */
  readonly temperatureFactor: number;
  /** Product of the temperature factor and configured system derate. */
  readonly combinedFactor: number;
  readonly referenceTemperatureDegC: 25;
  readonly model: 'linear-power-temperature-coefficient-v1';
  readonly approximation: true;
  readonly provenance: 'S';
}

const nonNegativeFinite = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and non-negative`);
  }
};

/** Estimate module cell temperature from ambient temperature and POA irradiance using the linear NOCT model. */
export function estimatePanelTemperature(input: PanelTemperatureInput): PanelTemperatureEstimate {
  const { ambientTemperature, planeOfArrayIrradianceWm2: poa, noctDegC } = input;
  if (!Number.isFinite(ambientTemperature) || ambientTemperature < -273.15) {
    throw new RangeError('ambientTemperature must be finite and at or above absolute zero');
  }
  nonNegativeFinite('planeOfArrayIrradianceWm2', poa);
  if (!Number.isFinite(noctDegC) || noctDegC < 30 || noctDegC > 60) {
    throw new RangeError('noctDegC must be finite and between 30 and 60 °C');
  }
  const cellTemperature = celsius(ambientTemperature + ((noctDegC - 20) * poa) / 800);
  return {
    cellTemperature,
    model: 'noct-linear-v1',
    approximation: true,
    provenance: 'S',
  };
}

/** Apply the configured linear Pmax coefficient and a separate system derate at STC reference 25 °C. */
export function calculateTemperatureDerate(input: TemperatureDerateInput): TemperatureDerateResult {
  const { cellTemperature, temperatureCoefficientPerDegC, systemDerate } = input;
  if (!Number.isFinite(cellTemperature) || cellTemperature < -273.15) {
    throw new RangeError('cellTemperature must be finite and at or above absolute zero');
  }
  if (
    !Number.isFinite(temperatureCoefficientPerDegC) ||
    temperatureCoefficientPerDegC > 0 ||
    temperatureCoefficientPerDegC < -0.02
  ) {
    throw new RangeError('temperatureCoefficientPerDegC must be finite and between -0.02 and 0');
  }
  if (!Number.isFinite(systemDerate) || systemDerate < 0 || systemDerate > 1) {
    throw new RangeError('systemDerate must be finite and between 0 and 1');
  }
  const temperatureFactor = Math.max(0, 1 + temperatureCoefficientPerDegC * (cellTemperature - 25));
  const combinedFactor = temperatureFactor * systemDerate;
  if (!Number.isFinite(combinedFactor)) {
    throw new RangeError('temperature derate calculation overflowed a finite result');
  }
  return {
    temperatureFactor,
    combinedFactor,
    referenceTemperatureDegC: 25,
    model: 'linear-power-temperature-coefficient-v1',
    approximation: true,
    provenance: 'S',
  };
}
