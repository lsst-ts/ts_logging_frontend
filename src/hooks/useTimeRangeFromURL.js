import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  getDayobsStartUTC,
  getDayobsEndUTC,
  getValidTimeRange,
} from "@/utils/timeUtils";

/**
 * Custom hook that manages a time range synced with URL search parameters.
 *
 * This hook provides a useState-like interface for managing a selected time range that is
 * automatically synchronized with the browser's URL search parameters (startTime and endTime).
 * It calculates the full valid time range from the dayobs search parameters and ensures
 * the selected range stays within bounds.
 *
 * Features:
 * - Reads startDayobs/endDayobs from URL to calculate valid bounds (fullTimeRange)
 * - Initializes selectedTimeRange from URL params (startTime/endTime) or falls back to fullTimeRange
 * - Bidirectional sync: URL changes update state, state changes update URL
 * - Validates time ranges to ensure they're within bounds
 * - Uses replace: true to avoid polluting browser history
 *
 * @param {string} routePath - The route path identifier (e.g., "/context-feed", "/plots")
 *
 * @returns {Object} Object containing:
 *   - selectedTimeRange: Array of [startDateTime, endDateTime] (Luxon DateTime objects)
 *   - setSelectedTimeRange: Function to update the time range (automatically syncs to URL)
 *   - fullTimeRange: Array of [startDateTime, endDateTime] representing the full valid bounds
 *
 * @example
 * const { selectedTimeRange, setSelectedTimeRange, fullTimeRange } = useTimeRangeFromURL("/context-feed");
 *
 * // Update the time range (will automatically update URL)
 * setSelectedTimeRange([newStart, newEnd]);
 */
export function useTimeRangeFromURL(routePath) {
  // Get all search params from the URL
  const { startDayobs, endDayobs, startTime, endTime } = useSearch({
    from: routePath,
  });

  // Calculate the full valid time range based on dayobs parameters
  const fullTimeRange = useMemo(
    () => [
      getDayobsStartUTC(String(startDayobs)),
      getDayobsEndUTC(String(endDayobs)),
    ],
    [startDayobs, endDayobs],
  );

  // Initialize state from URL params, validating against fullTimeRange
  const [selectedTimeRange, setSelectedTimeRangeInternal] = useState(() => {
    const startMillis = Number(startTime);
    const endMillis = Number(endTime);
    return getValidTimeRange(startMillis, endMillis, fullTimeRange);
  });

  const navigate = useNavigate({ from: routePath });
  const searchParams = useSearch({ from: routePath });

  // Sync URL time params → state when URL changes externally
  useEffect(() => {
    const startMillis = Number(startTime);
    const endMillis = Number(endTime);
    const newRange = getValidTimeRange(startMillis, endMillis, fullTimeRange);

    if (
      newRange[0].toMillis() !== selectedTimeRange[0].toMillis() ||
      newRange[1].toMillis() !== selectedTimeRange[1].toMillis()
    ) {
      setSelectedTimeRangeInternal(newRange);
    }
  }, [startTime, endTime, fullTimeRange, selectedTimeRange]);

  // Wrapped setter that updates both state and URL
  const setSelectedTimeRange = (newRange) => {
    if (
      !newRange[0] ||
      !newRange[1] ||
      Number.isNaN(newRange[0].toMillis()) ||
      Number.isNaN(newRange[1].toMillis())
    ) {
      console.warn(
        "setSelectedTimeRange called with invalid values: ",
        newRange,
      );
      return;
    }

    setSelectedTimeRangeInternal(newRange);

    const newStart = newRange[0].toMillis();
    const newEnd = newRange[1].toMillis();

    navigate({
      to: routePath,
      search: {
        ...searchParams,
        startTime: newStart,
        endTime: newEnd,
      },
      replace: true,
    });
  };

  return { selectedTimeRange, setSelectedTimeRange, fullTimeRange };
}
