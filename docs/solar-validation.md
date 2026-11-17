# Solar calculation validation

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Date | 2026-11-17 |
| Task | 03.2 |
| Implementation | SunCalc 2.1.4 (MIT), engine API `solarPositionAt` and `solarDayForSiteDate` |
| Automated proof | `npm run test -- --run packages/engine/src/solar/solar.test.ts` |
| Related | FR-PV-02, AC-05, DEC-047 |

## Reference fixtures

These fixed, rounded-to-minute values were transcribed from the published Sun tables for
2026-11-17. The three cities cover north and south hemispheres and distinct IANA time zones.
SunCalc results are absolute instants; the checks convert them into each site's civil time before
comparison. Timeanddate's solar-noon elevation is rounded to 0.1°. The noon azimuth fixture is the
cardinal meridian direction (south in the northern hemisphere, north in the southern hemisphere).

| Location | Coordinates (lat, lon) | Zone | Sunrise | Solar noon | Sunset | Noon elevation | Noon azimuth |
| --- | ---: | --- | --- | --- | --- | ---: | ---: |
| Tunis, Tunisia | 36.8065, 10.1815 | `Africa/Tunis` | 06:59 | 12:04 | 17:08 | 34.2° | 180° |
| Paris, France | 48.8566, 2.3522 | `Europe/Paris` | 08:02 | 12:35 | 17:08 | 22.1° | 180° |
| Sydney, Australia | −33.8688, 151.2093 | `Australia/Sydney` | 05:42 | 12:40 | 19:37 | 75.1° | 0° |

The test allows ±2 minutes for each rounded event time, ±0.5° for noon azimuth and the nearest
0.1° for elevation. The source pages are [Tunis](https://www.timeanddate.com/astronomy/tunisia/tunis),
[Paris](https://www.timeanddate.com/astronomy/france/paris), and
[Sydney](https://www.timeanddate.com/astronomy/australia/sydney); the date-specific table is
retained in the Vitest fixtures so verification never depends on a live service.

## Time-zone and edge-case checks

The calculation resolves each requested `YYYY-MM-DD` with the existing IANA time-zone database,
uses the actual local-midnight interval, and asks SunCalc for candidates at the offsets active at the
start, midpoint and end of the site day. It filters events back to the exact site-day interval. This
handles spring-forward and fall-back days without assuming 24 hours or one offset for the entire day.
The tests assert Paris's 23-hour 2026-03-29 day and 25-hour 2026-10-25 day, including event offsets.

Sunrise and sunset are `null` when the Sun does not cross SunCalc's apparent-horizon threshold;
`status` distinguishes `polar-day` and `polar-night`. Tests cover Tromsø at the June and December
solstices. Position remains defined at night, including negative elevation. Coordinates, site
altitude, malformed calendar dates and dates outside the algorithm's 1900–2150 calculation range
are bounded or rejected. SunCalc's horizon dip uses positive height above the horizon; a site below
mean sea level is treated at sea level for that small horizon correction.

This proves the solar geometry calculation contract. It does not yet model irradiance, array output,
clouds, shading, plane-of-array transposition or PV yield; those remain later phase-03 tasks.
