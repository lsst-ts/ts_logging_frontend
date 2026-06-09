import { useCallback, useEffect, useRef } from "react";
import * as echarts from "echarts";

import {
  generateHourlyTicks,
  buildBrushConfig,
  buildGridLinesSeries,
  buildTwilightSeries,
  buildDayobsGraphicElements,
} from "@/utils/timelineUtils";
import { transformStatusToSeries } from "@/utils/observatoryStatusUtils";
import {
  SERIES_ORDER,
  STATUS_COLORS,
  STATUS_TIMELINE_DIMENSIONS,
  STATUS_TIMELINE_MARGINS,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import {
  TIMELINE_MARGINS,
  TIMELINE_DIMENSIONS,
  TIMELINE_INTERVALS,
} from "@/constants/TIMELINE_DEFINITIONS";
import { useEChartsTimeline } from "@/hooks/useEChartsTimeline";

/**
 * Observatory status timeline component.
 *
 * Displays 7 parallel series showing when each observatory state was active,
 * derived from a bitmask status feed. Shares the selection brush with
 * TimelineChart via the shared selectedTimeRange / setSelectedTimeRange props.
 *
 * @param {Object} props
 * @param {Array<{time: string, status: number, note: string, statusLabels: string, time_ms: number}>} props.entries
 * @param {[DateTime, DateTime]} props.fullTimeRange
 * @param {[DateTime, DateTime]} props.selectedTimeRange
 * @param {Function} props.setSelectedTimeRange
 * @param {number[]} [props.twilightValues=[]] - 12° twilight times in ms (solid line)
 * @param {number[]} [props.twilight0DegValues=[]] - 0° twilight times in ms (dashed line)
 */
function ObservatoryStatusTimeline({
  entries = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  twilightValues = [],
  twilight0DegValues = [],
}) {
  const containerRef = useRef(null);

  const computedHeight =
    SERIES_ORDER.length * STATUS_TIMELINE_DIMENSIONS.SERIES_ROW_HEIGHT +
    STATUS_TIMELINE_DIMENSIONS.BASE_HEIGHT +
    TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT; // space for twilight labels below x-axis

  // ── Graphic elements (dayobs labels and border lines) ───────────────────────
  // These are positioned in pixel space, so must be computed after render.
  // Defined before the option useEffect so it can be in its dependency array.
  const updateGraphicElements = useCallback(
    (instance) => {
      // showTwilight=true because we always show twilight on this chart,
      // which dims and shifts down the dayobs date labels.
      const result = buildDayobsGraphicElements(instance, containerRef, {
        fullTimeRange,
        computedHeight,
        showTwilight: true,
      });
      if (!result) return;

      instance.setOption({ graphic: result.elements });
    },
    [fullTimeRange, computedHeight],
  );

  const { instanceRef, syncBrushToSelection } = useEChartsTimeline(
    containerRef,
    {
      fullTimeRange,
      selectedTimeRange,
      setSelectedTimeRange,
      onResize: updateGraphicElements,
    },
  );

  // ── Build and apply the ECharts option ─────────────────────────────────────
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    const xMinMillis = fullTimeRange[0]?.toMillis();
    const xMaxMillis = fullTimeRange[1]?.toMillis();
    if (!xMinMillis || !xMaxMillis) return;

    // Transform status entries into per-state interval arrays
    const series = transformStatusToSeries(entries, xMaxMillis);

    // Flatten all intervals into a single data array for the custom bar series,
    // and a parallel array for the start-of-interval markers.
    const barData = [];
    const markerData = [];

    for (const stateName of SERIES_ORDER) {
      const catIdx = SERIES_ORDER.indexOf(stateName);
      for (const interval of series[stateName]) {
        barData.push({
          value: [interval.start, interval.end, catIdx],
          itemStyle: { color: STATUS_COLORS[stateName] },
          stateName,
          note: interval.note,
          time: interval.time,
        });
        // Marker at the start of each interval
        markerData.push({
          value: [interval.start, catIdx],
          stateName,
          hasNote: !!interval.note,
          note: interval.note,
          time: interval.time,
        });
      }
    }

    // Hourly ticks for grid lines
    const hourlyTicks = generateHourlyTicks(
      xMinMillis,
      xMaxMillis + 60000,
      TIMELINE_INTERVALS.HOURLY_TICK_INTERVAL,
    );

    const option = {
      animation: false,
      toolbox: { show: false },
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(0,0,0,0.75)",
        borderColor: "#555",
        textStyle: { color: "#fff", fontSize: 12 },
        formatter: (params) => {
          if (params.seriesId !== "markers") return undefined;
          const { time, note, hasNote } = params.data;
          if (!hasNote) return time;
          // Escape HTML to prevent XSS while displaying raw text
          const escapedNote = note
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
          return `${time}<br/>${escapedNote}`;
        },
      },
      grid: {
        top: STATUS_TIMELINE_MARGINS.top,
        right: STATUS_TIMELINE_MARGINS.right,
        left: STATUS_TIMELINE_MARGINS.left,
        bottom:
          STATUS_TIMELINE_MARGINS.bottom +
          TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT,
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
        data: SERIES_ORDER,
        inverse: true, // category[0] at top, matching the label div render order
        show: false,
        boundaryGap: true,
      },
      brush: buildBrushConfig(),
      series: [
        buildGridLinesSeries(hourlyTicks),
        // 12° twilight — solid blue line
        buildTwilightSeries(
          "twilight-12deg",
          twilightValues,
          "solid",
          xMinMillis,
          xMaxMillis,
        ),
        // 0° twilight — dashed blue line
        buildTwilightSeries(
          "twilight-0deg",
          twilight0DegValues,
          "dashed",
          xMinMillis,
          xMaxMillis,
        ),
        // Status interval bars — custom series renders one rect per interval
        {
          type: "custom",
          id: "status-bars",
          renderItem: (params, api) => {
            const startMs = api.value(0);
            const endMs = api.value(1);
            const catIdx = api.value(2);

            const startCoord = api.coord([startMs, catIdx]);
            const endCoord = api.coord([endMs, catIdx]);
            const barH = STATUS_TIMELINE_DIMENSIONS.BAR_HEIGHT;

            // Clip rect to the chart grid area to avoid overdraw
            const rectShape = echarts.graphic.clipRectByRect(
              {
                x: startCoord[0],
                y: startCoord[1] - barH / 2,
                width: endCoord[0] - startCoord[0],
                height: barH,
              },
              {
                x: params.coordSys.x,
                y: params.coordSys.y,
                width: params.coordSys.width,
                height: params.coordSys.height,
              },
            );

            return (
              rectShape && {
                type: "rect",
                shape: rectShape,
                style: api.style(),
              }
            );
          },
          encode: { x: [0, 1], y: 2 },
          data: barData,
          animation: false,
          silent: true,
          z: 3,
        },
        // Markers at the start of each interval: diamond if has note, circle if not
        {
          type: "scatter",
          id: "markers",
          data: markerData,
          symbol: (value, params) =>
            params.data.hasNote ? "diamond" : "circle",
          symbolSize: (value, params) =>
            params.data.hasNote
              ? STATUS_TIMELINE_DIMENSIONS.MARKER_SIZE_WITH_NOTE
              : STATUS_TIMELINE_DIMENSIONS.MARKER_SIZE,
          itemStyle: {
            color: (params) =>
              STATUS_COLORS[params.data.stateName] ?? STATUS_COLORS.UNKNOWN,
            borderColor: "white",
            borderWidth: 1,
          },
          animation: false,
          z: 4,
        },
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
    entries,
    fullTimeRange,
    twilightValues,
    twilight0DegValues,
    updateGraphicElements,
    syncBrushToSelection,
    instanceRef,
  ]);

  // Re-run graphic elements when the relevant props change
  useEffect(() => {
    const instance = instanceRef.current;
    if (instance) updateGraphicElements(instance);
  }, [updateGraphicElements, instanceRef]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: computedHeight, userSelect: "none" }}
    />
  );
}

export default ObservatoryStatusTimeline;
