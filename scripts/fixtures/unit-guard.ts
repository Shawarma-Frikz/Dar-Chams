// Deliberately broken calculations for `scripts/check-units.mjs`.
//
// Each line marked "expect TSxxxx" must fail to compile with that diagnostic,
// and no unmarked line may fail. The checker runs tsc over this file; a brand
// that stops separating the quantities removes a diagnostic and fails the
// check, so the proof cannot pass vacuously. The unmarked lines are the
// positive control: they must keep compiling.

import {
  addWattHours,
  addWatts,
  intervalWattHours,
  kilowattHoursFromWattHours,
  percentFromStateOfCharge,
  stateOfCharge,
  wattHours,
  watts,
} from '../../packages/engine/src/index.ts';
import type { StateOfCharge, WattHours, Watts } from '../../packages/engine/src/index.ts';

const power = watts(1000);
const energy = wattHours(500);
const charge = stateOfCharge(0.5);

const totalPower: Watts = addWatts(power, watts(250));
const totalEnergy: WattHours = addWattHours(energy, wattHours(250));
const stepEnergy: WattHours = intervalWattHours(power, 15);
const percent: number = percentFromStateOfCharge(charge);

addWatts(power, energy); // expect TS2345
addWattHours(energy, power); // expect TS2345
kilowattHoursFromWattHours(power); // expect TS2345
intervalWattHours(energy, 15); // expect TS2345
const leakedPower: Watts = power + energy; // expect TS2322
const leakedEnergy: WattHours = energy + power; // expect TS2322
const rawPower: Watts = 1000; // expect TS2322
const rawCharge: StateOfCharge = 0.5; // expect TS2322

export { percent, stepEnergy, totalEnergy, totalPower };
