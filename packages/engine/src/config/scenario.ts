/**
 * The scenario contract, mirrored from `scenarios/scenario.schema.json`.
 *
 * The schema is authoritative and is enforced at runtime; these interfaces only
 * give the engine a typed view of the document once it has been validated. The
 * two are kept aligned by review, in the same commit as any schema change.
 *
 * Names are the JSON's names, snake_case and unit-suffixed, so a path quoted in
 * an error message can be copied straight into a scenario file.
 */

export type OperatingMode = 'grid_connected' | 'off_grid';
export type Priority = 'critical' | 'important' | 'flexible' | 'discretionary';
export type ApplianceProfile = 'always_on' | 'duty_cycle' | 'schedule' | 'flexible_window';
export type ProvenanceClass = 'synthetic-design' | 'dataset-derived' | 'measured';
export type TimestepMinutes = 5 | 15 | 30 | 60;

export interface TimeWindow {
  readonly start: string;
  readonly end: string;
}

export interface Provenance {
  readonly class: ProvenanceClass;
  readonly notes: string;
}

export interface Site {
  readonly label: string;
  readonly latitude_deg: number;
  readonly longitude_deg: number;
  readonly altitude_m: number;
  readonly timezone: string;
}

export interface Simulation {
  readonly timestep_minutes: TimestepMinutes;
  readonly start: string;
  readonly horizon_hours: number;
  readonly seed: number;
  readonly default_speed_multiplier: number;
}

export interface Tracker {
  readonly enabled: boolean;
  readonly axes: 0 | 1 | 2;
}

export interface Pv {
  readonly installed_dc_kwp: number;
  readonly panel_count: number;
  readonly tilt_deg: number;
  readonly azimuth_deg: number;
  readonly temperature_coefficient_per_degc: number;
  readonly noct_degc: number;
  readonly soiling_loss: number;
  readonly mismatch_loss: number;
  readonly availability: number;
  readonly shading_windows: readonly TimeWindow[];
  readonly tracker: Tracker;
}

export interface Inverter {
  readonly rated_ac_kw: number;
  readonly efficiency: number;
  readonly standby_w: number;
  readonly clipping: boolean;
}

export interface Degradation {
  readonly enabled: boolean;
  readonly annual_capacity_fade: number;
}

export interface Battery {
  readonly chemistry: 'lfp' | 'nmc' | 'lead_acid';
  readonly nominal_capacity_kwh: number;
  readonly initial_soc: number;
  readonly min_soc: number;
  readonly max_soc: number;
  readonly max_charge_kw: number;
  readonly max_discharge_kw: number;
  readonly round_trip_efficiency: number;
  readonly degradation: Degradation;
}

export interface Outage {
  readonly start: string;
  readonly end: string;
}

export interface Grid {
  readonly import_limit_kw: number;
  readonly export_limit_kw: number;
  readonly outages: readonly Outage[];
}

export interface TariffBand {
  readonly up_to_kwh_per_month: number | null;
  readonly price_tnd_per_kwh: number | null;
}

export interface Tariff {
  readonly currency: string;
  readonly verified: boolean;
  readonly source: string;
  readonly import_bands: readonly TariffBand[];
  readonly fixed_monthly_tnd: number | null;
  readonly export_compensation_tnd_per_kwh: number | null;
}

export interface Weather {
  readonly primary_source: 'open-meteo-forecast';
  readonly historical_source: 'open-meteo-era5';
  readonly cache_dir: string;
  readonly refresh_hours: number;
  readonly fallback_order: readonly ('cached' | 'synthetic')[];
}

export interface Room {
  readonly id: string;
  readonly name: string;
  readonly type: 'living' | 'kitchen' | 'bedroom' | 'wet' | 'utility' | 'outdoor' | 'other';
}

export interface Flexibility {
  readonly earliest: string;
  readonly latest: string;
  readonly duration_minutes: number;
  readonly non_interruptible: boolean;
}

export interface Appliance {
  readonly id: string;
  readonly name: string;
  readonly room: string;
  readonly rated_power_w: number;
  readonly priority: Priority;
  readonly controllable: boolean;
  readonly profile: ApplianceProfile;
  readonly duty_cycle?: number;
  readonly schedule?: TimeWindow;
  readonly flexibility?: Flexibility;
  readonly note?: string;
}

export interface Household {
  readonly preset: 'economical' | 'typical' | 'high-consumption' | 'high-flexibility';
  readonly rooms: readonly Room[];
  readonly appliances: readonly Appliance[];
}

export interface BaselinePolicy {
  readonly reserve_soc: number;
  readonly shed_order: readonly Priority[];
  readonly hysteresis_soc: number;
}

export interface SchedulerPolicy {
  readonly reserve_soc: number;
  readonly horizon_hours: number;
  readonly forecast_fallback: 'baseline';
}

export interface Policies {
  readonly baseline: BaselinePolicy;
  readonly scheduler: SchedulerPolicy;
}

export interface Scenario {
  readonly schema_version: '0.1.0';
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly created: string;
  readonly provenance: Provenance;
  readonly site: Site;
  readonly mode: OperatingMode;
  readonly simulation: Simulation;
  readonly pv: Pv;
  readonly inverter: Inverter;
  readonly battery: Battery;
  readonly grid: Grid;
  readonly tariff: Tariff;
  readonly weather: Weather;
  readonly household: Household;
  readonly policies: Policies;
}
