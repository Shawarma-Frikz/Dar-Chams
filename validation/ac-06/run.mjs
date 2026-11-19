#!/usr/bin/env node
// Replays the frozen Tunis PVGIS 2023 seasonal sample through Dar Chams' fixed-array components.

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  calculateInverterOutput,
  calculatePlaneOfArrayIrradiance,
  calculatePvOutput,
  celsius,
  solarPositionAt,
} from '../../packages/engine/src/index.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const scenarioPath = resolve(root, 'scenarios/tunis-typical-v1.json');
const referencePath = resolve(root, 'validation/ac-06/pvgis-sarah3-tunis-2023.json');
const weatherPath = resolve(root, 'validation/ac-06/pvgis-horizontal-sarah3-tunis-2023.json');
const outputPath = resolve(root, 'validation/ac-06/results-2023.json');
const sampleDays = [
  '2023-03-20',
  '2023-03-21',
  '2023-03-22',
  '2023-06-20',
  '2023-06-21',
  '2023-06-22',
  '2023-09-22',
  '2023-09-23',
  '2023-09-24',
  '2023-12-20',
  '2023-12-21',
  '2023-12-22',
];
const scenarioBytes = await readFile(scenarioPath);
const scenario = JSON.parse(scenarioBytes.toString('utf8'));
const referenceBytes = await readFile(referencePath);
const weatherBytes = await readFile(weatherPath);
const reference = JSON.parse(referenceBytes.toString('utf8'));
const horizontal = JSON.parse(weatherBytes.toString('utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const parseTime = (time) => {
  const match = /^(\d{4})(\d{2})(\d{2}):(\d{2})(\d{2})$/.exec(time);
  if (!match) throw new Error(`Invalid PVGIS timestamp: ${time}`);
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
};
const localDate = (instant) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: scenario.site.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};
const sample = new Set(sampleDays);
const referenceByTime = new Map(reference.outputs.hourly.map((row) => [row.time, row]));
const weatherByTime = new Map(horizontal.outputs.hourly.map((row) => [row.time, row]));
if (referenceByTime.size !== reference.outputs.hourly.length)
  throw new Error('Duplicate PVGIS reference timestamps');
if (weatherByTime.size !== horizontal.outputs.hourly.length)
  throw new Error('Duplicate PVGIS weather timestamps');
if (reference.inputs.meteo_data.radiation_db !== 'PVGIS-SARAH3')
  throw new Error('Unexpected reference radiation database');
if (horizontal.inputs.meteo_data.radiation_db !== reference.inputs.meteo_data.radiation_db)
  throw new Error('PVGIS weather and output radiation databases differ');
if (reference.inputs.pv_module.peak_power !== scenario.pv.installed_dc_kwp)
  throw new Error('Reference DC capacity differs from scenario');
if (reference.inputs.mounting_system.fixed.slope.value !== scenario.pv.tilt_deg)
  throw new Error('Reference tilt differs from scenario');
if (reference.inputs.mounting_system.fixed.azimuth.value !== 0)
  throw new Error('PVGIS reference must be south-facing');
const matchedLossPercent =
  (1 -
    (1 - scenario.pv.soiling_loss) *
      (1 - scenario.pv.mismatch_loss) *
      scenario.pv.availability *
      scenario.inverter.efficiency) *
  100;
if (Math.abs(reference.inputs.pv_module.system_loss - matchedLossPercent) > 0.000001) {
  throw new Error(
    `PVGIS system loss ${reference.inputs.pv_module.system_loss}% does not match scenario equivalent ${matchedLossPercent}%`,
  );
}

const daily = new Map(
  sampleDays.map((date) => [
    date,
    { date, steps: 0, reconstructedSteps: 0, modeledWh: 0, pvgisWh: 0 },
  ]),
);
let maxDaylightSolarElevationDifferenceDeg = 0;
for (const [time, weather] of weatherByTime) {
  const start = parseTime(time);
  const date = localDate(start);
  if (!sample.has(date)) continue;
  const pvgis = referenceByTime.get(time);
  if (!pvgis) throw new Error(`No PVGIS reference output matches irradiance at ${time}`);

  const sun = solarPositionAt(start, scenario.site);
  if (weather.H_sun > 0) {
    maxDaylightSolarElevationDifferenceDeg = Math.max(
      maxDaylightSolarElevationDifferenceDeg,
      Math.abs(sun.elevation_deg - weather.H_sun),
    );
  }
  const horizontalBeam = weather['Gb(i)'];
  const diffuseHorizontal = weather['Gd(i)'];
  const sinElevation = Math.sin((sun.elevation_deg * Math.PI) / 180);
  const dni = sinElevation > 1e-6 ? horizontalBeam / sinElevation : 0;
  const weatherFrame = {
    instant: start,
    ambientTemperature: celsius(weather.T2m),
    globalHorizontalIrradianceWm2: horizontalBeam + diffuseHorizontal,
    directNormalIrradianceWm2: dni,
    diffuseHorizontalIrradianceWm2: diffuseHorizontal,
    windSpeedMps: weather.WS10m,
    provenance: 'X',
  };
  const step = { index: 0, start, end: start + 3_600_000, durationMinutes: 60 };
  const planeOfArray = calculatePlaneOfArrayIrradiance({
    instant: start,
    site: scenario.site,
    array: scenario.pv,
    weather: weatherFrame,
  });
  const pv = calculatePvOutput({
    system: scenario.pv,
    step,
    weather: weatherFrame,
    planeOfArray,
    site: scenario.site,
    systemDerate: 1,
  });
  const inverter = calculateInverterOutput({
    system: scenario.inverter,
    step,
    dcPower: pv.dcPower,
  });
  const day = daily.get(date);
  day.steps += 1;
  day.reconstructedSteps += weather.Int || pvgis.Int ? 1 : 0;
  day.modeledWh += inverter.acEnergy;
  day.pvgisWh += pvgis.P;
}
if (maxDaylightSolarElevationDifferenceDeg > 1) {
  throw new Error(
    `PVGIS UTC timestamp alignment differs from engine solar geometry by ${maxDaylightSolarElevationDifferenceDeg.toFixed(3)}°`,
  );
}

const rawRows = [...daily.values()].map((day) => {
  if (day.steps !== 24)
    throw new Error(`${day.date}: expected 24 hourly inputs, found ${day.steps}`);
  if (day.reconstructedSteps !== 0)
    throw new Error(
      `${day.date}: PVGIS reconstructed ${day.reconstructedSteps} sample(s); investigate before accepting`,
    );
  if (!(day.pvgisWh > 0)) throw new Error(`${day.date}: PVGIS reference energy is zero`);
  const errorWh = day.modeledWh - day.pvgisWh;
  return {
    date: day.date,
    season:
      day.date.slice(5, 7) === '03'
        ? 'spring'
        : day.date.slice(5, 7) === '06'
          ? 'summer'
          : day.date.slice(5, 7) === '09'
            ? 'autumn'
            : 'winter',
    steps: day.steps,
    reconstructedSteps: day.reconstructedSteps,
    modeledWh: day.modeledWh,
    pvgisWh: day.pvgisWh,
    signedBiasPercentRaw: (errorWh / day.pvgisWh) * 100,
    absoluteBiasPercentRaw: (Math.abs(errorWh) / day.pvgisWh) * 100,
  };
});
const rows = rawRows.map((row) => ({
  date: row.date,
  season: row.season,
  steps: row.steps,
  reconstructedSteps: row.reconstructedSteps,
  modeledAcKWh: Number((row.modeledWh / 1000).toFixed(4)),
  pvgisAcKWh: Number((row.pvgisWh / 1000).toFixed(4)),
  signedBiasPercent: Number(row.signedBiasPercentRaw.toFixed(2)),
  absoluteBiasPercent: Number(row.absoluteBiasPercentRaw.toFixed(2)),
}));
const meanAbsoluteDailyBiasPercent =
  rawRows.reduce((sum, row) => sum + row.absoluteBiasPercentRaw, 0) / rawRows.length;
const totalModeledWh = rawRows.reduce((sum, row) => sum + row.modeledWh, 0);
const totalPvgisWh = rawRows.reduce((sum, row) => sum + row.pvgisWh, 0);
const meanAbsoluteErrorWh =
  rawRows.reduce((sum, row) => sum + Math.abs(row.modeledWh - row.pvgisWh), 0) / rawRows.length;
const maxAbsoluteDailyBiasPercent = Math.max(...rawRows.map((row) => row.absoluteBiasPercentRaw));
const result = {
  method:
    'PVGIS-SARAH3 hourly irradiance and temperature replayed through Dar Chams POA, PV and inverter components',
  sampleDays,
  scenario: scenario.id,
  scenarioSha256: sha256(scenarioBytes),
  pvgisReferenceSha256: sha256(referenceBytes),
  pvgisWeatherSha256: sha256(weatherBytes),
  pvgisInputs: reference.inputs,
  weatherInputs: horizontal.inputs,
  systemLossEquivalencePercent: matchedLossPercent,
  modelSystemDerate: 1,
  modelStandbyExcluded: true,
  timezoneAggregation: scenario.site.timezone,
  timestampsInterpretedAsUtc: true,
  maxDaylightSolarElevationDifferenceDeg: Number(maxDaylightSolarElevationDifferenceDeg.toFixed(3)),
  metrics: {
    meanAbsoluteDailyBiasPercent: Number(meanAbsoluteDailyBiasPercent.toFixed(4)),
    meanAbsoluteErrorKWh: Number((meanAbsoluteErrorWh / 1000).toFixed(4)),
    aggregateSignedBiasPercent: Number(
      (((totalModeledWh - totalPvgisWh) / totalPvgisWh) * 100).toFixed(2),
    ),
    maxAbsoluteDailyBiasPercent: Number(maxAbsoluteDailyBiasPercent.toFixed(2)),
    acceptanceThresholdPercent: 15,
    passesBiasThreshold: meanAbsoluteDailyBiasPercent <= 15,
  },
  daily: rows,
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  `AC-06 sample: ${rows.length} local days across ${new Set(rows.map((row) => row.season)).size} seasons`,
);
console.log(
  `Mean absolute daily bias: ${result.metrics.meanAbsoluteDailyBiasPercent}% (limit 15%)`,
);
console.log(`Aggregate signed bias: ${result.metrics.aggregateSignedBiasPercent}%`);
for (const row of rows) {
  console.log(
    `${row.date} ${row.season.padEnd(6)} model ${row.modeledAcKWh.toFixed(4)} kWh | PVGIS ${row.pvgisAcKWh.toFixed(4)} kWh | bias ${row.signedBiasPercent.toFixed(2)}%`,
  );
}
console.log(`Wrote ${outputPath}`);
