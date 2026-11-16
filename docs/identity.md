# Identity

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-16 |
| Phase | 02 (adopted after 02.3); the name, mark and tokens apply to every phase from here |
| Decided by | DEC-040, superseded for repository and code identifiers by DEC-041; charter v1.0 supplied for the product |
| Checked by | `node scripts/check-docs.mjs` (identity audit and its eighth negative), or `npm run check` for all twelve checks |
| Related | [Conventions](conventions.md) §8 · [Documentation](documentation.md) §9 · [Configuration](configuration.md) · [Roadmap](../Dar_Chams_Roadmap.html) · [Engineering plan](../Dar_Chams_Roadmap_and_Graphic_Charter_v2_Embedded.html) |

This document is the authority for the product's name, mark, colour, type and interface rules. The
application reads the tokens from [`src/app/globals.css`](../src/app/globals.css); this document
states what each token means and why. The two are compared by machine on every run, so a colour
changed in one place and not the other fails `npm run check` rather than drifting into a screenshot.

The rule inherited from the spelling of the name: **saffron means energy, and nothing else.** Not a
button, not a badge, not a highlight. When a viewer sees saffron, they are looking at production.

---

## 1 · The name

| Field | Value |
| --- | --- |
| Latin | Dar Chams |
| Arabic | دار شمس |
| Meaning | *Dar* is house and *Chams* is sun, in the Tunisian spelling: the house of the sun |
| Use on screen | Latin letters for the name; the Arabic form as a quiet second line wherever there is room |
| Use in code | `Dar-Chams` GitHub repository, `dar-chams` root package, `@dar-chams/engine` workspace, `dar-chams-engine` run identity and `dar-chams.settings.v1` storage key (DEC-041) |
| Never | An Arabic-only wordmark, an invented transliteration, or a slogan that claims a real installation |

Earlier decision entries and the signed acceptance checklist retain the former working name
Helios. The decision log is append-only (DEC-040, DEC-041), so those entries remain history rather
than an alternate current name.

## 2 · The mark

An arched doorway framing a sun disc, drawn on a 24 × 24 unit grid so it can be redrawn exactly in
SVG, in CSS and in the 3D scene. The arch is a window onto the sky; the disc is the sun on the
morning the day begins. The mark is never decorated with rays, glow, shadows or gradients.

| Element | Geometry | Colour |
| --- | --- | --- |
| Arch | `M4 22V10A8 8 0 0 1 20 10V22`: 16 units wide, 20 tall, half circle of radius 8 on the spring line at `y 10` | `--blue` |
| Disc | `cx 12`, `cy 10`, `r 3.6`, the centre on the spring line and the vertical axis | `--sun` |
| Clear space | one disc radius (3.6 units) free on every side | — |
| Smallest size | 16 px on screen, 8 mm in print; below that use the favicon, which drops the grid margin | — |

The mark is implemented once in [`src/components/brand-mark.tsx`](../src/components/brand-mark.tsx),
used by the header, and copied at favicon scale into [`src/app/icon.svg`](../src/app/icon.svg). The
checker compares the path, the centre and the radius against this table.

## 3 · Colour tokens

Every colour is a token with a job. The day theme is the default; the night theme is designed, not
inverted, and the browser chooses it with `prefers-color-scheme`. A token absent from the night block
keeps its day value.

| Token | Day | Night | Role |
| --- | --- | --- | --- |
| `--wash` | `#EDF0EE` | `#0A1424` | Page background; the page is never white |
| `--surface` | `#F8FAF9` | `#101C30` | Cards and panels |
| `--inset` | `#E2E8E5` | `#16243B` | Wells, table heads, chips |
| `--ink` | `#0E1B2C` | `#E8EEF5` | Headings and body text |
| `--ink2` | `#2F4157` | `#C3CFDD` | Secondary text |
| `--muted` | `#4E6177` | `#98A8BC` | Labels and captions |
| `--rule` | `#CBD4D0` | `#243551` | Hairlines and dividers |
| `--rule2` | `#9DAAA5` | `#4A5F7F` | Strong edges and table frames |
| `--blue` | `#1456A0` | `#6FA8F0` | Brand, links, storage and the focus ring |
| `--blue-deep` | `#0B3A73` | `#A5C8F7` | Arch band and top tier |
| `--blue-soft` | `#DCE8F6` | `#17304F` | Soft fill for blue things |
| `--sun` | `#EFA51A` | `#F7BE45` | Production fill only |
| `--sun-soft` | `#FBEBC8` | `#3A2D10` | Soft fill for energy notes |
| `--sun-ink` | `#7A4E00` | `#F7D488` | Text on a saffron wash |
| `--sun-line` | `#B26B00` | `#F7BE45` | Saffron strokes on the day ground |
| `--cell` | `#0F7B6C` | `#3CC1AB` | Healthy, running |
| `--cell-soft` | `#D3EBE6` | `#12362F` | Soft fill for teal things |
| `--load` | `#B02A52` | `#EE7C9A` | Consumption, alerts and faults |
| `--load-soft` | `#F3DAE1` | `#3C1A27` | Soft fill for rose things |
| `--shed` | `#6B7A8C` | `#8796AA` | Shed, off, waiting, unknown |
| `--arch-bg` | `#0B3A73` | `#0F2A4F` | Deep doorway ground |
| `--arch-fg` | `#EAF1FA` | `#EAF1FA` | Text on the arch band |
| `--code-bg` | `#0B1B31` | `#0B1B31` | Code and terminal ground |
| `--code-fg` | `#DCE7F5` | `#DCE7F5` | Code and terminal text |

**Computed contrast.** Ink on wash is 15.10:1 by day and 15.79:1 by night; secondary ink is 9.08 and
11.67; muted labels are 5.54 and 7.61; blue links are 6.38 and 7.50. Saffron on the day ground is
**1.82:1**, so on the light theme saffron is never a text colour or a thin line: use a filled area
with an ink label, or `--sun-line` (3.66:1) for strokes. Teal is 4.50:1 by day, which is not enough
for body text; it is a fill and a stroke. White on blue is 7.32:1 by day and 2.46:1 by night, so a
night button label uses `--ink` on `--blue`, not white.

**Proportion.** Ground 62 · ink 20 · blue 12 · teal 3 · rose 2 · saffron 1. Saffron is the smallest
area on purpose, so when it appears it means something.

## 4 · Energy language

Meaning never rides on colour alone. Every kind of power has a colour, a word and — in a chart, a
table or the 3D scene — a shape.

| Kind | Colour | Word | Shape |
| --- | --- | --- | --- |
| Production | `--sun` | Production, sun | Area with a stroke; a filled disc for the sun |
| Storage | `--blue` | Battery, stored | Solid line and bar; a flat bar with a cutoff marker |
| Consumption | `--load` | Use, load | Solid line; a device row with a power figure |
| Healthy, running | `--cell` | Running, OK | Filled teal dot and a check mark |
| Off, shed, waiting | `--shed` | Shed, waiting | Dashed border and a clock or power icon |

Tiers use a blue-and-slate ramp, never an energy colour: T0 critical is a solid square, T1 important a
solid circle, T2 comfort an open circle, T3 deferrable a dashed square. The hardware LEDs are T0
white, T1 blue, T2 cyan and T3 magenta, so a lit LED never reads as production.

Flow lines follow power at 2 px per 0.25 kW, never below 2 px and never above 18 px; straight, with
right-angle bends and a small arrowhead on the target edge. A line that carries no power is not drawn.

## 5 · Typography

Four free faces, four jobs, all self-hosted at build time by `next/font`. Display and interface are
variable fonts so a phone downloads one file per family.

| Role | Family | `next/font` loader | CSS variable | Utility |
| --- | --- | --- | --- | --- |
| Display | Bricolage Grotesque | `Bricolage_Grotesque` | `--font-bricolage` | `font-display` |
| Interface | Instrument Sans | `Instrument_Sans` | `--font-instrument` | `font-sans` |
| Data and labels | Martian Mono | `Martian_Mono` | `--font-martian` | `font-mono` |
| Arabic | Noto Kufi Arabic | `Noto_Kufi_Arabic` | `--font-kufi` | `font-arabic` |

| Role | Size and line | Weight and tracking |
| --- | --- | --- |
| Display | 46–96 px, line 0.92 | 800, −3.5 % |
| Page title | 28–46 px, line 1.04 | 700, −2.5 % |
| Section title | 22 px, line 1.2 | 650, −1.5 % |
| Body | 16 px, line 1.6, 74 characters at most | 400 |
| Small | 14 px, line 1.5, never below 14 px | 400–600 |
| Label | 10.5–11 px, uppercase | 500, +10 % to +12 % |
| Live number | 30 px in a KPI, 13 px in a row | 500, −2 % to −3 % |

## 6 · Numbers

- A **narrow no-break space** (U+202F) between a number and its unit: `3.2 kW`, `72 %`, `1,250 W`.
  Units are never bold.
- English uses a decimal point and a comma for thousands; the French interface uses a decimal comma
  and a narrow space for thousands.
- Power in kW with one decimal above 1 kW and in W below; energy in kWh with one decimal; charge in
  whole percent; temperatures in whole degrees; a forecast never shows more precision than its band.
- Time is a 24-hour clock, stored in UTC and shown in site time with `UTC+1` beside it.
- Battery power is positive when charging and negative when discharging, and the word sits beside the
  sign.

## 7 · States

Every state is distinguishable without colour. A state that is missing from this table does not
exist in the product.

| State | Chip | Non-colour cue |
| --- | --- | --- |
| Running | Running | Check mark |
| Shed | Shed | Dashed border, power icon, reason shown |
| Waiting | Waiting | Clock icon and the start time |
| Done | Done | Outline only |
| Pinned on | Pinned on | Lock icon |
| Pinned off | Pinned off | Lock icon and the word *off* |

| Data state | Shown as | Behaviour |
| --- | --- | --- |
| Live | Live · 3 s ago | Filled teal dot, relative time |
| Stale | Stale · 4 min | Hollow grey dot, values greyed, nothing hidden |
| Simulated | Synthetic weather | Dashed chip in the chart header |
| Node | Wokwi node | Double-edge chip, link state and last heard time |
| Loading | Grey blocks in the final layout | No spinner for under one second |
| Empty | One sentence and one action | Never a blank panel |
| Error | Rose border, sentence, retry | Never a blank panel |
| Offline | Banner with the last saved time | The last known state stays visible |

## 8 · Charts

- Name each series on the line, not in a legend; use the energy colours and nothing else.
- Zero-base bars, few ticks, Martian Mono labels, the unit printed once at the top.
- A forecast is never one confident number: the expected value is solid, the likely range is hatched,
  and the card states its confidence and band in words and numbers.
- Night is a band derived from the sun's altitude, not a fixed clock interval.
- No pie or donut charts. No red-to-green scale. No chart animated on every refresh.
- Every chart has a table view and a one-sentence summary behind it.
- Any chart of invented or fallback weather carries the chip **synthetic weather**; any chart with a
  real source carries its **sim**, **wokwi** or **hardware** chip.

## 9 · Motion

| Use | Duration | Easing | Rule |
| --- | --- | --- | --- |
| Press feedback | 120 ms | ease-out | Colour or a 1 px shift only |
| Device-row state change | 240 ms | cubic-bezier(.2, .7, .2, 1) | Fade the chip, never slide the row |
| Number change | 240 ms | ease-out | Crossfade, never count up |
| Page and panel transition | 240 ms | ease-out | Fade only |
| Panel tilt in 3D | real motor speed | linear | 0.5° per second at 1× |
| Sun in 3D | follows the clock | linear | Speeds up with the time control |

Nothing loops. A new alert appears once and stays. The time control wins: motion scales with the
simulation and stops when it is paused. When the viewer asks for reduced motion, every transition
becomes instant and the 3D energy lines stop moving, but every value stays visible. The settings
layer exposes the same choice as `data-motion="reduced"` on the document element.

## 10 · Accessibility

- Text contrast 4.5:1, large text and controls 3:1, checked in both themes.
- No meaning carried by colour alone: every state has a word and a shape.
- A visible focus ring, 2 px in `--blue`, 2 px offset.
- Targets at least 44 px high, with 8 px between neighbours.
- Everything reachable and usable by keyboard, in a logical order.
- Every chart has a table version and a one-sentence summary.
- Live values announce politely, no more than once every 10 seconds.
- The page works at 200 % zoom and at 320 px width.
- Reduced motion is respected everywhere, including the 3D scene.
- Language is set on every block; Arabic blocks are `lang="ar" dir="rtl"`.
- 3D has a full 2D alternative with the same information.
- Nothing flashes faster than three times a second.

## 11 · Definition of done for a screen

A screen is finished when every line holds:

1. Only token colours, no hard-coded hex.
2. Saffron appears only for production; on the day ground it is never text or a thin line.
3. Every state in the matrix is drawn, with its word and its shape.
4. Day and night are both checked at phone and laptop width.
5. Every number is in Martian Mono with a spaced unit.
6. The copy has a number and a reason; no *smart*, *seamless* or *AI-powered*.
7. A source chip is present wherever data comes from a fixture or the node.
8. The accessibility checklist above is ticked.

## 12 · The check

`scripts/check-docs.mjs` runs the identity audit on every `npm run check`:

| Area | What must hold |
| --- | --- |
| Name | The Latin and Arabic forms in §1 appear in the identity table and in the header wordmark |
| Tokens | The 24 rows in §3 equal the `--name: #hex` declarations in the marked day and night blocks of `globals.css`, with the documented fallback for a token the night block does not override |
| Legacy | No `basalt`, `limestone`, `oxide`, `sage`, `lichen`, `chalk`, `clay` or `slate` token survives anywhere under `src/` |
| Mark | `brand-mark.tsx` contains the arch path, the disc centre and the radius from §2; `icon.svg` names Dar Chams |
| Type | The four loaders appear in `layout.tsx`, the four variables appear in both `layout.tsx` and `globals.css`, and the header uses `font-arabic` |
| Negative | The checker removes the `--wash` row from a copy of §3 and requires the broken copy to be rejected |

The audit is folded into the existing documentation check rather than added as a thirteenth command:
identity is a documentation contract, and a separate process would let the two drift out of step.
