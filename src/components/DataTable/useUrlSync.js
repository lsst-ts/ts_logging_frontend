import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { getColumnUrlMappings } from "@/utils/tableUtils";

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

  // Extract only the filter-related params from searchParams as a stable string
  const filterParamsJson = useMemo(() => {
    const filterParams = {};
    for (const key of urlParamKeys) {
      if (searchParams[key] !== undefined) {
        filterParams[key] = searchParams[key];
      }
    }
    return JSON.stringify(filterParams);
  }, [searchParams, urlParamKeys]);

  // Parse a URL param value into an array
  // Handles: arrays, comma-separated strings, and single values
  const parseParamValue = (value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string" && value.includes(",")) {
      return value.split(",").map((v) => v.trim());
    }
    return [value];
  };

  // Build filters from URL params (falls back to defaultFilters if no URL params)
  const buildFiltersFromUrl = useCallback(() => {
    const filters = [];
    for (const [urlParam, columnId] of Object.entries(urlParamToColumnId)) {
      const value = searchParams[urlParam];
      if (value !== undefined && value !== null && value !== "") {
        filters.push({
          id: columnId,
          value: parseParamValue(value),
        });
      }
    }
    // If no filters in URL, use defaults
    return filters.length > 0 ? filters : defaultFilters;
  }, [searchParams, urlParamToColumnId, defaultFilters]);

  // Initialize state from URL (only on first render)
  const [columnFilters, setColumnFiltersState] = useState(buildFiltersFromUrl);

  // Track the last filterParamsJson we processed to avoid loops
  const lastProcessedParams = useRef(filterParamsJson);

  // Sync URL changes to state (for browser back/forward)
  useEffect(() => {
    // Only update if the filter params actually changed
    if (lastProcessedParams.current === filterParamsJson) {
      return;
    }
    lastProcessedParams.current = filterParamsJson;
    const newFilters = buildFiltersFromUrl();
    setColumnFiltersState(newFilters);
  }, [filterParamsJson, buildFiltersFromUrl]);

  // Custom setter that updates both state and URL
  const setColumnFilters = useCallback(
    (filtersOrUpdater) => {
      setColumnFiltersState((prevFilters) => {
        const newFilters =
          typeof filtersOrUpdater === "function"
            ? filtersOrUpdater(prevFilters)
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

        // Update the ref so the effect doesn't re-process this change
        const newFilterParams = {};
        for (const key of urlParamKeys) {
          if (newParams[key] !== undefined) {
            newFilterParams[key] = newParams[key];
          }
        }
        lastProcessedParams.current = JSON.stringify(newFilterParams);

        navigate({ to: routePath, search: newParams, replace: true });

        return newFilters;
      });
    },
    [searchParams, navigate, routePath, columnIdToUrlParam, urlParamKeys],
  );

  // Reset filters: clears filter params from URL and sets state to defaultFilters
  const resetFilters = useCallback(() => {
    // Build new URL params without any filter params
    const newParams = { ...searchParams };
    for (const urlParam of urlParamKeys) {
      if (Object.hasOwn(newParams, urlParam)) {
        delete newParams[urlParam];
      }
    }

    // Update ref so the effect doesn't re-process
    lastProcessedParams.current = JSON.stringify({});

    // Clear filter params from URL
    navigate({ to: routePath, search: newParams, replace: true });

    // Set state to defaults (not written to URL)
    setColumnFiltersState(defaultFilters);
  }, [searchParams, navigate, routePath, urlParamKeys, defaultFilters]);

  return {
    columnFilters,
    setColumnFilters,
    resetFilters,
  };
}
