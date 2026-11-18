/** Simplified isotropic transposition from horizontal weather irradiance to a fixed panel plane. */
import type { Pv, Site } from '../config/scenario.ts';
import type { Instant } from '../time/instant.ts';
import type { WeatherFrame } from '../simulation/interfaces.ts';
import { solarPositionAt } from './solar.ts';

/** Candidate default adopted for the Dar Chams model; callers may override it explicitly. */
export const DEFAULT_GROUND_ALBEDO = 0.2;
const GRAZING_COSINE_TOLERANCE = 1e-10;

export interface PlaneOfArrayInput {
  readonly instant: Instant;
  readonly site: Pick<Site, 'latitude_deg' | 'longitude_deg'>;
  readonly array: Pick<Pv, 'tilt_deg' | 'azimuth_deg'>;
  readonly weather: Pick<
    WeatherFrame,
    'globalHorizontalIrradianceWm2' | 'directNormalIrradianceWm2' | 'diffuseHorizontalIrradianceWm2'
  >;
  readonly albedo?: number;
}

export interface PlaneOfArrayIrradiance {
  readonly beamWm2: number;
  readonly skyDiffuseWm2: number;
  readonly groundReflectedWm2: number;
  readonly totalWm2: number;
  /** Sun-to-panel incidence angle, in degrees; 90 means grazing incidence. */
  readonly incidenceAngleDeg: number;
  readonly model: 'isotropic-sky-transposition-v1';
  readonly approximation: true;
  /** Derived estimate provenance; this is never a measured plane-of-array value. */
  readonly provenance: 'S';
}

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const bounded = (name: string, value: number, minimum: number, maximum: number): void => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be finite and between ${minimum} and ${maximum}`);
  }
};

const nonNegative = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and non-negative`);
  }
};

/**
 * Transposes GHI/DNI/DHI onto a fixed array plane using the isotropic-sky model.
 *
 * `DNI × max(0, cos(incidence)) + DHI × (1 + cos(tilt))/2 +
 * GHI × albedo × (1 - cos(tilt))/2`. Cloud influence is already represented by
 * the irradiance inputs and is deliberately not applied a second time.
 */
export function calculatePlaneOfArrayIrradiance(input: PlaneOfArrayInput): PlaneOfArrayIrradiance {
  const { tilt_deg: tilt, azimuth_deg: panelAzimuth } = input.array;
  bounded('array.tilt_deg', tilt, 0, 90);
  if (!Number.isFinite(panelAzimuth) || panelAzimuth < 0 || panelAzimuth >= 360) {
    throw new RangeError('array.azimuth_deg must be finite and in [0, 360)');
  }
  const albedo = input.albedo ?? DEFAULT_GROUND_ALBEDO;
  bounded('albedo', albedo, 0, 1);

  const ghi = input.weather.globalHorizontalIrradianceWm2;
  const dni = input.weather.directNormalIrradianceWm2;
  const dhi = input.weather.diffuseHorizontalIrradianceWm2;
  nonNegative('globalHorizontalIrradianceWm2', ghi);
  nonNegative('directNormalIrradianceWm2', dni);
  nonNegative('diffuseHorizontalIrradianceWm2', dhi);

  const sun = solarPositionAt(input.instant, input.site);
  const elevation = degreesToRadians(sun.elevation_deg);
  const zenith = Math.PI / 2 - elevation;
  const panelTilt = degreesToRadians(tilt);
  const azimuthDifference = degreesToRadians(sun.azimuth_deg - panelAzimuth);
  const cosineIncidence =
    Math.cos(zenith) * Math.cos(panelTilt) +
    Math.sin(zenith) * Math.sin(panelTilt) * Math.cos(azimuthDifference);
  const incidenceAngleDeg = (Math.acos(Math.min(1, Math.max(-1, cosineIncidence))) * 180) / Math.PI;

  // SunCalc gives geometric center elevation after atmospheric refraction; a
  // below-horizon Sun cannot contribute a direct beam to an unshaded module.
  // Numerical tolerance avoids a tiny positive beam caused by roundoff at exact grazing incidence.
  const beamWm2 =
    sun.elevation_deg > 0 && cosineIncidence > GRAZING_COSINE_TOLERANCE ? dni * cosineIncidence : 0;
  const skyDiffuseWm2 = dhi * ((1 + Math.cos(panelTilt)) / 2);
  const groundReflectedWm2 = ghi * albedo * ((1 - Math.cos(panelTilt)) / 2);
  const totalWm2 = beamWm2 + skyDiffuseWm2 + groundReflectedWm2;
  if (
    ![incidenceAngleDeg, beamWm2, skyDiffuseWm2, groundReflectedWm2, totalWm2].every(
      Number.isFinite,
    )
  ) {
    throw new RangeError('plane-of-array calculation overflowed a finite numeric result');
  }

  return {
    beamWm2,
    skyDiffuseWm2,
    groundReflectedWm2,
    totalWm2,
    incidenceAngleDeg,
    model: 'isotropic-sky-transposition-v1',
    approximation: true,
    provenance: 'S',
  };
}
