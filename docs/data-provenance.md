# Simulation truth, provenance and the metric contract

| Field | Value |
| --- | --- |
| Version | 0.3.0 |
| Date | 2026-11-16 |
| Phase | 00 (task 00.5); embedded metrics added by DEC-027 |
| Register | [`metric-register.json`](metric-register.json) — every value the interface may display |
| Checked by | `scripts/check-provenance.mjs` (CI from phase 01.5) |
| Related | [Requirements](requirements.md) NFR-07 · [Checklist](acceptance-checklist.md) AC-20, AC-28, AC-32 · [Decision log](decision-log.md) DEC-019, DEC-024, DEC-027 |

**No value describing the installation in Helios v1 is a measurement.** The first release models a virtual installation; every generation, consumption and state figure it shows is simulated, forecast, external, inferred, derived or configured. The only class M values are three bench-node channels behind a hardware gate, and they describe the room the node sits in, never the plant. This document defines the categories, the register that enumerates every displayed metric, the rules that label it, and the claims the project may and may not make with it.

---

## 0 · What this document fixes

- A value that is not in the register is not displayed. Adding a metric means editing the register and running the checker, not adding a widget.
- Every displayed value carries a class, a source, a unit and, where relevant, its inputs, issue time or gate.
- Simulated is never presented as measured. Unverified economics are disabled, not estimated.

The register is machine-readable because a labelling rule that lives only in prose does not survive contact with a dashboard. The document is generated from the register where tables are concerned, so the two cannot drift.

---

## 1 · Why this is engineering, not captioning

- It prevents the most common overclaim in a simulation project ("our system produced X kWh").
- It makes the policy comparison meaningful: both controllers are labelled the same way, so a difference cannot come from one side being described more favourably.
- It tells the reader exactly which conclusions the evidence supports — and the project's credibility rests on that boundary.
- It is testable: classes, units, gates and inputs are fields, and a script checks them.

---

## 2 · What a number is: the seven classes

### 2.1 Classes

| Code | Shown as | Definition | It is **not** | In v1 |
| --- | --- | --- | --- | --- |
| **M** | Measured | Read from a physical sensor on a real installation, with device identity and acquisition time. | A model output, however accurate. | Bench node only (3 channels, behind `hardware.node`) |
| **X** | External | Supplied by a third party's product: forecast API, reanalysis archive, reference dataset, tariff document. | Measured by us; produced by our model. | Weather inputs (6 metrics) |
| **S** | Simulated | Produced by a Helios model of the virtual installation: astronomy, weather generator, PV physics, battery, loads, grid, controller output. Ground truth *inside the simulation*. | Evidence about the real world. | 25 metrics |
| **F** | Forecast | A prediction for an instant after its issue time; carries issue time and horizon. | An observed or simulated value for that instant. | 3 metrics |
| **E** | Inferred | The twin's belief about a state it cannot observe directly, or a controller's expectation. | Ground truth; a probability. | 7 metrics |
| **D** | Derived | Computed from other registered metrics for analysis or presentation: totals, ratios, loss attribution, costs, diagnostics, comparisons, forecast errors. Names its inputs. | A new model output. | 33 metrics |
| **C** | Configured | Declared in the scenario: limits, thresholds, setpoints, seed, speed, installation geometry. An input to the run, not a result. | A value the model produced. | 20 metrics |
| **M / S** | Measured or simulated | The same bench channel, from two sources: the Wokwi simulator supplies S, the physical node supplies M inside its declared validity range. | Plant measurement; a calibrated irradiance sensor. | 3 metrics |

Weather metrics carry `X / S` because the same field is external when a provider supplies it and synthetic when the fallback does; the run manifest records which one was active. The three bench-node channels carry `M / S` for the same reason, resolved by the run's `source_mode`: Wokwi values stay simulated, and only the physical node produces class M. No other metric has more than one class.

### 2.2 Choosing a class

Apply these questions in order. The first match wins.

1. Is it read from a sensor on a real installation? → **M**, and only from the physical bench node inside a `hardware.*` gate (impossible for any plant channel in v1).
2. Was it supplied by an external product, without passing through a Helios model? → **X**.
3. Does it predict an instant after its issue time? → **F**.
4. Is it a belief about state that is not directly observed, or a controller's expectation? → **E**.
5. Is it declared in the scenario file? → **C**.
6. Is it produced by a model of the virtual installation? → **S**.
7. Is it computed from other registered metrics? → **D**.

If no question matches, the value has no honest label and must not be displayed.

### 2.3 Simulated versus derived: the boundary that is usually blurred

The distinction is **the engine's world versus analysis of a run**, not "physics versus arithmetic". Both may contain formulas.

| Value | Class | Why |
| --- | --- | --- |
| PV DC power | S | Modelled physical output of the array. |
| PV interval energy | S | Engine accounting for the step, atom of the balance. |
| PV daily energy | D | Sum of published intervals. |
| Household load power | S | Engine accounting, even though it is exactly the sum of appliance contributions (FR-LOD-04). |
| Room load | D | Display subtotal over appliance metrics. |
| Battery SOC | S | State variable of the model. |
| Battery throughput | D | Analysis over the energy series; a wear proxy. |
| Energy balance residual | D | Diagnostic over the step's metrics. |
| Forecast error | D | Comparison of an F metric with an S metric. |
| Expected effect of an action | E | The controller's belief, stored with the decision. |

Rule of thumb: if deleting the dashboard would still leave the number inside the engine's state or accounting, it is **S**; if it exists only because someone asked for a summary, it is **D**.

### 2.4 Composition and availability

- Every **D** metric lists its inputs by ID. The interface shows the D badge plus the badges of the input classes in its tooltip, so a derived value is never described more strongly than what it was computed from.
- A derived metric cannot be more available than its least available input. `MET-57` (net cost) is disabled because `MET-55` and `MET-56` are; the checker enforces this for the whole register rather than trusting review.
- **E** values carry a caveat in the same panel: what they are, and what they are not.
- **C** values are inputs: limits and thresholds are drawn as reference lines, capacity and geometry appear in the installation summary, and none of them is summed into results.

### 2.5 Mapping the roadmap's four words

| Roadmap term | Classes in this contract | Wording rule |
| --- | --- | --- |
| Estimated energy | **S** (and **D** for totals over it) | Displayed as "simulated"; the report may say "estimated by simulation", never "measured". |
| Forecast values | **F** | Always with issue time and horizon. |
| Measured values | **M** | Only the bench-node channels behind `hardware.node` (DEC-027); plant channels stay impossible. |
| Derived values | **D** | With inputs listed; no stronger claim than its inputs. |

Three extra classes are required because the roadmap's four terms do not cover them: **X** (weather is neither measured by us nor simulated by us), **E** (the twin's belief about unobserved state is not ground truth) and **C** (a configured limit is not a result). Keeping them separate is what makes the four main labels honest.

### 2.6 One trace, end to end

| Step | Metric | Class | What the interface shows |
| --- | --- | --- | --- |
| 1 | Global horizontal irradiance | X (or S on fallback) | `812 W/m² · External — Open-Meteo ERA5` |
| 2 | Plane-of-array irradiance | S | `941 W/m² · Simulated — transposition, 30° / 180°` |
| 3 | Cell temperature | S | `48.2 °C · Simulated — NOCT model` |
| 4 | PV DC power | S | `2.61 kW · Simulated — PV model` |
| 5 | PV AC power | S | `2.49 kW · Simulated — inverter 96 %` |
| 6 | PV interval energy | S | `0.62 kWh · Simulated — 15 min interval` |
| 7 | PV daily energy | D | `11.84 kWh · Derived — 96 intervals, 20 Mar 2026` |
| 8 | Grid import cost | D | *Disabled — tariff unverified (FR-GRD-03)* |

A reader can follow eight steps and never see a claim of measurement. That is the whole contract in one table.

---

## 3 · Labels in the interface, exports and report

### 3.1 Anatomy of a label

Every displayed value is a `Reading` with these fields:

| Field | Required | Purpose |
| --- | --- | --- |
| `label` | always | Human name, from the register. |
| `value` | always | Canonical value (W, Wh, °C, 0–1 or %, per FR-SIM-03). |
| `unit` | always | Canonical unit; non-numeric values use a declared token. |
| `class` | always | The active class for this run, shown as a word and a letter. |
| `source` | always | Provider or model, with version where one exists. |
| `interval` | for series | Step length, or start and end of the range. |
| `issue time`, `horizon` | for **F** | When the forecast was made and how far ahead it reaches. |
| `inputs` | for **D** | The metrics it was computed from. |
| `availability` | always | Available, conditional on a scenario field, or disabled with a reason. |
| `run` | always | Scenario ID, seed, engine version — from the manifest. |

### 3.2 Rendering rules

1. Every displayed number, percentage, ratio, timestamp, count and state — screen, chart, tooltip, table, export, print, report caption — is a `Reading`. A bare number is a bug.
2. The unit is never hidden, including for percentages, states and ratios. "Unitless" is a declared unit, not an absence.
3. The class is shown as a word ("Simulated", "Forecast", "Configured"), not only as a letter or a colour.
4. The source is visible or one focus/hover away, naming the provider or model.
5. A forecast shows its issue time and horizon beside the badge.
6. A derived value lists its inputs in the tooltip and is never worded more strongly than they allow.
7. A total shows the interval count and the range it covers; a ratio shows its denominator.
8. A disabled metric shows its gate and the reason, and no placeholder number.
9. A configured value is drawn as a dashed reference line or a slider position, never styled like data.
10. Display precision comes from the register; a widget may not override it.
11. Exports carry the descriptor columns and the run manifest; printed views repeat the badges rather than dropping them.
12. A value without a descriptor fails visibly in development and is not rendered in production. There is no fallback number and no default class.

### 3.3 Configured values

Limits, thresholds, reserves, seeds, speed multipliers, capacity and array geometry are inputs, not results. They are labelled `C · Configured`, name the scenario field they came from, are drawn distinctly (dashed reference line, slider position or installation summary), and are excluded from every sum. Changing one starts a new run; it never mutates a stored run (FR-UX-06).

### 3.4 Forecasts

- Issued values are plotted with a lighter, dashed style and labelled `F · Forecast — issued 06:00, +18 h`.
- A forecast series is never placed on an axis labelled "observed", and never silently paired with ground truth. When both appear, both are labelled.
- Forecast errors are **D** metrics computed from F and S series; the error chart states both classes and the sample count (FR-FCT-05).
- A missing or stale forecast triggers the documented fallback (FR-EMS-10), which is logged and visible; it does not become a gap in the chart.

### 3.5 Disabled metrics

A metric whose gate is closed is rendered as a labelled absence: name, badge, gate and reason, with a link to the open item. Examples in v1: cost and compensation until the STEG tariff is cited (FR-GRD-03), avoided CO₂ until an emission factor is cited. Enabling a disabled metric requires the data change and a decision-log entry; it is never a display toggle.

### 3.6 Display precision

The register carries `decimals` per metric; the table in §5 is authoritative. These are the defaults it encodes:

| Quantity | Canonical | Display | Note |
| --- | --- | --- | --- |
| Power | W | kW, 2 dp (small appliances: W, 0 dp) | No watt-level precision is implied for a modelled house. |
| Interval energy | Wh | kWh, 2 dp (small appliances: Wh, 0 dp) | Matches the 15-minute step. |
| Temperature | °C | 1 dp | The thermal model does not justify more. |
| Irradiance | W/m² | 0 dp | Provider resolution is coarser than 1 W/m². |
| SOC | % | 1 dp | The window is configured in whole percent. |
| Angles | ° | 1–2 dp | Solar position is checked to 0.5° (FR-PV-02). |
| Ratios | ratio | 2 dp | Percentages are displayed when the denominator is sensible. |
| Forecast error | W | 0 dp | Always with the sample count. |
| Cost | TND | 3 dp | Disabled in v1. |
| CO₂ | kg | 1 dp | Disabled in v1. |
| Latency | h | whole minutes | Detection is evaluated in simulated time. |

### 3.7 Exports and printed views

CSV and JSON exports include, per row or series: `metric_id`, `label`, `value`, `unit`, `class`, `source`, `inputs`, `interval_start`, `interval_end`, and the run manifest fields (scenario ID, scenario hash, seed, engine version, data provenance). The printed view carries the same badges as the screen and the same manifest block. An export that cannot be traced back to a scenario and seed is a defect (FR-UX-08, NFR-03).

### 3.8 Words

| Do not write | Why | Write instead |
| --- | --- | --- |
| measured, real, actual, live, observed, metered (for X/S/F/E/D/C) | Asserts class M | simulated, modelled, forecast, external, derived, configured |
| production data, consumption data | Implies metering | simulated generation, simulated demand |
| savings | Economic claim without a verified tariff | modelled change in grid import, with the tariff status |
| accurate twin, validated model | Validation claim without hardware | agreement with PVGIS (model-to-model), within 15 % |
| AI decides | Unfalsifiable | the scheduler selects … with reason code … |
| prediction (for an S value) | Conflates F with S | simulated value |
| smart, intelligent (as a claim) | Unverifiable | the named policy and its stated rule |

Required words: **simulated**, **forecast** (with issue time), **external** (with provider), **derived** (with inputs), **configured** (with scenario field), **inferred** (with caveat). A caption, badge or report sentence that cannot use one of these words is describing something the project did not do.

### 3.9 Charts and the 3D twin

- Every series carries its class in the legend or axis area; every figure caption states the class of the plotted data.
- Forecast and configured series use distinct line styles, not only distinct colours.
- The 3D flow width and speed map to registered power readings (MET-13, MET-27, MET-45, MET-46); at zero power the flow is inactive (FR-TWN-02). Tooltips show the `Reading`, not a bare number.
- Decorative lighting is labelled "decorative" and is not presented as a simulated or measured quantity (FR-TWN-04).
- The 2D map exposes the same states and readings as the 3D scene; disabling 3D removes no value (FR-UX-10, FR-TWN-05).

---

## 4 · Code contract

The interface is not allowed to invent a class, a unit or a source. It renders a descriptor that the engine or the adapter produced.

### 4.1 Types (introduced in phase 02, enforced in phase 09)

```ts
export type ProvenanceClass = 'M' | 'X' | 'S' | 'F' | 'E' | 'D' | 'C';
export type MetricId = `MET-${string}`;

export type Availability =
  | { status: 'available' }
  | { status: 'conditional'; gate: string }
  | { status: 'disabled'; gate: string; reason: string };

export interface MetricDescriptor {
  readonly id: MetricId;
  readonly label: string;
  readonly unit: string;           // canonical unit (FR-SIM-03)
  readonly class: ProvenanceClass; // active class for this run
  readonly source: string;
  readonly inputs?: readonly MetricId[];
  readonly intervalMinutes?: number;
  readonly issueTime?: string;     // required when class === 'F'
  readonly horizonHours?: number;  // required when class === 'F'
  readonly availability: Availability;
}

export interface Reading {
  readonly descriptor: MetricDescriptor;
  readonly value: number | string;
}
```

`formatReading(reading)` is the only formatter in the application: it applies the register's precision, unit conversion at the display boundary (DEC-004) and badge text. No component may call `toFixed`, `Intl.NumberFormat` or a bare template literal on a simulated value.

### 4.2 Where each class is assigned

| Producer | Assigns | Note |
| --- | --- | --- |
| Weather adapter | X, or S on fallback | One class per series, recorded in the manifest. |
| Scenario loader | C | Limits, reserves, seed, speed. |
| Solar-position, PV, battery, load, grid and controller models | S | Model outputs and engine accounting. |
| Forecast service | F | Requires issue time and horizon at construction. |
| Detector and decision record | E | Belief about unobserved state; caveat attached. |
| Selectors, aggregates, comparisons, report tables | D | Must list inputs; cannot be more available than them. |
| Embedded adapter (bench node) | M, or S from Wokwi | Only behind a `hardware.*` gate, only the three bench channels (FR-EMB-06). |

### 4.3 Fail-closed rules

- Missing descriptor → development error; production renders a visible "unlabelled value blocked" state, never a number.
- Unknown class → impossible by type; a runtime guard rejects it anyway.
- Missing unit → rejected at construction, not defaulted.
- Class F without issue time or horizon → rejected at construction.
- Class D without inputs → rejected at construction.
- Class M without a `hardware.*` availability gate → rejected by `check-provenance.mjs` and by the contract test.
- A metric that is not in the register → rejected by the contract test in phase 09.

### 4.4 Enforcement map

| Phase | Artifact | Check |
| --- | --- | --- |
| 00 (now) | This document, `metric-register.json` | `node scripts/check-provenance.mjs` |
| 01.5 | CI | Runs the checker; a stale table or an unregistered metric fails the build |
| 02.x | Engine types and tests | Every emitted series has a descriptor; no class M can be constructed |
| 03.x | Weather adapter tests | Provider series are X, fallback series are S, both labelled |
| 06.x | Controller and comparison tests | Actions carry reason code and expectation (E); paired runs carry the same manifest |
| 09.x | UI contract test and ESLint rule | Every numeric render goes through `formatReading`; no raw number; badge and unit present |
| 09.x | Export tests | Descriptor and manifest columns present and resolvable |
| 10.x | Bundle and report scan | Prohibited words absent; no economic metric enabled with an unverified tariff |
| 11.x | Report review | Every figure caption states the class; claims table (§7) respected |

---

## 5 · Metric register

The register is the complete list of values the interface may display. It is edited as JSON; this section is generated from it. If a screen needs a number that is not here, the answer is to register the metric first — with its class, unit, source and gate — not to render it.

| Register | Count |
| --- | --- |
| Registered metrics | 97 |
| Always available | 83 |
| Conditional | 10 |
| Disabled by a data gate | 4 |
| Derived (D) | 33 |
| Simulated (S) | 25 |
| Configured (C) | 20 |
| Weather (X / S) | 6 |
| Inferred (E) | 7 |
| Forecast (F) | 3 |
| Measured (M) | 0 |
| Measured or simulated (M / S) | 3 |

<!-- metric-register:start -->
_Generated from [`metric-register.json`](metric-register.json) by `scripts/check-provenance.mjs`. Do not edit these tables by hand; edit the JSON and run `node scripts/check-provenance.mjs --write`._

#### Weather and solar geometry

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-01 | Global horizontal irradiance | W/m² | X / S | Open-Meteo forecast or ERA5 reanalysis; seeded synthetic generator when neither is available (NFR-11). | — | Always | W/m² · 0 dp |
| MET-02 | Direct normal irradiance | W/m² | X / S | Open-Meteo forecast or ERA5 reanalysis; synthetic fallback as for MET-01. | — | Always | W/m² · 0 dp |
| MET-03 | Diffuse horizontal irradiance | W/m² | X / S | Open-Meteo forecast or ERA5 reanalysis; synthetic fallback as for MET-01. | — | Always | W/m² · 0 dp |
| MET-04 | Ambient temperature | °C | X / S | Open-Meteo forecast or ERA5 reanalysis; synthetic fallback as for MET-01. | — | Always | °C · 1 dp |
| MET-05 | Wind speed at 10 m | m/s | X / S | Open-Meteo forecast or ERA5 reanalysis; synthetic fallback as for MET-01. | — | Always | m/s · 1 dp |
| MET-06 | Cloud cover | % | X / S | Open-Meteo forecast or ERA5 reanalysis; synthetic fallback as for MET-01. | — | Always | % · 0 dp |
| MET-07 | Plane-of-array irradiance | W/m² | S | Simplified transposition from GHI, DNI and DHI plus panel tilt and azimuth; an approximation labelled in code and report (FR-PV-03). | MET-01, MET-02, MET-03 | Always | W/m² · 0 dp |
| MET-08 | Cell temperature | °C | S | NOCT-type thermal model from ambient temperature, plane-of-array irradiance and wind speed. | MET-04, MET-07, MET-05 | Always | °C · 1 dp |
| MET-09 | Sun elevation | ° | S | Solar-position algorithm (SunCalc or a validated equivalent) evaluated at the simulation instant for the site coordinates. | — | Always | ° · 2 dp |
| MET-10 | Sun azimuth | ° | S | Solar-position algorithm evaluated at the simulation instant for the site coordinates. | — | Always | ° · 1 dp |
| MET-11 | Daylight state | state | S | Derived from sun-elevation thresholds; drives day/night rendering and forces zero PV at night (FR-PV-06). | MET-09 | Always | state |

#### Photovoltaic array

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-12 | PV DC power | W | S | POA irradiance × installed DC capacity × temperature factor × (1 − soiling) × (1 − mismatch) × shading × availability. | MET-07, MET-08 | Always | kW · 2 dp |
| MET-13 | PV AC power | W | S | min(DC × inverter efficiency, rated AC power); zero at night and never negative (FR-PV-06). | MET-12 | Always | kW · 2 dp |
| MET-14 | PV interval energy | Wh | S | AC power × interval length, integrated to the step boundary. | MET-13 | Always | kWh · 2 dp |
| MET-15 | PV daily energy | kWh | D | Sum of PV interval energy over one site-day (midnight to midnight, site timezone). | MET-14 | Always | kWh · 2 dp |
| MET-16 | Specific yield | kWh/kWp | D | PV daily energy ÷ installed DC capacity. | MET-15 | Always | kWh/kWp · 2 dp |
| MET-17 | Performance ratio | ratio | D | Actual yield ÷ reference yield (POA energy × installed capacity). | MET-15, MET-07 | Always | ratio · 2 dp |
| MET-18 | Soiling loss | Wh | D | Energy removed by the configured soiling fraction; one row of the loss breakdown (FR-PV-05). | MET-12 | Always | kWh · 2 dp |
| MET-19 | Shading loss | Wh | D | Loss from configured shading windows, applied at the timestep. | MET-12 | Always | kWh · 2 dp |
| MET-20 | Mismatch loss | Wh | D | Loss from the configured module-mismatch fraction. | MET-12 | Always | kWh · 2 dp |
| MET-21 | Availability loss | Wh | D | Loss from the configured availability fraction (planned and unplanned downtime). | MET-12 | Always | kWh · 2 dp |
| MET-22 | Temperature derating loss | Wh | D | Difference between output at the stated cell temperature and output at 25 °C, using the configured temperature coefficient. | MET-12, MET-08 | Always | kWh · 2 dp |
| MET-23 | Inverter conversion loss | Wh | D | DC energy minus AC energy plus configured standby consumption (FR-BAT-05). | MET-12, MET-13 | Always | kWh · 2 dp |
| MET-24 | Clipping loss | Wh | D | DC energy that exceeds the inverter AC limit while clipping is enabled. | MET-12, MET-13 | Always | kWh · 2 dp |
| MET-25 | Tracker actuator energy | Wh | S | Energy consumed by tracker actuators, from the configured axis count and actuation profile (FR-PV-09). | — | Only when `tracking.enabled` | Wh · 0 dp |
| MET-26 | Tracking net gain | % | D | Additional harvest minus actuator energy, divided by fixed-tilt harvest. | MET-14, MET-25 | Only when `tracking.enabled` | % · 1 dp |

#### Battery and inverter

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-27 | Battery power | W | S | Signed dispatch power, positive for discharge, applied to the energy-bucket battery model (DEC-007). | — | Always | kW · 2 dp |
| MET-28 | Battery state of charge | % | S | Previous SOC plus charge minus discharge with round-trip efficiency, clamped to the usable window (FR-BAT-02). | — | Always | % · 1 dp |
| MET-29 | Battery interval energy | Wh | S | Charge or discharge energy over the interval, after applying efficiency. | — | Always | kWh · 2 dp |
| MET-30 | Battery throughput | kWh | D | Sum of absolute charge plus absolute discharge over the run. | MET-29 | Always | kWh · 1 dp |
| MET-31 | Battery round-trip loss | Wh | D | Energy drawn from the battery minus energy delivered back, at the configured round-trip efficiency. | MET-29 | Always | kWh · 2 dp |
| MET-32 | Battery capacity fade proxy | % | E | Optional linear capacity-fade proxy from the configured annual fade rate. | — | Only when `degradation.enabled` | % · 1 dp |
| MET-33 | Reserve SOC | % | C | Policy threshold read from the scenario (baseline or scheduler reserve). | — | Always | % · 0 dp |
| MET-34 | Minimum SOC | % | C | Usable-window lower bound read from the scenario. | — | Always | % · 0 dp |
| MET-35 | Maximum SOC | % | C | Usable-window upper bound read from the scenario. | — | Always | % · 0 dp |
| MET-36 | Inverter AC limit | kW | C | Rated AC power read from the scenario. | — | Always | kW · 1 dp |

#### Household demand

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-37 | Household load power | W | S | Sum of appliance contributions generated by the seeded load model; contributions sum exactly to the total (FR-LOD-04). | — | Always | kW · 2 dp |
| MET-38 | Household interval energy | Wh | S | Household load power × interval length. | MET-37 | Always | kWh · 2 dp |
| MET-39 | Appliance power | W | S | Rated power × run fraction for one appliance instance in one interval. | — | Always | W · 0 dp |
| MET-40 | Appliance interval energy | Wh | S | Appliance power × interval length. | MET-39 | Always | Wh · 0 dp |
| MET-41 | Appliance state | state | S | State machine output for one appliance: off, scheduled, running, paused/deferred, completed or unavailable (FR-LOD-03). | — | Always | state |
| MET-42 | Room load | W | D | Sum of appliance instances assigned to one room. | MET-39 | Always | W · 0 dp |
| MET-43 | Deferred energy | Wh | S | Flexible-load energy moved outside its original window by the scheduler. | — | Always | Wh · 0 dp |
| MET-44 | Unmet critical demand | Wh | D | Required critical energy minus served critical energy. | MET-39 | Always | Wh · 0 dp |

#### Grid and energy summary

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-45 | Grid import power | W | S | Residual of the energy balance after local supply and dispatch; limited by the configured import limit. | — | Always | kW · 2 dp |
| MET-46 | Grid export power | W | S | Surplus after local use, battery charging and export limit are applied. | — | Always | kW · 2 dp |
| MET-47 | Grid connection state | state | S | Connected, islanded or restored, from the configured outage windows. | — | Always | state |
| MET-48 | Grid import limit | kW | C | Import limit read from the scenario. | — | Always | kW · 1 dp |
| MET-49 | Grid export limit | kW | C | Export limit read from the scenario. | — | Always | kW · 1 dp |
| MET-50 | Energy balance residual | Wh | D | Absolute supply minus demand per step, including losses; tolerance 1 × 10⁻⁶ kWh (AC-01). | MET-12, MET-13, MET-27, MET-29, MET-37, MET-45, MET-46 | Always | Wh · 3 dp |
| MET-51 | Self-consumption ratio | % | D | Local PV energy used on site divided by total PV generation. | MET-13, MET-27, MET-45, MET-46 | Always | % · 1 dp |
| MET-52 | Self-sufficiency ratio | % | D | Locally supplied energy divided by total household demand. | MET-37, MET-45 | Always | % · 1 dp |
| MET-53 | Curtailed PV energy | Wh | D | Available PV energy that could not be stored, used on site or exported. | MET-13, MET-27, MET-45, MET-46 | Always | kWh · 2 dp |
| MET-54 | Critical-load uptime | % | D | Intervals with critical demand served divided by intervals with critical demand. | MET-44 | Always | % · 1 dp |

#### Economics and emissions

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-55 | Grid import cost | TND | D | Imported energy × verified tariff band. | MET-45 | Disabled until `tariff.verified` | TND · 3 dp |
| MET-56 | Export compensation | TND | D | Exported energy × verified compensation rate. | MET-46 | Disabled until `tariff.verified` | TND · 3 dp |
| MET-57 | Net cost | TND | D | Import cost minus export compensation plus the fixed monthly charge. | MET-55, MET-56 | Disabled until `tariff.verified` | TND · 3 dp |
| MET-58 | Avoided CO₂ | kg | D | Avoided grid import × a dated, cited grid emission factor. | MET-45 | Disabled until `emission-factor.cited` | kg · 1 dp |

#### Forecast

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-59 | PV power forecast | W | F | Weather forecast × PV model, issued before the simulated instant. | — | Always | kW · 2 dp |
| MET-60 | PV energy forecast | Wh | F | PV power forecast × interval length. | — | Always | kWh · 2 dp |
| MET-61 | Load power forecast | W | F | Weather-driven or learned load forecast, issued before the simulated instant. | — | Always | kW · 2 dp |
| MET-62 | PV forecast MAE | W | D | Mean absolute error of MET-59 against MET-13, per horizon, with sample count (FR-FCT-05). | MET-59, MET-13 | Always | W · 0 dp |
| MET-63 | Load forecast MAE | W | D | Mean absolute error of MET-61 against MET-37, per horizon, with sample count. | MET-61, MET-37 | Always | W · 0 dp |
| MET-64 | PV forecast RMSE | W | D | Root mean square error of MET-59 against MET-13, per horizon, with sample count. | MET-59, MET-13 | Always | W · 0 dp |
| MET-65 | Load forecast RMSE | W | D | Root mean square error of MET-61 against MET-37, per horizon, with sample count. | MET-61, MET-37 | Always | W · 0 dp |
| MET-66 | Forecast skill score | ratio | D | 1 − model MAE divided by the named naïve baseline MAE, per horizon. | MET-62 | Always | ratio · 2 dp |

#### Control decisions

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-67 | Selected action | state | S | Action chosen by the active controller, with its trigger and active constraints (FR-EMS-08). | — | Always | state |
| MET-68 | Action reason code | state | S | Machine-readable reason for the chosen action (FR-EMS-07). | — | Always | state |
| MET-69 | Expected effect of action | Wh | E | The controller's own expectation for the action it selected. | — | Always | Wh · 0 dp |
| MET-70 | Effect error | Wh | D | Realised interval effect minus the expectation stored with the action. | MET-69, MET-14, MET-27, MET-45 | Always | Wh · 0 dp |
| MET-71 | Policy difference in grid import | Wh | D | Paired difference in grid import between the baseline and scheduler runs. | MET-45 | Always | kWh · 2 dp |
| MET-72 | Oracle gap | % | D | Scheduler result as a percentage gap to the perfect-foresight oracle on the same scenario (FR-EMS-11). | MET-71 | Always | % · 1 dp |

#### Anomaly detection

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-73 | Anomaly score | unitless | E | Residual or model score computed from observed simulation state only (FR-SIM-08). | — | Only when `detector.enabled` | unitless · 2 dp |
| MET-74 | Anomaly severity | state | E | Low, medium or high, with the expected range and evidence window attached (FR-ANM-03). | — | Only when `detector.enabled` | state |
| MET-75 | Detection latency | h | D | Simulated time between an injected fault and the first detection, reported per fault type. | MET-73 | Only when `detector.enabled` | min · 0 dp |

#### Run and interface

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-76 | Simulation clock time | time | S | Engine clock: scenario start plus elapsed fixed steps, displayed at the site timezone (DEC-003). | — | Always | site timezone |
| MET-77 | Step index | count | S | Number of fixed steps executed since run start. | — | Always | count · 0 dp |
| MET-78 | Simulation speed multiplier | × | C | Speed multiplier selected for the demonstration (1×, 60× or maximum), with fixed-step semantics unchanged (FR-SIM-09). | — | Always | × · 0 dp |
| MET-79 | Run seed | count | C | Scenario seed that fixes the run. | — | Always | count · 0 dp |

#### Installation configuration

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-80 | Installed DC capacity | kWp | C | Array capacity read from the scenario header (`pv.installed_dc_kwp`). | — | Always | kWp · 2 dp |
| MET-81 | Panel count | count | C | Module count read from the scenario (`pv.panel_count`). | — | Always | count · 0 dp |
| MET-82 | Array tilt | ° | C | Tilt read from the scenario (`pv.tilt_deg`). | — | Always | ° · 0 dp |
| MET-83 | Array azimuth | ° | C | Azimuth read from the scenario (`pv.azimuth_deg`). | — | Always | ° · 0 dp |
| MET-84 | Battery nominal capacity | kWh | C | Nominal capacity read from the scenario (`battery.nominal_capacity_kwh`). | — | Always | kWh · 2 dp |
| MET-85 | Battery maximum charge power | kW | C | Charge limit read from the scenario (`battery.max_charge_kw`). | — | Always | kW · 2 dp |
| MET-86 | Battery maximum discharge power | kW | C | Discharge limit read from the scenario (`battery.max_discharge_kw`). | — | Always | kW · 2 dp |
| MET-87 | Inverter efficiency | % | C | Conversion efficiency read from the scenario (`inverter.efficiency`). | — | Always | % · 1 dp |
| MET-88 | Inverter standby power | W | C | Standby consumption read from the scenario (`inverter.standby_w`). | — | Always | W · 0 dp |

#### Embedded node and telemetry

| ID | Metric | Unit | Class | Source / formula | Inputs | Availability | Display |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MET-89 | Node connection state | state | E | Inferred by the adapter from the last receipt time for the configured device: connected, stale or offline. | — | Always | state |
| MET-90 | Telemetry staleness | h | E | Adapter receipt time compared with the current simulation instant; computed locally, never received from the node. | — | Always | min · 0 dp |
| MET-91 | Telemetry source mode | state | C | Manifest field `source_mode` of the active run: scenario, wokwi, physical or replay. | — | Always | state |
| MET-92 | Telemetry sequence gaps | count | E | Adapter detects a discontinuity in the node's `sequence` counter and counts the missing positions. | — | Only when `hardware.node` | count · 0 dp |
| MET-93 | Bench node ambient temperature | °C | M / S | DHT22 channel; simulated class S from the Wokwi node, measured class M from the physical bench node inside its declared validity range. | — | Only when `hardware.node` | °C · 1 dp |
| MET-94 | Bench node relative humidity | % | M / S | DHT22 channel; simulated class S from the Wokwi node, measured class M from the physical bench node inside its declared validity range. | — | Only when `hardware.node` | % · 0 dp |
| MET-95 | Light-level proxy | unitless | M / S | Uncalibrated light-dependent resistor on an ADC1 pin; a relative level from 0 to full scale, simulated class S in Wokwi and measured class M on the bench. | — | Only when `hardware.node` | unitless · 0 dp |
| MET-96 | Firmware version | state | C | Version string compiled into the firmware and repeated in every telemetry document. | — | Always | state |
| MET-97 | Telemetry schema version | state | C | `schema_version` field of the telemetry document, validated against the committed schema. | — | Always | state |
<!-- metric-register:end -->

---

## 6 · Reference sources and verification status

| Source | Used for | Class it supplies | Status |
| --- | --- | --- | --- |
| Open-Meteo forecast API | Forward irradiance, cloud cover, temperature, wind | X | Key-free; adapter with cache and synthetic fallback (NFR-11) |
| Open-Meteo ERA5 archive | Historical weather for repeatable experiments | X | Key-free; reanalysis, **not** a sensor record |
| PVGIS (SARAH2) | Independent check of simulated daily yield (FR-PV-07) | X | Model-to-model consistency check, not validation |
| NOAA calculator or an ephemeris | Independent check of solar position (FR-PV-02) | — (test fixture) | Reference values recorded in fixtures |
| STEG residential tariff | Import cost, export compensation | X (when cited) | **Unverified** — prices are `null`, economics disabled |
| National grid emission factor | Avoided CO₂ | X (when cited) | Not selected; the metric stays disabled |
| Solar-position algorithm | Sun elevation, azimuth, daylight state | S | Checked against an independent reference within 0.5° |
| Wokwi ESP32 simulator | Bench-node channel values in the Wokwi source mode | S | Electronics simulated from the committed circuit; parity with the physical bench is measured (AC-34), not assumed |

---

## 7 · Claims the project may and may not make

| Claim | Status | Required basis or wording |
| --- | --- | --- |
| "The installation would generate N kWh on date D" | Allowed as a simulation | "Simulated generation: N kWh (S, scenario …, seed …)"; with the PVGIS agreement and its 15 % bound stated. |
| "The scheduler reduces grid import by N %" | Allowed only from paired runs | "Modelled reduction under identical scenario, seed, weather, load trace and initial SOC" (FR-EMS-09); never without the oracle gap beside it. |
| "The household would save N TND" | **Forbidden** | No economic claim until a dated STEG tariff is cited; the cost metric is disabled (FR-GRD-03, CON-08). |
| "The detector achieves precision / recall of …" | Allowed only on injected faults | State the fault types, counts and detection latency; the faults are synthetic and labelled (FR-ANM-02). |
| "The forecast beats persistence" | Allowed if skill is positive per horizon | Report MAE and RMSE per horizon with sample counts; a negative result is reported, not hidden (FR-FCT-05). |
| "Helios matches a real installation" | **Forbidden** | No measured values exist; PVGIS is a second model, not a field measurement. |
| "The PV model is validated" | **Forbidden** | Say "agrees with PVGIS within 15 % on 12 seasonal days (model-to-model)". |
| "Battery health is predicted" | **Forbidden** | The fade proxy is disabled by default and is not a remaining-useful-life estimate (FR-BAT-06). |
| "The demonstration works offline" | Allowed | Demonstrated with the network disabled (AC-19); the provenance label shows cached or synthetic data. |
| "Helios controls a real installation" | **Forbidden** | No physical plant is monitored or actuated in v1 (CON-01, claim gate). |
| "The bench node measures the installation" | **Forbidden** | It reads room temperature, humidity and a relative light level; the installation stays modelled (DEC-026). |

The claim gate in the [acceptance checklist](acceptance-checklist.md) remains binding regardless of what the interface can render.

---

## 8 · The bench node: how class M is activated and bounded

Class M is not a display toggle. The register carries three bench-node channels as `M / S` behind the `hardware.node` gate (DEC-027), and activation requires all of the following, in order:

1. An adapter that implements the observation interface with device identity, calibration, unit and acquisition timestamp (FR-SIM-08, FR-EMB-04).
2. A recorded source mode: Scenario, Wokwi, Physical or Replay, written into the run manifest (FR-EMB-05).
3. Register entries that admit M for that metric under a `hardware.*` gate; the document is regenerated and the checker passes.
4. A freshness rule: a stale reading degrades to E or S with a visible label, never silently.
5. A missing reading is never written as zero; the metric is unavailable with a reason.
6. A validity range per channel: a value outside it is flagged as bad quality, not shown as a reading.
7. Measured and simulated series are never merged into one unlabelled series.
8. The channel declares what it is calibrated against. An uncalibrated light-dependent resistor stays a relative light level and is never converted to W/m² irradiance (FR-EMB-06, AC-32).
9. Hardware validation evidence recorded before any wording changes; the claim gate is updated by decision-log entry, not by editing a caption.

Until the physical node is attached, the gate is closed, the Wokwi source resolves to S, and an M badge outside those three channels is a defect.

---

## 9 · Limits to state in the report

1. There are **no measured values** in v1. Every generation, consumption and state figure is simulated.
2. Agreement with PVGIS is a **consistency check between two models**. It catches unit errors, geometry mistakes and implausible loss factors; it does not prove real-world accuracy.
3. ERA5 is a reanalysis product, not a record from the site.
4. Household behaviour is a design assumption; real occupancy differs.
5. Battery aging and anomaly scores are approximations, explicitly not certification-grade.
6. The comparative claim is valid **inside the simulation**, under the stated scenarios, seeds and assumptions — not as a field result.
7. No economic claim is made; the tariff is unverified and the cost metrics are disabled.
8. Injected faults are synthetic and labelled; detector quality is reported against them, not against field failures.
9. Only the bench node can supply class M values, and only for three room-level channels: ambient temperature, relative humidity and a relative light level. Nothing measures the array, the battery or the grid, and a room reading is not plant telemetry (DEC-026).

---

## 10 · Change control

- The register is the single source of truth. The §5 table is generated; if the checker reports it stale, run `node scripts/check-provenance.mjs --write` and commit the regenerated document with the JSON.
- Adding, removing or reclassifying a metric requires a decision-log entry when it changes a claim, a gate, a class or a displayed unit.
- Metric IDs are never reused. A withdrawn metric stays retired even if a similar one appears later.
- Display precision and gate thresholds are fixed before results are seen and are not tuned afterwards (task 11.1).
- The checker, the UI contract test and the bundle scan are cumulative: passing one does not excuse another.

**Change history.** 0.1.0 defined six value classes and labelling rules. 0.2.0 adds class C for configured values, makes D inputs explicit, turns the metric list into a generated register and adds the machine check (DEC-024). 0.3.0 registers the embedded node and telemetry group, admits class M for three bench channels behind `hardware.node`, adds the `M / S` combination and requires a `hardware.*` gate for any M metric (DEC-027).
