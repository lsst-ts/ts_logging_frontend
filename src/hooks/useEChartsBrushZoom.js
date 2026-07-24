import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

/**
 * Manages an ECharts instance lifecycle with brush-based zoom selection for timeline charts.
 *
 * Handles:
 * - Chart init / dispose
 * - Resize via ResizeObserver
 * - Brush selection (rect or lineX with Shift key)
 * - brushEnd → updates xDomain / yDomain
 * - Double-click reset of selection
 * - Syncing brush interactions to internal zoom state
 *
 * @param {React.RefObject} containerRef - Ref to the chart container div
 * @param {Object} options
 * @param {Function} [options.onResize] - Called with (instance) after resize
 * @returns {{
 *   instanceRef: React.RefObject,
 *   xDomain: [number, number] | null,
 *   yDomain: [number, number] | null
 * }}
 */
export function useEChartsBrushZoom(containerRef, { onResize }) {
  const instanceRef = useRef(null);

  const [xDomain, setXDomain] = useState(null);
  const [yDomain, setYDomain] = useState(null);

  const xDomainRef = useRef(null);
  const yDomainRef = useRef(null);

  useEffect(() => {
    xDomainRef.current = xDomain;
  }, [xDomain]);

  useEffect(() => {
    yDomainRef.current = yDomain;
  }, [yDomain]);

  // For shift and control zoom options ----------
  const updateBrushType = () => {
    const instance = instanceRef.current;
    if (!instance) return;

    const brushType = modifierKeys.current.shift ? "lineX" : "rect";

    instance.dispatchAction({
      type: "takeGlobalCursor",
      key: "brush",
      brushOption: {
        brushType,
        brushMode: "single",
      },
    });
  };

  const modifierKeys = useRef({
    shift: false,
  });

  useEffect(() => {
    const down = (e) => {
      modifierKeys.current.shift = e.shiftKey;

      updateBrushType();
    };

    const up = (e) => {
      modifierKeys.current.shift = e.shiftKey;

      updateBrushType();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Keep refs to latest prop values for use inside stable event handlers.
  const onResizeRef = useRef(onResize);
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
      if (!params.areas.length) {
        setXDomain(null);
        setYDomain(null);
        return;
      }

      // Update area differently, depending if brush type
      // is both axes (rect) or just x-axis (lineX).
      const area = params.areas[0];

      let x0, x1, y0, y1;

      if (area.brushType === "lineX") {
        [x0, x1] = area.coordRange;
      } else {
        [[x0, x1], [y0, y1]] = area.coordRange;
      }

      setXDomain([Math.min(x0, x1), Math.max(x0, x1)]);

      if (area.brushType === "rect") {
        setYDomain([Math.min(y0, y1), Math.max(y0, y1)]);
      }

      // Clear the visual brush so the user can immediately draw another zoom box.
      instance.dispatchAction({
        type: "brush",
        areas: [],
      });
    });

    // Use native DOM listener — the brush component intercepts mouse events
    // and prevents ECharts' own dblclick from firing.
    const handleDblClick = () => {
      setXDomain(null);
      setYDomain(null);

      instance.dispatchAction({
        type: "brush",
        areas: [],
      });
    };
    el.addEventListener("dblclick", handleDblClick);

    return () => {
      el.removeEventListener("dblclick", handleDblClick);
      observer.disconnect();
      instance.dispose();
      instanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { instanceRef, xDomain, yDomain };
}
