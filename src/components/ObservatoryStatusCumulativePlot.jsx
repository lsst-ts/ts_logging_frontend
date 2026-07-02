import { useCallback, useEffect, useRef } from "react";

import { buildTimelineGraphicElements } from "@/utils/timelineUtils";
import { buildCumulativePlotModel } from "@/utils/observatoryStatusUtils";
import { formatTimestamp, formatDuration } from "@/utils/timeUtils";
import {
  STATUS_COLORS,
  STATUS_CUMULATIVE_MARGINS,
  STATUS_CUMULATIVE_DIMENSIONS,
  STATUS_CUMULATIVE_VARIABLE_DIMENSIONS,
  STATUS_CUMULATIVE_SERIES_ORDER,
  STATUS_CUMULATIVE_PLOT_COLOURS,
  STATUS_CUMULATIVE_ELEMENTS_Z,
  STATUS_CUMULATIVE_LEGEND_LABELS,
  STATUS_CUMULATIVE_AREA_OPACITY,
  STATUS_CUMULATIVE_SYMBOL_SIZE,
  STATUS_CUMULATIVE_FONTS,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import { TIMELINE_DIMENSIONS } from "@/constants/TIMELINE_DEFINITIONS";
import { useEChartsTimeline } from "@/hooks/useEChartsTimeline";

/**
 * Observatory status applet.
 */
function ObservatoryStatusCumulativePlot({
  almanacInfo = [],
  intervals = [],
  openDomeTimes = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  fullScreen = false,
  brushGroup = null,
}) {
  const containerRef = useRef(null);
  const markerDataRef = useRef([]);
  const markerSeriesIdxRef = useRef([]);

  // Only used as a backup in the following function.
  const computedHeight = 0;

  // Set constants based on applet or fullscreen view.
  const markerSize = fullScreen
    ? STATUS_CUMULATIVE_SYMBOL_SIZE.fullscreen
    : STATUS_CUMULATIVE_SYMBOL_SIZE.applet;
  
  const fontSize = fullScreen
    ? STATUS_CUMULATIVE_FONTS.fullScreen
    : STATUS_CUMULATIVE_FONTS.applet;

  const variableDimensions = fullScreen
    ? STATUS_CUMULATIVE_VARIABLE_DIMENSIONS.fullscreen
    : STATUS_CUMULATIVE_VARIABLE_DIMENSIONS.applet;
  
  // ── Graphic elements (dayobs labels, border lines, baseline) ────────────────
  // These are positioned in pixel space, so must be computed after render.
  // Defined before the option useEffect so it can be in its dependency array.
  const updateGraphicElements = useCallback(
    (instance) => {
      const result = buildTimelineGraphicElements(instance, containerRef, {
        fullTimeRange,
        computedHeight,
        showBaseline: false,
        cumulativePlot: true,
        fullScreen: fullScreen,
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
      const seriesIndices = markerSeriesIdxRef.current;
      if (!instance || seriesIndices.length === 0) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let closestSeriesIdx = -1;
      let closestDataIdx = -1;
      let closestDist = Infinity;
      let closestPixel = null;

      for (const seriesIdx of seriesIndices) {
        const data = instance.getOption().series[seriesIdx].data;

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
            (data[i].hasNote ? markerSize.withNote : markerSize.withoutNote) /
            2;

          if (dist < radius && dist < closestDist) {
            closestDist = dist;
            closestSeriesIdx = seriesIdx;
            closestDataIdx = i;
            closestPixel = pixel;
          }
        }
      }

      if (closestDataIdx === activeDataIndex) return;
      activeDataIndex = closestDataIdx;

      if (closestSeriesIdx !== -1) {
        instance.dispatchAction({
          type: "showTip",
          seriesIndex: closestSeriesIdx,
          dataIndex: closestDataIdx,
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

    const { breaks, nightHours, openDomeSeries, stateSeries } =
      buildCumulativePlotModel(almanacInfo, intervals, openDomeTimes);

    const markerData = [];

    // Add state markers.
    for (const stateName of STATUS_CUMULATIVE_SERIES_ORDER) {
      for (const interval of stateSeries?.[stateName] ?? []) {
        if (interval.showMarker) {
          markerData.push({
            value: interval.value,
            stateName: stateName,
            status: interval.status,
            hasNote: !!interval.note,
            note: interval.note,
            time_ms: interval.time_ms,
            duration: interval.duration,
            clippedAtSunset: interval.clippedAtSunset,
          });
        }
      }
    }

    markerDataRef.current = markerData;

    const option = {
      useUTC: true,
      animation: false,
      toolbox: { show: false },
      title: {
        text: "Cumulative Time in State",
        textStyle: {
          color: STATUS_CUMULATIVE_PLOT_COLOURS.names,
          fontSize: fontSize.titleFontSize,
          fontWeight: "lighter",
        },
        top: STATUS_CUMULATIVE_DIMENSIONS.titleTop,
      },
      tooltip: {
        trigger: "item",
        triggerOn: "none",
        confine: true,
        backgroundColor: "none",
        borderColor: "none",
        borderWidth: 0,
        padding: 0,
        // Replicates ECharts' native tooltip positioning, which is lost when
        // the tooltip is triggered programmatically via dispatchAction.
        // Positions the tooltip to the right of the marker with a 10px gap,
        // flipping to the left if it would overflow the chart. Vertically
        // centered on the marker, clamped to stay within the chart bounds.
        position: (point, _params, _dom, _rect, size) => {
          const [x, y] = point;
          const [cw, ch] = size.contentSize;
          const [vw, vh] = size.viewSize;
          const offset = 16;
          const tx = x + offset + cw <= vw ? x + offset : x - offset - cw;
          const ty = Math.max(0, Math.min(y - ch / 2, vh - ch));
          return [tx, ty];
        },
        formatter: (params) => {
          if (params.seriesType !== "scatter") return undefined;
          const { time_ms, duration, status, note, clippedAtSunset } =
            params.data;

          // Format time using the standard formatter
          const timeFormatted = formatTimestamp(time_ms);
          const durationFormatted = formatDuration(duration);

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
            <div class="font-mono text-stone-100 bg-black opacity-80 p-5 border-1 border-stone-200 rounded-sm">
              ${
                clippedAtSunset
                  ? `<p class="italic">Status change occured prior to sunset; duration is clipped.</p></br>`
                  : ""
              }
              <table class="border-collapse">
                <tr>
                  <td class="font-semibold pr-3 whitespace-nowrap text-stone-100 ">Time:</td>
                  <td class="text-stone-100 whitespace-nowrap">${timeFormatted}</td>
                </tr>
                <tr>
                  <td class="font-semibold pr-3 whitespace-nowrap text-stone-100 ">State:</td>
                  <td class="text-stone-100 whitespace-nowrap">${status}</td>
                </tr>
                <tr>
                  <td class="font-semibold pr-3 whitespace-nowrap text-stone-100 ">Duration:</td>
                  <td class="text-stone-100 whitespace-nowrap">${durationFormatted}</td>
                </tr>
                ${
                  note
                    ? `<tr><td class="font-semibold pr-3 whitespace-nowrap pt-2 text-stone-100 ">Note:</td><td class="font-light pt-2 text-stone-300 max-w-[300px] break-words whitespace-normal">${escapedNote}</td></tr>`
                    : ""
                }
              </table>
            </div>
          `;
        },
      },
      legend: {
        borderColor: STATUS_CUMULATIVE_PLOT_COLOURS.borders,
        borderWidth: STATUS_CUMULATIVE_DIMENSIONS.legendBorderWidth,
        borderRadius: STATUS_CUMULATIVE_DIMENSIONS.legendBorderRadius,
        backgroundColor: STATUS_CUMULATIVE_PLOT_COLOURS.legendBackground,
        bottom: STATUS_CUMULATIVE_DIMENSIONS.legendBorderBottom,
        textStyle: {
          color: STATUS_CUMULATIVE_PLOT_COLOURS.names,
          fontWeight: "lighter",
          fontSize: fontSize.legendFontSize,
        },
        lineStyle: {
          width: STATUS_CUMULATIVE_DIMENSIONS.legendLinesWidth,
          inactiveColor: STATUS_CUMULATIVE_PLOT_COLOURS.borders,
          inactiveWidth: STATUS_CUMULATIVE_DIMENSIONS.legendInactiveWidth,
        },
        data: [
          { name: "night hours" },
          { name: "open dome" },
          ...STATUS_CUMULATIVE_SERIES_ORDER.map((stateName) => ({
            name: `${
              STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName
            }`,
          })),
        ],
      },
      grid: {
        z: STATUS_CUMULATIVE_ELEMENTS_Z.grid,
        top: variableDimensions.gridTop,
        left: STATUS_CUMULATIVE_MARGINS.top,
        right: STATUS_CUMULATIVE_MARGINS.right,
        bottom: STATUS_CUMULATIVE_MARGINS.bottom,
        borderColor: STATUS_CUMULATIVE_PLOT_COLOURS.borders,
        borderWidth: STATUS_CUMULATIVE_DIMENSIONS.gridBorderWidth,
        show: true,
        containLabel: true, // deprecated?
        outerBoundsMode: "same",
      },
      xAxis: {
        type: "time",
        name: "UTC",
        nameLocation: "center",
        nameGap: variableDimensions.xAxisNameGap,
        nameTextStyle: {
          color: STATUS_CUMULATIVE_PLOT_COLOURS.names,
          fontWeight: "lighter",
          fontSize: fontSize.xAxisNameFontSize,
        },
        min: nightHours?.[0][0],
        max: nightHours?.[nightHours?.length - 1][0] ?? xAxisOption.max,
        minInterval: 180 * 1000,
        maxInterval: 3600 * 1000,
        interval: 3600 * 1000,
        axisLine: { show: false },
        splitLine: { show: false },
        axisTick: {
          show: true,
          length: TIMELINE_DIMENSIONS.HOURLY_TICK_LENGTH,
          lineStyle: {
            color: STATUS_CUMULATIVE_PLOT_COLOURS.axisTick,
            width: STATUS_CUMULATIVE_DIMENSIONS.axisTickWidth,
          },
        },
        axisLabel: {
          show: true,
          showMinLabel: false,
          showMaxLabel: false,
          hideOverlap: true,
          formatter: (val) => {
            const d = new Date(val);
            const h = d.getUTCHours();
            const m = d.getUTCMinutes();

            return `${h}:${String(m).padStart(2, "0")}`;
          },
          margin: variableDimensions.xAxisLabelMargin,
          fontSize: fontSize.xAxisLabelFontSize,
          color: STATUS_CUMULATIVE_PLOT_COLOURS.axisLabel,
          fontWeight: "lighter",
        },
        // Add day breaks to show only nights.
        breaks: breaks,
        breakArea: {
          expandOnClick: false,
          zigzagAmplitude: 0,
          zigzagZ: STATUS_CUMULATIVE_ELEMENTS_Z.xAxisBreaks,
          itemStyle: {
            borderType: "solid",
            borderColor: STATUS_CUMULATIVE_PLOT_COLOURS.borders,
            borderWidth: STATUS_CUMULATIVE_DIMENSIONS.breakBorderWidth,
            color: STATUS_CUMULATIVE_PLOT_COLOURS.breakAreaFill,
            opacity: 1,
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Cumulative Hours",
        nameLocation: "center",
        nameRotate: 90,
        nameGap: STATUS_CUMULATIVE_DIMENSIONS.yAxisNameGap,
        nameTextStyle: {
          color: STATUS_CUMULATIVE_PLOT_COLOURS.names,
          fontWeight: "lighter",
          fontSize: fontSize.yAxisNameFontSize,
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: STATUS_CUMULATIVE_PLOT_COLOURS.axisTick,
            width: STATUS_CUMULATIVE_DIMENSIONS.axisTickWidth,
          },
        },
        axisLabel: {
          show: true,
          color: STATUS_CUMULATIVE_PLOT_COLOURS.axisLabel,
          fontWeight: "lighter",
          fontSize: fontSize.yAxisLabelFontSize,
          width: STATUS_CUMULATIVE_DIMENSIONS.yAxisLabelWidth,
        },
        splitLine: {
          lineStyle: {
            color: STATUS_CUMULATIVE_PLOT_COLOURS.hourLines,
          },
        },
      },
      // TODO: (OSW-2444) align zoom functionality with other plots
      // brush: buildBrushConfig(),
      dataZoom: [
        {
          type: "inside",
          filterMode: "none",
        },
      ],
      series: [
        // Status-update vertical lines
        {
          type: "scatter",
          id: "status-update-lines",
          silent: true,
          animation: false,
          markLine: {
            silent: true,
            z: STATUS_CUMULATIVE_ELEMENTS_Z.verticalLines,
            symbol: ["none", "none"],
            lineStyle: {
              color: STATUS_CUMULATIVE_PLOT_COLOURS.statusUpdateLines,
              opacity: STATUS_CUMULATIVE_DIMENSIONS.verticalLinesOpacity,
              width: STATUS_CUMULATIVE_DIMENSIONS.verticalLinesWidth,
              type: "solid",
            },
            label: { show: false },
            data: markerData.map((i) => ({ xAxis: i.value[0] })),
          },
        },
        // State time accumulation lines
        ...STATUS_CUMULATIVE_SERIES_ORDER.map((stateName) => ({
          type: "line",
          data: stateSeries?.[stateName],
          id: `state-line-${
            STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName
          }`,
          name: `${STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName}`,
          lineStyle: {
            color: STATUS_COLORS[stateName],
            width: STATUS_CUMULATIVE_DIMENSIONS.stateLineWidth,
          },
          areaStyle: {
            color: STATUS_COLORS[stateName],
            opacity: STATUS_CUMULATIVE_AREA_OPACITY[stateName],
          },
          itemStyle: {
            opacity: 0,
          },
          z: STATUS_CUMULATIVE_ELEMENTS_Z.stateLines,
        })),
        // Open dome line
        {
          type: "line",
          data: openDomeSeries,
          name: "open dome",
          id: "open-dome",
          lineStyle: {
            color: STATUS_CUMULATIVE_PLOT_COLOURS.openDomeLine,
            width: STATUS_CUMULATIVE_DIMENSIONS.openDomeLineWidth,
          },
          itemStyle: {
            opacity: 0,
          },
          z: STATUS_CUMULATIVE_ELEMENTS_Z.openDomeLine,
        },
        // Night Hours - horizontal lines marking available observing hours
        {
          type: "line",
          data: nightHours,
          name: "night hours",
          id: "night-hours",
          lineStyle: {
            color: STATUS_CUMULATIVE_PLOT_COLOURS.nightHoursLine,
            opacity: 1,
            type: "solid",
            width: STATUS_CUMULATIVE_DIMENSIONS.nightHoursLineWidth,
          },
          itemStyle: {
            opacity: 0,
          },
          z: STATUS_CUMULATIVE_ELEMENTS_Z.nightHours,
        },
        // Markers at the start of each interval: diamond if has note, circle if not
        ...STATUS_CUMULATIVE_SERIES_ORDER.map((stateName) => ({
          type: "scatter",
          name: `${STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName}`,
          data: markerData.filter((d) => d.stateName == stateName),
          id: `state-marker-${
            STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName
          }`,
          itemStyle: {
            color: (params) =>
              STATUS_COLORS[params.data.stateName] ??
              STATUS_CUMULATIVE_PLOT_COLOURS.markerBorder,
            borderColor: STATUS_CUMULATIVE_PLOT_COLOURS.markerBorder,
            borderWidth: STATUS_CUMULATIVE_DIMENSIONS.markerBorderWidth,
            opacity: 1,
          },
          symbol: (value, params) =>
            params.data.hasNote ? "diamond" : "circle",
          symbolSize: (value, params) =>
            params.data.hasNote ? markerSize.withNote : markerSize.withoutNote,
          z: STATUS_CUMULATIVE_ELEMENTS_Z.markers,
        })),
      ],
    };

    markerSeriesIdxRef.current = option.series
      .map((series, index) => ({ series, index }))
      .filter(
        ({ series }) =>
          series.type === "scatter" && series.id?.startsWith("state-marker-"),
      )
      .map(({ index }) => index);
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
    almanacInfo,
    intervals,
    openDomeTimes,
    fullTimeRange,
    xAxisOption,
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
        height: "100%",
        userSelect: "none",
      }}
    />
  );
}

export default ObservatoryStatusCumulativePlot;
