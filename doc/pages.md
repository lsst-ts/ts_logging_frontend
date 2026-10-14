# Pages and components

This document describes each page, the components it is built from and the
backend endpoints it reads, followed by the parts shared between pages. The
endpoints themselves are described in the backend's
[endpoint reference](https://github.com/lsst-ts/ts_logging_and_reporting/blob/develop/doc/endpoints.md).

---

## 1. Pages

Every page lives in `src/pages/` and renders inside `Layout.jsx`, which holds
the sidebar with the date range and telescope controls (`Parameters.jsx`).
Routes and their relevant search parameters are defined in `src/routes.js`.

### Digest (`/`)

`Digest.jsx`: a summary of the selected nights.

| Section | Components | Endpoints |
|---|---|---|
| Metrics row | `MetricsCard` (exposures taken, efficiency), `TimeLossCard`, `JiraTicketsTable` | `exposures`, `expected-exposures`, `obs-status`, `jira-tickets` |
| Observing conditions | `ObservingConditionsApplet` | `exposures`, `almanac` |
| Exposure breakdown | `ExposureBreakdownApplet` | `exposures`, `exposure-flags`, `block-details` |
| Night summary | `NightSummary` | `night-reports` |
| Observatory status | `ObservatoryStatusApplet`, `ObservatoryStatusCumulativePlot` | `obs-status`, `almanac` |
| Visit map | `VisitMapStaticApplet` | `static-visit-map` |

### Plots (`/plots`)

`Plots.jsx`: per-exposure metrics plotted against time, one `TimeseriesPlot`
per visible field, above a `TimelineChart` for selecting a time range.
`PlotVisibilityPopover` and `PlotFormatPopover` choose the plots and their
styling. Reads `data-log` and `almanac`.

### Data Log (`/data-log`)

`DataLog.jsx`: one row per exposure, in a `DataTable` with the columns from
`DataLogColumns.jsx`, above a `TimelineChart`. Reads `data-log` (ConsDB),
`exposure-entries` (the exposure log's flags and comments, merged into the
rows by `exposure_name`), `almanac` and `block-details`.

### Context Feed (`/context-feed`)

`ContextFeed.jsx`: the night's events from Rubin Nights (queue scripts,
errors, exposures, AUTOLOG and Narrative Log entries) in a `DataTable` with the columns from
`ContextFeedColumns.jsx`, above a `TimelineChart` of the events and an
`ObservatoryStatusTimeline`. Reads `context-feed`, `obs-status`, `almanac` and
`block-details`. Event categories are defined in
`src/constants/CONTEXT_FEED_DEFINITIONS.js`.

### Visit Maps (`/visit-maps`)

`VisitMaps.jsx`: an interactive sky map of the night's visits, a Bokeh
document rendered by `BokehPlot`. Reads `multi-night-visit-maps`.

---

## 2. Time ranges

The URL is the single source of the selected time: `startDayobs`, `endDayobs`
and `telescope` select the nights and are kept when moving between pages, and
`startTime`/`endTime` narrow to a window within them. `useTimeRangeFromURL`
syncs a page's selected range with the URL, and `SelectedTimeRangeBar` shows
it. Dragging a selection across a `TimelineChart` or a `TimeseriesPlot` updates it.

Exposure times from ConsDB are in TAI. The Plots and Data Log pages display
TAI, and shift other sources' UTC times by `TAI_OFFSET_SECONDS`
(`src/utils/timeUtils.js`) to line them up.

---

## 3. Charts

Three charting libraries are in use:

| Library | Used by | Rendering |
|---|---|---|
| [Recharts](https://recharts.org/) | `TimeseriesPlot`, `ObservingConditionsApplet`, `ExposureBreakdownApplet`, `ui/RadialChart` | SVG |
| [ECharts](https://echarts.apache.org/) | `TimelineChart`, `ObservatoryStatusTimeline`, `ObservatoryStatusCumulativePlot` | Canvas |
| [BokehJS](https://docs.bokeh.org/) | `BokehPlot` | Canvas, from a document the backend builds |

### Recharts

- Hover and drag feedback bypass React, so that moving the mouse does not
  re-render every plot. `src/stores/hoverStore.js` moves a highlight to the
  hovered exposure on every plot at once, and `src/hooks/useDOMClickDrag.js`
  draws the drag selection, both by editing the SVG directly.
- Recharts drops elements positioned outside the plot area, including
  reference markers. Set `ifOverflow` on them to keep them in the DOM.
- Data points carry `data-obsid`, which the hover store and the end-to-end
  tests use to find them.

### ECharts

- ECharts is driven imperatively: `src/hooks/useEChartsTimeline.js` creates the
  instance, applies option updates and resizes it, and
  `useEChartsBrushZoom.js` does the same for the cumulative plot, adding
  brush-to-zoom.
- Canvas charts have no DOM per mark, so the instance is exposed on its
  container as `__echartsInstance` for the end-to-end tests to query.

### BokehJS

- The backend builds the whole Bokeh document, and `BokehPlot` only embeds it
  with `Bokeh.embed.embed_item`. Changes to the visit map's content or
  interactions must be made in the backend.
- BokehJS has to be on the same Bokeh version as the backend that built the
  document. The frontend pins `@bokeh/bokehjs` in `package.json`, while the
  backend only requires Bokeh 3, so upgrade them together.

---

## 4. Tables

The Data Log and Context Feed share `src/components/DataTable/`, built on
[TanStack Table](https://tanstack.com/table). Each page provides column
definitions, and `DataTable` provides sorting, filtering, grouping, column
visibility, resizing and row selection.

Two properties of a column definition control its filter:

- `filterType: "string"` gives the column a multi-select filter of its values.
- `meta.urlParam` keeps the column's filter in the URL, under that name.
  Filters on columns without one are kept only in the table's
  state, and are lost on reload.

---

## 5. Notifications

Pages report loading failures and empty results as banners, through
`NotificationContext` and `NotificationBannerStack`. Error banners cannot be
dismissed; "no data" and system notices can.
