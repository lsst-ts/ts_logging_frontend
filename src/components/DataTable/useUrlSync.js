import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { getColumnUrlMappings } from "./tableUtils";

// A `= []` default allocates a new array on every call, which would invalidate
// the memos below, so the optional params default to shared identities.
const NO_COLUMNS = [];
const NO_FILTERS = [];

/**
 * Hook for syncing column filters with URL parameters.
 * Reads initial filters from URL and writes filter changes back to URL.
 *
 * Columns without a `urlParam` in their meta can still be filtered: their
 * filter values are kept in local state and merged with the URL-derived
 * filters, but never written to the URL (so they don't survive a reload).
 *
 * @param {Object} options - Configuration options
 * @param {string} options.routePath - TanStack Router route path (e.g., "/data-log")
 * @param {Array} options.columns - Column definitions (to find urlParam metadata)
 * @param {Array} options.defaultFilters - Default filters used by resetFilters()
 * @returns {Object} { columnFilters, setColumnFilters, resetFilters }
 */
export function useUrlSync({
  routePath,
  columns = NO_COLUMNS,
  defaultFilters = NO_FILTERS,
}) {
  const navigate = useNavigate({ from: routePath });

  // Memoize the column mappings so they don't change on every render
  const { urlParamToColumnId, columnIdToUrlParam, urlParamKeys } = useMemo(
    () => getColumnUrlMappings(columns),
    [columns],
  );

  // Subscribe to the filter params only. structuralSharing keeps the result
  // reference-stable while their values are unchanged
  const filterParams = useSearch({
    from: routePath,
    select: (search) =>
      Object.fromEntries(
        urlParamKeys
          .filter((key) => search[key] !== undefined)
          .map((key) => [key, search[key]]),
      ),
    structuralSharing: true,
  });

  // Filters for columns without a urlParam mapping (table-only filters)
  const [localFilters, setLocalFilters] = useState(NO_FILTERS);

  // Derive columnFilters from URL params (falling back to defaultFilters if
  // none), merged with the table-only local filters
  const columnFilters = useMemo(() => {
    const filters = [];
    for (const [urlParam, columnId] of Object.entries(urlParamToColumnId)) {
      const value = filterParams[urlParam];
      if (value !== undefined && value !== null && value !== "") {
        filters.push({ id: columnId, value: parseParamValue(value) });
      }
    }
    const urlFilters = filters.length > 0 ? filters : defaultFilters;
    return localFilters.length > 0
      ? [...urlFilters, ...localFilters]
      : urlFilters;
  }, [filterParams, urlParamToColumnId, defaultFilters, localFilters]);

  // Custom setter that updates the URL (columnFilters is derived from URL automatically)
  const setColumnFilters = useCallback(
    (filtersOrUpdater) => {
      const newFilters =
        typeof filtersOrUpdater === "function"
          ? filtersOrUpdater(columnFilters)
          : filtersOrUpdater;

      // Filters on columns without a urlParam go to local state. Falling back
      // to the shared empty identity keeps columnFilters stable when there are
      // none.
      const newLocalFilters = newFilters.filter(
        (filter) => !columnIdToUrlParam[filter.id],
      );
      setLocalFilters(
        newLocalFilters.length > 0 ? newLocalFilters : NO_FILTERS,
      );

      navigate({
        to: routePath,
        search: (prev) => {
          // Build new URL params (preserve non-filter params)
          const newParams = { ...prev };

          // Remove old filter params
          for (const urlParam of urlParamKeys) {
            if (Object.hasOwn(newParams, urlParam)) {
              delete newParams[urlParam];
            }
          }

          // Add current filters for URL-mapped columns
          for (const filter of newFilters) {
            const urlParam = columnIdToUrlParam[filter.id];
            if (urlParam && filter.value) {
              newParams[urlParam] = Array.isArray(filter.value)
                ? filter.value
                : [filter.value];
            }
          }

          return newParams;
        },
        replace: true,
      });
    },
    [columnFilters, navigate, routePath, columnIdToUrlParam, urlParamKeys],
  );

  // Reset filters: clears table-only filters and filter params from URL;
  // columnFilters falls back to defaultFilters
  const resetFilters = useCallback(() => {
    setLocalFilters(NO_FILTERS);
    navigate({
      to: routePath,
      search: (prev) => {
        const newParams = { ...prev };
        for (const urlParam of urlParamKeys) {
          if (Object.hasOwn(newParams, urlParam)) {
            delete newParams[urlParam];
          }
        }
        return newParams;
      },
      replace: true,
    });
  }, [navigate, routePath, urlParamKeys]);

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
