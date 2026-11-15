# 1 · Product statement

> Helios is a simulation-first residential solar microgrid and energy-management digital twin. It models a virtual installation — photovoltaic array, battery storage, grid connection and a configurable household — inside a deterministic TypeScript engine, then compares a transparent rule-based controller against a forecast-aware scheduler that predicts generation and demand, coordinates flexible loads, protects battery reserve and explains every decision. The first release runs entirely in a browser against simulated telemetry and public weather data; no physical plant is monitored or controlled. Physical ESP32 and sensor integration is a later extension that must connect through the same observation and actuation contracts without rewriting the energy-management rules.

**Status:** canonical text, written in phase 00 (task 00.1). It is identical to the paragraph in [`README.md`](../../README.md) and [`docs/00-scope-brief.md`](../00-scope-brief.md) §1. Do not paraphrase it in the report; if the statement changes, update all three copies in the same commit.

**Boundaries this wording enforces**

- "Simulation-first" and "virtual installation" — the work is a model, not a field deployment.
- "No physical plant is monitored or controlled" — prevents the most common overclaim in IoT coursework.
- "Later extension … without rewriting the energy-management rules" — states the adapter boundary that phase 10 (task 10.8) must preserve.

Sections 2 onward of the report are written in phase 11 from the phase 00–10 artifacts.
