import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ENGINE_NAME,
  ENGINE_VERSION,
  calculateInverterOutput,
  calculatePvOutput,
  celsius,
  createStepGrid,
  formatZonedInstant,
  parseInstant,
  stepAt,
} from '../packages/engine/src/index.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scenarioPath = resolve(root, 'scenarios/tunis-typical-v1.json');
const outputPath = resolve(root, 'runs/exp-001/summary.json');
const scenarioBytes = await readFile(scenarioPath);
const scenario = JSON.parse(scenarioBytes.toString('utf8'));
const basePv = structuredClone(scenario.pv);
const changedPv = {
  ...structuredClone(scenario.pv),
  soiling_loss: 0.12,
  shading_profile: {
    windows: [{ start: '12:00', end: '13:00', shading_loss: 0.5 }],
  },
};

const withoutControls = (pv) => {
  const comparable = structuredClone(pv);
  delete comparable.soiling_loss;
  delete comparable.shading_profile;
  return comparable;
};
if (JSON.stringify(withoutControls(basePv)) !== JSON.stringify(withoutControls(changedPv))) {
  throw new Error('the paired scenarios differ outside soiling_loss and shading_profile');
}

const start = parseInstant('2026-06-21T09:00:00Z');
const grid = createStepGrid(start, 60, 240);
const planeOfArray = {
  beamWm2: 700,
  skyDiffuseWm2: 80,
  groundReflectedWm2: 20,
  totalWm2: 800,
  incidenceAngleDeg: 20,
  model: 'controlled-experiment-fixed-input-v1',
  approximation: true,
  provenance: 'S',
};
const weatherAt = (instant) => ({
  instant,
  ambientTemperature: celsius(25),
  globalHorizontalIrradianceWm2: 700,
  directNormalIrradianceWm2: 600,
  diffuseHorizontalIrradianceWm2: 100,
  windSpeedMps: 2,
  provenance: 'S',
});

function run(pvConfig) {
  return Array.from({ length: grid.stepCount }, (_, index) => {
    const step = stepAt(grid, index);
    const pv = calculatePvOutput({
      system: pvConfig,
      step,
      site: scenario.site,
      weather: weatherAt(step.start),
      planeOfArray,
      systemDerate: 0.95,
    });
    const inverter = calculateInverterOutput({
      system: scenario.inverter,
      step,
      dcPower: pv.dcPower,
    });
    return {
      utcStart: new Date(Number(step.start)).toISOString(),
      siteLocalStart: formatZonedInstant(step.start, scenario.site.timezone),
      soilingFactor: pv.soilingFactor,
      shadingFactor: pv.shadingFactor,
      dcEnergyWh: pv.dcEnergy,
      acEnergyWh: inverter.acEnergy,
      conversionLossWh: inverter.conversionLoss,
      clippingLossWh: inverter.clippingLoss,
    };
  });
}

const baselineSteps = run(basePv);
const changedSteps = run(changedPv);
const replaySteps = run(changedPv);
if (JSON.stringify(changedSteps) !== JSON.stringify(replaySteps)) {
  throw new Error('replaying the same scenario controls did not reproduce identical output');
}
const total = (steps, key) => steps.reduce((sum, step) => sum + step[key], 0);
const baselineDcWh = total(baselineSteps, 'dcEnergyWh');
const changedDcWh = total(changedSteps, 'dcEnergyWh');
const baselineAcWh = total(baselineSteps, 'acEnergyWh');
const changedAcWh = total(changedSteps, 'acEnergyWh');
const reductionPercent = (baseline, changed) => ((baseline - changed) / baseline) * 100;
const report = {
  experiment: 'EXP-001',
  question:
    'Do explicit soiling and site-local shading controls produce a repeatable PV energy reduction?',
  engine: { name: ENGINE_NAME, version: ENGINE_VERSION },
  scenario: {
    id: scenario.id,
    path: 'scenarios/tunis-typical-v1.json',
    sha256: createHash('sha256').update(scenarioBytes).digest('hex'),
    seed: scenario.simulation.seed,
  },
  fixture: {
    start: '2026-06-21T10:00:00+01:00',
    timestepMinutes: 60,
    steps: 4,
    ambientTemperatureC: 25,
    planeOfArrayIrradianceWm2: 800,
    systemDerate: 0.95,
    weather: 'fixed synthetic input; no random values or provider requests',
  },
  controls: {
    baseline: {
      soilingLoss: basePv.soiling_loss,
      shadingWindows: basePv.shading_profile?.windows ?? [],
      pvConfigurationSha256: createHash('sha256').update(JSON.stringify(basePv)).digest('hex'),
    },
    experiment: {
      soilingLoss: changedPv.soiling_loss,
      shadingWindows: changedPv.shading_profile.windows,
      pvConfigurationSha256: createHash('sha256').update(JSON.stringify(changedPv)).digest('hex'),
    },
    otherPvConfigurationHeldEqual: true,
  },
  result: {
    baselineDcEnergyWh: baselineDcWh,
    experimentDcEnergyWh: changedDcWh,
    dcEnergyReductionPercent: reductionPercent(baselineDcWh, changedDcWh),
    baselineGrossAcEnergyWh: baselineAcWh,
    experimentGrossAcEnergyWh: changedAcWh,
    grossAcEnergyReductionPercent: reductionPercent(baselineAcWh, changedAcWh),
    replayIdentical: true,
  },
  steps: baselineSteps.map((baseline, index) => ({ baseline, experiment: changedSteps[index] })),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`wrote ${outputPath}`);
console.log(`DC energy: ${baselineDcWh.toFixed(3)} Wh → ${changedDcWh.toFixed(3)} Wh`);
console.log(`Gross AC energy: ${baselineAcWh.toFixed(3)} Wh → ${changedAcWh.toFixed(3)} Wh`);
console.log(`Reduction: ${reductionPercent(baselineDcWh, changedDcWh).toFixed(3)}%`);
console.log('Replay identical: yes');
