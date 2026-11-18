#!/usr/bin/env node
// Proof for task 02.3: the energy-ledger identity closes on every simulated
// step, and a ledger that loses or invents energy is refused.
//
// The identity is exercised on a hand-computed step, then across the real time
// grid of the three shipped scenarios, the four timesteps of one Tunis day and
// the two daylight-saving days in Paris. The numbers in the reference dispatch
// are fractions of each scenario's own declared limits, and every loss is
// computed from the inverter efficiency and the battery round-trip efficiency,
// so the residual measures the arithmetic rather than a hand-picked correction.
//
// Usage: node scripts/check-balance.mjs

import fs from 'node:fs';
import path from 'node:path';

import {
  BALANCE_TERMS,
  BALANCE_TOLERANCE_WH,
  BalanceError,
  assertBalanced,
  balanceStep,
  createScenarioValidator,
  createStepGrid,
  inverterConversionLoss,
  intervalWattHours,
  kilowatts,
  parseInstant,
  siteDayGrid,
  watts,
  wattsFromKilowatts,
  wattHours,
} from '@dar-chams/engine';

const ROOT = path.resolve('.');
const SCENARIOS = path.join(ROOT, 'scenarios');

const problems = [];
const expect = (condition, message) => {
  if (!condition) problems.push(message);
};
const same = (actual, expected, message) => {
  const equal = JSON.stringify(actual) === JSON.stringify(expected);
  expect(equal, `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};
const close = (actual, expected, message) => {
  expect(Math.abs(actual - expected) <= 1e-9, `${message}: expected ${expected}, got ${actual}`);
};

const ledger = (overrides = {}) => ({
  pv: 0,
  gridImport: 0,
  batteryDischarge: 0,
  load: 0,
  batteryCharge: 0,
  gridExport: 0,
  conversionLoss: 0,
  clippingLoss: 0,
  batteryLoss: 0,
  standbyLoss: 0,
  ...overrides,
});

// ---------------------------------------------------------------------------
// 1 · A hand-computed step, and the tolerance around it.
// ---------------------------------------------------------------------------
const worked = ledger({
  pv: 1000,
  gridImport: 500,
  batteryDischarge: 250,
  load: 1100,
  batteryCharge: 400,
  gridExport: 100,
  conversionLoss: 40,
  clippingLoss: 0,
  batteryLoss: 90,
  standbyLoss: 20,
});
const settled = balanceStep(worked);
same(settled.supplyWh, 1750, 'the supply side is pv + import + discharge');
same(settled.demandWh, 1750, 'the demand side is load + charge + export + the three losses');
same(settled.residualWh, 0, 'a worked step has no residual');
expect(settled.balanced, 'a worked step must be balanced');
same(BALANCE_TERMS.length, 10, 'the ledger has ten terms');
same(
  [...BALANCE_TERMS],
  [
    'pv',
    'gridImport',
    'batteryDischarge',
    'load',
    'batteryCharge',
    'gridExport',
    'conversionLoss',
    'clippingLoss',
    'batteryLoss',
    'standbyLoss',
  ],
  'the ledger terms are named in supply-then-demand order',
);

same(
  balanceStep(ledger({ pv: BALANCE_TOLERANCE_WH })).balanced,
  true,
  'a residual at tolerance is accepted',
);
same(
  balanceStep(ledger({ pv: BALANCE_TOLERANCE_WH * 2 })).balanced,
  false,
  'a residual beyond tolerance is refused',
);
const leak = balanceStep(ledger({ pv: 1000, load: 999 }));
same(leak.residualWh, 1, 'an unaccounted watt-hour is a residual');
expect(!leak.balanced, 'an unaccounted watt-hour must not balance');

// ---------------------------------------------------------------------------
// 2 · Conversion loss is arithmetic, not a free parameter.
// ---------------------------------------------------------------------------
close(
  inverterConversionLoss(wattHours(960), 0.96),
  40,
  '960 Wh AC at 96 % costs 40 Wh of conversion',
);
same(inverterConversionLoss(wattHours(0), 0.5), 0, 'no energy, no loss');
same(inverterConversionLoss(wattHours(500), 1), 0, 'a lossless inverter loses nothing');

// ---------------------------------------------------------------------------
// 3 · The reference dispatch: every step of every shipped scenario.
// ---------------------------------------------------------------------------
const TOLERANCE = BALANCE_TOLERANCE_WH;
let settlements = 0;
let maxResidual = 0;
let maxResidualWhere = '';
const shapesUsed = new Set();

const contextFor = (scenario, minutes) => {
  const wh = (kw) => intervalWattHours(wattsFromKilowatts(kilowatts(kw)), minutes);
  return {
    ceiling: wh(scenario.inverter.rated_ac_kw),
    chargeMax: wh(scenario.battery.max_charge_kw),
    dischargeMax: wh(scenario.battery.max_discharge_kw),
    importMax: wh(scenario.grid.import_limit_kw),
    exportMax: wh(scenario.grid.export_limit_kw),
    standby: intervalWattHours(watts(scenario.inverter.standby_w), minutes),
    efficiency: scenario.inverter.efficiency,
    roundTrip: scenario.battery.round_trip_efficiency,
  };
};

// Cells → terminals → inverter → AC bus, for a discharge that must serve `acNeed`.
const dischargeFor = (acNeed, ctx) => {
  const terminal = acNeed / ctx.efficiency;
  const cells = terminal / Math.sqrt(ctx.roundTrip);
  return { cells, conversionLoss: terminal - acNeed, batteryLoss: cells - terminal };
};

// AC bus → inverter → terminals → cells, for `acDrawn` taken from the bus.
const chargeFrom = (acDrawn, ctx) => {
  const terminal = acDrawn * ctx.efficiency;
  const cells = terminal * Math.sqrt(ctx.roundTrip);
  return { cells, conversionLoss: acDrawn - terminal, batteryLoss: terminal - cells };
};

// Array DC → inverter → AC bus, for `acTarget` delivered to the bus.
const pvProducing = (acTarget, ctx) => {
  const dc = acTarget / ctx.efficiency;
  return { dc, conversionLoss: dc - acTarget };
};

const gridShapes = [
  {
    name: 'pv surplus to the grid',
    build: (ctx) => {
      const pv = pvProducing(0.9 * ctx.ceiling, ctx);
      const load = 0.3 * ctx.ceiling;
      return ledger({
        pv: pv.dc,
        load,
        standbyLoss: ctx.standby,
        conversionLoss: pv.conversionLoss,
        gridExport: 0.9 * ctx.ceiling - load - ctx.standby,
      });
    },
  },
  {
    name: 'grid covers the house',
    build: (ctx) => {
      const load = 0.5 * ctx.ceiling;
      return ledger({ load, standbyLoss: ctx.standby, gridImport: load + ctx.standby });
    },
  },
  {
    name: 'battery covers the house',
    build: (ctx) => {
      const load = 0.4 * ctx.ceiling;
      const drawn = dischargeFor(load + ctx.standby, ctx);
      return ledger({
        load,
        standbyLoss: ctx.standby,
        batteryDischarge: drawn.cells,
        conversionLoss: drawn.conversionLoss,
        batteryLoss: drawn.batteryLoss,
      });
    },
  },
  {
    name: 'pv charges the battery and exports the rest',
    build: (ctx) => {
      const pv = pvProducing(0.9 * ctx.ceiling, ctx);
      const stored = chargeFrom(0.3 * ctx.ceiling, ctx);
      const load = 0.2 * ctx.ceiling;
      return ledger({
        pv: pv.dc,
        load,
        standbyLoss: ctx.standby,
        batteryCharge: stored.cells,
        conversionLoss: pv.conversionLoss + stored.conversionLoss,
        batteryLoss: stored.batteryLoss,
        gridExport: 0.9 * ctx.ceiling - load - ctx.standby - 0.3 * ctx.ceiling,
      });
    },
  },
  {
    name: 'standby only',
    build: (ctx) => ledger({ standbyLoss: ctx.standby, gridImport: ctx.standby }),
  },
  {
    name: 'night discharge with grid top-up',
    build: (ctx) => {
      const load = 0.35 * ctx.ceiling;
      const gridImport = 0.15 * ctx.ceiling;
      const drawn = dischargeFor(load + ctx.standby - gridImport, ctx);
      return ledger({
        gridImport,
        load,
        standbyLoss: ctx.standby,
        batteryDischarge: drawn.cells,
        conversionLoss: drawn.conversionLoss,
        batteryLoss: drawn.batteryLoss,
      });
    },
  },
];

const offGridShapes = [
  {
    name: 'pv covers the house and charges the battery',
    build: (ctx) => {
      const pv = pvProducing(0.9 * ctx.ceiling, ctx);
      const stored = chargeFrom(0.3 * ctx.ceiling, ctx);
      // No export and no curtailment term: the house absorbs what the battery does not.
      const load = 0.9 * ctx.ceiling - ctx.standby - 0.3 * ctx.ceiling;
      return ledger({
        pv: pv.dc,
        load,
        standbyLoss: ctx.standby,
        batteryCharge: stored.cells,
        conversionLoss: pv.conversionLoss + stored.conversionLoss,
        batteryLoss: stored.batteryLoss,
      });
    },
  },
  {
    name: 'battery covers the house',
    build: (ctx) => {
      const load = 0.4 * ctx.ceiling;
      const drawn = dischargeFor(load + ctx.standby, ctx);
      return ledger({
        load,
        standbyLoss: ctx.standby,
        batteryDischarge: drawn.cells,
        conversionLoss: drawn.conversionLoss,
        batteryLoss: drawn.batteryLoss,
      });
    },
  },
  {
    name: 'standby from the battery',
    build: (ctx) => {
      const drawn = dischargeFor(ctx.standby, ctx);
      return ledger({
        standbyLoss: ctx.standby,
        batteryDischarge: drawn.cells,
        conversionLoss: drawn.conversionLoss,
        batteryLoss: drawn.batteryLoss,
      });
    },
  },
];

const checkStep = (terms, ctx, where) => {
  for (const [key, value] of Object.entries(terms)) {
    expect(
      Number.isFinite(value) && value >= 0,
      `${where}: ${key} must be a non-negative magnitude, got ${value}`,
    );
  }
  expect(
    terms.gridExport <= ctx.exportMax + TOLERANCE,
    `${where}: export exceeds the declared limit`,
  );
  expect(
    terms.gridImport <= ctx.importMax + TOLERANCE,
    `${where}: import exceeds the declared limit`,
  );
  expect(terms.batteryCharge <= ctx.chargeMax + TOLERANCE, `${where}: charge exceeds the limit`);
  expect(
    terms.batteryDischarge <= ctx.dischargeMax + TOLERANCE,
    `${where}: discharge exceeds the limit`,
  );
  const balance = balanceStep(terms);
  expect(
    balance.balanced,
    `${where}: residual ${balance.residualWh} Wh exceeds the ±${BALANCE_TOLERANCE_WH} Wh tolerance ` +
      `(supply ${balance.supplyWh}, demand ${balance.demandWh})`,
  );
  if (Math.abs(balance.residualWh) > Math.abs(maxResidual)) {
    maxResidual = balance.residualWh;
    maxResidualWhere = where;
  }
  settlements += 1;
};

const schema = JSON.parse(fs.readFileSync(path.join(SCENARIOS, 'scenario.schema.json'), 'utf8'));
const validator = createScenarioValidator(schema);
const readScenario = (name) => JSON.parse(fs.readFileSync(path.join(SCENARIOS, name), 'utf8'));
const shipped = fs
  .readdirSync(SCENARIOS)
  .filter((name) => name.endsWith('.json') && name !== 'scenario.schema.json')
  .sort();

let scenarios = 0;
for (const name of shipped) {
  const checked = validator.check(readScenario(name));
  expect(checked.ok, `${name} should validate before its steps are settled`);
  if (!checked.ok) continue;
  const { scenario } = checked;
  const grid = createStepGrid(
    parseInstant(scenario.simulation.start),
    scenario.simulation.timestep_minutes,
    scenario.simulation.horizon_hours * 60,
  );
  const shapes = scenario.mode === 'off_grid' ? offGridShapes : gridShapes;
  const ctx = contextFor(scenario, scenario.simulation.timestep_minutes);
  for (let index = 0; index < grid.stepCount; index += 1) {
    const shape = shapes[index % shapes.length];
    shapesUsed.add(shape.name);
    checkStep(shape.build(ctx), ctx, `${name} step ${index} (${shape.name})`);
  }
  scenarios += 1;
}

// ---------------------------------------------------------------------------
// 4 · Every timestep of one day, and the two Paris daylight-saving days.
// ---------------------------------------------------------------------------
const typical = validator.check(readScenario('tunis-typical-v1.json'));
expect(typical.ok, 'the typical scenario should validate');
const dayContexts = {};
let daySteps = 0;
let dstSteps = 0;

if (typical.ok) {
  for (const minutes of [5, 15, 30, 60]) {
    const grid = siteDayGrid('2026-06-21', 'Africa/Tunis', minutes);
    const ctx = contextFor(typical.scenario, minutes);
    dayContexts[minutes] = grid.stepCount;
    for (let index = 0; index < grid.stepCount; index += 1) {
      const shape = gridShapes[index % gridShapes.length];
      checkStep(
        shape.build(ctx),
        ctx,
        `2026-06-21 at ${minutes} min, step ${index} (${shape.name})`,
      );
    }
    daySteps += grid.stepCount;
  }

  for (const date of ['2026-03-29', '2026-10-25']) {
    const grid = siteDayGrid(date, 'Europe/Paris', 15);
    const ctx = contextFor(typical.scenario, 15);
    for (let index = 0; index < grid.stepCount; index += 1) {
      const shape = gridShapes[index % gridShapes.length];
      checkStep(shape.build(ctx), ctx, `Paris ${date}, step ${index} (${shape.name})`);
    }
    dstSteps += grid.stepCount;
  }
}

same(
  [dayContexts[5], dayContexts[15], dayContexts[30], dayContexts[60]],
  [288, 96, 48, 24],
  'the Tunis day settles at every timestep',
);
same(dstSteps, 192, 'both Paris daylight-saving days settle');

// ---------------------------------------------------------------------------
// 5 · Negative proofs: each broken ledger must be refused, not repaired.
// ---------------------------------------------------------------------------
const negatives = [];
const rejected = (labelText, action, pattern) => {
  let error = null;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  const passed = error !== null && pattern.test(error.message);
  expect(
    passed,
    `${labelText} must be refused with ${String(pattern)}, got ${error ? `"${error.message}"` : 'no error'}`,
  );
  if (passed) negatives.push(labelText);
};

rejected(
  'a step one watt-hour short',
  () => assertBalanced(ledger({ pv: 1000, load: 999 }), 0),
  /does not balance/,
);
rejected(
  'a step one watt-hour long',
  () => assertBalanced(ledger({ pv: 1000, load: 1001 }), 4),
  /step 4 does not balance/,
);
rejected(
  'a magnitude written negative',
  () => balanceStep(ledger({ load: -5 })),
  /non-negative magnitude/,
);
rejected(
  'a clipping loss written negative',
  () => balanceStep(ledger({ clippingLoss: -1 })),
  /clippingLoss must be a non-negative magnitude/,
);
rejected('a term that is not finite', () => balanceStep(ledger({ pv: Number.NaN })), /finite/);
rejected(
  'a ledger missing a term',
  () => {
    const missing = ledger();
    delete missing.batteryLoss;
    balanceStep(missing);
  },
  /missing batteryLoss/,
);
rejected(
  'a term the ledger does not have',
  () => balanceStep(ledger({ curtailment: 10 })),
  /curtailment is not a step term/,
);
rejected(
  'a residual beyond the tolerance',
  () => assertBalanced(ledger({ pv: BALANCE_TOLERANCE_WH * 3 }), 2),
  /beyond/,
);
rejected(
  'an inverter efficiency of zero',
  () => inverterConversionLoss(wattHours(100), 0),
  /efficiency/,
);
rejected(
  'an inverter efficiency above one',
  () => inverterConversionLoss(wattHours(100), 1.2),
  /efficiency/,
);
rejected(
  'a step index that is not a whole number',
  () => assertBalanced(worked, 1.5),
  /step index/,
);

// The throwing path carries the numbers, not just a message.
let failure = null;
try {
  assertBalanced(ledger({ load: 2 }), 37);
} catch (caught) {
  failure = caught;
}
expect(failure instanceof BalanceError, 'an unbalanced step must throw BalanceError');
if (failure instanceof BalanceError) {
  same(
    [failure.stepIndex, failure.residualWh],
    [37, -2],
    'the error names the step and the residual',
  );
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
if (problems.length > 0) {
  console.error('balance: FAILED');
  for (const problem of problems) console.error(`  x ${problem}`);
  console.error(`\n${problems.length} problem(s) found`);
  process.exit(1);
}

console.log('balance: OK');
console.log(
  '  identity: pv + gridImport + batteryDischarge = load + batteryCharge + gridExport + conversionLoss + clippingLoss + batteryLoss + standbyLoss',
);
console.log(
  '  step: 1750 Wh on both sides, residual 0 Wh; a 1 Wh leak is refused and a residual at the tolerance is accepted',
);
console.log(
  `  steps: ${settlements} settled — ${scenarios} shipped scenarios, ${daySteps} steps of one Tunis day at 5/15/30/60 min, ` +
    `${dstSteps} steps across both Paris daylight-saving days`,
);
console.log(
  `  shapes: ${shapesUsed.size} reference shapes (${[...shapesUsed].join('; ')}), every magnitude a fraction of the scenario's own limits`,
);
console.log(
  `  tolerance: ±${BALANCE_TOLERANCE_WH.toExponential()} Wh; largest residual ` +
    `${Number(maxResidual.toPrecision(3))} Wh at ${maxResidualWhere}`,
);
console.log(`  negative: ${negatives.length} broken ledgers detected (${negatives.join(', ')})`);
