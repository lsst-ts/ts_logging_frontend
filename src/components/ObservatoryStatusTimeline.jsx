import { useCallback, useEffect, useRef } from "react";
import * as echarts from "echarts";

import {
  buildBrushConfig,
  buildTwilightSeries,
  buildTimelineGraphicElements,
} from "@/utils/timelineUtils";
import { transformStatusToSeries } from "@/utils/observatoryStatusUtils";
import { formatTimestamp } from "@/utils/timeUtils";
import {
  SERIES_ORDER,
  STATUS_COLORS,
  STATUS_BAR_COLORS,
  STATUS_TIMELINE_DIMENSIONS,
  STATUS_TIMELINE_MARGINS,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import {
  TIMELINE_MARGINS,
  TIMELINE_DIMENSIONS,
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
  brushGroup,
}) {
  const containerRef = useRef(null);
  const markerDataRef = useRef([]);
  const markerSeriesIdxRef = useRef(-1);

  // Grid data area = (N series + 1 buffer unit for min:-1) × row height,
  // plus top and bottom margins.
  const computedHeight =
    (SERIES_ORDER.length + 1) * STATUS_TIMELINE_DIMENSIONS.SERIES_ROW_HEIGHT +
    STATUS_TIMELINE_MARGINS.top +
    STATUS_TIMELINE_MARGINS.bottom;

  // ── Graphic elements (dayobs labels, border lines, baseline) ────────────────
  // These are positioned in pixel space, so must be computed after render.
  // Defined before the option useEffect so it can be in its dependency array.
  const updateGraphicElements = useCallback(
    (instance) => {
      const result = buildTimelineGraphicElements(instance, containerRef, {
        fullTimeRange,
        computedHeight,
        showBaseline: true,
      });
      if (!result) return;

      instance.setOption({ graphic: result.elements });
    },
    [fullTimeRange, computedHeight],
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

  // ── Tooltip hit detection (brush intercepts ECharts mouse events) ──────────
  // The brush overlay captures all pointer events, so ECharts' own hover
  // never fires over a brush selection. We listen natively, find the nearest
  // marker by pixel distance, and dispatch showTip with a concrete
  // seriesIndex+dataIndex (bypasses internal hit testing entirely).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let activeDataIndex = -1;

    const handleMouseMove = (e) => {
      const instance = instanceRef.current;
      const seriesIdx = markerSeriesIdxRef.current;
      if (!instance || seriesIdx === -1) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const data = markerDataRef.current;
      let closestIdx = -1;
      let closestDist = Infinity;
      let closestPixel = null;

      for (let i = 0; i < data.length; i++) {
        const pixel = instance.convertToPixel(
          { seriesIndex: seriesIdx },
          data[i].value,
        );
        if (!pixel) continue;
        const dx = pixel[0] - mouseX;
        const dy = pixel[1] - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius =
          (data[i].hasNote
            ? STATUS_TIMELINE_DIMENSIONS.MARKER_SIZE_WITH_NOTE
            : STATUS_TIMELINE_DIMENSIONS.MARKER_SIZE) / 2;
        if (dist < radius && dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
          closestPixel = pixel;
        }
      }

      if (closestIdx === activeDataIndex) return;
      activeDataIndex = closestIdx;

      if (closestIdx !== -1) {
        instance.dispatchAction({
          type: "showTip",
          seriesIndex: seriesIdx,
          dataIndex: closestIdx,
          x: closestPixel[0],
          y: closestPixel[1],
        });
      } else {
        instance.dispatchAction({ type: "hideTip" });
      }
    };

    const handleMouseLeave = () => {
      activeDataIndex = -1;
      instanceRef.current?.dispatchAction({ type: "hideTip" });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build and apply the ECharts option ─────────────────────────────────────
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    const xMinMillis = fullTimeRange[0]?.toMillis();
    const xMaxMillis = fullTimeRange[1]?.toMillis();
    if (!xMinMillis || !xMaxMillis) return;

    // Transform status entries into per-state interval arrays.
    // Cap the end time at now so bars don't extend into the future
    // when viewing a night that is still in progress.
    const series = transformStatusToSeries(
      entries,
      Math.min(xMaxMillis, Date.now()),
    );

    // Flatten all intervals into a single data array for the custom bar series,
    // and a parallel array for the start-of-interval markers.
    const barData = [];
    const markerData = [];

    for (const stateName of SERIES_ORDER) {
      const catIdx = SERIES_ORDER.indexOf(stateName);
      for (const interval of series[stateName]) {
        barData.push({
          value: [interval.start, interval.end, catIdx],
          itemStyle: { color: STATUS_BAR_COLORS[stateName] },
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
          time_ms: interval.start,
          duration: interval.duration,
          stateChange: interval.stateChange,
        });
      }
    }

    markerDataRef.current = markerData;

    const option = {
      animation: false,
      toolbox: { show: false },
      tooltip: {
        trigger: "item",
        triggerOn: "none",
        backgroundColor: "rgba(0,0,0,1)",
        borderColor: "#555",
        textStyle: { color: "#fff", fontSize: 12 },
        // Replicates ECharts' native tooltip positioning, which is lost when
        // the tooltip is triggered programmatically via dispatchAction.
        // Positions the tooltip to the right of the marker with a 10px gap,
        // flipping to the left if it would overflow the chart. Vertically
        // centered on the marker, clamped to stay within the chart bounds.
        position: (point, _params, _dom, _rect, size) => {
          const [x, y] = point;
          const [cw, ch] = size.contentSize;
          const [vw, vh] = size.viewSize;
          const offset = 28;
          const tx = x + offset + cw <= vw ? x + offset : x - offset - cw;
          const ty = Math.max(0, Math.min(y - ch / 2, vh - ch));
          return [tx, ty];
        },
        formatter: (params) => {
          if (params.seriesId !== "markers") return undefined;
          const { time_ms, duration, stateChange, note } = params.data;

          // Format time using the standard formatter
          const timeFormatted = formatTimestamp(time_ms);

          // Escape HTML to prevent XSS while displaying raw text
          const escapedNote = note
            ? note
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
            : "";

          // Build two-column tooltip HTML with Tailwind classes
          return `
            <div class="font-mono text-stone-100 max-w-[420px]">
              <table class="border-collapse">
                <tr>
                  <td class="font-semibold pr-3 whitespace-nowrap text-stone-100">Time:</td>
                  <td class="text-stone-100 whitespace-nowrap">${timeFormatted}</td>
                </tr>
                <tr>
                  <td class="font-semibold pr-3 whitespace-nowrap text-stone-100">Duration:</td>
                  <td class="text-stone-100 whitespace-nowrap">${duration}</td>
                </tr>
                <tr>
                  <td class="font-semibold pr-3 whitespace-nowrap text-stone-100">State:</td>
                  <td class="text-stone-100 whitespace-normal break-words">${stateChange}</td>
                </tr>
                ${
                  note
                    ? `<tr><td class="font-semibold pr-3 whitespace-nowrap pt-2 text-stone-100">Note:</td><td class="font-light pt-2 text-stone-300 whitespace-normal break-words">${escapedNote}</td></tr>`
                    : ""
                }
              </table>
            </div>
          `;
        },
      },
      grid: {
        top: STATUS_TIMELINE_MARGINS.top,
        right: STATUS_TIMELINE_MARGINS.right,
        left: STATUS_TIMELINE_MARGINS.left,
        bottom: STATUS_TIMELINE_MARGINS.bottom,
        containLabel: false,
      },
      xAxis: xAxisOption,
      yAxis: {
        type: "category",
        data: SERIES_ORDER,
        inverse: true, // category[0] at top, matching the label div render order
        show: false,
        boundaryGap: false,
        min: -1,
        max: SERIES_ORDER.length,
      },
      brush: buildBrushConfig(),
      series: [
        // State-change vertical lines — more visible than hourly grid lines
        {
          type: "scatter",
          id: "state-change-lines",
          data: [],
          silent: true,
          animation: false,
          markLine: {
            silent: true,
            z: 1,
            symbol: ["none", "none"],
            lineStyle: {
              color: "white",
              opacity: 0.3,
              width: 1,
              type: "solid",
            },
            label: { show: false },
            data: entries.map((e) => ({ xAxis: e.time_ms })),
          },
        },
        // 12° twilight — solid blue line, label at top
        buildTwilightSeries(
          "twilight-12deg",
          twilightValues,
          "solid",
          xMinMillis,
          xMaxMillis,
          undefined,
          undefined,
          "12°",
        ),
        // 0° twilight — dashed white line (thinner, longer dashes), label at top
        buildTwilightSeries(
          "twilight-0deg",
          twilight0DegValues,
          [6, 6],
          xMinMillis,
          xMaxMillis,
          "white",
          1,
          "0°",
        ),
        // Background row lines — one thin line per series at 20% opacity
        ...SERIES_ORDER.map((stateName, idx) => ({
          type: "line",
          z: 1,
          id: `row-line-${stateName}`,
          data: [
            [xMinMillis, idx],
            [xMaxMillis, idx],
          ],
          lineStyle: {
            color: STATUS_COLORS[stateName],
            width: 1,
            opacity: 0.2,
          },
          symbol: "none",
          animation: false,
          silent: true,
        })),
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
            opacity: 1,
            borderColor: "white",
            borderWidth: 1,
          },
          animation: false,
          z: 4,
        },
      ],
    };

    markerSeriesIdxRef.current = option.series.length - 1;
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
    xAxisOption,
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

export default ObservatoryStatusTimeline;
