import { useCallback, useEffect, useRef } from "react";

import { millisToDateTime, dayobsAtMidnight } from "@/utils/timeUtils";
import {
  generateHourlyTicks,
  buildBrushConfig,
  buildGridLinesSeries,
  buildTwilightSeries,
  buildTimelineGraphicElements,
} from "@/utils/timelineUtils";
import {
  TIMELINE_DIMENSIONS,
  TIMELINE_MARGINS,
  TIMELINE_COLORS,
  TIMELINE_TEXT_STYLES,
  TIMELINE_OPACITY,
  TIMELINE_INTERVALS,
  TIMELINE_MARKER,
} from "@/constants/TIMELINE_DEFINITIONS";
import { useEChartsTimeline } from "@/hooks/useEChartsTimeline";

/**
 * Unified timeline chart component for displaying events over time.
 *
 * @param {Object} props
 * @param {Array<{index: number, timestamps: number[], color: string, isActive: boolean}>} props.data - Data series to display
 * @param {[DateTime, DateTime]} props.fullTimeRange - Full time range for the chart
 * @param {[DateTime, DateTime]} props.selectedTimeRange - Currently selected time range
 * @param {Function} props.setSelectedTimeRange - Function to update selected time range
 * @param {number[]} [props.twilightValues=[]] - Twilight times in milliseconds (shown when non-empty)
 * @param {boolean} [props.showMoonArea=false] - Whether to show moon-up areas
 * @param {Array<[number, number]>} [props.moonIntervals=[]] - Moon-up intervals
 * @param {boolean} [props.showMoonIllumination=false] - Whether to show moon illumination labels
 * @param {Array<{dayobs: string, illum: string}>} [props.illumValues=[]] - Moon illumination values
 */
function TimelineChart({
  data,
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  twilightValues = [],
  showMoonArea = false,
  moonIntervals = [],
  showMoonIllumination = false,
  illumValues = [],
  brushGroup,
}) {
  const containerRef = useRef(null);

  const prevDataRef = useRef(null);
  const scatterEChartsDataRef = useRef(null);

  const computedHeight =
    data.length * TIMELINE_DIMENSIONS.SERIES_ROW_HEIGHT +
    TIMELINE_DIMENSIONS.BASE_HEIGHT;

  // ── Graphic elements (dayobs labels, borders, moon symbols) ─────────────────
  // These are positioned in pixel space, so must be computed after render.
  // Defined before the option useEffect so it can be in its dependency array.
  const updateGraphicElements = useCallback(
    (instance) => {
      const result = buildTimelineGraphicElements(instance, containerRef, {
        fullTimeRange,
        computedHeight,
        showBaseline: data?.length > 1,
      });
      if (!result) return;

      const { elements, fontFamily } = result;

      // ── Chile midnight: moon illumination symbol ─────────────────────────
      if (showMoonIllumination) {
        const xMinMillis = fullTimeRange[0]?.toMillis();
        const xMaxMillis = fullTimeRange[1]?.toMillis();
        const hourlyTicks = generateHourlyTicks(
          xMinMillis,
          xMaxMillis + 60000,
          TIMELINE_INTERVALS.HOURLY_TICK_INTERVAL,
        );

        for (const tickMs of hourlyTicks) {
          const dt = millisToDateTime(tickMs);
          // Skip hours already handled by buildDayobsGraphicElements
          if (dt.hour === 12 || dt.hour === 0) continue;

          const dtChile = dt.setZone("America/Santiago");
          if (dtChile.hour !== 0) continue;

          const pixelX = instance.convertToPixel({ xAxisIndex: 0 }, tickMs);
          if (pixelX == null) continue;

          const dayobs = dayobsAtMidnight(dtChile, "yyyyLLdd");
          const illumEntry = illumValues.find(
            (entry) => entry.dayobs === dayobs,
          );
          const illumLabel = illumEntry?.illum ?? null;
          if (!illumLabel) continue;

          const r = TIMELINE_DIMENSIONS.MOON_RADIUS;
          const xOff = TIMELINE_DIMENSIONS.X_OFFSET;
          const moonY = r; // offset down by radius so symbol isn't clipped at top

          elements.push({
            type: "group",
            silent: true,
            z: 0,
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

      instance.setOption({ graphic: elements });
    },
    [data, fullTimeRange, showMoonIllumination, illumValues, computedHeight],
  );

  const { instanceRef, syncBrushToSelection, xAxisOption } = useEChartsTimeline(
    containerRef,
    {
      fullTimeRange,
      selectedTimeRange,
      setSelectedTimeRange,
      onResize: updateGraphicElements,
      brushGroup,
    },
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
      z: -1,
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
      large: true,
      largeThreshold: 1,
      itemStyle: {
        color: entry.color,
        opacity: entry.isActive
          ? TIMELINE_OPACITY.ACTIVE
          : TIMELINE_OPACITY.INACTIVE,
      },
      animation: false,
      silent: true,
      z: 3,
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

    const option = {
      animation: false,
      toolbox: { show: false },
      grid: {
        top: TIMELINE_MARGINS.top,
        right: TIMELINE_MARGINS.right,
        left: TIMELINE_MARGINS.left,
        bottom: TIMELINE_MARGINS.bottom,
        containLabel: false,
      },
      xAxis: xAxisOption,
      yAxis: {
        type: "category",
        data: categoryIds,
        inverse: true,
        show: false,
        boundaryGap: false,
        min: -1,
        max: categoryIds.length,
      },
      brush: buildBrushConfig(),
      series: [
        buildGridLinesSeries(hourlyTicks),
        moonSeries,
        buildTwilightSeries(
          "twilight-lines",
          twilightValues,
          "solid",
          xMinMillis,
          xMaxMillis,
        ),
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

    // Sync brush to URL-restored selection — must run after setOption (brush
    // component must exist) and after takeGlobalCursor (brush mode must be active).
    syncBrushToSelection();

    // Defer graphic elements until ECharts has finished rendering,
    // since convertToPixel is only valid after the chart is laid out.
    setTimeout(() => updateGraphicElements(instance), 0);
  }, [
    data,
    fullTimeRange,
    xAxisOption,
    twilightValues,
    showMoonArea,
    moonIntervals,
    showMoonIllumination,
    illumValues,
    updateGraphicElements,
    syncBrushToSelection,
    instanceRef,
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
  }, [data, instanceRef]);

  // Re-run graphic elements when the relevant props change
  useEffect(() => {
    const instance = instanceRef.current;
    if (instance) updateGraphicElements(instance);
  }, [updateGraphicElements, instanceRef]);

  return (
    <div
      ref={containerRef}
      data-testid="timeline-chart"
      style={{
        width: "100%",
        minWidth: 0,
        height: computedHeight,
        overflow: "hidden",
        userSelect: "none",
      }}
    />
  );
}

export default TimelineChart;
