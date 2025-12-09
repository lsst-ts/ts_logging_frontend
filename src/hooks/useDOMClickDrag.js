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
 * @param {Function} params.callback - Called on mouseUp with (start: MousePosition, end: MousePosition, event: MouseEvent)
 *   MousePosition = { pixelX, pixelY, fractionX, fractionY, nearestPayload }
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
 * @param {Function} [params.onMouseLeave] - Optional callback after mouseLeave, receives (dragState)
 * @param {boolean} [params.enable2DSelection=false] - Whether to enable 2D (X and Y) selection
 *
 * @returns {Object} Event handlers and state: { mouseDown, mouseMove, mouseUp, doubleClick, mouseLeave, dragState }
 *
 * @example
 * const chartRef = useRef(null);
 *
 * const { mouseDown, mouseMove, mouseUp, doubleClick, mouseLeave, dragState } = useDOMClickDrag({
 *   callback: (start, end, event) => {
 *     const startTime = millisToDateTime(start.nearestPayload.timestamp);
 *     const endTime = millisToDateTime(end.nearestPayload.timestamp);
 *     setSelectedTimeRange([startTime, endTime]);
 *   },
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
 *     onMouseLeave={mouseLeave}
 *   >
 *     ... LineChart contents
 *   </LineChart>
 * </ChartContainer>
 */
export function useDOMClickDrag({
  callback,
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
  onMouseLeave: onMouseLeaveCallback,
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
    startPayload: null, // activePayload[0]?.payload from initial click (for callback)
    startYPixel: null, // chartY from initial click (for Y-axis zoom)
    currentPixel: null, // Track current mouse position
    currentCoordinate: null, // Track current activeCoordinate.x
    currentYPixel: null, // Track current Y position
    shiftKeyHeld: false, // Track shift key state
    ctrlKeyHeld: false, // Track ctrl key state
    keyHandler: null, // Reference to keyboard event handler for cleanup
  });

  // Helper: Update the visual selection rectangles
  const updateSelectionRects = useCallback(() => {
    const {
      startPixel,
      startCoordinate,
      startYPixel,
      currentPixel,
      currentCoordinate,
      currentYPixel,
      shiftKeyHeld,
      ctrlKeyHeld,
    } = dragState.current;

    // Determine if we should do 2D selection (enabled AND shift not held)
    const use2DSelection = enable2DSelection && !shiftKeyHeld;

    // Update stroke-dasharray for ctrl key
    if (showMouseRect && mouseRef.current) {
      if (enable2DSelection && ctrlKeyHeld) {
        mouseRef.current.setAttribute("stroke-dasharray", "5,5");
      } else {
        mouseRef.current.removeAttribute("stroke-dasharray");
      }
    }
    if (showSnappedRect && snappedRef.current) {
      if (enable2DSelection && ctrlKeyHeld) {
        snappedRef.current.setAttribute("stroke-dasharray", "5,5");
      } else {
        snappedRef.current.removeAttribute("stroke-dasharray");
      }
    }

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
    // Otherwise, update the selection to the full height of the plot
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
  }, [showMouseRect, showSnappedRect, enable2DSelection, chartRef]);

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
  }, []);

  // Helper: End the dragging operation (hide rectangles, remove listeners, reset state)
  const endDrag = useCallback(() => {
    // Hide the selection rectangles
    hideSelectionRects();

    // Reset all drag state properties
    dragState.current.isDragging = false;
    dragState.current.startPixel = null;
    dragState.current.startCoordinate = null;
    dragState.current.startPayload = null;
    dragState.current.startYPixel = null;
    dragState.current.currentPixel = null;
    dragState.current.currentCoordinate = null;
    dragState.current.currentYPixel = null;
    dragState.current.shiftKeyHeld = false;
    dragState.current.ctrlKeyHeld = false;

    // Remove keyboard event listeners
    if (dragState.current.keyHandler) {
      window.removeEventListener("keydown", dragState.current.keyHandler);
      window.removeEventListener("keyup", dragState.current.keyHandler);
      dragState.current.keyHandler = null;
    }
  }, [hideSelectionRects]);

  // Helper: Handle keyboard events during drag
  const handleKeyChange = useCallback(
    (event) => {
      if (!dragState.current.isDragging) return;

      // Check for Escape key to cancel drag
      if (event.key === "Escape") {
        endDrag();
        return;
      }

      // Update key states
      dragState.current.shiftKeyHeld = event.shiftKey;
      dragState.current.ctrlKeyHeld = event.ctrlKey || event.metaKey;

      // Update rectangles immediately
      updateSelectionRects();
    },
    [updateSelectionRects, endDrag],
  );

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
    mouseRect.setAttribute("stroke", mouseRectStyle.stroke || "#888");
    mouseRect.setAttribute(
      "stroke-width",
      mouseRectStyle["stroke-width"] || "1",
    );
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
    snappedRect.setAttribute("stroke", snappedRectStyle.stroke || "#666");
    snappedRect.setAttribute(
      "stroke-width",
      snappedRectStyle["stroke-width"] || "1",
    );
    snappedRect.setAttribute("pointer-events", "none");
    // Apply additional custom styles
    Object.entries(snappedRectStyle).forEach(([key, value]) => {
      if (key !== "fill" && key !== "fill-opacity") {
        snappedRect.setAttribute(key, value);
      }
    });

    // Append to SVG and store in refs
    svg.appendChild(snappedRect);
    svg.appendChild(mouseRect);
    mouseRef.current = mouseRect;
    snappedRef.current = snappedRect;

    return true;
  }, [chartRef, mouseRectStyle, snappedRectStyle, enable2DSelection]);

  const mouseDown = useCallback(
    (chartState, event) => {
      // Call optional callback
      if (onMouseDownCallback) {
        onMouseDownCallback(chartState, dragState.current);
      }

      // Only respond to left mouse button (button 0)
      if (event?.button !== 0) {
        return;
      }

      // Ensure rects are created on first interaction
      if (!ensureRectsExist()) {
        return;
      }

      let startPixel = chartState.chartX;
      let startCoordinate = chartState.activeCoordinate.x;
      let startPayload = chartState.activePayload?.[0]?.payload || null;

      // Shift-extend: extend from the farther edge of the current selection
      // Only works for 1D selection
      if (event?.shiftKey && !enable2DSelection) {
        // Find the selection ReferenceArea path to get pixel positions
        // Note that this requires the chart to have a reference area with the `selection-highlight` class
        const selectionPath = chartRef.current?.querySelector(
          ".selection-highlight path",
        );

        if (selectionPath) {
          const rectX = parseFloat(selectionPath.getAttribute("x"));
          const rectWidth = parseFloat(selectionPath.getAttribute("width"));

          if (!isNaN(rectX) && !isNaN(rectWidth)) {
            const clickedPixel = chartState.activeCoordinate.x;

            // Find which endpoint is farther from the click (using pixel positions)
            const distToStart = Math.abs(clickedPixel - rectX);
            const distToEnd = Math.abs(clickedPixel - (rectX + rectWidth));

            // Use the farther endpoint as the start point
            if (distToStart > distToEnd) {
              startPixel = rectX; // Left edge
            } else {
              startPixel = rectX + rectWidth; // Right edge
            }
            // Note: startPayload and startCoordinate are null as we don't have
            // a way of reliably telling which payloads the startPixel corresponds to
            startPayload = null;
            startCoordinate = null;
          }
        }
      }

      dragState.current.isDragging = true;
      dragState.current.startPixel = startPixel;
      dragState.current.startCoordinate = startCoordinate;
      dragState.current.startPayload = startPayload;
      dragState.current.startYPixel = chartState.chartY;
      dragState.current.currentPixel = chartState.chartX;
      dragState.current.currentCoordinate = chartState.activeCoordinate.x;
      dragState.current.currentYPixel = chartState.chartY;
      dragState.current.shiftKeyHeld = event?.shiftKey || false;
      dragState.current.ctrlKeyHeld = event?.ctrlKey || event?.metaKey || false;

      // Make areas visible based on configuration
      if (showMouseRect && mouseRef.current) {
        mouseRef.current.setAttribute("fill-opacity", "0.4");
      }
      if (showSnappedRect && snappedRef.current) {
        snappedRef.current.setAttribute("fill-opacity", "0.4");
      }

      // Add keyboard event listeners to track ctrl/shift during drag
      dragState.current.keyHandler = handleKeyChange;
      window.addEventListener("keydown", handleKeyChange);
      window.addEventListener("keyup", handleKeyChange);

      // Update rectangle dimensions immediately
      updateSelectionRects();
    },
    [
      ensureRectsExist,
      showMouseRect,
      showSnappedRect,
      onMouseDownCallback,
      chartRef,
      updateSelectionRects,
      enable2DSelection,
      handleKeyChange,
    ],
  );

  const mouseMove = useCallback(
    (chartState, event) => {
      // Call optional callback even when not dragging
      if (onMouseMoveCallback) {
        onMouseMoveCallback(chartState, dragState.current);
      }
      // If we're outisde the chart zone, don't do anything
      if (chartState.chartX === undefined || chartState.chartY === undefined) {
        return;
      }
      if (!dragState.current.isDragging) {
        return;
      }

      // Update current position and key states in dragState
      dragState.current.currentPixel = chartState?.chartX;
      dragState.current.currentCoordinate = chartState?.activeCoordinate?.x;
      dragState.current.currentYPixel = chartState?.chartY;
      dragState.current.shiftKeyHeld = event?.shiftKey || false;
      dragState.current.ctrlKeyHeld = event?.ctrlKey || event?.metaKey || false;

      // Update selection rectangles
      updateSelectionRects();
    },
    [onMouseMoveCallback, updateSelectionRects],
  );

  const mouseUp = useCallback(
    (chartState, event) => {
      // Call optional callback
      if (onMouseUpCallback) {
        onMouseUpCallback(chartState, dragState.current);
      }
      // Only respond to left mouse button (button 0)
      if (event?.button !== 0) {
        return;
      }

      if (!dragState.current.isDragging) return;

      const { startPixel, startPayload, startYPixel } = dragState.current;

      // Get plot bounds for fraction calculations
      const svg = chartRef.current?.querySelector("svg.recharts-surface");
      const bbox = getChartPlotBounds(svg);

      const {
        x: plotLeft,
        y: plotTop,
        width: plotWidth,
        height: plotHeight,
      } = bbox;

      // Create start MousePosition
      const startFractionX = (startPixel - plotLeft) / plotWidth;
      const startFractionY = 1 - (startYPixel - plotTop) / plotHeight;

      const start = {
        pixelX: startPixel,
        pixelY: startYPixel,
        fractionX: startFractionX,
        fractionY: startFractionY,
        nearestPayload: startPayload,
      };

      // Create end MousePosition
      // If mouseup occurs outside cartesian grid but inside chart bounds,
      // chartState values will be undefined - fall back to dragState values
      const endPixelX = chartState.chartX ?? dragState.current.currentPixel;
      const endPixelY = chartState.chartY ?? dragState.current.currentYPixel;
      const endPayload = chartState.activePayload?.[0]?.payload || null;

      const endFractionX = (endPixelX - plotLeft) / plotWidth;
      const endFractionY = 1 - (endPixelY - plotTop) / plotHeight;

      const end = {
        pixelX: endPixelX,
        pixelY: endPixelY,
        fractionX: endFractionX,
        fractionY: endFractionY,
        nearestPayload: endPayload,
      };

      // Only invoke callback if there's an actual selection (not just a click)
      if (
        start.fractionX !== end.fractionX ||
        start.fractionY !== end.fractionY
      ) {
        callback(start, end, event);
      }

      // End the drag operation
      endDrag();
    },
    [callback, onMouseUpCallback, chartRef, endDrag],
  );

  const doubleClick = useCallback(
    (chartState) => {
      // Reset selection to full range
      if (resetCallback) {
        resetCallback();
      }

      // End the drag operation (in case double-click happens during drag)
      endDrag();

      // Call optional callback
      if (onDoubleClickCallback) {
        onDoubleClickCallback(chartState, dragState.current);
      }
    },
    [resetCallback, onDoubleClickCallback, endDrag],
  );

  const mouseLeave = useCallback(() => {
    if (onMouseLeaveCallback) {
      onMouseLeaveCallback(dragState.current);
    }
    if (dragState.current.isDragging) {
      // End the drag operation
      endDrag();
    }
  }, [onMouseLeaveCallback, endDrag]);

  return {
    mouseDown,
    mouseMove,
    mouseUp,
    doubleClick,
    mouseLeave,
    dragState,
  };
}
