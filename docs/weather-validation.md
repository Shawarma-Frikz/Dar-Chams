# Weather adapter validation

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-17 |
| Phase | 03.3 — optional provider, cache boundary and offline fallback |
| Authority | [Engine adapter](../packages/engine/src/weather.ts), [engine tests](../packages/engine/src/weather.test.ts), DEC-048 |
| Provider contract | [Open-Meteo Forecast API](https://open-meteo.com/en/docs) |

## Contract

The engine requests hourly temperature, shortwave radiation, direct normal irradiance, diffuse
radiation and wind speed from Open-Meteo in UTC using Unix timestamps. Temperature and wind are
interpolated onto the requested fixed-step grid. Radiation values are held across sub-hour steps
because the API describes them as hourly means over the preceding hour. Provider data are class `X`;
deterministic synthetic frames are class `S`.

Every requested frame is validated before the source returns anything. Missing arrays, unequal
series lengths, invalid timestamps, gaps, invalid numbers, negative radiation or wind, and
temperatures below absolute zero invalidate the whole response. The cache port stores only complete
provider snapshots, keyed to site, interval, timestep, seed and weather policy. Cache records are
validated again on read; mismatched or corrupt records are ignored. The engine has no filesystem or
browser-storage dependency. Applications can inject durable storage; tests and simple consumers can
use `MemoryWeatherCache`.

If the provider fails, the source tries a complete cache match and then generates the full synthetic
series from the site, seed and instants. A typed `weather-fallback` record includes the failure reason
and selected fallback. No simulation component receives partial weather. Scenario schema validation
requires the synthetic fallback to remain configured.

## Evidence

`npm run test -- --run packages/engine/src/weather.test.ts` covers:

- a complete provider response and its mapping onto a 30-minute grid;
- capturing a successful provider sample in the injected cache and reusing it after the provider
  becomes unavailable;
- identical offline output from the same seed and site;
- visible fallback records for an HTTP error and malformed provider data.

The tests mock the provider boundary and do not call the live service. A live API smoke test is
intentionally not part of verification because it would make CI depend on network availability,
provider quotas and changing forecasts. No persistent cache adapter or full simulation coordinator
is part of task 03.3; those integration tasks must connect application storage and consume these
frames in a later phase.

## Limits

The provider source uses the forecast endpoint. Dates it cannot serve, including historical periods
outside its supported forecast window, become visible provider failures and use the configured
fallback. The synthetic series is a deterministic demo input, not a meteorological estimate and not
measured weather. It must not be presented as a forecast or used as measured evidence.
