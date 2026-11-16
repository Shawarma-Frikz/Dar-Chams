# The energy balance

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-16 |
| Phase | 02 (task 02.3) |
| Decided by | DEC-039 |
| Checked by | `node scripts/check-balance.mjs`, or `npm run check` for all checks |
| Related | [API](api.md) · [Quality gates](quality-gates.md) · [Conventions](conventions.md) · [Decision log](decision-log.md) |

Task 02.3 asks for three things: an equation that balances every simulated step, a sign convention chosen and documented, and a numerical tolerance the residual must stay inside. This document states all three. The equation lives in [`packages/engine/src/balance/`](../packages/engine/src/balance/balance.ts); the proof is `scripts/check-balance.mjs`, the ninth register check.

---

## 1 · The identity

For each step, in watt-hours:

```text
pv + gridImport + batteryDischarge =
    load + batteryCharge + gridExport + conversionLoss + batteryLoss + standbyLoss
```

Three supply terms on the left, six demand terms on the right. The roadmap names the same flows and adds "conversion/loss terms"; there are three of those, because they happen in three different places and belong to three different components:

| Term | Where the energy is lost |
| --- | --- |
| `conversionLoss` | the inverter, on every path that crosses it: PV production, battery discharge, battery charge |
| `batteryLoss` | inside the battery, between its terminals and its cells |
| `standbyLoss` | the inverter's own consumption, drawn from the AC bus while it is energised |

Folding them into one number would let a battery's inefficiency be reported as the inverter's, which is exactly the attribution an energy study exists to get right.

## 2 · The sign convention

**Every term is a non-negative magnitude, and the direction is in the name.** Supply terms are energy entering the site; demand terms are energy leaving it. A flow that reverses changes its term, not its sign: there is no `-gridExport`, there is `gridImport`.

The convention buys three things:

- **A sign error cannot cancel another mistake.** Two errors in one signed equation can produce a plausible total; in a two-sided ledger each error changes one side, and the residual doubles rather than disappearing.
- **Every term is reportable.** A provider, a meter or a component can state a magnitude; a signed net flow has to be resolved before it can be shown, and the resolution is where direction gets lost.
- **The residual is the only signed number.** `balanceStep` returns it as a plain `number` — positive is a surplus, negative a shortfall — and it is deliberately not a `WattHours`, because it is not an energy magnitude.

`balanceStep` refuses a negative magnitude and names the term: a `batteryCharge` of `-5` is a programming error, and the message says that a reversed flow changes the term, not the sign. A malformed ledger — a missing term, an unknown key, a non-finite value — throws; a ledger that merely fails to close is reported, so the caller can name the step and let the simulation stop with a diagnosis rather than a stack trace.

## 3 · The terms, and who reports them

| Term | Side | Measured where | Reported by | Excludes |
| --- | --- | --- | --- | --- |
| `pv` | supply | the array's DC terminals | the PV model (phase 03) | the inverter's conversion loss |
| `gridImport` | supply | the meter | the grid model (phase 03) | anything on the house side of the meter |
| `batteryDischarge` | supply | the battery cells | the battery model (phase 04) | the round-trip loss, which is `batteryLoss` |
| `load` | demand | the appliances | the household model (phase 05) | the inverter's standby draw |
| `batteryCharge` | demand | the battery cells | the battery model (phase 04) | the round-trip loss, which is `batteryLoss` |
| `gridExport` | demand | the meter | the grid model (phase 03) | anything on the house side of the meter |
| `conversionLoss` | demand | the inverter | the inverter model (phase 03) | the standby draw, which is its own term |
| `batteryLoss` | demand | inside the battery | the battery model (phase 04) | the inverter, which is `conversionLoss` |
| `standbyLoss` | demand | the AC bus, into the inverter | the engine clock (phase 02.5) | conversion, which is `conversionLoss` |

The measurement points are what make the identity checkable. `inverterConversionLoss(acEnergy, efficiency)` returns `acEnergy × (1 / efficiency - 1)`, the DC energy consumed beyond what the converter delivered; a producer calls it once per path that crosses the inverter and sums the results into `conversionLoss`. Nothing else may be put in that term.

**A term is never invented to close the books.** A solver derives one flow from the others — the grid exports what the site cannot absorb, or the house absorbs what the battery cannot — and that derived term is a real quantity with a limit attached, not a remainder. The reference dispatch in the check names which term it derives in every shape.

## 4 · A worked step

Phase-03 style step with an inverter at 96 % and a battery whose round-trip efficiency is 0.9216, so each direction is 0.96:

| Flow | Energy | Arithmetic |
| --- | --- | --- |
| PV at the array | 1040 Wh | given |
| PV at the bus | 998.4 Wh | `1040 × 0.96` |
| PV conversion loss | 41.6 Wh | `1040 - 998.4` |
| Battery charge at the bus | 200 Wh | given |
| Battery charge at the terminals | 192 Wh | `200 × 0.96` |
| Battery charge in the cells | 184.32 Wh | `192 × 0.96` |
| Battery charge losses | 8 Wh + 7.68 Wh | `200 - 192` + `192 - 184.32` |
| Load | 600 Wh | given |
| Standby | 10 Wh | `5 W × 15 min ÷ 60 × 8`, eight energised steps |
| Export | 188.4 Wh | `998.4 - 600 - 10 - 200` |

```text
supply:  1040                                    = 1040
demand:  600 + 184.32 + 188.4 + 41.6 + 8 + 7.68 + 10 = 1040
```

A discharge step, at night: the cells release 500 Wh, the terminals receive 480 Wh and the bus 460.8 Wh. `batteryLoss` is 20 Wh, `conversionLoss` is 19.2 Wh, and the load plus standby take the 460.8 Wh that reached the bus.

The arithmetic in both examples is exact in decimal; in double precision the two sides of the second example agree to better than 1e-13 Wh, which is why the tolerance below is not zero.

## 5 · The tolerance

```ts
BALANCE_TOLERANCE_WH = 1e-6
```

**Absolute, not relative.** Every term is the result of arithmetic on numbers the scenario already fixed — power × minutes ÷ 60, efficiencies, energies — not a measurement with an uncertainty. A relative tolerance would claim a precision the inputs do not have and would shrink towards zero on a quiet step, where the absolute error does not.

**Where the number comes from.** Nine double-precision sums at magnitudes up to 1e5 Wh carry a rounding error near 1e-10 Wh; 1e-6 Wh leaves four orders of headroom. It is also four orders below the smallest term the shipped scenarios can produce — a 1 W load over a 5-minute step is 0.083 Wh — so a real leak cannot hide inside it. The largest residual observed across the 1224 steps the check settles is 2.27e-13 Wh, eight orders below the tolerance.

**What it is not.** It is not an allowance for a component to lose energy, and it is not a rounding step: a 1 Wh leak is six orders of magnitude beyond it and is refused. The comparison is `≤`, so a residual of exactly the tolerance is accepted.

**Against AC-01.** The acceptance criterion allows a residual of 1 × 10⁻⁶ kWh per step — 1 × 10⁻³ Wh — and a daily sum of 1 × 10⁻⁴ kWh. This ledger's 1 × 10⁻⁶ Wh is a thousand times tighter, and a full Tunisian day of 288 steps at that bound sums to 2.88 × 10⁻⁷ kWh, so a run that passes here clears both AC-01 thresholds with margin.

**The step that fails.** `assertBalanced(terms, stepIndex)` throws `BalanceError` carrying the step index, the two totals, the residual and the tolerance; the message reads `step 37 does not balance: supply 0 Wh, demand 2 Wh, residual -2 Wh beyond ±0.000001 Wh`. The caller can name the instant from its own grid.

## 6 · What the check proves

```text
balance: OK
  identity: pv + gridImport + batteryDischarge = load + batteryCharge + gridExport + conversionLoss + batteryLoss + standbyLoss
  step: 1750 Wh on both sides, residual 0 Wh; a 1 Wh leak is refused and a residual at the tolerance is accepted
  steps: 1224 settled — 3 shipped scenarios, 456 steps of one Tunis day at 5/15/30/60 min, 192 steps across both Paris daylight-saving days
  shapes: 8 reference shapes (pv surplus to the grid; grid covers the house; battery covers the house; pv charges the battery and exports the rest; standby only; night discharge with grid top-up; pv covers the house and charges the battery; standby from the battery), every magnitude a fraction of the scenario's own limits
  tolerance: ±1e-6 Wh; largest residual -2.27e-13 Wh at 2026-06-21 at 60 min, step 5 (night discharge with grid top-up)
  negative: 10 broken ledgers detected (a step one watt-hour short, a step one watt-hour long, a magnitude written negative, a term that is not finite, a ledger missing a term, a term the ledger does not have, a residual beyond the tolerance, an inverter efficiency of zero, an inverter efficiency above one, a step index that is not a whole number)
```

The dispatch is a fixture, not a physical model. Each step of each shipped scenario is settled under one of eight reference shapes, cycling by index; every magnitude is a fraction of the scenario's own declared limits, and every loss is computed from the shipped efficiencies rather than chosen. The eight shapes exist so that each of the nine terms is exercised as a fixed quantity and as the derived one: export is derived in the PV-surplus shape, import in the grid shape, discharge in the off-grid battery shape, charge in the off-grid charging shape. The two off-grid shapes carry no import or export at all, because that scenario declares both limits at zero.

## 7 · What this does not cover yet

- **No physics.** The engine has no PV, battery or household model, so the numbers come from the reference dispatch. From 02.4 each component reports its own terms, and the same `assertBalanced` call runs on their output; the ledger does not change when that happens.
- **No curtailment term.** An off-grid step cannot export, so its PV must exactly equal what the site consumes and stores. A phase-03 PV model that produces more will fail the balance rather than silently lose the surplus — which is the correct failure until curtailment is added as a term by its own decision.
- **Per step, not per run.** A run total is the sum of its steps and inherits the property; no cross-step state is checked here. Battery state of charge is 04's accounting, and it consumes the same charge and discharge magnitudes this ledger fixes.
- **A swapped pair still balances.** The ledger cannot tell import from export if both are reported as magnitudes that happen to total the same. The defence is that each term has one owner and one measurement point (§3), and that every number carries a provenance class (DEC-024).
- **Limits are not enforced here.** The reference dispatch respects the declared kW limits, but the ledger itself checks conservation, not power. A component that exceeds a limit must be caught by its own model, not by this identity.

## 8 · Related decisions

DEC-007 puts the battery behind an energy-bucket model, which is why charge and discharge are cell-side magnitudes here. DEC-012 makes the run deterministic, which is why the tolerance can be arithmetic rather than statistical. DEC-024 gives every term a provenance class when the interface displays it. DEC-039 records this ledger.
