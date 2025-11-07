import { millisToDateTime } from "@/utils/timeUtils";
import { useCallback, useRef } from "react";

/**
 * Hook for implementing drag selection on charts using direct DOM manipulation.
 *
 * Avoids component rerenders by creating and manipulating SVG rect elements directly
 * instead of using React state. Provides two selection areas:
 * - Mouse rect: Tracks precise pixel-based mouse movement
 * - Snapped rect: Snaps to nearest data point using Recharts' activeCoordinate
 *
 * @param {Object} params - Configuration object
 * @param {Function} params.callback - Called on mouseUp with [startTime, endTime] from indexToMillis
 * @param {Function} [params.indexToMillis] - Converts activeLabel (domain value) to milliseconds. Defaults to identity function (for time series charts).
 * @param {Function} params.resetCallback - Called on doubleClick to reset selection
 * @param {React.MutableRefObject} params.chartRef - Ref to the LineChart component to find SVG container
 * @param {boolean} [params.showMouseRect=true] - Whether to show the mouse tracking rectangle
 * @param {boolean} [params.showSnappedRect=true] - Whether to show the snapped selection rectangle
 * @param {Object} [params.mouseRectStyle] - Style object for mouse tracking rectangle (fill, stroke, etc.)
 * @param {Object} [params.snappedRectStyle] - Style object for snapped selection rectangle (fill, stroke, etc.)
 * @param {Function} [params.onMouseDown] - Optional callback after mouseDown, receives (chartState, dragState)
 * @param {Function} [params.onMouseMove] - Optional callback after mouseMove, receives (chartState, dragState)
 * @param {Function} [params.onMouseUp] - Optional callback after mouseUp, receives (chartState, dragState)
 * @param {Function} [params.onDoubleClick] - Optional callback after doubleClick, receives (chartState, dragState)
 *
 * @returns {Object} Event handlers and state: { mouseDown, mouseMove, mouseUp, doubleClick, dragState }
 *
 * @example
 * const chartRef = useRef(null);
 *
 * const { mouseDown, mouseMove, mouseUp, doubleClick, dragState } = useDOMClickDrag({
 *   callback: ([start, end]) => setSelectedTimeRange([start, end]),
 *   indexToMillis: (label) => label,
 *   resetCallback: () => resetToFullRange(),
 *   chartRef,
 *   showMouseRect: false,
 *   showSnappedRect: true,
 *   snappedRectStyle: { fill: 'pink', stroke: 'hotpink' },
 *   onMouseMove: (chartState, dragState) => {
 *     if (dragState.isDragging) hoverStore.setHover(null);
 *   }
 * });
 *
 * // In JSX - attach ref to ChartContainer (or wrapper element), not LineChart:
 * <ChartContainer ref={chartRef} ...>
 *   <LineChart
 *     onMouseDown={mouseDown}
 *     onMouseMove={mouseMove}
 *     onMouseUp={mouseUp}
 *     onDoubleClick={doubleClick}
 *   >
 *     ... LineChart contents
 *   </LineChart>
 * </ChartContainer>
 */
export function useDOMClickDrag({
  callback,
  indexToMillis = (label) => label,
  resetCallback,
  chartRef,
  showMouseRect = true,
  showSnappedRect = true,
  mouseRectStyle = {},
  snappedRectStyle = {},
  onMouseDown: onMouseDownCallback,
  onMouseMove: onMouseMoveCallback,
  onMouseUp: onMouseUpCallback,
  onDoubleClick: onDoubleClickCallback,
}) {
  // Internal refs for the rect elements
  const mouseRef = useRef(null);
  const snappedRef = useRef(null);

  // Internal state - using ref to avoid rerenders
  const dragState = useRef({
    isDragging: false,
    startPixel: null, // chartX from initial click (for mouseRef)
    startCoordinate: null, // activeCoordinate.x from initial click (for snappedRef)
    startLabel: null, // activeLabel (for callback)
  });

  // Lazily create rect elements on first interaction
  const ensureRectsExist = useCallback(() => {
    if (mouseRef.current && snappedRef.current) {
      return true; // Already created
    }

    if (!chartRef.current) {
      return false;
    }

    // Find the SVG element in the chart
    let svg = chartRef.current.querySelector("svg.recharts-surface");
    if (!svg) {
      svg = chartRef.current.querySelector("svg");
    }

    if (!svg) {
      return false;
    }

    // Find the plot area bounds from the clipPath
    const clipPathRect = svg.querySelector("defs clipPath rect");
    if (!clipPathRect) {
      return false;
    }
    const bbox = clipPathRect.getBBox();
    const plotY = bbox.y;
    const plotHeight = bbox.height;

    // Create mouse tracking rect (precise pixel movement)
    const mouseRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    mouseRect.setAttribute("x", "0");
    mouseRect.setAttribute("y", plotY);
    mouseRect.setAttribute("width", "0");
    mouseRect.setAttribute("height", plotHeight);
    mouseRect.setAttribute("fill", mouseRectStyle.fill || "#888");
    mouseRect.setAttribute("fill-opacity", "0");
    mouseRect.setAttribute("pointer-events", "none");
    // Apply additional custom styles
    Object.entries(mouseRectStyle).forEach(([key, value]) => {
      if (key !== "fill" && key !== "fill-opacity") {
        mouseRect.setAttribute(key, value);
      }
    });

    // Create snapped rect (snaps to data points)
    const snappedRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    snappedRect.setAttribute("x", "0");
    snappedRect.setAttribute("y", plotY);
    snappedRect.setAttribute("width", "0");
    snappedRect.setAttribute("height", plotHeight);
    snappedRect.setAttribute("fill", snappedRectStyle.fill || "#666");
    snappedRect.setAttribute("fill-opacity", "0");
    snappedRect.setAttribute("pointer-events", "none");
    // Apply additional custom styles
    Object.entries(snappedRectStyle).forEach(([key, value]) => {
      if (key !== "fill" && key !== "fill-opacity") {
        snappedRect.setAttribute(key, value);
      }
    });

    // Append to SVG (order matters: mouse on top of snapped)
    svg.appendChild(snappedRect);
    svg.appendChild(mouseRect);

    // Store in refs
    mouseRef.current = mouseRect;
    snappedRef.current = snappedRect;

    return true;
  }, [chartRef, mouseRectStyle, snappedRectStyle]);

  const mouseDown = useCallback(
    (chartState) => {
      // Ensure rects are created on first interaction
      if (!ensureRectsExist()) {
        return;
      }

      if (
        !chartState?.activeLabel ||
        !chartState?.chartX ||
        !chartState?.activeCoordinate
      ) {
        return;
      }

      dragState.current.isDragging = true;
      dragState.current.startPixel = chartState.chartX;
      dragState.current.startCoordinate = chartState.activeCoordinate.x;
      dragState.current.startLabel = chartState.activeLabel;

      // Make areas visible based on configuration
      if (showMouseRect && mouseRef.current) {
        mouseRef.current.setAttribute("fill-opacity", "0.2");
      }
      if (showSnappedRect && snappedRef.current) {
        snappedRef.current.setAttribute("fill-opacity", "0.5");
      }

      // Call optional callback
      if (onMouseDownCallback) {
        onMouseDownCallback(chartState, dragState.current);
      }
    },
    [ensureRectsExist, showMouseRect, showSnappedRect, onMouseDownCallback],
  );

  const mouseMove = useCallback(
    (chartState) => {
      if (!dragState.current.isDragging) {
        // Call optional callback even when not dragging
        if (onMouseMoveCallback) {
          onMouseMoveCallback(chartState, dragState.current);
        }
        return;
      }

      const { startPixel, startCoordinate } = dragState.current;

      // Mouse area: raw pixel movement for precise tracking
      if (showMouseRect && mouseRef.current && chartState?.chartX) {
        const x = Math.min(startPixel, chartState.chartX);
        const width = Math.abs(chartState.chartX - startPixel);
        mouseRef.current.setAttribute("x", x);
        mouseRef.current.setAttribute("width", width);
      }

      // Snapped area: uses Recharts' activeCoordinate (snaps to data points)
      if (
        showSnappedRect &&
        snappedRef.current &&
        chartState?.activeCoordinate
      ) {
        const currentCoordinate = chartState.activeCoordinate.x;
        const x = Math.min(startCoordinate, currentCoordinate);
        const width = Math.abs(currentCoordinate - startCoordinate);
        snappedRef.current.setAttribute("x", x);
        snappedRef.current.setAttribute("width", width);
      }

      // Call optional callback
      if (onMouseMoveCallback) {
        onMouseMoveCallback(chartState, dragState.current);
      }
    },
    [showMouseRect, showSnappedRect, onMouseMoveCallback],
  );

  const mouseUp = useCallback(
    (chartState) => {
      if (!dragState.current.isDragging) return;

      const { startLabel } = dragState.current;
      const endLabel = chartState?.activeLabel || startLabel;

      // Convert snapped labels to times using provided converter
      const startTime = indexToMillis(Math.min(startLabel, endLabel));
      const endTime = indexToMillis(Math.max(startLabel, endLabel));

      // Only invoke callback if there's an actual selection
      if (startTime !== endTime) {
        callback([millisToDateTime(startTime), millisToDateTime(endTime)]);
      }

      // Hide areas
      if (mouseRef.current) {
        mouseRef.current.setAttribute("fill-opacity", "0");
        mouseRef.current.setAttribute("width", "0");
      }
      if (snappedRef.current) {
        snappedRef.current.setAttribute("fill-opacity", "0");
        snappedRef.current.setAttribute("width", "0");
      }

      dragState.current.isDragging = false;

      // Call optional callback
      if (onMouseUpCallback) {
        onMouseUpCallback(chartState, dragState.current);
      }
    },
    [callback, indexToMillis, onMouseUpCallback],
  );

  const doubleClick = useCallback(
    (chartState) => {
      // Reset selection to full range
      if (resetCallback) {
        resetCallback();
      }

      // Ensure areas are hidden
      if (mouseRef.current) {
        mouseRef.current.setAttribute("fill-opacity", "0");
        mouseRef.current.setAttribute("width", "0");
      }
      if (snappedRef.current) {
        snappedRef.current.setAttribute("fill-opacity", "0");
        snappedRef.current.setAttribute("width", "0");
      }

      dragState.current.isDragging = false;

      // Call optional callback
      if (onDoubleClickCallback) {
        onDoubleClickCallback(chartState, dragState.current);
      }
    },
    [resetCallback, onDoubleClickCallback],
  );

  return {
    mouseDown,
    mouseMove,
    mouseUp,
    doubleClick,
    dragState,
  };
}
