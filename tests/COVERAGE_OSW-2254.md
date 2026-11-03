# Critical test coverage

The five requested sets are now implemented:

| Set | Tests added | Location |
| --- | --- | --- |
| Missing inputs | 9 browser cases: empty/failed Almanac, accounting, dome and status; known zero versus unavailable hours | `e2e/mocked/time-accounting/degraded-tooltips.spec.js` |
| Current-night accumulation | 5 unit cases: prior-night totals, ongoing night, sunrise cutoff, open/closed dome, pre-sunset last event | `cumulativePlotAccumulation.test.js` |
| Zoom and reset | 4 browser cases: both cumulative plots, reverse Shift selection, timeline selection; axes, timeline brush and URL stay synchronized and reset together | `e2e/mocked/time-accounting/zoom-sync.spec.js` |
| Breakdown | 3 browser cases: exact two-night totals for overlapping states, parent/child selection, active filtering, individual/global collapse | `e2e/mocked/time-accounting/breakdown-values.spec.js` |
| Narrative links | 4 browser cases: null/empty/invalid end dates, UTC microseconds and a five-minute window crossing midnight | `e2e/mocked/time-accounting/narrative-links.spec.js` |

## Confirmed behavior and deferred issue

- Empty Almanac/accounting/dome inputs display `0.00`; fetch failures display
  `NA`. Tests preserve this confirmed behavior.
- Pre-sunset accumulation is deferred to **SSW-2999**. Concise TODOs identify
  the daytime overcount and sunset-marker reset. Its reproduction uses
  `it.fails`, so fixing it will require converting it to a normal passing test.

The new browser tests use roles, labels, visible text, or test IDs for chart
and row elements. No screenshot comparisons are used.

## Latest validation

- Pre-commit: passed. New test/helper files also pass ESLint.
- Full unit suite: 357 passed, including the SSW-2999 expected failure.
- Full mocked browser suite: 532 passed, 7 existing skips (includes the new AuxTel, Observing Conditions and empty-Jira checks).
- Added in this follow-up: 5 unit tests and 20 browser tests.

Final consistency cleanup: both timelines share `TimelineApplet` and separate
body components; notification callers use `SOURCE`; Observing Conditions
retains a usable empty domain and distinguishes off-sky-only data.
The standalone Context Feed table resolves its message separately from its
AppletCard-based timeline. AuxTel switching is covered by a LATISS request
and rendered-data test. Vite production bundling passes; `npm run build`
needs the currently missing `tsc` executable.
