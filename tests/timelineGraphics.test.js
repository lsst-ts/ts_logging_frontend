import { afterEach, describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import { buildTimelineGraphicElements } from "@/utils/timelineUtils";

const fullTimeRange = [
  DateTime.fromISO("2026-07-01T12:00:00Z"),
  DateTime.fromISO("2026-07-02T12:00:00Z"),
];
function build({ gridRect, throws = false, ...options } = {}) {
  const container = document.createElement("div");
  Object.defineProperties(container, {
    offsetWidth: { value: 800 },
    offsetHeight: { value: 300 },
  });
  const instance = {
    convertToPixel: vi.fn(
      (_, time) => ((time - fullTimeRange[0].toMillis()) / 86400000) * 800,
    ),
    getModel: () => {
      if (throws) throw new Error("Grid not laid out yet");
      return {
        getComponent: () =>
          gridRect
            ? { coordinateSystem: { getRect: () => gridRect } }
            : undefined,
      };
    },
  };
  return buildTimelineGraphicElements(
    instance,
    { current: container },
    { fullTimeRange, ...options },
  );
}
afterEach(() => vi.restoreAllMocks());

describe("timeline empty-state graphics", () => {
  it("centres the message in the plotting grid rather than the entire chart", () => {
    const result = build({
      gridRect: { x: 100, y: 20, width: 600, height: 200 },
      noDataMessage: "No events",
    });
    const message = result.elements.find(
      (item) => item.id === "no-data-message",
    );
    expect(message).toMatchObject({
      x: 400,
      y: 120,
      silent: true,
      style: { text: "No events", width: 576, overflow: "break" },
    });
  });

  it.each([false, true])(
    "uses container bounds when no grid is available (throws: %s)",
    (throws) => {
      const result = build({ throws, noDataMessage: "No events" });
      expect(
        result.elements.find((item) => item.id === "no-data-message"),
      ).toMatchObject({ x: 400, y: 150, style: { width: 776 } });
    },
  );

  it("does not retain an empty-state message in ready graphics", () => {
    expect(build().elements.some((item) => item.id === "no-data-message")).toBe(
      false,
    );
  });

  it("waits for valid time bounds before building graphics", () => {
    const instance = { convertToPixel: vi.fn() };
    expect(
      buildTimelineGraphicElements(
        instance,
        { current: null },
        { fullTimeRange: [] },
      ),
    ).toBeNull();
    expect(instance.convertToPixel).not.toHaveBeenCalled();
  });
});
