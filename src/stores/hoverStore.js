/**
 * External store for cross-plot hover state management using direct DOM manipulation
 * Bypasses React re-renders by directly manipulating SVG elements
 */

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

  setHover(exposureID) {
    this.hoveredExposureID = exposureID;
    this.graphs.forEach((graphID) => {
      this.updateGraph(graphID);
    });
  }

  updateGraph(graphID) {
    // Query for the circle element that recharts rendered for our ReferenceDot
    // The data-hover-indicator attribute is on a parent element, so we need to find it
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
      hoverCircle.style.display = "none";
      return;
    }
    const { cx, cy } = dataPoint.dataset;

    if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) {
      hoverCircle.style.display = "none";
      return;
    }

    // Update the hover circle position
    hoverCircle.setAttribute("cx", cx);
    hoverCircle.setAttribute("cy", cy);
    hoverCircle.style.display = "block";
  }
}

export const hoverStore = new HoverStore();
