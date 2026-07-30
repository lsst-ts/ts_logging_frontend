import { useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * Hook for syncing a single selected value with URL parameters.
 * Reads the given param from URL and writes changes back.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.routePath - TanStack Router route path (e.g., "/data-log")
 * @param {string} options.paramName - The URL search param name (e.g., "selectedExposureId")
 * @returns {Object} { selectedValue, setSelectedValue, clearSelection }
 */
export function useSelectionSync({ routePath, paramName }) {
  const navigate = useNavigate({ from: routePath });
  const searchParams = useSearch({ from: routePath });

  // Get the current selected value from URL (single value, not array)
  const selectedValue = useMemo(() => {
    const paramValue = searchParams[paramName];
    if (Array.isArray(paramValue)) {
      // Take first value if array (single-select mode)
      return paramValue[0] || null;
    }
    return paramValue || null;
  }, [searchParams, paramName]);

  // Set the selected value (updates URL)
  const setSelectedValue = (value) => {
    navigate({
      to: routePath,
      search: (prev) => {
        const newParams = { ...prev };
        if (value) {
          // Set as single-element array for consistency with router parsing
          newParams[paramName] = [value];
        } else {
          delete newParams[paramName];
        }
        return newParams;
      },
      replace: true,
    });
  };

  // Clear the selection (removes URL param)
  const clearSelection = () => {
    navigate({
      to: routePath,
      search: (prev) => {
        const newParams = { ...prev };
        delete newParams[paramName];
        return newParams;
      },
      replace: true,
    });
  };

  return {
    selectedValue,
    setSelectedValue,
    clearSelection,
  };
}
