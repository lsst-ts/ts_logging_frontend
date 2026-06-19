import { useCallback, useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { millisToDateTime } from "@/utils/timeUtils";
import {
  TIMELINE_COLORS,
  TIMELINE_DIMENSIONS,
} from "@/constants/TIMELINE_DEFINITIONS";

// Module-level registry for cross-instance brush sync.
// Maps groupId -> Set of { instanceRef, isSyncingRef }
const brushGroups = new Map();

function syncBrushToGroup(groupId, sourceEntry, areas) {
  const group = brushGroups.get(groupId);
  if (!group) return;
  for (const entry of group) {
    if (entry === sourceEntry || entry.isSyncingRef.current) continue;
    const inst = entry.instanceRef.current;
    if (!inst) continue;
    entry.isSyncingRef.current = true;
    // Dispatch without $from so BrushView._updateController guard passes
    inst.dispatchAction({ type: "brush", areas });
    entry.isSyncingRef.current = false;
  }
}

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
 * @returns {{ instanceRef: React.RefObject, syncBrushToSelection: Function, xAxisOption: Object }}
 */
export function useEChartsTimeline(
  containerRef,
  {
    fullTimeRange,
    selectedTimeRange,
    setSelectedTimeRange,
    onResize,
    brushGroup,
  },
) {
  const instanceRef = useRef(null);
  const isSyncingRef = useRef(false);

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

    // Register in brush group for cross-instance visual sync
    const brushGroupEntry = brushGroup ? { instanceRef, isSyncingRef } : null;
    if (brushGroup) {
      if (!brushGroups.has(brushGroup)) brushGroups.set(brushGroup, new Set());
      brushGroups.get(brushGroup).add(brushGroupEntry);
    }

    instance.on("brush", (params) => {
      if (isSyncingRef.current || !brushGroup) return;
      syncBrushToGroup(brushGroup, brushGroupEntry, params.areas);
    });

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
      if (brushGroup && brushGroupEntry) {
        brushGroups.get(brushGroup)?.delete(brushGroupEntry);
      }
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

  const xAxisOption = useMemo(() => {
    const xMinMillis = fullTimeRange[0]?.toMillis();
    const xMaxMillis = fullTimeRange[1]?.toMillis();
    return {
      type: "time",
      min: xMinMillis,
      max: xMaxMillis,
      minInterval: 3600 * 1000,
      maxInterval: 3600 * 1000,
      axisLine: { show: false },
      splitLine: { show: false },
      axisTick: {
        show: true,
        length: TIMELINE_DIMENSIONS.HOURLY_TICK_LENGTH,
        lineStyle: {
          color: TIMELINE_COLORS.GRID_LINE,
          opacity: TIMELINE_COLORS.GRID_OPACITY,
          width: 1,
        },
      },
      axisLabel: {
        show: true,
        hideOverlap: true,
        margin: 8,
        formatter: (val) => {
          const h = new Date(val).getUTCHours();
          if (h === 12) return "";
          return `${h}:00`;
        },
        color: TIMELINE_COLORS.HOUR_LABEL,
        fontSize: TIMELINE_DIMENSIONS.HOURLY_TICK_LABEL_FONT_SIZE,
      },
    };
  }, [fullTimeRange]);

  return { instanceRef, syncBrushToSelection, xAxisOption };
}
