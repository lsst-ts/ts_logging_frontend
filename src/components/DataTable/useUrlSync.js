import { useCallback, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { getColumnUrlMappings } from "./tableUtils";

/**
 * Hook for syncing column filters with URL parameters.
 * Reads initial filters from URL and writes filter changes back to URL.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.routePath - TanStack Router route path (e.g., "/data-log")
 * @param {Array} options.columns - Column definitions (to find urlParam metadata)
 * @param {Array} options.defaultFilters - Default filters used by resetFilters()
 * @returns {Object} { columnFilters, setColumnFilters, resetFilters }
 */
export function useUrlSync({ routePath, columns = [], defaultFilters = [] }) {
  const navigate = useNavigate({ from: routePath });
  const searchParams = useSearch({ from: routePath });

  // Memoize the column mappings so they don't change on every render
  const { urlParamToColumnId, columnIdToUrlParam, urlParamKeys } = useMemo(
    () => getColumnUrlMappings(columns),
    [columns],
  );

  // Derive columnFilters directly from URL params (falls back to defaultFilters if none)
  const columnFilters = useMemo(() => {
    const filters = [];
    for (const [urlParam, columnId] of Object.entries(urlParamToColumnId)) {
      const value = searchParams[urlParam];
      if (value !== undefined && value !== null && value !== "") {
        filters.push({ id: columnId, value: parseParamValue(value) });
      }
    }
    return filters.length > 0 ? filters : defaultFilters;
  }, [searchParams, urlParamToColumnId, defaultFilters]);

  // Custom setter that updates the URL (columnFilters is derived from URL automatically)
  const setColumnFilters = useCallback(
    (filtersOrUpdater) => {
      const newFilters =
        typeof filtersOrUpdater === "function"
          ? filtersOrUpdater(columnFilters)
          : filtersOrUpdater;

      // Build new URL params (preserve non-filter params)
      const newParams = { ...searchParams };

      // Remove old filter params
      for (const urlParam of urlParamKeys) {
        if (Object.hasOwn(newParams, urlParam)) {
          delete newParams[urlParam];
        }
      }

      // Add current filters
      for (const filter of newFilters) {
        const urlParam = columnIdToUrlParam[filter.id];
        if (urlParam && filter.value) {
          newParams[urlParam] = Array.isArray(filter.value)
            ? filter.value
            : [filter.value];
        }
      }

      navigate({ to: routePath, search: newParams, replace: true });
    },
    [
      columnFilters,
      searchParams,
      navigate,
      routePath,
      columnIdToUrlParam,
      urlParamKeys,
    ],
  );

  // Reset filters: clears filter params from URL; columnFilters falls back to defaultFilters
  const resetFilters = useCallback(() => {
    const newParams = { ...searchParams };
    for (const urlParam of urlParamKeys) {
      if (Object.hasOwn(newParams, urlParam)) {
        delete newParams[urlParam];
      }
    }
    navigate({ to: routePath, search: newParams, replace: true });
  }, [searchParams, navigate, routePath, urlParamKeys]);

  return {
    columnFilters,
    setColumnFilters,
    resetFilters,
  };
}

// Parse a URL param value into an array.
// Handles: arrays, comma-separated strings, and single values.
function parseParamValue(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.includes(",")) {
    return value.split(",").map((v) => v.trim());
  }
  return [value];
}
