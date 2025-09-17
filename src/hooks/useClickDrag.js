import { useState, useCallback } from "react";
import { millisToDateTime } from "@/utils/timeUtils";

/**
 * Hook for managing click+drag time range selection on Recharts.
 *
 * @param {Function} setSelectedTimeRange - Setter for the selected time range state.
 *   Expects an array of Luxon DateTime objects [start, end].
 * @param {[number, number]} fullTimeRange - The full resettable time range, in TAI milliseconds.
 * @param {Function} [indexToMillis] - A function which maps points on the X axis to TAI milliseconds
 * @returns {object} Handlers and refs for use in a Recharts chart.
 */
export const useClickDrag = (
  setSelectedTimeRange,
  fullTimeRange,
  indexToMillis = (i) => i,
) => {
  const [refAreaLeft, setRefAreaLeft] = useState(null);
  const [refAreaRight, setRefAreaRight] = useState(null);

  const handleMouseDown = useCallback(
    (e) => setRefAreaLeft(e?.activeLabel ?? null),
    [],
  );

  const handleMouseMove = useCallback(
    (e) => refAreaLeft && setRefAreaRight(e?.activeLabel ?? null),
    [refAreaLeft],
  );

  const handleMouseUp = useCallback(() => {
    // Ignore invalid selections
    if (!refAreaLeft || !refAreaRight || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }
    // Swap start/end if user dragged backwards
    const [startMillis, endMillis] =
      refAreaLeft < refAreaRight
        ? [refAreaLeft, refAreaRight]
        : [refAreaRight, refAreaLeft];

    // Convert millis to DateTime objects
    const startDT = millisToDateTime(indexToMillis(startMillis));
    const endDT = millisToDateTime(indexToMillis(endMillis));

    // Push selection back to parent component
    setSelectedTimeRange([startDT, endDT]);

    // Reset
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [refAreaLeft, refAreaRight, setSelectedTimeRange, indexToMillis]);

  const handleDoubleClick = useCallback(() => {
    setSelectedTimeRange(fullTimeRange);
  }, [fullTimeRange, setSelectedTimeRange]);

  return {
    refAreaLeft,
    refAreaRight,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
  };
};
