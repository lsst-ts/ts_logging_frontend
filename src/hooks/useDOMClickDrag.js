import { millisToDateTime } from "@/utils/timeUtils";
import { getChartPlotBounds } from "@/utils/plotUtils";
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
 * @param {Function} params.resetCallback - Called on doubleClick to reset selection
 * @param {React.MutableRefObject} params.chartRef - Ref to the LineChart component to find SVG container
 * @param {[DateTime, DateTime]} [params.selectedTimeRange] - Current selected time range.
 * @param {Function} [params.indexToMillis] - Converts activeLabel (domain value) to milliseconds. Defaults to identity function (for time series charts).
 * @param {Function} [params.millisToIndex] - Converts milliseconds to activeLabel (domain value).
 * @param {boolean} [params.showMouseRect=true] - Whether to show the mouse tracking rectangle
 * @param {boolean} [params.showSnappedRect=true] - Whether to show the snapped selection rectangle
 * @param {Object} [params.mouseRectStyle] - Style object for mouse tracking rectangle (fill, stroke, etc.)
 * @param {Object} [params.snappedRectStyle] - Style object for snapped selection rectangle (fill, stroke, etc.)
 * @param {Function} [params.onMouseDown] - Optional callback after mouseDown, receives (chartState, dragState)
 * @param {Function} [params.onMouseMove] - Optional callback after mouseMove, receives (chartState, dragState)
 * @param {Function} [params.onMouseUp] - Optional callback after mouseUp, receives (chartState, dragState)
 * @param {Function} [params.onDoubleClick] - Optional callback after doubleClick, receives (chartState, dragState)
 * @param {Function} [params.onMouseLeave] - Optional callback after mouseLeave, receives (dragState)
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
  resetCallback,
  chartRef,
  selectedTimeRange,
  indexToMillis = (label) => label,
  millisToIndex = (millis) => millis,
  showMouseRect = true,
  showSnappedRect = true,
  mouseRectStyle = {},
  snappedRectStyle = {},
  onMouseDown: onMouseDownCallback,
  onMouseMove: onMouseMoveCallback,
  onMouseUp: onMouseUpCallback,
  onDoubleClick: onDoubleClickCallback,
  onMouseLeave: onMouseLeaveCallback,
  onYAxisZoom: onYAxisZoomCallback,
  enable2DSelection = false,
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
    startYPixel: null, // chartY from initial click (for Y-axis zoom)
  });

  // Helper: Update the visual selection rectangles
  const updateSelectionRects = useCallback(
    (currentPixel, currentCoordinate, currentYPixel, shiftKeyHeld) => {
      const { startPixel, startCoordinate, startYPixel } = dragState.current;

      // Determine if we should do 2D selection (enabled AND shift not held)
      const use2DSelection = enable2DSelection && !shiftKeyHeld;

      // Update mouse tracking rect
      if (showMouseRect && mouseRef.current && currentPixel !== undefined) {
        const x = Math.min(startPixel, currentPixel);
        const width = Math.abs(currentPixel - startPixel);
        mouseRef.current.setAttribute("x", x);
        mouseRef.current.setAttribute("width", width);
      }

      // Update snapped rect
      if (
        showSnappedRect &&
        snappedRef.current &&
        currentCoordinate !== undefined
      ) {
        const x = Math.min(startCoordinate, currentCoordinate);
        const width = Math.abs(currentCoordinate - startCoordinate);
        snappedRef.current.setAttribute("x", x);
        snappedRef.current.setAttribute("width", width);
      }

      // Update Y coordinates only if 2D selection is enabled AND shift is not held
      if (use2DSelection && currentYPixel !== undefined) {
        const y = Math.min(startYPixel, currentYPixel);
        const height = Math.abs(currentYPixel - startYPixel);
        mouseRef.current.setAttribute("y", y);
        mouseRef.current.setAttribute("height", height);
        snappedRef.current.setAttribute("y", y);
        snappedRef.current.setAttribute("height", height);
      } else {
        const bbox = getChartPlotBounds(
          chartRef.current?.querySelector("svg.recharts-surface") ||
            chartRef.current?.querySelector("svg"),
        );
        if (bbox && mouseRef.current && snappedRef.current) {
          mouseRef.current.setAttribute("y", bbox.y);
          mouseRef.current.setAttribute("height", bbox.height);
          snappedRef.current.setAttribute("y", bbox.y);
          snappedRef.current.setAttribute("height", bbox.height);
        }
      }
    },
    [showMouseRect, showSnappedRect, enable2DSelection, chartRef],
  );

  // Helper: Hide the visual slection rectangles
  const hideSelectionRects = useCallback(() => {
    // Hide areas
    if (mouseRef.current) {
      mouseRef.current.setAttribute("fill-opacity", "0");
      mouseRef.current.setAttribute("width", "0");
      mouseRef.current.setAttribute("height", "0");
    }
    if (snappedRef.current) {
      snappedRef.current.setAttribute("fill-opacity", "0");
      snappedRef.current.setAttribute("width", "0");
      snappedRef.current.setAttribute("height", "0");
    }
  }, [mouseRef, snappedRef]);

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
    const bbox = getChartPlotBounds(svg);
    if (!bbox) {
      return false;
    }
    const plotY = bbox.y;
    const plotHeight = bbox.height;

    // Create mouse tracking rect (precise pixel movement)
    const mouseRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    mouseRect.setAttribute("x", "0");
    mouseRect.setAttribute("y", enable2DSelection ? "0" : plotY);
    mouseRect.setAttribute("width", "0");
    mouseRect.setAttribute("height", enable2DSelection ? "0" : plotHeight);
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
    snappedRect.setAttribute("y", enable2DSelection ? "0" : plotY);
    snappedRect.setAttribute("width", "0");
    snappedRect.setAttribute("height", enable2DSelection ? "0" : plotHeight);
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
  }, [chartRef, mouseRectStyle, snappedRectStyle, enable2DSelection]);

  const mouseDown = useCallback(
    (chartState, event) => {
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

      let startLabel = chartState.activeLabel;
      let startPixel = chartState.chartX;
      let startCoordinate = chartState.activeCoordinate.x;

      // Shift-extend: extend from the farther edge of the current selection
      if (event?.shiftKey && selectedTimeRange?.[0] && selectedTimeRange?.[1]) {
        const clickedLabel = chartState.activeLabel;

        // Convert current selection endpoints to index values
        const selectionStartMillis = selectedTimeRange[0].toMillis();
        const selectionEndMillis = selectedTimeRange[1].toMillis();
        const selectionStartLabel = millisToIndex(selectionStartMillis);
        const selectionEndLabel = millisToIndex(selectionEndMillis);

        // Find which endpoint is farther from the click
        const distToStart = Math.abs(clickedLabel - selectionStartLabel);
        const distToEnd = Math.abs(clickedLabel - selectionEndLabel);

        // Find the selection ReferenceArea path to get pixel positions
        const selectionPath = chartRef.current?.querySelector(
          ".selection-highlight path",
        );

        if (selectionPath) {
          const rectX = parseFloat(selectionPath.getAttribute("x"));
          const rectWidth = parseFloat(selectionPath.getAttribute("width"));

          if (!isNaN(rectX) && !isNaN(rectWidth)) {
            // Use the farther endpoint
            if (distToStart > distToEnd) {
              startLabel = selectionStartLabel;
              startPixel = rectX; // Left edge
              startCoordinate = rectX;
            } else {
              startLabel = selectionEndLabel;
              startPixel = rectX + rectWidth; // Right edge
              startCoordinate = rectX + rectWidth;
            }
          }
        }
        // If we can't get the pixel position, fall back to normal drag behavior
      }

      dragState.current.isDragging = true;
      dragState.current.startPixel = startPixel;
      dragState.current.startCoordinate = startCoordinate;
      dragState.current.startLabel = startLabel;
      dragState.current.startYPixel = chartState.chartY;

      // Make areas visible based on configuration
      if (showMouseRect && mouseRef.current) {
        mouseRef.current.setAttribute("fill-opacity", "0.2");
      }
      if (showSnappedRect && snappedRef.current) {
        snappedRef.current.setAttribute("fill-opacity", "0.5");
      }

      // Update rectangle dimensions immediately (important for shift-extend)
      updateSelectionRects(
        chartState.chartX,
        chartState.activeCoordinate.x,
        chartState.chartY,
        event?.shiftKey || false,
      );

      // Call optional callback
      if (onMouseDownCallback) {
        onMouseDownCallback(chartState, dragState.current);
      }
    },
    [
      ensureRectsExist,
      showMouseRect,
      showSnappedRect,
      onMouseDownCallback,
      selectedTimeRange,
      millisToIndex,
      chartRef,
      updateSelectionRects,
    ],
  );

  const mouseMove = useCallback(
    (chartState, event) => {
      // If we're outisde the chart zone, don't do anything
      if (chartState.chartX === undefined || chartState.chartY === undefined) {
        return;
      }
      if (!dragState.current.isDragging) {
        // Call optional callback even when not dragging
        if (onMouseMoveCallback) {
          onMouseMoveCallback(chartState, dragState.current);
        }
        return;
      }

      // Update selection rectangles (check shift key dynamically)
      updateSelectionRects(
        chartState?.chartX,
        chartState?.activeCoordinate?.x,
        chartState?.chartY,
        event?.shiftKey || false,
      );

      // Call optional callback
      if (onMouseMoveCallback) {
        onMouseMoveCallback(chartState, dragState.current);
      }
    },
    [onMouseMoveCallback, updateSelectionRects],
  );

  const mouseUp = useCallback(
    (chartState, event) => {
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

      // Y-axis callback (only if 2D selection enabled AND shift not held at release)
      if (
        enable2DSelection &&
        onYAxisZoomCallback &&
        dragState.current.startYPixel &&
        chartState?.chartY &&
        !event?.shiftKey
      ) {
        const startY = dragState.current.startYPixel;
        const endY = chartState.chartY;
        onYAxisZoomCallback(startY, endY);
      }

      // Hide areas
      hideSelectionRects();

      dragState.current.isDragging = false;

      // Call optional callback
      if (onMouseUpCallback) {
        onMouseUpCallback(chartState, dragState.current);
      }
    },
    [
      callback,
      indexToMillis,
      onMouseUpCallback,
      enable2DSelection,
      onYAxisZoomCallback,
      hideSelectionRects,
    ],
  );

  const doubleClick = useCallback(
    (chartState) => {
      // Reset selection to full range
      if (resetCallback) {
        resetCallback();
      }

      // Ensure areas are hidden and reset
      hideSelectionRects();

      dragState.current.isDragging = false;

      // Call optional callback
      if (onDoubleClickCallback) {
        onDoubleClickCallback(chartState, dragState.current);
      }
    },
    [resetCallback, onDoubleClickCallback, hideSelectionRects],
  );

  const mouseLeave = useCallback(() => {
    if (onMouseLeaveCallback) {
      onMouseLeaveCallback(dragState.current);
    }
    if (dragState.current.isDragging) {
      // Hide areas
      hideSelectionRects();

      dragState.current.isDragging = false;
    }
  }, [onMouseLeaveCallback, hideSelectionRects]);

  return {
    mouseDown,
    mouseMove,
    mouseUp,
    doubleClick,
    mouseLeave,
    dragState,
  };
}
