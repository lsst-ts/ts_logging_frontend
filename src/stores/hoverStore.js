/**
 * External store for cross-plot hover state management using direct DOM manipulation
 * Bypasses React re-renders by directly manipulating SVG elements
 */

import { getChartPlotBounds } from "@/utils/plotUtils";

class HoverStore {
  constructor() {
    this.hoveredExposureID = null;
    this.graphs = new Set();
  }

  registerGraph(graphID) {
    this.graphs.add(graphID);
  }

  unregisterGraph(graphID) {
    this.graphs.delete(graphID);
  }

  /**
   * Sets the currently hovered exposure ID and updates all registered graphs to display hover indicators.
   *
   * When an exposure is hovered, this method synchronizes hover indicators across all timeseries plots
   * on the page. It uses direct DOM manipulation to position hover circles at the corresponding data
   * points in each graph, providing cross-plot hover synchronization without triggering React re-renders.
   *
   * @param {string|null} exposureID - The exposure ID to highlight across all graphs, or null to clear
   *                                   the hover state and hide all hover indicators.
   *
   * The method works by:
   * 1. Storing the exposure ID in the store's state
   * 2. Iterating through all registered graphs
   * 3. For each graph, finding the data point matching this exposure ID
   * 4. Moving the graph's hover indicator circle to match that data point's position
   * 5. Hiding hover indicators on graphs that don't contain this exposure ID
   *
   * This enables synchronized hover behavior across multiple plots - when a user hovers over
   * a data point in one plot, corresponding points in all other plots are highlighted simultaneously.
   */
  setHover(exposureID) {
    this.hoveredExposureID = exposureID;
    this.graphs.forEach((graphID) => {
      this.updateGraph(graphID);
    });
  }

  updateGraph(graphID) {
    // Query for the circle element that recharts rendered for our ReferenceDot
    const hoverCircle = document.querySelector(
      `[data-hover-indicator="${graphID}"]`,
    );

    if (hoverCircle === null) {
      return; // Haven't found the circle yet, recharts might not have rendered it
    }

    // If no hover, hide the circle
    if (!this.hoveredExposureID) {
      hoverCircle.style.display = "none";
      return;
    }

    // Find the rendered dot on the graph for this exposureID, so that we can
    // steal and reuse its positioning
    const dataPoint = document.querySelector(
      `[data-obsid="${this.hoveredExposureID}"][data-graphid="${graphID}"]`,
    );

    if (dataPoint === null) {
      // No data point on this graph for this exposureID
      hoverCircle.style.display = "none";
      return;
    }
    const { cx, cy } = dataPoint.dataset;

    if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) {
      hoverCircle.style.display = "none";
      return;
    }

    // Get the plot area bounds to check if cy is visible
    const svg = hoverCircle.closest("svg");
    const bbox = getChartPlotBounds(svg);
    if (bbox) {
      const plotTop = bbox.y;
      const plotBottom = bbox.y + bbox.height;
      const cyValue = parseFloat(cy);

      // Only show the hover circle if it's within the visible Y bounds
      if (cyValue < plotTop || cyValue > plotBottom) {
        hoverCircle.style.display = "none";
        return;
      }
    }

    // Update the hover circle position
    hoverCircle.setAttribute("cx", cx);
    hoverCircle.setAttribute("cy", cy);
    hoverCircle.style.display = "block";
  }
}

export const hoverStore = new HoverStore();
