import { useCallback, useEffect, useRef } from "react";
import * as echarts from "echarts";
import { millisToDateTime } from "@/utils/timeUtils";

/**
 * Manages an ECharts instance lifecycle and shared brush/selection logic
 * for timeline charts.
 *
 * Handles init/destroy, resize, brushEnd → setSelectedTimeRange,
 * double-click reset, and syncing an external selectedTimeRange into the brush.
 *
 * @param {React.RefObject} containerRef - Ref to the chart container div
 * @param {Object} options
 * @param {[DateTime, DateTime]} options.fullTimeRange
 * @param {[DateTime, DateTime]} options.selectedTimeRange
 * @param {Function} options.setSelectedTimeRange
 * @param {Function} [options.onResize] - Called with (instance) after resize
 * @returns {{ instanceRef: React.RefObject, syncBrushToSelection: Function }}
 */
export function useEChartsTimeline(
  containerRef,
  { fullTimeRange, selectedTimeRange, setSelectedTimeRange, onResize },
) {
  const instanceRef = useRef(null);

  // Keep refs to latest prop values for use inside stable event handlers.
  const fullTimeRangeRef = useRef(fullTimeRange);
  const selectedTimeRangeRef = useRef(selectedTimeRange);
  const setSelectedTimeRangeRef = useRef(setSelectedTimeRange);
  const onResizeRef = useRef(onResize);
  useEffect(() => {
    fullTimeRangeRef.current = fullTimeRange;
  }, [fullTimeRange]);
  useEffect(() => {
    selectedTimeRangeRef.current = selectedTimeRange;
  }, [selectedTimeRange]);
  useEffect(() => {
    setSelectedTimeRangeRef.current = setSelectedTimeRange;
  }, [setSelectedTimeRange]);
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  // ── Init / destroy ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const instance = echarts.init(el, null, { renderer: "canvas" });
    instanceRef.current = instance;

    const observer = new ResizeObserver(() => {
      instance.resize();
      onResizeRef.current?.(instance);
    });
    observer.observe(el);

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

    // Use native DOM listener — the brush component intercepts mouse events
    // and prevents ECharts' own dblclick from firing.
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

  // ── Sync external selectedTimeRange → brush ───────────────────────────────
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

  // Push the current selectedTimeRange into the brush. Must be called after
  // setOption (which creates the brush component) and takeGlobalCursor.
  const syncBrushToSelection = useCallback(() => {
    const instance = instanceRef.current;
    const sr = selectedTimeRangeRef.current;
    const fr = fullTimeRangeRef.current;
    if (!instance || !sr?.[0] || !sr?.[1] || !fr?.[0] || !fr?.[1]) return;

    const isFullRange =
      sr[0].toMillis() === fr[0].toMillis() &&
      sr[1].toMillis() === fr[1].toMillis();

    if (!isFullRange) {
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
  }, []);

  return { instanceRef, syncBrushToSelection };
}
