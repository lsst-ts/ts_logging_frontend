import { useCallback, useEffect, useRef } from "react";
import * as echarts from "echarts";

import {
  millisToDateTime,
  millisToHHmm,
  dayobsAtMidnight,
} from "@/utils/timeUtils";
import { generateHourlyTicks } from "@/utils/timelineUtils";
import {
  TIMELINE_DIMENSIONS,
  TIMELINE_MARGINS,
  TIMELINE_COLORS,
  TIMELINE_TEXT_STYLES,
  TIMELINE_OPACITY,
  TIMELINE_INTERVALS,
  TIMELINE_MARKER,
} from "@/constants/TIMELINE_DEFINITIONS";

/**
 * Unified timeline chart component for displaying events over time.
 *
 * @param {Object} props
 * @param {Array<{index: number, timestamps: number[], color: string, isActive: boolean}>} props.data - Data series to display
 * @param {[DateTime, DateTime]} props.fullTimeRange - Full time range for the chart
 * @param {[DateTime, DateTime]} props.selectedTimeRange - Currently selected time range
 * @param {Function} props.setSelectedTimeRange - Function to update selected time range
 * @param {boolean} [props.showTwilight=false] - Whether to show twilight lines
 * @param {number[]} [props.twilightValues=[]] - Twilight times in milliseconds
 * @param {boolean} [props.showMoonArea=false] - Whether to show moon-up areas
 * @param {Array<[number, number]>} [props.moonIntervals=[]] - Moon-up intervals
 * @param {boolean} [props.showMoonIllumination=false] - Whether to show moon illumination labels
 * @param {Array<{dayobs: string, illum: string}>} [props.illumValues=[]] - Moon illumination values
 * @param {string} [props.selectionFill='pink'] - Fill color for selection rectangles
 * @param {Function} [props.onMouseDown] - Optional callback for mouseDown event
 * @param {Function} [props.onMouseMove] - Optional callback for mouseMove event
 * @param {Function} [props.onMouseUp] - Optional callback for mouseUp event
 * @param {Function} [props.onDoubleClick] - Optional callback for doubleClick event
 */
function TimelineChart({
  data,
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  showTwilight = false,
  twilightValues = [],
  showMoonArea = false,
  moonIntervals = [],
  showMoonIllumination = false,
  illumValues = [],
  selectionFill = "pink",
}) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);

  // Track latest prop values in refs for use inside event handlers without
  // needing to re-register them on every render.
  const fullTimeRangeRef = useRef(fullTimeRange);
  const selectedTimeRangeRef = useRef(selectedTimeRange);
  const setSelectedTimeRangeRef = useRef(setSelectedTimeRange);
  useEffect(() => {
    fullTimeRangeRef.current = fullTimeRange;
  }, [fullTimeRange]);
  useEffect(() => {
    selectedTimeRangeRef.current = selectedTimeRange;
  }, [selectedTimeRange]);
  useEffect(() => {
    setSelectedTimeRangeRef.current = setSelectedTimeRange;
  }, [setSelectedTimeRange]);

  const prevDataRef = useRef(null);
  const scatterEChartsDataRef = useRef(null);

  const computedHeight =
    data.length * TIMELINE_DIMENSIONS.SERIES_ROW_HEIGHT +
    TIMELINE_DIMENSIONS.BASE_HEIGHT +
    (showMoonIllumination ? TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT : 0) +
    (showTwilight ? TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT : 0);

  // ── Init / destroy ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const instance = echarts.init(el, null, { renderer: "canvas" });
    instanceRef.current = instance;

    // Resize on container size changes
    const observer = new ResizeObserver(() => {
      instance.resize();
      updateGraphicElements(instance);
    });
    observer.observe(el);

    // ── Brush (drag selection) ────────────────────────────────────────────────
    instance.on("brushEnd", (params) => {
      const ft = fullTimeRangeRef.current;
      const setter = setSelectedTimeRangeRef.current;
      if (!params.areas.length) {
        setter(ft);
        return;
      }
      const [startMs, endMs] = params.areas[0].coordRange;
      const min = millisToDateTime(Math.round(Math.min(startMs, endMs)));
      const max = millisToDateTime(Math.round(Math.max(startMs, endMs)));
      setter([min, max]);
    });

    // ── Double-click reset ────────────────────────────────────────────────────
    // Use native DOM listener — the brush component intercepts mouse events and
    // prevents ECharts' own dblclick from firing.
    const handleDblClick = () => {
      instance.dispatchAction({ type: "brush", areas: [] });
      setSelectedTimeRangeRef.current(fullTimeRangeRef.current);
    };
    el.addEventListener("dblclick", handleDblClick);

    return () => {
      el.removeEventListener("dblclick", handleDblClick);
      observer.disconnect();
      instance.dispose();
      instanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Escape key reset ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      instanceRef.current?.dispatchAction({ type: "brush", areas: [] });
      setSelectedTimeRangeRef.current(fullTimeRangeRef.current);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Sync brush from external selectedTimeRange changes ──────────────────────
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !fullTimeRange[0] || !fullTimeRange[1]) return;

    const isFullRange =
      selectedTimeRange[0].toMillis() === fullTimeRange[0].toMillis() &&
      selectedTimeRange[1].toMillis() === fullTimeRange[1].toMillis();

    if (isFullRange) {
      instance.dispatchAction({ type: "brush", areas: [] });
    } else {
      instance.dispatchAction({
        type: "brush",
        areas: [
          {
            brushType: "lineX",
            coordRange: [
              selectedTimeRange[0].toMillis(),
              selectedTimeRange[1].toMillis(),
            ],
            xAxisIndex: 0,
          },
        ],
      });
    }
  }, [selectedTimeRange, fullTimeRange]);

  // ── Graphic elements (dayobs labels, borders, moon symbols) ─────────────────
  // These are positioned in pixel space, so must be computed after render.
  // Defined before the option useEffect so it can be in its dependency array.
  const updateGraphicElements = useCallback(
    (instance) => {
      const xMinMillis = fullTimeRange[0]?.toMillis();
      const xMaxMillis = fullTimeRange[1]?.toMillis();
      if (!xMinMillis || !xMaxMillis) return;

      const hourlyTicks = generateHourlyTicks(
        xMinMillis,
        xMaxMillis + 60000,
        TIMELINE_INTERVALS.HOURLY_TICK_INTERVAL,
      );

      // Get pixel x bounds from the axis (reliable for value-type x-axis)
      const gridLeft = instance.convertToPixel({ xAxisIndex: 0 }, xMinMillis);
      const gridRight = instance.convertToPixel({ xAxisIndex: 0 }, xMaxMillis);
      if (gridLeft == null || gridRight == null) return;

      // Derive grid y bounds from our own margin constants — convertToPixel
      // on a category y-axis returns the row centre, not the grid edge.
      const containerHeight =
        containerRef.current?.offsetHeight ?? computedHeight;
      const fontFamily = getComputedStyle(containerRef.current).fontFamily;
      const bottomMargin =
        TIMELINE_MARGINS.bottom +
        (showTwilight ? TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT : 0);
      const gridBottom = containerHeight - bottomMargin;

      const elements = [];

      for (const tickMs of hourlyTicks) {
        const dt = millisToDateTime(tickMs);
        const hourUTC = dt.hour;
        const pixelX = instance.convertToPixel({ xAxisIndex: 0 }, tickMs);
        if (pixelX == null) continue;

        // ── UTC midday: dayobs border line ──────────────────────────────────
        if (hourUTC === 12) {
          elements.push({
            type: "line",
            silent: true,
            shape: {
              x1: pixelX,
              y1: 0,
              x2: pixelX,
              y2: containerHeight,
            },
            style: {
              stroke: TIMELINE_COLORS.DAYOBS_BORDER,
              lineWidth: 1,
            },
          });
          continue;
        }

        // ── UTC midnight: date label ─────────────────────────────────────────
        if (hourUTC === 0) {
          elements.push({
            type: "text",
            silent: true,
            x: pixelX,
            y:
              gridBottom +
              TIMELINE_DIMENSIONS.DIST_BELOW_X_AXIS +
              (showTwilight ? TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT : 0),
            style: {
              text: dayobsAtMidnight(dt, "yyyy-LL-dd"),
              textAlign: "center",
              fill: showTwilight
                ? TIMELINE_COLORS.DAYOBS_LABEL_DIM
                : TIMELINE_COLORS.DAYOBS_LABEL,
              fontSize: TIMELINE_DIMENSIONS.LABEL_TEXT_SIZE,
              fontFamily,
              userSelect: "none",
            },
          });
          continue;
        }

        // ── Chile midnight: moon illumination symbol ─────────────────────────
        if (showMoonIllumination) {
          const dtChile = dt.setZone("America/Santiago");
          if (dtChile.hour === 0) {
            const dayobs = dayobsAtMidnight(dtChile, "yyyyLLdd");
            const illumEntry = illumValues.find(
              (entry) => entry.dayobs === dayobs,
            );
            const illumLabel = illumEntry?.illum ?? null;

            if (illumLabel) {
              const r = TIMELINE_DIMENSIONS.MOON_RADIUS;
              const xOff = TIMELINE_DIMENSIONS.X_OFFSET;
              const moonY = r; // offset down by radius so symbol isn't clipped at top

              elements.push({
                type: "group",
                silent: true,
                x: pixelX,
                y: moonY,
                children: [
                  {
                    type: "circle",
                    shape: { cx: -xOff, cy: 0, r },
                    style: { fill: TIMELINE_COLORS.MOON_SYMBOL_LIGHT },
                  },
                  {
                    type: "circle",
                    shape: { cx: -xOff + r / 2, cy: -r / 2, r },
                    style: { fill: TIMELINE_COLORS.MOON_SYMBOL_DARK },
                  },
                  {
                    type: "text",
                    x: xOff,
                    y: -r,
                    style: {
                      text: illumLabel,
                      fill: TIMELINE_COLORS.MOON_LABEL,
                      fontSize: TIMELINE_TEXT_STYLES.LABEL_FONT_SIZE,
                      fontWeight: TIMELINE_TEXT_STYLES.LABEL_FONT_WEIGHT,
                      fontFamily,
                      userSelect: "none",
                    },
                  },
                ],
              });
            }
          }
        }
      }

      instance.setOption({ graphic: elements });
    },
    [
      fullTimeRange,
      showMoonIllumination,
      illumValues,
      computedHeight,
      showTwilight,
    ],
  );

  // ── Build and apply the ECharts option ─────────────────────────────────────
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    const xMinMillis = fullTimeRange[0]?.toMillis();
    const xMaxMillis = fullTimeRange[1]?.toMillis();
    if (!xMinMillis || !xMaxMillis) return;

    // Skip full rebuild when only isActive changed — targeted effect handles it.
    const prevData = prevDataRef.current;
    const isOnlyActiveChange =
      prevData !== null &&
      prevData !== data &&
      prevData.length === data.length &&
      data.every(
        (entry, i) =>
          entry.timestamps === prevData[i].timestamps &&
          entry.color === prevData[i].color,
      );
    if (isOnlyActiveChange) return;

    const isSingleSeries = data.length === 1;

    // Category IDs for the Y axis — fall back to stringified index if no id
    const categoryIds = data.map((entry) => entry.id ?? String(entry.index));

    // Hourly ticks for grid lines
    const hourlyTicks = generateHourlyTicks(
      xMinMillis,
      xMaxMillis + 60000,
      TIMELINE_INTERVALS.HOURLY_TICK_INTERVAL,
    );

    // ── Series ────────────────────────────────────────────────────────────────

    // Row lines: one thin horizontal line per series
    const rowLineSeries = data.map((entry, i) => ({
      type: "line",
      z: 1,
      id: `row-line-${i}`,
      data: [
        [xMinMillis, categoryIds[i]],
        [xMaxMillis, categoryIds[i]],
      ],
      lineStyle: {
        color: isSingleSeries
          ? TIMELINE_COLORS.SINGLE_SERIES_LINE
          : TIMELINE_COLORS.MULTI_SERIES_LINE,
        width: isSingleSeries
          ? TIMELINE_COLORS.SINGLE_SERIES_STROKE_WIDTH
          : TIMELINE_COLORS.MULTI_SERIES_STROKE_WIDTH,
        opacity: entry.isActive
          ? TIMELINE_OPACITY.ACTIVE
          : TIMELINE_OPACITY.INACTIVE,
      },
      symbol: "none",
      animation: false,
      silent: true,
    }));

    // Memoised scatter data — reuse arrays when only isActive changed.
    const timestampsChanged =
      !prevData ||
      prevData.length !== data.length ||
      data.some((entry, i) => entry.timestamps !== prevData[i].timestamps);
    if (timestampsChanged) {
      scatterEChartsDataRef.current = data.map((entry, i) =>
        entry.timestamps.map((t) => [t, categoryIds[i]]),
      );
    }

    console.debug(
      "[TimelineChart] series counts:",
      data.map((entry, i) => ({
        id: `data-${i}`,
        label: entry.label ?? entry.color,
        count: entry.timestamps.length,
        isActive: entry.isActive,
      })),
    );

    // Data point scatter series: one per entry
    const scatterSeries = data.map((entry, i) => ({
      type: "scatter",
      id: `data-${i}`,
      data: scatterEChartsDataRef.current[i],
      symbol: "path://M 0.5,0 L 1,8 L 0.5,16 L 0,8 Z",
      symbolSize: [
        TIMELINE_MARKER.DEFAULT_WIDTH,
        TIMELINE_MARKER.DEFAULT_HEIGHT,
      ],
      itemStyle: {
        color: entry.color,
        opacity: entry.isActive
          ? TIMELINE_OPACITY.ACTIVE
          : TIMELINE_OPACITY.INACTIVE,
      },
      animation: false,
      silent: true,
    }));

    // Moon-up areas — dedicated host series
    const moonSeries = {
      type: "scatter",
      id: "moon-areas",
      data: [],
      silent: true,
      animation: false,
      markArea:
        showMoonArea && moonIntervals.length
          ? {
              silent: true,
              itemStyle: {
                color: TIMELINE_COLORS.MOON_AREA_FILL,
                opacity: TIMELINE_COLORS.MOON_AREA_OPACITY,
              },
              data: moonIntervals.map(([start, end]) => [
                { xAxis: start },
                { xAxis: end },
              ]),
            }
          : { data: [] },
    };

    // Twilight lines — dedicated host series
    const twilightSeries = {
      type: "scatter",
      id: "twilight-lines",
      data: [],
      silent: true,
      animation: false,
      markLine:
        showTwilight && twilightValues.length
          ? {
              silent: true,
              symbol: ["none", "none"],
              lineStyle: {
                color: TIMELINE_COLORS.TWILIGHT_LINE,
                width: TIMELINE_COLORS.TWILIGHT_STROKE_WIDTH,
                type: "solid",
              },
              data: twilightValues
                .filter((twi) => xMinMillis <= twi && twi <= xMaxMillis)
                .map((twi) => ({
                  xAxis: twi,
                  label: {
                    show: true,
                    formatter: millisToHHmm(twi),
                    position: "end",
                    distance: 10,
                    rotate: 0,
                    color: TIMELINE_COLORS.TWILIGHT_LABEL,
                    fontSize: TIMELINE_TEXT_STYLES.LABEL_FONT_SIZE,
                    fontWeight: TIMELINE_TEXT_STYLES.LABEL_FONT_WEIGHT,
                    letterSpacing: TIMELINE_TEXT_STYLES.LABEL_LETTER_SPACING,
                  },
                })),
            }
          : { data: [] },
    };

    const option = {
      animation: false,
      toolbox: { show: false },
      grid: {
        top:
          TIMELINE_MARGINS.top +
          (showMoonIllumination ? TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT : 0),
        right: TIMELINE_MARGINS.right,
        left: TIMELINE_MARGINS.left,
        bottom:
          TIMELINE_MARGINS.bottom +
          (showTwilight ? TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT : 0),
        containLabel: false,
      },
      xAxis: {
        type: "value",
        min: xMinMillis,
        max: xMaxMillis,
        show: false,
        splitLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: categoryIds,
        inverse: true,
        show: false,
      },
      brush: {
        toolbox: [],
        xAxisIndex: 0,
        brushType: "lineX",
        brushStyle: {
          borderColor: TIMELINE_COLORS.SELECTION_STROKE,
          color: selectionFill,
          opacity: TIMELINE_COLORS.SELECTION_FILL_OPACITY,
          borderWidth: 4,
        },
        inBrush: {},
        outOfBrush: {},
      },
      series: [
        // Invisible host series for hourly grid lines
        {
          type: "scatter",
          id: "grid-lines",
          data: [],
          silent: true,
          animation: false,
          markLine: {
            silent: true,
            symbol: ["none", "none"],
            lineStyle: {
              color: TIMELINE_COLORS.GRID_LINE,
              opacity: TIMELINE_COLORS.GRID_OPACITY,
              width: 1,
              type: "solid",
            },
            label: { show: false },
            data: hourlyTicks.map((tick) => ({ xAxis: tick })),
          },
        },
        moonSeries,
        twilightSeries,
        ...rowLineSeries,
        ...scatterSeries,
      ],
    };

    instance.setOption(option, { notMerge: false });

    // Activate brush mode permanently — without this the brush is inert
    // because there's no toolbox button to enable it.
    instance.dispatchAction({
      type: "takeGlobalCursor",
      key: "brush",
      brushOption: { brushType: "lineX", brushMode: "single" },
    });

    // Restore brush from URL params on load — but only if it's a sub-range.
    // Must run after setOption (brush component must exist) and after
    // takeGlobalCursor (brush mode must be active).
    const sr = selectedTimeRangeRef.current;
    const fr = fullTimeRangeRef.current;
    const isFullRange =
      sr?.[0]?.toMillis() === fr?.[0]?.toMillis() &&
      sr?.[1]?.toMillis() === fr?.[1]?.toMillis();
    if (sr && fr && sr[0] && sr[1] && !isFullRange) {
      instance.dispatchAction({
        type: "brush",
        areas: [
          {
            brushType: "lineX",
            coordRange: [sr[0].toMillis(), sr[1].toMillis()],
            xAxisIndex: 0,
          },
        ],
      });
    }

    // Defer graphic elements until ECharts has finished rendering,
    // since convertToPixel is only valid after the chart is laid out.
    setTimeout(() => updateGraphicElements(instance), 0);
  }, [
    data,
    fullTimeRange,
    showTwilight,
    twilightValues,
    showMoonArea,
    moonIntervals,
    showMoonIllumination,
    illumValues,
    selectionFill,
    updateGraphicElements,
  ]);

  // ── Targeted isActive update ────────────────────────────────────────────────
  useEffect(() => {
    const prevData = prevDataRef.current;
    prevDataRef.current = data;

    if (!prevData || prevData.length !== data.length) return;
    const isOnlyActiveChange = data.every(
      (entry, i) =>
        entry.timestamps === prevData[i].timestamps &&
        entry.color === prevData[i].color,
    );
    if (!isOnlyActiveChange) return;

    const instance = instanceRef.current;
    if (!instance) return;

    instance.setOption(
      {
        series: [
          ...data.map((entry, i) => ({
            id: `row-line-${i}`,
            lineStyle: {
              opacity: entry.isActive
                ? TIMELINE_OPACITY.ACTIVE
                : TIMELINE_OPACITY.INACTIVE,
            },
          })),
          ...data.map((entry, i) => ({
            id: `data-${i}`,
            itemStyle: {
              opacity: entry.isActive
                ? TIMELINE_OPACITY.ACTIVE
                : TIMELINE_OPACITY.INACTIVE,
            },
          })),
        ],
      },
      { notMerge: false },
    );
  }, [data]);

  // Re-run graphic elements when the relevant props change
  useEffect(() => {
    const instance = instanceRef.current;
    if (instance) updateGraphicElements(instance);
  }, [updateGraphicElements]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: computedHeight,
        userSelect: "none",
      }}
    />
  );
}

export default TimelineChart;
