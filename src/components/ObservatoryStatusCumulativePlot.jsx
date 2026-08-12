import { useCallback, useEffect, useRef } from "react";

import { buildTimelineGraphicElements } from "@/utils/timelineUtils";
import { buildCumulativePlotModel } from "@/utils/cumulativePlotModel";
import { buildCumulativePlotOption } from "@/utils/cumulativePlotOption";
import {
  STATUS_CUMULATIVE_VARIABLE_DIMENSIONS,
  STATUS_CUMULATIVE_SERIES_ORDER,
  STATUS_CUMULATIVE_SYMBOL_SIZE,
  STATUS_CUMULATIVE_FONTS,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import { useEChartsBrushZoom } from "@/hooks/useEChartsBrushZoom";

/**
 * Render the cumulative observatory status chart as an ECharts plot with
 * state markers, open-dome overlays, and brush-based zoom interactions.
 *
 * @param {Object} props
 * @param {Array} [props.almanacInfo=[]] Almanac data for night boundaries and twilight markers.
 * @param {Array} [props.intervals=[]] Observatory status intervals to convert into cumulative series.
 * @param {Array} [props.openDomeTimes=[]] Open-dome intervals to overlay on the plot.
 * @param {[DateTime, DateTime]} props.fullTimeRange Visible time range for the chart.
 * @param {boolean} [props.fullScreen=false] Whether the plot is being rendered in fullscreen mode.
 */
function ObservatoryStatusCumulativePlot({
  almanacInfo = [],
  intervals = [],
  openDomeTimes = [],
  fullTimeRange,
  fullScreen = false,
}) {
  const containerRef = useRef(null);
  const markerSeriesIdxRef = useRef([]);

  // Set constants based on applet or fullscreen view.
  const markerSize = fullScreen
    ? STATUS_CUMULATIVE_SYMBOL_SIZE.FULL_SCREEN
    : STATUS_CUMULATIVE_SYMBOL_SIZE.APPLET;

  const fontSize = fullScreen
    ? STATUS_CUMULATIVE_FONTS.FULL_SCREEN
    : STATUS_CUMULATIVE_FONTS.APPLET;

  const variableDimensions = fullScreen
    ? STATUS_CUMULATIVE_VARIABLE_DIMENSIONS.FULL_SCREEN
    : STATUS_CUMULATIVE_VARIABLE_DIMENSIONS.APPLET;

  // ── Graphic elements (dayobs labels, border lines, baseline) ────────────────
  // These are positioned in pixel space, so must be computed after render.
  // Defined before the option useEffect so it can be in its dependency array.
  const updateGraphicElements = useCallback(
    (instance) => {
      const result = buildTimelineGraphicElements(instance, containerRef, {
        fullTimeRange,
        showBaseline: false,
        cumulativePlot: true,
        fullScreen: fullScreen,
      });
      if (!result) return;

      instance.setOption({ graphic: result.elements });
    },
    [fullTimeRange, fullScreen],
  );

  const { instanceRef, xDomain, yDomain } = useEChartsBrushZoom(containerRef, {
    onResize: updateGraphicElements,
  });

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
            (data[i].hasNote ? markerSize.WITH_NOTE : markerSize.WITHOUT_NOTE) /
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
  }, [markerSize]);

  // ── Build and apply the ECharts option ─────────────────────────────────────
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    const xMinMillis = fullTimeRange[0]?.toMillis();
    const xMaxMillis = fullTimeRange[1]?.toMillis();
    if (!xMinMillis || !xMaxMillis) return;

    // Build the model and marker data for the cumulative plot.
    const model = buildCumulativePlotModel(
      almanacInfo,
      intervals,
      openDomeTimes,
    );
    const markerData = [];

    // Add state markers.
    for (const stateName of STATUS_CUMULATIVE_SERIES_ORDER) {
      for (const interval of model.stateSeries?.[stateName] ?? []) {
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

    // Build the ECharts option and apply it to the instance.
    const option = buildCumulativePlotOption({
      model,
      markerData,
      markerSize,
      fontSize,
      variableDimensions,
      xDomain,
      yDomain,
    });

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
      brushOption: { brushType: "rect", brushMode: "single" },
    });

    // Defer graphic elements until ECharts has finished rendering,
    // since convertToPixel is only valid after the chart is laid out.
    setTimeout(() => updateGraphicElements(instance), 0);
  }, [
    almanacInfo,
    intervals,
    openDomeTimes,
    fullTimeRange,
    fullScreen,
    xDomain,
    yDomain,
    updateGraphicElements,
    instanceRef,
  ]);

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
